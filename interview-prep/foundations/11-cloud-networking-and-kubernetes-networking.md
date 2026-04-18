# Cloud Networking and Kubernetes Networking

> Cloud networking and Kubernetes networking are two separate layers that must work together. Understanding where they meet — and where they conflict — is the difference between guessing at incidents and solving them.

---

## What Is It and Why It Matters

When you run Kubernetes on a cloud provider (GCP/GKE, AWS/EKS, Azure/AKS), there are **two networking systems** operating simultaneously:

1. **Cloud VPC networking:** The network that the cloud provider manages. Controls how VMs (nodes) talk to each other, how they reach the internet, and how traffic enters from outside.

2. **Kubernetes Pod networking:** The overlay or native routing that CNI implements on top of the VPC. Controls how Pods talk to each other and to Services.

**Problems arise at the intersection:** A cloud firewall rule can block Kubernetes health checks. A VPC route can be missing for Pod CIDRs. A cloud load balancer health check path can diverge from actual service health.

---

## Mental Model

```
Internet
    │
[Cloud Load Balancer] ← health check via cloud
    │
[VPC Network]
  [Security Groups / Firewall Rules] ← L4 stateful (SG) or stateless (NACL)
    │
[Node EC2/GCE instance]
    │ iptables / eBPF (kube-proxy / Cilium)
[Pod Network]
  [NetworkPolicy] ← L3/L4 within cluster
    │
[Pod]
```

Each layer can independently drop traffic. The debugging approach: identify the layer where the drop occurs.

---

## Part 1: GCP Networking for Kubernetes (GCP/GKE)

### GCP VPC — Key Differences from AWS

GCP's VPC is **global** — a single VPC spans all regions. Subnets are regional.

```
GCP VPC "production-vpc"
  ├── Subnet: us-central1 (10.1.0.0/20)   ← GKE node IPs here
  ├── Subnet: europe-west4 (10.2.0.0/20)
  └── Subnet: asia-east1 (10.3.0.0/20)
```

**How GKE uses this:**
- GKE nodes get IPs from the node subnet
- Pod IPs come from a secondary IP range on the same subnet (VPC-native clusters)
- Services (ClusterIPs) come from a separate secondary range

```bash
# GKE VPC-native cluster: show node and pod CIDRs
gcloud container clusters describe my-cluster --format='value(networkConfig.network)'
gcloud container clusters describe my-cluster --format='value(clusterIpv4Cidr)'
gcloud container clusters describe my-cluster --format='value(servicesIpv4Cidr)'
```

### GCP Firewall Rules

GCP uses **firewall rules** (stateful, applied at the VPC level based on tags or service accounts):

```
# Default GKE firewall rules (auto-created):
- Allow all internal traffic between nodes in the cluster
- Allow health checks from GCP Load Balancer ranges (130.211.0.0/22, 35.191.0.0/16)
- Allow SSH from IAP (35.235.240.0/20) if configured

# Common SRE issue: custom firewall rules block health checks
gcloud compute firewall-rules list --filter="network=production-vpc"
```

**Key differences from AWS Security Groups:**
- GCP firewall rules: applied at network level, based on network tags or service accounts
- No per-instance security groups (though you can simulate this with tags)
- Rules can be hierarchical (org policy → folder → project)
- VPC flow logs: `gcloud compute networks describe <vpc> --format='value(enableUlaInternalIpv6)'`

### GKE Load Balancing

**External HTTP(S) Load Balancer:**
```
Internet → Global Anycast IP → GCP HTTP(S) LB
    → Backend Service (NEG: Network Endpoint Group)
    → Pod IPs directly (VPC-native GKE)
```

**Key: NEGs vs Instance Groups**
- Old way: Instance Group (routes to node, then kube-proxy routes to Pod)
- New way: NEG — Cloud LB routes directly to Pod IP, bypassing kube-proxy entirely
- NEGs require VPC-native clusters (secondary IP ranges for Pods)
- NEGs give better health checking (per-Pod, not per-Node)

```bash
# Check if NEG is being used
kubectl describe svc my-service | grep "cloud.google.com/neg"
# Annotation: cloud.google.com/neg: '{"ingress": true}' → NEGs enabled

# List NEGs
gcloud compute network-endpoint-groups list
```

### Cloud NAT and Egress

Pods need to reach external services (DockerHub, package repos, external APIs). Without Cloud NAT, outbound traffic from Pods uses the node's external IP.

**Cloud NAT:**
```bash
# Create NAT gateway for a region
gcloud compute routers create nat-router \
  --network=production-vpc --region=us-central1

gcloud compute routers nats create nat-config \
  --router=nat-router \
  --auto-allocate-nat-external-ips \
  --nat-all-subnet-ip-ranges \
  --region=us-central1
```

**With VPC-native GKE:** Both node IPs and Pod IPs are NAT'd when leaving the VPC.

---

## Part 2: AWS Networking for Kubernetes (AWS/EKS)

### AWS VPC — Regional, Explicit Route Tables

AWS VPCs are **regional** (unlike GCP's global VPCs). Every subnet needs explicit routing.

```
AWS VPC 10.0.0.0/16  (us-east-1)
  ├── Public Subnet: 10.0.1.0/24  (us-east-1a) → route table → Internet Gateway
  ├── Public Subnet: 10.0.2.0/24  (us-east-1b) → route table → Internet Gateway
  ├── Private Subnet: 10.0.10.0/24 (us-east-1a) → route table → NAT Gateway
  └── Private Subnet: 10.0.11.0/24 (us-east-1b) → route table → NAT Gateway
```

**EKS node placement:**
- Worker nodes typically in private subnets
- Public subnets for load balancers
- Bastion host or SSM for node access

### Security Groups vs NACLs — The Critical Difference

This is a common interview question. Understand it deeply.

| | Security Group | Network ACL |
|--|---------------|-------------|
| **Level** | Instance/ENI | Subnet |
| **Statefulness** | Stateful | Stateless |
| **Rules** | Allow only | Allow and Deny |
| **Return traffic** | Automatic | Must explicitly allow |
| **Order** | All rules evaluated | Rules evaluated in number order |

**Why statefulness matters:**
- Security Group: If you allow inbound port 443, the response packet is automatically allowed out. You do not need to write an outbound rule for the response.
- NACL: If you allow inbound port 443, you MUST also write an outbound rule allowing ephemeral ports (1024-65535) for the TCP response. Without this, TCP handshake fails on the return.

```bash
# Common troubleshooting: why can I connect from A to B but not B to A?
# Check: Security Group on B allows inbound from A's security group / CIDR
# Check: NACL on B's subnet allows both inbound and outbound

# AWS CLI
aws ec2 describe-security-groups --group-ids sg-xxxxxx
aws ec2 describe-network-acls --filters Name=vpc-id,Values=vpc-xxxxxx
```

### EKS Networking Modes

**VPC CNI (aws-node):** Default for EKS. Each Pod gets an IP from the node's ENI secondary IPs.
- Pods are first-class VPC citizens — no overlay
- Pros: no encapsulation overhead, cloud security groups apply at Pod level
- Cons: limited by ENI secondary IP capacity per instance type

**Instance limits:**
```
c5.large: 3 ENIs × 10 secondary IPs - 1 (node) = 29 Pod IPs max
c5.xlarge: 4 ENIs × 15 secondary IPs - 1 = 59 Pod IPs max
c5.18xlarge: 15 ENIs × 50 secondary IPs - 1 = 749 Pod IPs max
```

**With Prefix Delegation (EKS 1.28+):** Each ENI gets /28 prefix (16 IPs) instead of individual IPs, significantly increasing Pod density.

```bash
# Check ENI and IP allocation on EKS nodes
kubectl describe node <node> | grep "Capacity\|Allocatable" -A 10
# Look for max-pods capacity

# Check VPC CNI plugin configuration
kubectl describe daemonset aws-node -n kube-system
```

### EKS Load Balancers

**Application Load Balancer (ALB) with AWS Load Balancer Controller:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip   # route to Pod IPs (instance targets skip kube-proxy)
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

**`target-type: ip` vs `target-type: instance`:**
- `instance`: ALB routes to NodePort on any node, then kube-proxy routes to Pod. Double hop.
- `ip`: ALB routes directly to Pod IP. Requires VPC CNI. More efficient.

---

## Part 3: Cross-Cutting Concepts

### Load Balancer Health Checks vs Kubernetes Readiness

A critical failure mode: cloud LB reports healthy while users experience errors.

**How it happens:**
1. Cloud LB health checks `GET /healthz` → returns 200 → node is "healthy"
2. Actual request `GET /api/v1/orders` hits a Pod whose database connection is broken
3. Pod returns 500 — but the health check path doesn't test the database

**Fix:** Make health checks realistic.

```yaml
# Kubernetes readiness probe that checks actual dependencies
readinessProbe:
  httpGet:
    path: /ready    # endpoint that checks DB connection, cache, etc.
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3

# The /ready endpoint in your app:
# → Connect to database: SELECT 1
# → Check cache connection
# → Check upstream dependencies
# → Return 200 if all OK, 503 if any critical dependency is down
```

**Why "/healthz" is wrong for readiness:** Liveness checks `healthz` to know if the container is alive. Readiness checks a deeper path to know if it should receive traffic. They serve different purposes.

### Tracing a Packet from Internet to Pod

Full path for a GKE external HTTPS request:

```
1. Client resolves api.example.com → GCP Anycast IP (Global LB VIP)
2. Client connects to nearest GCP edge POP (BGP Anycast routing)
3. GCP terminates TLS (SSL policy at LB layer)
4. LB evaluates host/path rules → selects backend (NEG or Instance Group)
5. LB health-checks backend — uses /healthz or custom path
6. LB forwards to backend Pod IP (NEG mode) or Node:Port (IG mode)
   - NEG mode: direct to Pod IP (native routing, no kube-proxy)
   - IG mode: arrives at node, kube-proxy DNAT to Pod IP
7. GCP VPC firewall rules evaluated on the node
8. If NEG: packet arrives at Pod eth0 via veth
   If IG: kube-proxy iptables DNAT, then packet reaches Pod
9. Pod processes request and responds
```

**Where things can break at each step:**
- Step 3: TLS cert expired on LB
- Step 5: Health check path returns 500 (app broken but at different path)
- Step 7: Firewall rule missing — common when cluster is recreated without recreating fw rules
- Step 8 (IG mode): kube-proxy hasn't updated iptables yet (endpointSlice lag)

### Private vs Public Clusters

**Public cluster:** API server has a public IP. Worker nodes have external IPs (or NAT).

**Private cluster:** API server only reachable from within VPC (or via peering). Worker nodes have only internal IPs.

```bash
# GKE private cluster: nodes have no external IP
gcloud container clusters describe my-cluster \
  --format='value(privateClusterConfig.enablePrivateNodes)'

# Access kubectl from a bastion host inside the VPC:
gcloud container clusters get-credentials my-cluster \
  --internal-ip --region us-central1
```

**SRE concern with private clusters:**
- How do CI/CD pipelines reach the API server? (Peering, VPN, or Cloud Shell tunnel)
- How do worker nodes pull images from Docker Hub? (Cloud NAT or private image registry)
- How do alerts reach external systems? (Egress via NAT or VPN)

---

## Part 4: Interview Questions and Strong Answers

### Q: "Explain the difference between a Security Group and a Network ACL and when each breaks things differently."

"Security Groups are stateful and operate at the instance/ENI level. When you allow inbound port 443, the return traffic is automatically allowed — no rule needed. Security Groups are your primary traffic control tool for application access.

NACLs are stateless and operate at the subnet level. They need explicit rules for both directions. If you allow inbound TCP port 443 but forget to allow outbound ephemeral ports (1024-65535), the TCP handshake succeeds but the response is dropped by the NACL. This manifests as connections that appear to establish but then hang with no data.

The operationally important difference: Security Group misconfiguration fails fast (connection refused or timeout before connecting). NACL misconfiguration can pass the TCP handshake and then silently drop data packets — much harder to diagnose because the connection appears established.

Debugging tool: VPC flow logs. They show accept/reject decisions at the VPC level and identify which layer dropped the packet."

---

### Q: "A GKE service has healthy pods but external clients occasionally get 502 errors."

"502 from a GCP load balancer means the LB reached the backend but got a bad response or the backend closed the connection unexpectedly.

I would check in this order:

First: Is the health check passing for backends that are actually healthy? Check the LB backend service health in Cloud Console or:
```bash
gcloud compute backend-services get-health my-backend-service --global
```
If some backends are UNHEALTHY while the pods are Running: the LB health check path doesn't match actual pod health.

Second: Are there connection draining issues? During pod termination (rolling update), the LB might still route to a terminating pod. Fix: add `preStop: sleep 15` to give LB time to drain connections before pod terminates.

Third: Are there timeout mismatches? GCP LB has a 30-second backend timeout by default. If your app takes >30s for any request, LB will 502 before the app responds.

Fourth: Check pod logs for the requests that resulted in 502. GCP access logs show backend response times — correlate to pod logs."

---

## Points to Remember

- GCP firewall rules are stateful, network-tag based; AWS Security Groups are stateful, per-ENI
- AWS NACLs are stateless — must explicitly allow return traffic (ephemeral ports 1024-65535)
- VPC-native GKE / EKS with VPC CNI: Pods get VPC IPs, no overlay, cloud firewall applies at Pod level
- NEG (GCP) / `target-type: ip` (AWS ALB): LB routes directly to Pod, no double-hop through kube-proxy
- Health check path shallowness causes "LB healthy, users unhappy" — use deep readiness probes
- Cloud NAT required for Pods to reach internet if nodes are private
- Private clusters: API server not reachable externally — CI/CD needs VPN/peering/tunnel

## What to Study Next

- [06-kubernetes-networking-deep-dive.md](./06-kubernetes-networking-deep-dive.md) — Kubernetes-side networking details
- [01-networking-fundamentals.md](./01-networking-fundamentals.md) — TCP/IP underpinning
- [nebius/02-kubernetes-cilium-production.md](../nebius/02-kubernetes-cilium-production.md) — Cilium as the CNI
