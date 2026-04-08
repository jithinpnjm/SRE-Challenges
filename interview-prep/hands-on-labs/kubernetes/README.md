# Kubernetes Labs

These labs focus on object behavior, rollout safety, service networking, and node-level troubleshooting.

## Labs

1. [lab-01-pod-service-debug.md](lab-01-pod-service-debug.md)
2. [lab-02-rollout-and-probes.md](lab-02-rollout-and-probes.md)
3. [lab-03-node-pressure-and-scheduling.md](lab-03-node-pressure-and-scheduling.md)

## Supporting Manifests

- [manifests/demo-app-bad-readiness.yaml](manifests/demo-app-bad-readiness.yaml)
- [manifests/demo-app-good-readiness.yaml](manifests/demo-app-good-readiness.yaml)
- [manifests/demo-service-mismatch.yaml](manifests/demo-service-mismatch.yaml)
- [manifests/resource-pressure-pod.yaml](manifests/resource-pressure-pod.yaml)

## Advanced Practice

- [lab-04-gpu-ml-ai-platform-review.md](lab-04-gpu-ml-ai-platform-review.md)
- [lab-05-operators-mesh-and-dr-review.md](lab-05-operators-mesh-and-dr-review.md)

## Where To Run These

- local `kind` cluster: https://kind.sigs.k8s.io/docs/user/quick-start/
- local `minikube` cluster: https://minikube.sigs.k8s.io/docs/commands/start/
- managed cluster if you already have one, but start locally first

Helpful references:

- Kubernetes tools: https://kubernetes.io/docs/tasks/tools/
- DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Services networking: https://kubernetes.io/docs/concepts/services-networking/service/
- Node pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- GPU scheduling: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Operator pattern: https://kubernetes.io/docs/concepts/extend-kubernetes/operator/
- Kubernetes policies: https://kubernetes.io/docs/concepts/policy
- Operating etcd clusters: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- NVIDIA device plugin: https://nvidia.github.io/k8s-device-plugin/
- Istio overview: https://istio.io/latest/docs/overview/
- Istio architecture: https://istio.io/latest/docs/ops/deployment/architecture/
- Istio ambient overview: https://istio.io/latest/docs/ambient/overview/
- Kubeflow Trainer overview: https://www.kubeflow.org/docs/components/trainer/overview/
- KServe admin overview: https://kserve.github.io/website/docs/admin-guide/overview
- Kueue installation: https://kueue.sigs.k8s.io/docs/installation/
- Kueue tasks: https://kueue.sigs.k8s.io/docs/tasks/
