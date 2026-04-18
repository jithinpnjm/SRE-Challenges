# Kubernetes Networking Deep Dive

> If you can explain the packet path, you can debug the packet path. Most Kubernetes networking issues are diagnosed by reasoning about which hop in the path is failing — not by guessing.

---

## What Is Kubernetes Networking?

Kubernetes networking is a set of abstractions that give every Pod its own IP address and allow Pods to communicate regardless of which node they run on — as if they were all on the same flat network.

**The core requirements (Kubernetes networking model):**
1. Every Pod gets its own IP address
2. Pods on any node can communicate with any other Pod without NAT
3. Agents on a node (kubelet, etc.) can communicate with all Pods on that node
4. Pods see their own IP the same way the outside world sees it (no NAT for Pod IPs within the cluster)

These are requirements on the CNI plugin. How they are implemented varies by CNI (Calico, Cilium, Flannel, etc.).

---

## Mental Model

For any networking question, ask five questions in order:
1. What type of traffic? (Pod→Pod, Pod→Service, External→Service, Pod→External)
2. Where does name resolution happen? (CoreDNS, external DNS, `/etc/hosts`)
3. Where is endpoint selection decided? (eBPF map, iptables rule, load balancer)
4. Where is policy enforced? (NetworkPolicy, iptables, eBPF, security group)
5. Where is state tracked? (conntrack, eBPF map, route table)

---

## Part 1: Pod Networking — How It Actually Works

### The veth Pair

Every Pod is connected to the node network via a **virtual Ethernet (veth) pair** — two virtual network interfaces connected like a cable:
- One end (`eth0`) lives inside the Pod's network namespace
- The other end (`vethXXXXXX`) lives in the node's root network namespace

```
Pod network namespace          Node (root) network namespace
┌─────────────────────┐        ┌──────────────────────────────┐
│  eth0 (10.1.2.3)    │◄──────►│  veth3a4b5c                  │
│  ip route:          │        │  (peer of Pod's eth0)        │
│  default via        │        │                              │
│  169.254.1.1        │        │  cilium_host / cbr0 / cni0   │
└─────────────────────┘        │  (bridge or eBPF hook)       │
                                └──────────────────────────────┘
```

**How a packet leaves a Pod:**
1. App sends packet to `10.1.2.5` (another Pod)
2. Packet exits via `eth0` into the veth pair
3. Packet appears on `vethXXXXXX` in the node network namespace
4. Node routes packet — either locally or out via the physical NIC toward the destination node

### Pod-to-Pod: Same Node

```
Pod A (10.1.2.3)                Pod B (10.1.2.5)
   eth0                            eth0
    │ veth pair                     │ veth pair
    │                               │
    └──────── node bridge / eBPF ───┘
              (stays on same node, no physical NIC)
```

**How it works:**
- With a bridge CNI (Flannel, classic Calico): both veth ends connect to a Linux bridge (`cbr0` or `cni0`). Packet is bridged locally.
- With Cilium: eBPF program on the veth intercepts the packet and redirects to the destination veth directly. Faster — no bridge traversal.

**Failure modes:**
- CNI plugin failed to set up veth pair properly
- eBPF maps out of sync (Cilium endpoint not present for new Pod)
- `ip route` on node has no route for Pod subnet

### Pod-to-Pod: Cross-Node

```
Node 1                           Node 2
Pod A (10.1.2.3)                 Pod B (10.1.3.5)
  eth0                              eth0
    │                                 │
  veth                              veth
    │                                 │
  Node 1 eth0 ───── fabric ─────── Node 2 eth0
  (overlay or native routing)
```

**Two approaches:**

**Overlay (VXLAN/Geneve):**
- Pod packet is encapsulated in a UDP packet with source/dest node IPs
- Node 1's CNI encapsulates, sends to Node 2
- Node 2's CNI decapsulates, delivers to Pod B
- Overhead: 50–100 bytes per packet, slight CPU cost for encap/decap
- Works in any network where nodes can reach each other (VLANs, clouds)

**Native routing:**
- Pod CIDR routes are added to the node's routing table (and to the network fabric)
- Packets route directly using Pod IPs — no encapsulation overhead
- Requires network fabric to know Pod routes (GKE, EKS use this with VPC-native routing)
- Cilium in native routing mode: no overhead, higher throughput

```bash
# Check routes on a Kubernetes node
ip route show
# Example Cilium native routing output:
# 10.1.2.0/24 via 192.168.1.10 dev eth0  ← route to another node's Pod subnet
# 10.1.3.0/24 via 192.168.1.11 dev eth0
# local 10.1.1.0/24 dev cilium_host       ← this node's Pod subnet
```

---

## Part 2: Services — The Virtual IP Layer

### What Is a Service?

A Service is a stable virtual IP (ClusterIP) that load balances to a set of Pod backends. No packet is ever delivered to the ClusterIP itself — it is always translated to a backend Pod IP.

**Why Services exist:**
- Pod IPs are ephemeral (change on every restart)
- Services provide a stable DNS name and IP
- Services provide load balancing across multiple Pod replicas

### Service Types

| Type | How It Works | When to Use |
|------|-------------|-------------|
| `ClusterIP` | VIP accessible only within cluster | Internal service-to-service |
| `NodePort` | Exposes port on every node | Dev/test, or when no cloud LB available |
| `LoadBalancer` | Creates cloud load balancer | Production external access |
| `ExternalName` | DNS CNAME to external name | Migrate or alias external services |
| `Headless` | No VIP, returns Pod IPs directly | Stateful sets, direct Pod access, gRPC |

### How Service Routing Works (iptables)

When `kube-proxy` is used (traditional):
```
# For service 10.96.100.100:8080 with 3 backends:
iptables-save | grep 10.96.100.100
# OUTPUT: -j KUBE-SVC-XXXXX (jump to service chain)
# KUBE-SVC: probabilistic rules (33% each backend)
#   -m statistic --mode random --probability 0.33333 -j KUBE-SEP-1
#   -m statistic --mode random --probability 0.5     -j KUBE-SEP-2
#   -j KUBE-SEP-3
# KUBE-SEP-1: -j DNAT --to-destination 10.1.2.3:8080
```

**Problem:** With 10,000 services, iptables chains are traversed linearly. O(n) lookup. This is why Cilium replaces iptables with eBPF hash maps (O(1) lookup).

### How Service Routing Works (Cilium eBPF)

```
App sends packet to ClusterIP 10.96.100.100:8080
    │
    ▼
Cilium eBPF program at TC hook on veth
    │ lookup in BPF_MAP_TYPE_HASH: key=VIP, value=backend_list
    │ select backend (round-robin or maglev hashing)
    ▼
DNAT: destination rewritten to 10.1.2.3:8080 (backend Pod IP)
    │
    ▼
Packet routed to backend Pod normally
```

```bash
# Inspect Cilium service maps
cilium service list
# Shows all services and their backend endpoints

cilium map get cilium_lb4_services  # IPv4 service map
cilium map get cilium_lb4_backends  # Backend IP/port entries

# Verify endpoint is in the map
cilium endpoint list | grep <pod-ip>
```

### EndpointSlices — The Backend Registry

EndpointSlices track which Pod IPs are ready to receive traffic for each Service.

```bash
# Check EndpointSlice for a service
kubectl get endpointslice -l kubernetes.io/service-name=my-service -o yaml

# Key fields:
# .endpoints[].addresses  → Pod IPs
# .endpoints[].conditions.ready  → must be true for traffic
# .endpoints[].targetRef  → which Pod this address belongs to
```

**Critical insight:** A pod can be `Running` but not in EndpointSlice if:
- Its readiness probe is failing
- The pod is being terminated (graceful shutdown period)
- The EndpointSlice controller hasn't caught up yet (brief lag after pod starts)

---

## Part 3: DNS in Kubernetes

### CoreDNS Architecture

Every Kubernetes cluster runs CoreDNS as the in-cluster DNS server:
```
Pod's /etc/resolv.conf:
  nameserver 10.96.0.10     ← CoreDNS ClusterIP
  search default.svc.cluster.local svc.cluster.local cluster.local
  options ndots:5
```

**DNS lookup flow for `my-service.default.svc.cluster.local`:**
1. Pod queries CoreDNS at `10.96.0.10`
2. CoreDNS looks up the Service in its in-cluster store
3. Returns the Service ClusterIP
4. Pod sends traffic to ClusterIP
5. Cilium/kube-proxy translates to backend Pod IP

### The ndots:5 Problem

`ndots:5` means: if a hostname has fewer than 5 dots, try appending search domains first.

```
Query for "api.example.com":
  1. try api.example.com.default.svc.cluster.local  ← extra DNS lookup
  2. try api.example.com.svc.cluster.local           ← extra DNS lookup
  3. try api.example.com.cluster.local               ← extra DNS lookup
  4. try api.example.com.                            ← succeeds (FQDN)
```

**Impact:** Every external DNS lookup makes 3–4 extra queries first. Under high request rate, this amplifies CoreDNS load significantly.

**Fix:**
```yaml
# In Pod spec — use FQDN to avoid search domain traversal
dnsConfig:
  options:
  - name: ndots
    value: "1"    # only try search domains if hostname has <1 dot

# Or always use FQDN with trailing dot
# curl http://api.example.com./endpoint
```

### Debugging DNS

```bash
# Check CoreDNS pods are healthy
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system deploy/coredns

# Test DNS from inside a Pod
kubectl exec -it debug-pod -- nslookup kubernetes.default
kubectl exec -it debug-pod -- nslookup my-service.default.svc.cluster.local
kubectl exec -it debug-pod -- cat /etc/resolv.conf

# Check DNS response time
kubectl exec -it debug-pod -- time nslookup my-service

# Check CoreDNS ConfigMap
kubectl get configmap -n kube-system coredns -o yaml
```

**Common CoreDNS failure modes:**
- CoreDNS pods OOMKilled: under high query load, increase memory limit
- DNS timeouts for external queries: check CoreDNS upstream resolvers
- Only some namespaces affected: check network policy — CoreDNS needs to receive queries from all namespaces
- SERVFAIL on external names: CoreDNS upstream (8.8.8.8 or your VPC resolver) is unreachable

---

## Part 4: NetworkPolicy — How Traffic Is Controlled

### What NetworkPolicy Does

By default, all Pod-to-Pod communication is allowed. A NetworkPolicy restricts this.

**Key rule:** When ANY NetworkPolicy targets a Pod, it becomes default-deny for the traffic types (Ingress/Egress) mentioned in that policy. Everything not explicitly allowed is dropped.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-server-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server    # this policy applies to pods with this label
  policyTypes:
  - Ingress              # controls inbound traffic
  - Egress               # controls outbound traffic
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend  # only pods with this label can send traffic
    - namespaceSelector:
        matchLabels:
          team: monitoring  # all pods in monitoring namespace
    ports:
    - port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - port: 5432
  - ports:               # allow DNS (critical — always include this)
    - port: 53
      protocol: UDP
    - port: 53
      protocol: TCP
```

### What Gets Silently Blocked

When you first apply NetworkPolicy, these often break:

| Traffic | Why It Breaks | Fix |
|---------|--------------|-----|
| DNS resolution | CoreDNS is on port 53, UDP | Add explicit egress rule for port 53 |
| Prometheus scraping | Prometheus Pod doesn't match ingress selector | Add Prometheus label to ingress allow |
| Health check from kubelet | kubelet uses node IP, not Pod identity | Add `namespaceSelector: {}` or node CIDR to ingress |
| Webhook calls | API server calls admission webhooks | Allow ingress from API server CIDR |
| External HTTPS | Blocked by default egress deny | Add egress rule for port 443 |

### Debugging NetworkPolicy with Hubble (Cilium)

```bash
# Real-time flow monitoring — see what is being dropped
hubble observe --type drop --follow

# Filter by specific pod
hubble observe --from-pod production/api-server --follow

# Filter by destination
hubble observe --to-pod production/database

# See L7 HTTP flows
hubble observe --protocol http --follow

# Count drops by source/destination pair
hubble observe --type drop --output json | \
  jq '.source.pod_name + " → " + .destination.pod_name' | sort | uniq -c | sort -rn
```

---

## Part 5: Ingress and External Access

### How Ingress Works

```
Internet → Cloud LB → Ingress Controller Pod → Service → Pod
```

**Ingress Controller** (nginx, Traefik, or cloud-native) is a Pod that:
- Watches Ingress objects
- Configures reverse proxy rules
- Receives traffic from the cloud load balancer
- Forwards to Service backends based on host/path rules

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

**Why "service is down" when the Ingress controller is healthy:**
- Ingress controller reaches the Service, but Service has no ready backends
- Health check on the Service backend is passing but is too shallow (checks `/healthz` not real path)
- TLS certificate expired on the Ingress controller
- Ingress controller config not updated (watch event dropped, controller restarted)

---

## Part 6: Common Failure Patterns and Debugging

### Decision Tree: Pod Cannot Reach Service

```
Step 1: Can Pod reach the Service ClusterIP directly?
    kubectl exec -it <pod> -- curl http://<ClusterIP>:<port>

    If NO:
      Step 2: Does the Service have ready endpoints?
        kubectl get endpointslice -l kubernetes.io/service-name=<svc>
        → If no endpoints: readiness probe failing, check pod logs/events
        → If endpoints exist: check kube-proxy/Cilium health

      Step 3: Is there a NetworkPolicy blocking?
        kubectl get networkpolicy -n <ns>
        hubble observe --from-pod <pod> --type drop  (Cilium)
```

### Decision Tree: Pod Cannot Resolve DNS

```
Step 1: Is /etc/resolv.conf correct?
    kubectl exec -it <pod> -- cat /etc/resolv.conf
    → Should show CoreDNS ClusterIP as nameserver

Step 2: Is CoreDNS healthy?
    kubectl get pods -n kube-system | grep coredns
    kubectl logs -n kube-system deploy/coredns

Step 3: Can the Pod reach CoreDNS?
    kubectl exec -it <pod> -- nc -u -z <CoreDNS-IP> 53
    → If blocked: NetworkPolicy blocking egress to CoreDNS

Step 4: Test resolution
    kubectl exec -it <pod> -- nslookup kubernetes.default
```

### Decision Tree: Intermittent Service Failures

```
Possible causes:
1. One Pod backend is unhealthy but readiness probe doesn't catch it
   → Add deeper readiness probe (test actual dependency, not just /ping)

2. Connection to a terminating Pod during rolling update
   → Add preStop hook with sleep (give LB time to drain)
   → Configure terminationGracePeriodSeconds > maxDrainSeconds

3. TCP connection reuse hitting dead backends
   → Configure client-side connection pool max lifetime
   → Use HTTP/1.1 with Connection: close for services under frequent roll

4. DNS TTL causing stale IPs
   → Check service's ClusterIP TTL (should be 30s default in CoreDNS)
```

---

## Points to Remember

- Every Pod gets a unique IP, reachable from any node without NAT
- Service ClusterIPs are virtual — never delivered to, always translated (iptables DNAT or Cilium eBPF)
- Ready endpoints = Pods where readiness probe passes + not terminating
- `ndots:5` amplifies external DNS queries — consider lowering to 1 for external-heavy workloads
- NetworkPolicy default-deny applies per traffic type (Ingress/Egress) when ANY policy targets a pod
- DNS port 53 must be explicitly allowed in NetworkPolicy egress rules — easy to forget
- Cilium uses eBPF maps for O(1) Service lookup vs iptables O(n) — significant at scale
- Overlay (VXLAN) has overhead — native routing is faster but requires fabric cooperation

## What to Study Next

- [11-cloud-networking-and-kubernetes-networking.md](./11-cloud-networking-and-kubernetes-networking.md) — cloud VPC + K8s networking combined
- [nebius/02-kubernetes-cilium-production.md](../nebius/02-kubernetes-cilium-production.md) — Cilium deep dive (Nebius-specific)
- [01-networking-fundamentals.md](./01-networking-fundamentals.md) — TCP/IP foundations that K8s networking builds on
