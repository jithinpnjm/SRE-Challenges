# SRE Challenge: Deploy a Bun Service

Welcome! Your task is to deploy a simple Bun-based HTTP service to Kubernetes.

## Tasks

1. **Fix the Dockerfile**  
   The provided Dockerfile does not build or run the service correctly. Your first task is to fix it so the service can be built and run successfully.

2. **Deploy the hello-bun service**  
   Write a `hello-bun.yml` in the `k8s/` directory that:
   - Deploys the service with 1 replica
   - Exposes it via a NodePort service on port 9080
   
3. **Write a deployment script**  
   Create a `deploy.sh` script that:
   - Builds the Docker image
   - Loads the container into the cluster
   - Applies the Kubernetes manifests to deploy the service 
   
4. **Add Grafana & Prometheus**  
   Extend your deployment to include Grafana and Prometheus for monitoring the Bun service. Ensure that:
   - Prometheus scrapes metrics from the Bun service.
   - Grafana is set up to visualize these metrics.
   
## Provided Files

- `app/`: Contains a minimal Bun HTTP server.
- `Dockerfile`: Broken, needs fixing.
- `kubeconfig`: Use this for `kubectl` access.
- `k8s/deployment.yaml`: To be created by you.
- `deploy.sh`: To be created by you.
