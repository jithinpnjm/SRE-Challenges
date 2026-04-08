#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="peec-cluster"
DEPLOYMENT_FILE="k8s/deploy.yaml"
SERVICE_MONITOR_FILE="k8s/servicemonitor.yaml"
PROM_STACK_VALUES_FILE="k8s/kube-prometheus-stack-values.yaml"
PROM_STACK_RELEASE="monitoring"
PROM_STACK_NAMESPACE="monitoring"
DEFAULT_IMAGE_NAME="hello-bun"
DEFAULT_IMAGE_TAG="v2"

read -r -p "Image name [${DEFAULT_IMAGE_NAME}]: " IMAGE_NAME_INPUT
read -r -p "Image tag [${DEFAULT_IMAGE_TAG}]: " IMAGE_TAG_INPUT

IMAGE_NAME="${IMAGE_NAME_INPUT:-$DEFAULT_IMAGE_NAME}"
IMAGE_TAG="${IMAGE_TAG_INPUT:-$DEFAULT_IMAGE_TAG}"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building ${IMAGE_REF}..."
docker build -t "${IMAGE_REF}" ./services/hello-bun

echo "Loading ${IMAGE_REF} into kind cluster ${CLUSTER_NAME}..."
kind load docker-image "${IMAGE_REF}" --name "${CLUSTER_NAME}"

echo "Updating ${DEPLOYMENT_FILE} to use ${IMAGE_REF}..."
sed -i '' "s|.*image:.*|          image: ${IMAGE_REF}|" "${DEPLOYMENT_FILE}"

echo "Applying application manifests..."
kubectl apply -f "${DEPLOYMENT_FILE}"

echo "Installing kube-prometheus-stack via Helm..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install "${PROM_STACK_RELEASE}" prometheus-community/kube-prometheus-stack \
  --namespace "${PROM_STACK_NAMESPACE}" \
  --create-namespace \
  -f "${PROM_STACK_VALUES_FILE}"

echo "Applying ServiceMonitor..."
kubectl apply -f "${SERVICE_MONITOR_FILE}"

echo "Waiting for the hello-bun deployment..."
kubectl rollout status deployment/hello-bun

echo "Waiting for the Prometheus operator..."
kubectl rollout status deployment/"${PROM_STACK_RELEASE}"-kube-prometheus-operator -n "${PROM_STACK_NAMESPACE}"

echo "Waiting for Grafana..."
kubectl rollout status deployment/"${PROM_STACK_RELEASE}"-grafana -n "${PROM_STACK_NAMESPACE}"

echo "Waiting for Prometheus..."
kubectl rollout status statefulset/prometheus-"${PROM_STACK_RELEASE}"-kube-prometheus-prometheus -n "${PROM_STACK_NAMESPACE}"

echo "Deployment complete. App should be reachable on localhost:9080"
echo "Prometheus: kubectl port-forward -n ${PROM_STACK_NAMESPACE} svc/${PROM_STACK_RELEASE}-kube-prometheus-prometheus 9090:9090"
echo "Grafana: kubectl port-forward -n ${PROM_STACK_NAMESPACE} svc/${PROM_STACK_RELEASE}-grafana 3000:80"
