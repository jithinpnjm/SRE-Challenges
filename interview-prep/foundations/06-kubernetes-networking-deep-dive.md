# Foundations: Kubernetes Networking Deep Dive

This guide exists because many candidates can name Kubernetes objects but cannot narrate how packets actually reach a Pod.

## Mentor Mode

If you can explain the packet path, you can usually debug the packet path.

For any Kubernetes networking question, ask:

1. is traffic Pod to Pod, Pod to Service, external to Service, or Pod to external
2. where does name resolution happen
3. where is endpoint selection decided
4. where is policy enforced
5. where is state tracked

## Pod To Pod

Typical path:

1. process in Pod A opens socket
2. packet leaves Pod A network namespace
3. packet traverses node networking
4. if same-node, it may stay local
5. if cross-node, it uses overlay or routed path
6. packet enters Pod B namespace

Likely failure points:

- wrong Pod IP or route
- node dataplane issue
- CNI failure
- NetworkPolicy
- MTU problem on cross-node path

## Pod To Service

Typical path:

1. app resolves Service DNS name
2. Service VIP is selected
3. dataplane chooses a backend from ready endpoints
4. packet is translated or steered to backend Pod IP
5. backend Pod receives traffic

Important insight:

- running pods are not enough
- only ready endpoints should receive traffic

## External To Service

Typical path:

1. external client resolves public name
2. client reaches cloud load balancer or ingress
3. LB health and routing decide backend node or proxy
4. ingress or proxy forwards into cluster
5. Service and endpoints select backend Pod

Health can look good while users still fail if:

- health check path is too shallow
- one route is healthy but real path is not
- readiness does not reflect actual dependency health

## DNS In Kubernetes

What often surprises people:

- search domains can amplify lookups
- `ndots` can create extra DNS queries
- CoreDNS problems can look like generic app slowness
- only some namespaces or nodes may be affected

Useful commands:

```bash
kubectl get svc -n kube-system
kubectl logs -n kube-system deploy/coredns
kubectl exec -it <pod> -- cat /etc/resolv.conf
kubectl exec -it <pod> -- nslookup kubernetes.default
```

## NetworkPolicy Reality

Common misses:

- DNS
- metrics exporters
- tracing backends
- admission or webhook dependencies
- egress required for auth or secret retrieval

Senior habit:

- treat policy rollout like application rollout

## Dataplane Clues

If Pod IP works but Service VIP fails:

- suspect endpoint selection or dataplane translation

If some nodes work and some do not:

- suspect node-local dataplane or CNI skew

If only large responses fail:

- suspect MTU, fragmentation, or overlay overhead

If only new connections fail:

- suspect conntrack or listener pressure

## Senior Practice Drill

Explain these three packet paths without notes:

1. Pod to Pod on same node
2. Pod to Service across nodes
3. External client to Ingress to backend Pod
