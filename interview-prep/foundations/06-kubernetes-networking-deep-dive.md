# Foundations: Kubernetes Networking Zero To Hero

Kubernetes networking is where Linux networking, container networking, DNS, load balancing, policy, and cloud networking meet.

If you can explain the packet path, you can debug the packet path.

This guide is designed as a complete path:

- Beginner: Pod IPs, Services, DNS, Ingress
- Intermediate: CNI, EndpointSlices, kube-proxy, NetworkPolicy
- Advanced: eBPF, conntrack, overlays, native routing, MTU, SNAT, service meshes
- SRE Level: debug DNS failures, Service failures, ingress 502s, one-node connectivity bugs
- Interview Level: explain traffic paths without vague “CNI issue” answers

---

# Part 1: Memory Palace — Kubernetes Is A City

Think of a cluster as a city.

| Kubernetes networking concept | City analogy | Production meaning |
|---|---|---|
| Cluster | City | Whole platform network |
| Node | Building | Worker host |
| Pod | Apartment | Workload network namespace |
| Pod IP | Apartment address | Direct workload address |
| Service | Public phone number | Stable virtual access |
| EndpointSlice | Real apartment directory | Ready backend list |
| CoreDNS | City directory desk | Name resolution |
| CNI | Roads and intersections | Pod networking implementation |
| kube-proxy/eBPF | Traffic dispatcher | Service translation |
| Ingress | City gate | External HTTP entry |
| NetworkPolicy | Neighborhood access rules | Traffic authorization |
| Conntrack | Visitor logbook | Kernel connection tracking |

---

# Part 2: Kubernetes Networking Requirements

Kubernetes expects:

1. every Pod has its own IP
2. Pods can reach Pods across nodes
3. nodes can reach Pods
4. containers inside a Pod share localhost
5. Services provide stable access to changing Pods

The CNI plugin makes this real.

---

# Part 3: Pod Networking Basics

A Pod usually has its own Linux network namespace.

Containers in the same Pod share:

- IP address
- port space
- localhost
- network interfaces

This means two containers in the same Pod cannot both bind the same port.

```bash
kubectl get pods -o wide
kubectl exec -it POD -- ip addr
kubectl exec -it POD -- ip route
```

---

# Part 4: Same-Node Pod Traffic

Typical path:

```text
Pod A eth0 -> veth peer -> CNI datapath -> veth peer -> Pod B eth0
```

Failures may involve:

- veth missing
- bridge/eBPF state broken
- policy drop
- app not listening

---

# Part 5: Cross-Node Pod Traffic

Two major models:

| Model | Meaning | Tradeoff |
|---|---|---|
| Overlay | encapsulate Pod packets between nodes | easier setup, overhead/MTU concerns |
| Native routing | underlying network routes Pod CIDRs | efficient, needs network support |

Overlay examples:

- VXLAN
- Geneve

Native/eBPF examples:

- Cilium native routing
- cloud VPC CNI models

---

# Part 6: CNI

CNI is the interface Kubernetes uses to configure Pod networking.

CNI plugin responsibilities:

- create Pod interface
- assign IP
- set routes
- configure datapath
- apply policy if supported

Popular CNIs:

- Calico
- Cilium
- Flannel
- AWS VPC CNI
- Azure CNI
- GKE Dataplane

Debug:

```bash
kubectl get pods -n kube-system
kubectl logs -n kube-system -l k8s-app=cilium
kubectl logs -n kube-system -l k8s-app=calico-node
```

---

# Part 7: Services And EndpointSlices

Pods are temporary. Services are stable.

A Service selects ready Pods using labels.

```bash
kubectl get svc
kubectl describe svc api
kubectl get endpointslice -l kubernetes.io/service-name=api -o yaml
```

Important:

> A Service with no ready endpoints cannot send useful traffic.

Common reasons:

- selector mismatch
- readiness probe failing
- Pods terminating
- wrong namespace

---

# Part 8: kube-proxy, iptables, IPVS, eBPF

Service ClusterIP is usually virtual.

Traffic to ClusterIP is translated to a backend Pod.

Implementations:

| Implementation | How it works |
|---|---|
| iptables | NAT rules created by kube-proxy |
| IPVS | kernel load balancing tables |
| eBPF | programmable kernel datapath, often via Cilium |

Debug iptables:

```bash
iptables-save | grep KUBE-SVC
iptables-save | grep KUBE-SEP
```

Debug Cilium:

```bash
cilium service list
cilium endpoint list
hubble observe --follow
```

---

# Part 9: DNS And CoreDNS

CoreDNS resolves service names.

Example:

```text
api.default.svc.cluster.local -> Service ClusterIP
```

Commands:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system deploy/coredns
kubectl exec -it POD -- cat /etc/resolv.conf
kubectl exec -it POD -- nslookup kubernetes.default
```

Common DNS failures:

- CoreDNS down/overloaded
- NetworkPolicy blocks DNS
- bad search domains
- upstream DNS broken
- `ndots:5` causing extra queries

---

# Part 10: The ndots Trap

Pods often use `ndots:5`.

Short external names may trigger multiple cluster-domain lookups before external resolution.

Symptoms:

- external calls slow
- high CoreDNS QPS
- DNS latency in p95/p99

Mitigation:

- use fully qualified names when appropriate
- tune `dnsConfig`
- cache carefully

---

# Part 11: Ingress

Common external path:

```text
Internet -> Cloud Load Balancer -> Ingress Controller -> Service -> EndpointSlice -> Pod
```

Debug:

```bash
kubectl get ingress -A
kubectl describe ingress NAME
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller
kubectl get svc
kubectl get endpointslice
```

Common failures:

- DNS points to wrong LB
- certificate/SNI mismatch
- host/path rule mismatch
- Service port wrong
- no ready endpoints
- NetworkPolicy blocks ingress controller

---

# Part 12: NetworkPolicy

NetworkPolicy controls Pod traffic.

Default: traffic is usually allowed until policies select Pods.

Once a Pod is selected by ingress/egress policy, traffic in that direction must be explicitly allowed.

Common mistake:

> Egress default-deny without allowing DNS.

DNS allow example:

```yaml
egress:
- to:
  - namespaceSelector: {}
  ports:
  - port: 53
    protocol: UDP
  - port: 53
    protocol: TCP
```

---

# Part 13: Conntrack And New Connection Failures

Linux conntrack tracks flows for NAT and firewall state.

If exhausted, new connections may fail while old ones continue.

Debug:

```bash
conntrack -S
sysctl net.netfilter.nf_conntrack_max
ss -s
```

Symptoms:

- intermittent new connection failures
- DNS timeouts
- Service access flaky under load

---

# Part 14: MTU And Packet Loss

Overlay networks add encapsulation overhead.

If MTU is wrong:

- small packets work
- large packets hang or fragment/drop
- TLS/HTTP may appear flaky

Debug:

```bash
ping -M do -s 1472 TARGET
tracepath TARGET
```

---

# Part 15: Pod To External Traffic

Pod egress path may involve:

```text
Pod -> node datapath -> SNAT/NAT gateway -> firewall/security group -> external service
```

Common failures:

- egress NetworkPolicy
- cloud firewall/security group
- NAT port exhaustion
- DNS/upstream resolver
- external allowlist expects node IP/NAT IP

---

# Part 16: Service Mesh Layer

Service mesh adds sidecar or ambient datapath.

It can affect:

- mTLS
- retries
- timeouts
- circuit breaking
- routing
- telemetry

Debug question:

> Is this Kubernetes networking, application networking, or mesh policy?

---

# Part 17: Troubleshooting By Symptom

## Pod Cannot Resolve DNS

Check:

```bash
kubectl exec POD -- cat /etc/resolv.conf
kubectl exec POD -- nslookup kubernetes.default
kubectl logs -n kube-system deploy/coredns
kubectl get networkpolicy -A
```

## Pod Cannot Reach Service

Check:

```bash
kubectl get svc SERVICE
kubectl get endpointslice -l kubernetes.io/service-name=SERVICE
kubectl exec POD -- curl -v http://SERVICE:PORT
kubectl exec POD -- curl -v http://POD_IP:PORT
```

## Ingress Returns 502

Check:

```bash
kubectl describe ingress NAME
kubectl get svc SERVICE
kubectl get endpointslice -l kubernetes.io/service-name=SERVICE
kubectl logs -n INGRESS_NS deploy/CONTROLLER
```

## One Node Has Failures

Check:

```bash
kubectl get pods -o wide
kubectl describe node NODE
ip route
conntrack -S
journalctl -u kubelet -n 100
```

---

# Part 18: Command Interpretation Table

| Command | What it answers | Bad signs |
|---|---|---|
| `kubectl get pods -o wide` | where Pods run and their IPs | failures scoped to one node |
| `kubectl get svc` | service definition | wrong ports/type |
| `kubectl get endpointslice` | ready backends | empty endpoints |
| `nslookup` from Pod | DNS path | timeout/SERVFAIL |
| `curl Service` vs `curl PodIP` | service vs backend path | Service fails, PodIP works |
| `hubble observe` | Cilium flow/drop visibility | policy/drop reasons |
| `conntrack -S` | kernel flow tracking | drops/insert_failed |
| `tcpdump` | actual packets | SYN no reply, resets |

---

# Part 19: Real Incident Stories

## Service Has No Endpoints

Likely causes:

- label selector mismatch
- readiness failing
- wrong namespace

## DNS Fails Only In One Namespace

Likely cause:

- namespace NetworkPolicy blocks egress to CoreDNS

## New Connections Fail During Spike

Likely causes:

- conntrack exhaustion
- NAT exhaustion
- backend backlog saturation

## Ingress 502 After Deploy

Likely causes:

- readiness too shallow
- wrong targetPort
- app not listening
- backend policy blocked

---

# Part 20: Hands-On Labs

## Beginner

- create two Pods and curl Pod IP
- create ClusterIP Service
- resolve service DNS

## Intermediate

- break Service selector
- break readiness probe
- apply NetworkPolicy default deny
- expose through Ingress

## Advanced

- compare PodIP vs Service routing
- inspect iptables/eBPF path
- simulate DNS block
- test MTU behavior
- observe Cilium/Hubble drops

---

# Part 21: Interview Questions

- What happens when a Pod curls a ClusterIP Service?
- Why can DNS work but Service routing fail?
- Why can Service exist but have no endpoints?
- What does CNI do?
- How does NetworkPolicy affect DNS?
- Why do only new connections fail when conntrack is exhausted?
- How would you debug ingress 502?

---

# Part 22: Senior Answer Shape

> I would first classify the traffic path: Pod-to-Pod, Pod-to-Service, external-to-Ingress, or Pod-to-external. Then I would test DNS, endpoint selection, Service translation, policy enforcement, and node dataplane separately. If direct Pod IP works but Service fails, I focus on Service, EndpointSlice, kube-proxy/eBPF, or conntrack. If both fail, I inspect app listener, CNI, policy, and node-level networking.

---

# Recall Prompts

- What does CoreDNS return for a ClusterIP Service?
- Why can a Running Pod be absent from EndpointSlice?
- What is the difference between overlay and native routing?
- What does conntrack exhaustion look like?
- Why does MTU matter in overlay networking?
