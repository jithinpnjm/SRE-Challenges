# Kubernetes Lab 3: Node Pressure And Scheduling Reasoning

## Scenario

New pods stay Pending, and one noisy workload appears to hurt neighbors.

## Learning Goal

Reason about requests, limits, scheduling, and node pressure.

## Setup

Use:

```bash
kubectl apply -f manifests/resource-pressure-pod.yaml
```

## Commands To Try

```bash
kubectl describe pod pressure-demo
kubectl describe node <node>
kubectl top pod
kubectl top node
kubectl get events --sort-by=.lastTimestamp
```

## Tasks

1. Explain why the pod is Pending, slow, or disruptive based on its resource settings.
2. Explain the difference between scheduling failure and runtime pressure.
3. Explain how requests and limits interact with QoS.
4. Suggest a safer resource policy.
5. Explain what kubelet eviction would look like in this kind of scenario.
