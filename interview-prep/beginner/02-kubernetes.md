# Beginner: Kubernetes Fundamentals And Troubleshooting

These prompts target core concepts that senior candidates should answer clearly and quickly.

## Challenge 1: Explain The Control Plane

Prompt:

- explain what the API server, etcd, scheduler, controller manager, and kubelet each do
- explain what happens from `kubectl apply` to a running Pod
- explain where desired state lives and who reconciles it

## Challenge 2: Pod Starts But Never Receives Traffic

Scenario: A Deployment has healthy-looking Pods, but the Service sends no traffic to them.

Your task:

- list the most likely causes in order
- explain how labels, selectors, readiness probes, endpoints, and NetworkPolicy can affect this
- name the exact `kubectl` commands you would run

## Challenge 3: CrashLoopBackOff

Scenario: A new release enters `CrashLoopBackOff` after deployment.

Your task:

- describe your first response
- explain how you distinguish app crash, bad config, probe failure, OOM kill, bad entrypoint, and missing dependency
- explain what the Pod events and previous container logs tell you

## Challenge 4: Requests, Limits, And QoS

Prompt:

- explain requests versus limits
- explain Guaranteed, Burstable, and BestEffort QoS
- explain how these affect scheduling and eviction during node pressure
- explain one common mistake teams make with CPU limits and one with memory limits

## Challenge 5: Service Discovery Basics

Prompt:

- explain how a Pod reaches another service by DNS name
- explain the role of CoreDNS, Services, kube-proxy, and endpoint selection
- explain how this differs between ClusterIP and LoadBalancer

## Challenge 6: Rolling Update Safety

Scenario: A team uses a Deployment with default rolling update settings. A change causes request failures during rollout.

Your task:

- explain how readiness, startup behavior, and `maxUnavailable` interact
- explain a safer rollout design
- name the observability signals you would watch during rollout

Nebius interview note:

- be prepared to speak about what the kubelet does on the node, not only high-level Kubernetes objects
