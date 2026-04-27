# Kubernetes Networking Deep Dive

> If you can explain the packet path, you can debug the packet path. Most Kubernetes networking issues are diagnosed by reasoning about which hop in the path is failing, not by guessing.

Kubernetes networking becomes much easier when you imagine the cluster as a city.

---

## What This Foundation Must Help You Do

By the end of this guide, you should be able to:

- explain pod-to-pod, pod-to-service, ingress-to-service, and pod-to-external traffic
- reason about CNI, kube-proxy, eBPF, CoreDNS, EndpointSlices, Services, and NetworkPolicy together
- debug DNS, Service routing, ingress, and policy failures without random command hopping
- connect Kubernetes networking back to Linux networking fundamentals
- explain the packet path clearly in senior/staff interviews

---

## Memory Palace: Kubernetes Is A City Operations Center

Think of a Kubernetes cluster as a city.

| Kubernetes concept | City analogy | Production meaning |
|---|---|---|
| Cluster | City | Whole platform boundary |
| Node | Building | Worker host |
| Pod | Apartment | Smallest scheduled workload unit |
| Container | Person/process inside apartment | Isolated workload process |
| Pod IP | Apartment address | Direct workload address |
| Service | Public city phone number | Stable virtual access to changing pods |
| EndpointSlice | Phone-book list of real apartments | Ready backend registry |
| Ingress | City gate / reception entrance | External HTTP entry path |
| CoreDNS | City directory desk | Service name resolution |
| CNI | Road network | Pod connectivity implementation |
| kube-proxy / eBPF | Traffic dispatcher | Service-to-backend translation |
| NetworkPolicy | Neighborhood access rules | Pod traffic authorization |
| kubelet | Building manager | Keeps pods healthy on a node |
| Readiness probe | Open-for-visitors sign | Eligible to receive traffic |
| Liveness probe | Welfare check | Restart if stuck |

### Story: A Visitor Cannot Reach An Apartment

A visitor calls the city number for the API.

A junior operator says: “Kubernetes networking is broken.”

A senior operator asks:

1. Did the visitor find the city directory entry? DNS/CoreDNS.
2. Did the city number map to real apartments? Service and EndpointSlice.
3. Are the apartments open for visitors? Readiness.
4. Are the roads working? CNI / route / eBPF / iptables.
5. Is a neighborhood rule blocking entry? NetworkPolicy.
6. Is the city gate misrouting traffic? Ingress / load balancer.

Technical translation:

- A pod can be Running but not Ready.
- A Service can exist but have no endpoints.
- DNS can work while Service routing fails.
- Service routing can work while NetworkPolicy blocks traffic.
- Ingress can be healthy while backends are unavailable.

---

## Senior Mental Model

For any Kubernetes networking problem, ask five questions in order:

1. What type of traffic is failing?
   - Pod to Pod
   - Pod to Service
   - External to Ingress to Service
   - Pod to external dependency
2. Where does name resolution happen?
   - CoreDNS, external DNS, host resolver, `/etc/hosts`
3. Where is endpoint selection decided?
   - kube-proxy iptables/IPVS, Cilium eBPF map, cloud load balancer, ingress controller
4. Where is policy enforced?
   - NetworkPolicy, CNI, security groups, service mesh, proxy policy
5. Where is state tracked?
   - conntrack, eBPF maps, route tables, proxy connection pools

A staff-level answer names the traffic type, the decision points, and the first failing hop.

---

## Kubernetes Networking Requirements

Kubernetes expects:

1. Every Pod gets its own IP address.
2. Pods on any node can communicate with pods on any other node without NAT.
3. Node agents such as kubelet can communicate with pods on that node.
4. Pods see their own IP consistently.

The CNI plugin implements this. Calico, Cilium, Flannel, and cloud-native CNIs differ in how they build the roads.

---

## Fast Triage Flow

## 1. Classify The Traffic

| Failure | First places to check |
|---|---|
| Pod cannot resolve service | CoreDNS, resolv.conf, NetworkPolicy to DNS |
| Pod cannot reach Service | Service, EndpointSlice, kube-proxy/eBPF, policy |
| External traffic fails | DNS, LB, Ingress, Service, endpoints |
| One node fails | CNI agent, routes, node firewall, kubelet, conntrack |
| Only some pods fail | labels, readiness, endpoint selection, policy |
| New connections fail | conntrack, backlog, NAT, proxy pool, eBPF state |

## 2. Inspect The City Directory

```bash
kubectl get svc
kubectl get endpointslice
kubectl get pods -o wide
kubectl exec -it <pod> -- cat /etc/resolv.conf
kubectl exec -it <pod> -- nslookup kubernetes.default
```

What this tells you:

- whether DNS points at CoreDNS
- whether Services exist
- whether ready endpoints exist
- whether pod IPs and nodes line up with expectations

## 3. Inspect Traffic Dispatch

```bash
kubectl describe svc <service>
kubectl get endpointslice -l kubernetes.io/service-name=<service> -o yaml
kubectl get pods -l app=<app> -o wide
```

If using Cilium:

```bash
cilium service list
cilium endpoint list
hubble observe --follow
```

If using kube-proxy/iptables:

```bash
iptables-save | grep KUBE-SVC
```

## 4. Inspect Policy And Drops

```bash
kubectl get networkpolicy -A
kubectl describe networkpolicy -n <namespace>
```

With Cilium/Hubble:

```bash
hubble observe --type drop --follow
hubble observe --from-pod <namespace>/<pod> --follow
```

## 5. Inspect Node-Level Networking

```bash
ip addr
ip route
ip neigh
ss -s
conntrack -S
```

Kubernetes networking still runs on Linux.

---

## Pod Networking: Apartments And Roads

Every pod gets a network namespace and usually a veth pair.

```text
Pod namespace                    Node namespace
+-------------------+            +----------------------+
| eth0: Pod IP      | <------->  | veth peer            |
| default route     |            | bridge/eBPF/CNI path |
+-------------------+            +----------------------+
```

Same-node pod traffic may stay inside the node. Cross-node traffic must traverse the node network using overlay or native routing.

## Same-Node Pod To Pod

The packet often moves:

1. Pod A process sends packet.
2. Packet leaves Pod A eth0.
3. CNI/bridge/eBPF path dispatches it locally.
4. Packet enters Pod B eth0.

Common failures:

- pod interface not created
- CNI agent broken
- eBPF endpoint state stale
- NetworkPolicy drop

## Cross-Node Pod To Pod

Two common road-building models:

| Model | City analogy | Meaning |
|---|---|---|
| Overlay VXLAN/Geneve | Delivery truck uses tunnel road | Pod packet encapsulated between nodes |
| Native routing | City roads know every apartment district | Fabric routes pod CIDRs directly |

Overlay works broadly but adds overhead. Native routing is efficient but requires the underlying network to understand pod routes.

---

## Services: Public Phone Numbers For Moving Apartments

A Service gives a stable virtual IP/name for pods that come and go.

Important rule:

> Traffic is not delivered to the ClusterIP as a real endpoint. It is translated to a ready backend pod.

## Service Types

| Type | City analogy | Use |
|---|---|---|
| ClusterIP | Internal city phone number | Internal service-to-service |
| NodePort | Every building exposes a desk number | Basic external access / dev |
| LoadBalancer | Public city switchboard | Cloud production entry |
| ExternalName | Directory alias | External service alias |
| Headless | Direct apartment list | Stateful workloads / direct discovery |

## EndpointSlices: The Real Apartment List

EndpointSlices answer:

> Which pods are actually ready to receive traffic?

```bash
kubectl get endpointslice -l kubernetes.io/service-name=<service> -o yaml
```

A pod can be Running but missing from EndpointSlice if:

- readiness probe fails
- pod is terminating
- labels do not match Service selector
- endpoint controller has not caught up

This is one of the most important Kubernetes networking debugging facts.

---

## DNS: The City Directory Desk

CoreDNS maps service names to ClusterIPs.

Example flow:

1. Pod asks CoreDNS for `api.default.svc.cluster.local`.
2. CoreDNS returns Service ClusterIP.
3. Pod sends traffic to ClusterIP.
4. kube-proxy/eBPF translates to backend pod IP.

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system deploy/coredns
kubectl exec -it <pod> -- nslookup kubernetes.default
kubectl exec -it <pod> -- cat /etc/resolv.conf
```

## The `ndots:5` Trap

Kubernetes pods often use `ndots:5`. Short external names may trigger multiple internal search-domain attempts before the final query.

Symptoms:

- external calls look slow
- CoreDNS query volume is high
- DNS latency affects app p95/p99

Mitigations:

- use fully qualified names with a trailing dot when appropriate
- tune `dnsConfig` for external-heavy workloads
- cache DNS responsibly

---

## NetworkPolicy: Neighborhood Access Rules

By default, pod-to-pod communication is usually open. Once a NetworkPolicy selects a pod for ingress or egress, that direction becomes restricted to allowed rules.

Common mistake:

> Adding egress default-deny and forgetting DNS.

Always consider allowing DNS when needed:

```yaml
egress:
- ports:
  - port: 53
    protocol: UDP
  - port: 53
    protocol: TCP
```

Common blocked traffic:

- DNS to CoreDNS
- Prometheus scraping
- ingress controller to backend pods
- API server to admission webhooks
- app to external HTTPS dependencies

---

## Ingress: The City Gate

External HTTP traffic commonly flows like this:

```text
Internet -> Cloud Load Balancer -> Ingress Controller -> Service -> Ready Pod
```

If ingress fails, inspect each checkpoint:

```bash
kubectl get ingress -A
kubectl describe ingress <name>
kubectl logs -n <ingress-namespace> deploy/<ingress-controller>
kubectl get svc <service>
kubectl get endpointslice -l kubernetes.io/service-name=<service>
```

Common failures:

- DNS points to wrong load balancer
- TLS certificate expired or wrong SNI
- ingress rule host/path mismatch
- Service has no ready endpoints
- backend readiness too shallow
- NetworkPolicy blocks ingress controller to pod

---

## Real Incident Stories

## Scenario 1: Service Exists But No Traffic Reaches Pods

Wrong assumption: kube-proxy is broken.

Better path:

```bash
kubectl describe svc api
kubectl get endpointslice -l kubernetes.io/service-name=api
kubectl get pods -l app=api
kubectl describe pod <api-pod>
```

Likely causes:

- Service selector does not match pod labels
- readiness probe failing
- pods terminating

## Scenario 2: DNS Works In One Namespace But Not Another

Wrong assumption: CoreDNS is down.

Better path:

```bash
kubectl exec -n good-ns <pod> -- nslookup kubernetes.default
kubectl exec -n bad-ns <pod> -- nslookup kubernetes.default
kubectl get networkpolicy -n bad-ns
```

Likely cause:

- NetworkPolicy blocks egress to CoreDNS.

## Scenario 3: Only One Node Has Pod Connectivity Failures

Wrong assumption: application regression.

Better path:

```bash
kubectl get pods -o wide
kubectl describe node <node>
kubectl logs -n kube-system <cni-pod-on-node>
ip route
conntrack -S
```

Likely causes:

- CNI agent unhealthy on one node
- stale route/eBPF state
- conntrack pressure
- node-level firewall/routing issue

## Scenario 4: Ingress Returns 502

Wrong assumption: ingress controller is broken.

Better path:

```bash
kubectl describe ingress <ingress>
kubectl get svc <service>
kubectl get endpointslice -l kubernetes.io/service-name=<service>
kubectl logs -n <ingress-namespace> deploy/<controller>
```

Likely causes:

- no ready endpoints
- upstream connect failure
- wrong service port
- NetworkPolicy blocking controller to backend

---

## Command Interpretation Table

| Command | What it answers | Bad signs | Next step |
|---|---|---|---|
| `kubectl get pods -o wide` | Where are pods and IPs? | affected pods on one node | inspect node/CNI |
| `kubectl get svc` | Does stable service exist? | wrong port/type | describe Service |
| `kubectl get endpointslice` | Are ready backends registered? | empty endpoints | inspect selectors/readiness |
| `kubectl exec -- nslookup` | Does pod DNS work? | timeout/SERVFAIL | inspect CoreDNS/policy |
| `kubectl get networkpolicy -A` | Is policy active? | default-deny without DNS | inspect allow rules |
| `hubble observe --type drop` | What is being dropped? | policy/drop reasons | fix policy/path |
| `cilium service list` | eBPF service map state | missing backend | inspect endpoints/Cilium |
| `iptables-save | grep KUBE-SVC` | kube-proxy service rules | missing service chain | inspect kube-proxy |
| `conntrack -S` | State tracking health | drops/insert_failed | tune/reduce churn |

---

## Kubernetes To Linux Connection

Kubernetes networking is Linux networking with controllers around it.

- Pod interfaces are Linux interfaces.
- Service translation uses iptables/IPVS/eBPF.
- DNS is still DNS.
- NetworkPolicy becomes dataplane rules.
- Node problems become pod problems.
- conntrack exhaustion can break new pod connections.

If you cannot debug Linux routing, sockets, DNS, and policy, Kubernetes networking will feel random.

---

## Hands-On Drill

Create a simple debug path:

1. Deploy a client pod and an API pod.
2. Create a ClusterIP Service for the API.
3. Exec into the client pod.
4. Test DNS, Service, and direct pod IP.

Commands:

```bash
kubectl get pods -o wide
kubectl get svc
kubectl get endpointslice
kubectl exec -it <client-pod> -- nslookup <service>
kubectl exec -it <client-pod> -- curl -v http://<service>:<port>
kubectl exec -it <client-pod> -- curl -v http://<pod-ip>:<port>
```

Interpretation:

- DNS fails: inspect CoreDNS/resolv.conf/policy.
- Service fails but pod IP works: inspect Service/EndpointSlice/kube-proxy/eBPF.
- Both fail: inspect app listener, policy, CNI, or node path.

---

## Interview Answer Shape

If asked, “How would you debug a pod that cannot reach a Kubernetes Service?” a strong answer is:

> I would first classify whether this is DNS, Service translation, backend readiness, policy, or node networking. I would test DNS from inside the pod, then inspect the Service and EndpointSlice to confirm ready backends. If endpoints exist, I would compare direct pod IP access with ClusterIP access to separate backend health from Service translation. Then I would check NetworkPolicy and CNI dataplane signals such as Hubble, Cilium maps, kube-proxy rules, or conntrack depending on the cluster implementation.

---

## Recall Prompts

- In the city model, what is a Service?
- Why can a Running pod be absent from EndpointSlice?
- What does CoreDNS return for a normal ClusterIP Service?
- What breaks when NetworkPolicy blocks egress to port 53?
- How do you distinguish DNS failure from Service routing failure?
- Why can one bad node cause only some pods to fail?

---

## What To Study Next

- [Cloud networking and Kubernetes networking](./11-cloud-networking-and-kubernetes-networking.md)
- [Networking fundamentals](./01-networking-fundamentals.md)
- [Linux and Kubernetes foundations](./02-linux-kubernetes-foundations.md)
