# Kubernetes Lab 2: Readiness, Startup, And Rollout Safety

## Scenario

A rollout introduces failures because pods are considered ready too soon.

## Learning Goal

Understand how probes influence real traffic safety.

## Setup

Apply the intentionally weak manifest first:

```bash
kubectl apply -f manifests/demo-app-bad-readiness.yaml
```

Then compare with:

```bash
kubectl apply -f manifests/demo-app-good-readiness.yaml
```

## Commands To Try

```bash
kubectl rollout status deploy/demo-app
kubectl describe pod -l app=demo-app
kubectl get pod -w
kubectl logs -l app=demo-app
```

## Tasks

1. Explain why a bad readiness probe can create user-facing failure even if the app starts eventually.
2. Compare the weak and improved manifests.
3. Explain when a startup probe is useful.
4. Explain how `maxUnavailable` and `maxSurge` change rollout safety.
5. Write the safer rollout policy you would recommend for a real service.
