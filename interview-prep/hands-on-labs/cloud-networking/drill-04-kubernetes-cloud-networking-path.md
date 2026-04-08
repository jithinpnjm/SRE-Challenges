# Cloud Networking Drill 4: Kubernetes And Cloud Networking Path

## Goal

Bridge cloud edge networking and Kubernetes internal networking in one explanation.

## Scenario

Explain the path from internet client to a service running on GKE or EKS.

## Tasks

1. Explain DNS, edge, WAF, and load balancer flow.
2. Explain how traffic enters the cluster.
3. Explain how Service and endpoints choose the backend.
4. Explain where node-local dataplane behavior matters.
5. Explain one failure where cloud health looks good but user traffic still fails.

## Model-Answer Rubric

- does the answer connect cloud edge and cluster internals
- does it mention endpoints and readiness
- does it show awareness of health-check shallowness
