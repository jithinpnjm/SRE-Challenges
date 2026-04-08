# Kubernetes Lab 1: Pod Is Running But Service Does Not Work

## Scenario

A Deployment is healthy-looking, but traffic through the Service fails.

## Learning Goal

Connect labels, selectors, readiness, and endpoints.

## Setup

If you have a local cluster:

```bash
kubectl apply -f manifests/demo-service-mismatch.yaml
```

## How To Think

Do not jump straight to the application code. Service flow is:

1. client hits Service
2. Service selects endpoints
3. endpoints map to ready Pods
4. node dataplane forwards traffic

## Commands To Try

```bash
kubectl get deploy,po,svc,endpoints,endpointslices
kubectl describe svc demo-service
kubectl get pod --show-labels
kubectl describe pod <pod>
kubectl logs <pod>
```

## Tasks

1. Identify whether the selector matches the Pod labels.
2. Check whether endpoints exist.
3. Explain how readiness affects endpoint inclusion.
4. Fix the problem and write what changed.
5. Summarize the service request path in five lines.

## Deliverable

- a short note showing root cause, evidence, and fix
