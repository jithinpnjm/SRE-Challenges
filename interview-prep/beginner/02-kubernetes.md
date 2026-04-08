# Beginner: Kubernetes Fundamentals And Troubleshooting

These prompts build the core explanations you must be able to give cleanly before senior-level depth becomes useful.

## Mentor Mode

Do not treat Kubernetes as a list of YAML objects. For each issue, ask:

1. what desired state exists
2. which component is responsible for reconciling that state
3. what the node is actually doing
4. how traffic reaches or avoids the Pod

Useful commands:

```bash
kubectl get pods -A
kubectl describe pod <pod>
kubectl logs <pod> --previous
kubectl get events -A --sort-by=.lastTimestamp
kubectl describe node <node>
kubectl get svc,endpoints,endpointslices -A
kubectl top pod -A
kubectl top node
```

## What Interviewers Are Testing

- do you know the control-plane components and their roles
- do you understand how readiness affects live traffic
- can you connect Services to endpoints and pods
- can you talk about kubelet as a real node agent

## Challenge 1: Explain The Control Plane

Prompt:

- explain what the API server, etcd, scheduler, controller manager, and kubelet each do
- explain what happens from `kubectl apply` to a running Pod
- explain where desired state lives and who reconciles it

Mentor hints:

- distinguish storage of state from enforcement of state
- kubelet is not part of the central control plane, but it is operationally crucial

## Challenge 2: Pod Starts But Never Receives Traffic

Scenario: A Deployment has healthy-looking Pods, but the Service sends no traffic to them.

Your task:

- list the most likely causes in order
- explain how labels, selectors, readiness probes, endpoints, and NetworkPolicy can affect this
- name the exact `kubectl` commands you would run

Mentor hints:

- service traffic depends on ready endpoints, not just running pods
- always check labels and selectors before blaming networking

## Challenge 3: CrashLoopBackOff

Scenario: A new release enters `CrashLoopBackOff` after deployment.

Your task:

- describe your first response
- explain how you distinguish app crash, bad config, probe failure, OOM kill, bad entrypoint, and missing dependency
- explain what the Pod events and previous container logs tell you

Mentor hints:

- previous container logs matter here
- events often tell you whether the failure is pull, start, probe, or kill related

## Challenge 4: Requests, Limits, And QoS

Prompt:

- explain requests versus limits
- explain Guaranteed, Burstable, and BestEffort QoS
- explain how these affect scheduling and eviction during node pressure
- explain one common mistake teams make with CPU limits and one with memory limits

Mentor hints:

- requests affect placement
- limits affect enforcement
- bad resource policy can make stable code look unstable

## Challenge 5: Service Discovery Basics

Prompt:

- explain how a Pod reaches another service by DNS name
- explain the role of CoreDNS, Services, kube-proxy or dataplane logic, and endpoint selection
- explain how this differs between ClusterIP and LoadBalancer

Mentor hints:

- explain this as a packet path, not just an object glossary

## Challenge 6: Rolling Update Safety

Scenario: A team uses a Deployment with default rolling update settings. A change causes request failures during rollout.

Your task:

- explain how readiness, startup behavior, and `maxUnavailable` interact
- explain a safer rollout design
- name the observability signals you would watch during rollout

Mentor hints:

- "container started" is not "service safe"
- startup probes can protect slow-starting apps from premature liveness or readiness behavior

## Challenge 7: Pod To Pod Networking

Your task:

- explain how one Pod reaches another Pod
- explain where CNI, routes, and policy fit in
- explain why this matters when debugging "works on one node but not another"

## Challenge 8: ImagePullBackOff

Your task:

- explain the likely causes
- explain how auth, DNS, registry availability, and tag mistakes can all show up here
- explain which events would help you narrow it quickly

## Challenge 9: Explain Kubelet In Plain Language

Your task:

- explain what kubelet watches and what it does locally on the node
- explain why kubelet issues can feel like app issues

## Challenge 10: Service VIP Fails, Pod IP Works

Your task:

- explain what this suggests
- explain whether you would suspect the app, endpoint selection, or node dataplane first
- explain what evidence you would gather
