# Foundations: Cloud Networking And Kubernetes Networking Zero To Hero

Cloud networking and Kubernetes networking are separate layers that must work together. Most production networking incidents happen at the boundary between them: cloud load balancers, VPC routes, firewalls/security groups, Pod IPs, Services, CNIs, NAT, and DNS.

This guide is designed as a complete path:

- Beginner: VPCs, subnets, routes, firewalls, load balancers, Pod networks
- Intermediate: AWS/EKS, GCP/GKE, NAT, private clusters, ingress, health checks
- Advanced: direct Pod routing, NEGs, ALB target modes, pod IP exhaustion, egress control, flow logs
- SRE Level: debug 502s, blocked health checks, failed egress, one-node failures, cloud/K8s mismatch
- Interview Level: explain packet paths clearly across cloud and cluster layers

---

# Part 1: Mental Model — Two Networks, One Request

When Kubernetes runs in the cloud, two networks cooperate:

| Layer | Owns | Examples |
|---|---|---|
| Cloud network | node connectivity and external traffic | VPC, subnets, route tables, firewalls, load balancers, NAT |
| Kubernetes network | Pod and Service connectivity | CNI, Pod IPs, ClusterIP, Ingress, NetworkPolicy, kube-proxy/eBPF |

Request path example:

```text
Internet
 -> Cloud DNS / Load Balancer
 -> VPC firewall / security group
 -> Node or Pod IP
 -> Kubernetes Service / datapath
 -> Pod
```

Each layer can drop or misroute traffic independently.

---

# Part 2: Memory Palace — Cloud + Kubernetes As City Roads

| Concept | City analogy | Production meaning |
|---|---|---|
| VPC | city road network | private cloud network |
| Subnet | district | address range in zone/region |
| Route table | road signs | next-hop decisions |
| Internet Gateway | highway entrance | internet path |
| NAT Gateway | outbound toll booth | private outbound access |
| Firewall / SG | security checkpoint | traffic permission |
| Load Balancer | traffic dispatcher | routes external/internal traffic |
| Node | building | VM running kubelet |
| Pod IP | apartment address | workload network identity |
| Service | public phone number | stable access to Pods |
| CNI | local road crew | implements Pod networking |
| NetworkPolicy | neighborhood access rule | cluster traffic control |

---

# Part 3: Core Cloud Networking Basics

## VPC

A private network boundary in a cloud provider.

## Subnet

A smaller IP range inside a VPC. Usually tied to an AZ or region depending on cloud.

## Route Table

Decides where packets go next.

## Firewall / Security Group

Controls whether traffic is allowed.

## NAT

Lets private workloads initiate outbound connections without being directly reachable from the internet.

---

# Part 4: AWS/EKS Networking

AWS VPCs are regional. Subnets are AZ-scoped.

Typical EKS layout:

```text
VPC
  public subnets  -> internet-facing load balancers, NAT gateways
  private subnets -> EKS worker nodes
  database subnets -> RDS/private data layer
```

EKS usually uses AWS VPC CNI.

Important behavior:

- Pods receive VPC IPs
- Pod density depends on ENI/IP capacity
- Security groups can be used at node or Pod level depending on configuration
- load balancers integrate through AWS Load Balancer Controller

---

# Part 5: Security Groups vs NACLs

| Feature | Security Group | NACL |
|---|---|---|
| Scope | ENI/resource | subnet |
| State | stateful | stateless |
| Rules | allow only | allow and deny |
| Return traffic | automatic | must be allowed |
| Typical use | primary access control | subnet guardrail |

If NACLs block ephemeral return ports, connections may appear strange or intermittent.

Debug:

```bash
aws ec2 describe-security-groups
aws ec2 describe-network-acls
aws ec2 describe-route-tables
```

---

# Part 6: EKS Pod IP Exhaustion

With AWS VPC CNI, Pods consume VPC IPs.

Symptoms:

- Pods stuck Pending or ContainerCreating
- CNI allocation errors
- nodes show capacity but cannot assign Pod IPs

Check:

```bash
kubectl describe node NODE
kubectl logs -n kube-system ds/aws-node
kubectl get pods -A -o wide
```

Fix options:

- prefix delegation
- larger instance types
- more subnets/IP space
- custom networking
- Karpenter/node scaling

---

# Part 7: AWS Load Balancer Controller

Ingress path:

```text
Route53 -> ALB -> target group -> Pod IP or NodePort -> Pod
```

Target modes:

| Mode | Meaning | Tradeoff |
|---|---|---|
| instance | ALB targets node NodePort | extra hop through node/kube-proxy |
| ip | ALB targets Pod IP directly | efficient, needs VPC CNI/IP routability |

Common annotations:

```yaml
alb.ingress.kubernetes.io/scheme: internet-facing
alb.ingress.kubernetes.io/target-type: ip
```

---

# Part 8: GCP/GKE Networking

GCP VPCs are global. Subnets are regional.

GKE VPC-native clusters use secondary IP ranges:

- node IP range
- Pod IP range
- Service IP range

GKE load balancing may use NEGs.

NEG means Network Endpoint Group: the cloud load balancer can target Pod IPs directly.

Benefits:

- per-Pod health checking
- no NodePort double hop
- better load distribution

---

# Part 9: Private Clusters

Private clusters reduce public exposure.

Concerns:

- how does CI/CD reach the API server?
- how do nodes pull images?
- how do Pods reach external APIs?
- how do alerts/webhooks leave the cluster?

Solutions:

- VPN/peering/Direct Connect/Interconnect
- NAT gateway or Cloud NAT
- private registries
- VPC endpoints / Private Service Connect / PrivateLink
- bastion or SSM/IAP access patterns

---

# Part 10: Kubernetes Ingress Across Cloud Boundaries

Ingress is Kubernetes intent. Cloud controllers translate it into cloud load balancers.

Flow:

```text
Ingress object -> cloud controller -> cloud LB -> target group/backend -> Service/Pod
```

Failures can happen in either control plane:

- Kubernetes object invalid
- controller lacks IAM/RBAC
- cloud quota exceeded
- subnet tags missing
- health check path wrong
- Service has no endpoints

---

# Part 11: Health Checks And Readiness

Cloud LB health checks and Kubernetes readiness must agree.

Bad pattern:

```text
LB checks /healthz returns 200
real API dependency is broken
users get 500
```

Better:

- liveness: process alive
- readiness: safe to receive traffic
- startup: app initialized
- LB health path should align with traffic readiness where appropriate

During shutdown, use graceful termination and connection draining.

---

# Part 12: Egress Design

Pod egress path:

```text
Pod -> node/CNI datapath -> VPC route -> NAT/VPC endpoint/firewall -> external service
```

Common egress failures:

- NetworkPolicy blocks DNS or HTTPS
- NAT port exhaustion
- missing route table entry
- firewall/security group blocks outbound
- external service allowlist expects NAT IP
- private node lacks NAT or endpoint

Monitor NAT connection counts, flow logs, and rejected connections.

---

# Part 13: DNS Across Layers

DNS can involve:

- CoreDNS inside cluster
- cloud private DNS zones
- public DNS
- search domains
- upstream resolvers

Debug:

```bash
kubectl exec POD -- cat /etc/resolv.conf
kubectl exec POD -- nslookup SERVICE.NAMESPACE.svc.cluster.local
kubectl logs -n kube-system deploy/coredns
```

Cloud DNS failures and Kubernetes DNS failures look similar to applications. Separate them with targeted tests.

---

# Part 14: NetworkPolicy vs Cloud Firewall

NetworkPolicy controls Pod-level traffic inside the cluster.

Cloud firewall/security groups control VPC/resource-level traffic.

A connection may require both to allow it.

Example:

```text
Cloud SG allows node traffic
NetworkPolicy blocks Pod egress
Result: app still cannot connect
```

Or:

```text
NetworkPolicy allows egress
Cloud firewall blocks route to DB
Result: app still cannot connect
```

---

# Part 15: Observability Tools

Use the right evidence for each layer.

| Layer | Tools |
|---|---|
| Pod | curl, nslookup, ip route, ss |
| Kubernetes | kubectl describe, events, EndpointSlice, CNI logs |
| Node | iptables, ip route, tcpdump, conntrack, journalctl |
| Cloud | flow logs, LB target health, route tables, firewall logs |
| eBPF/Cilium | Hubble, cilium endpoint/service/policy commands |

---

# Part 16: Troubleshooting By Symptom

## External Users Get 502

Check:

- LB target/backend health
- Ingress rules
- Service endpoints
- readiness probe
- app logs
- connection draining

## Pods Cannot Reach Internet

Check:

- DNS
- NetworkPolicy egress
- route table
- NAT gateway/Cloud NAT
- VPC endpoints
- external allowlist

## Only One Node Has Failures

Check:

- CNI pod on that node
- node routes
- conntrack table
- security group/ENI state
- kubelet events

## Service Works By Pod IP But Not Service Name

Check:

- CoreDNS
- Service object
- EndpointSlice
- kube-proxy/eBPF datapath

## Cloud LB Healthy But Users See Errors

Check:

- health check shallowness
- app dependency health
- real user path vs health path
- target group distribution

---

# Part 17: Real Incident Stories

## Custom Firewall Blocked Health Checks

Symptoms:

- cloud LB marks targets unhealthy
- Pods are Running and Ready

Fix:

- allow cloud health check ranges
- validate target health after change

## EKS Pods Could Not Schedule

Cause:

- no available Pod IPs despite node CPU/memory availability

Fix:

- prefix delegation
- expand subnet CIDRs
- adjust instance families

## Private Cluster CI/CD Broke

Cause:

- pipeline runner could not reach private API server

Fix:

- private runner network path
- VPN/peering
- GitOps controller inside cluster

## External API Calls Failed After Egress Change

Cause:

- NAT IP changed but external vendor allowlist did not

Fix:

- stable egress IPs
- change management with external dependency owners

---

# Part 18: Command Interpretation Table

| Command/tool | What it answers | Bad signs |
|---|---|---|
| `kubectl get endpointslice` | are there ready backends? | empty endpoints |
| `kubectl describe ingress` | controller/LB events | invalid annotation, no address |
| `kubectl logs CNI` | Pod networking health | IP allocation errors |
| `aws ec2 describe-route-tables` | AWS next hops | missing NAT/IGW route |
| `gcloud compute firewall-rules list` | GCP firewall policy | missing health check allow |
| VPC Flow Logs | accept/reject evidence | rejects on expected path |
| LB target health | backend health | unhealthy or draining targets |
| `tcpdump` | packet truth | SYN no SYN-ACK, resets |

---

# Part 19: Labs

## Beginner

- draw traffic path from internet to Pod
- inspect Service, Ingress, EndpointSlice
- test DNS from inside Pod

## Intermediate

- break Service selector and restore it
- simulate blocked egress with NetworkPolicy
- inspect cloud LB target health
- compare Pod IP vs Service access

## Advanced

- debug EKS pod IP exhaustion scenario
- inspect VPC flow logs for rejected traffic
- test private cluster API access path
- compare ALB instance vs IP target mode
- design stable egress IP for vendor allowlist

---

# Part 20: Interview Questions

- What is the difference between VPC networking and Kubernetes networking?
- How does traffic reach a Pod from the internet?
- Security group vs NACL?
- Why can a cloud LB be healthy while users see errors?
- What causes EKS pod IP exhaustion?
- What is the difference between ALB target-type instance and ip?
- How would you debug Pods unable to reach the internet?
- How do private clusters affect CI/CD?

---

# Part 21: Senior Answer Shape

> I separate cloud networking from Kubernetes networking first. For an external request, I trace DNS, cloud load balancer, firewall/security group, node or Pod target, Service/EndpointSlice, CNI datapath, and application readiness. If Pod IP works but Service fails, I focus on Kubernetes Service/datapath. If traffic never reaches the node or target, I focus on cloud routes, firewalls, health checks, and load balancer target health. I always verify with flow logs, events, endpoint state, and packet-level evidence instead of guessing.

---

# Recall Prompts

- Why are there two networking layers in cloud Kubernetes?
- Why do private clusters require special CI/CD design?
- Why can Pod CPU/memory be available but Pod IPs exhausted?
- Why should health checks align with readiness?
- Why do flow logs help when Kubernetes events look clean?
