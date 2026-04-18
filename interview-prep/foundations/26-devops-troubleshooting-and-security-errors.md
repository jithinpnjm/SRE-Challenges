# DevOps Troubleshooting and Security Errors

## What It Is and Why It Matters

Production systems fail in patterns. Most operational failures repeat the same dependency patterns across different tools — a missing credential, a network path blocked, a resource limit exceeded, a certificate expired. Recognizing these patterns quickly is what separates engineers who debug efficiently from those who flail.

This guide covers structured troubleshooting approaches and the most common error patterns in Kubernetes, Docker, CI/CD pipelines, Terraform, networking, and security tooling. The goal is pattern recognition and systematic diagnosis, not memorizing error strings.

---

## Mental Model: The Troubleshooting Framework

Before running commands, answer four questions:

1. **What is the symptom?** (error message, timeout, 5xx rate, pod in CrashLoopBackOff)
2. **What is the scope?** (one pod? one service? one region? all users?)
3. **What changed recently?** (deploy, config change, certificate renewal, traffic spike)
4. **What is the blast radius?** (how many users affected? is it getting worse?)

Then: form a hypothesis, run one command to test it, interpret the result, repeat.

```
Symptom → Orient → Hypothesis → Test → Interpret → Next Hypothesis
```

Never run commands randomly. Each command should test exactly one hypothesis.

---

## Kubernetes Troubleshooting

### Pod States and Diagnosis

```bash
# See all pods and their states
kubectl get pods -n production

# Status meanings:
# Pending:          pod not scheduled (resource constraints, taint, affinity)
# ContainerCreating: pulling image or creating volumes
# Running:          at least one container running
# CrashLoopBackOff: container crashing repeatedly
# OOMKilled:        container killed by Linux OOM killer
# Evicted:          pod evicted due to node resource pressure
# ImagePullBackOff: can't pull container image
# Terminating:      pod being deleted

# For any problematic pod, always start with describe
kubectl describe pod <pod-name> -n production
# Read: Conditions, Events section at the bottom

# Get logs
kubectl logs <pod-name> -n production
kubectl logs <pod-name> -n production --previous    # last run (if pod restarted)
kubectl logs <pod-name> -n production -c <container> # specific container in multi-container pod
kubectl logs <pod-name> -n production --since=1h   # last hour
```

### Common Pod Error Patterns

**Pending: Insufficient resources**
```
Events: 0/5 nodes are available: 5 Insufficient memory.
```
Diagnosis: pods requesting more memory than any node has free. Check `kubectl top nodes`.
Fix: scale up node pool, or reduce pod memory requests.

**Pending: Taint NoSchedule**
```
Events: 0/5 nodes are available: 5 node(s) had untolerated taint {dedicated: gpu}
```
Diagnosis: pod is trying to schedule on GPU nodes (which have a taint) without a toleration.
Fix: add the correct toleration to the pod spec.

**CrashLoopBackOff**
```bash
kubectl logs <pod> --previous   # always look at the previous run
# Usually: application startup error, missing env var, failed DB connection
```

**OOMKilled**
```bash
kubectl describe pod <pod> | grep -A 3 "OOM\|Last State"
# Shows: Last State: Terminated  Reason: OOMKilled  Exit Code: 137
```
Fix: increase memory limit, or investigate memory leak.

**ImagePullBackOff**
```
Failed to pull image "registry.internal/app:v2.3": unauthorized
```
Diagnosis: missing or expired imagePullSecret.
Fix: create/renew the secret: `kubectl create secret docker-registry regcred --docker-server=registry.internal --docker-username=... --docker-password=...`

### Service Not Reachable

```bash
# Check if service exists and has endpoints
kubectl get svc checkout-api -n production
kubectl get endpoints checkout-api -n production
# If ENDPOINTS is <none>: no pods matching the selector

# Check if pod labels match service selector
kubectl get pods -n production --show-labels | grep checkout-api
kubectl get svc checkout-api -n production -o yaml | grep selector

# Test connectivity from another pod
kubectl run debug --rm -it --image=busybox -- sh
# Inside: wget -O- http://checkout-api.production.svc.cluster.local:80/health

# Check DNS resolution
kubectl exec -it <pod> -- nslookup checkout-api.production.svc.cluster.local
# If DNS fails: CoreDNS problem

# Check network policy
kubectl get networkpolicy -n production
# If default-deny is applied, ensure there's an allow policy for this traffic
```

### Node Issues

```bash
# Node status
kubectl get nodes
# NotReady: kubelet not reporting to API server

# Describe a NotReady node
kubectl describe node <node-name>
# Look: Conditions → check MemoryPressure, DiskPressure, PIDPressure

# Check node resource usage
kubectl top nodes

# Check what's on the node
kubectl get pods --all-namespaces -o wide | grep <node-name>

# On the node itself
systemctl status kubelet
journalctl -u kubelet --since "30 minutes ago" | tail -50
df -h /var/lib/kubelet    # disk space for kubelet
```

### Deployment Rollout Problems

```bash
# Check rollout status
kubectl rollout status deployment/checkout-api -n production

# History of rollouts
kubectl rollout history deployment/checkout-api -n production

# Rollback to previous version
kubectl rollout undo deployment/checkout-api -n production

# Rollback to specific revision
kubectl rollout undo deployment/checkout-api --to-revision=3 -n production

# Pause a rollout (stop partway through)
kubectl rollout pause deployment/checkout-api -n production

# Resume
kubectl rollout resume deployment/checkout-api -n production
```

---

## Docker and Container Troubleshooting

### Image Build Failures

```bash
# Build with verbose output
docker build --no-cache --progress=plain -t myapp:v1 .

# Common failures:
# COPY failed: file not found
#   → file doesn't exist or .dockerignore excludes it

# RUN command failed
#   → check exit code, package not found, permission denied

# Test build context
docker build -f /dev/null --progress plain .
# Shows all files being sent to Docker daemon (check for large unexpected files)
```

### Container Won't Start / Crashes

```bash
# See last few runs including exit codes
docker ps -a | grep myapp

# Get logs from crashed container
docker logs <container-id>

# Inspect container (see exit code, environment, mounts)
docker inspect <container-id>
# Look: State.ExitCode, State.OOMKilled, Env, Mounts

# Common exit codes:
# 0:   clean exit
# 1:   application error
# 127: command not found (ENTRYPOINT/CMD binary doesn't exist in image)
# 137: SIGKILL (OOM kill or docker kill)
# 139: SIGSEGV (segfault)
# 143: SIGTERM (graceful shutdown)

# Run a shell in the failing image for debugging
docker run --rm -it --entrypoint /bin/sh myapp:v1
# If no shell: copy binary to a debug image
```

### Registry Issues

```bash
# Login failures
docker login registry.internal
# "unauthorized" or "access denied" → wrong credentials or insufficient permissions

# Pull failures
docker pull registry.internal/myapp:v2.3
# "not found" → image or tag doesn't exist
# "unauthorized" → expired token, run docker login again

# For ECR: token expires every 12 hours
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

---

## Networking Issues

### DNS Resolution Failures

```bash
# Test DNS resolution
dig api.example.com
nslookup api.example.com
host api.example.com

# Check what DNS server is being used
cat /etc/resolv.conf

# If resolving correctly but connection fails: DNS is fine, check next layer
# If DNS fails: check resolver, check if domain exists, check NXDOMAIN vs SERVFAIL
# NXDOMAIN: domain doesn't exist
# SERVFAIL: DNS server error (resolver issue, not domain issue)

# Inside Kubernetes pod
kubectl exec -it <pod> -- nslookup kubernetes.default.svc.cluster.local
# If this fails: CoreDNS is down or misconfigured

# ndots:5 issue: Pod adds search domains for each lookup
# "mydb" → tries "mydb.production.svc.cluster.local", then "mydb.svc.cluster.local"
# Use FQDN (trailing dot) to avoid: "mydb.production.svc.cluster.local."
```

### TCP Connection Issues

```bash
# Test if port is reachable
nc -zv hostname 5432     # TCP port test
nc -zuv hostname 5432    # UDP port test

# Check if something is listening
ss -tlnp | grep 5432     # what's listening on port 5432
ss -tlnp | grep <port>

# Trace TCP connection (shows where it fails)
traceroute -T -p 443 api.example.com    # TCP traceroute

# Test HTTPS
curl -v https://api.example.com/health
# Shows: DNS, TCP, TLS, HTTP layers

# Test with timing breakdown
curl -w "\nDNS:%{time_namelookup}s TCP:%{time_connect}s TLS:%{time_appconnect}s Total:%{time_total}s\n" \
  -o /dev/null -s https://api.example.com

# Check firewall rules (Linux)
iptables -L -n -v | grep DROP    # dropped traffic
```

### SSL/TLS Errors

```bash
# Check certificate details
openssl s_client -connect api.example.com:443 -servername api.example.com

# Check certificate expiry
echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates
# notBefore= ...
# notAfter= ...   ← expiry date

# Check certificate chain
openssl s_client -connect api.example.com:443 -showcerts 2>/dev/null | \
  grep "s:\|i:"
# s: subject (this cert)
# i: issuer (who signed it)

# Common TLS errors:
# "certificate has expired" → cert needs renewal
# "certificate verify failed" → self-signed or missing intermediate cert
# "hostname mismatch" → cert CN/SAN doesn't match the hostname
# "SSL_ERROR_RX_RECORD_TOO_LONG" → connecting to HTTP port with HTTPS

# In Kubernetes (cert-manager managed certs)
kubectl describe certificate <cert-name> -n production
kubectl describe certificaterequest -n production
kubectl logs -n cert-manager deploy/cert-manager | tail -50
```

---

## CI/CD Pipeline Troubleshooting

### GitHub Actions Failures

```bash
# Common patterns and diagnosis:

# "Process completed with exit code 1"
# → The command failed. Read the step output for the actual error.

# "Resource not accessible by integration"
# → Missing permissions in workflow
# Fix: add the required permission to the job:
#   permissions:
#     contents: write
#     packages: write

# "Error: credentials.json: No such file or directory"
# → Secret not available in this context (wrong environment, secret not set)
# Fix: check Environments settings, ensure secret exists

# "dial tcp: lookup github.com: no such host"
# → Network connectivity from runner to internet
# → Self-hosted runner behind firewall without internet access
# Fix: configure proxy, or use GitHub-hosted runners

# Cache restore failures
# → Cache key changed (dependency lock file changed)
# → This is normal — cache will be rebuilt
```

### Jenkins Pipeline Failures

```bash
# Pipeline fails with "hudson.AbortException"
# → Build step returned non-zero exit code

# "No such DSL method" in Jenkinsfile
# → Missing plugin
# → Check: Manage Jenkins → Plugin Manager

# "ERROR: Couldn't find any revision to build"
# → Branch doesn't exist, or git credentials don't have access

# Agent pod fails to start (Kubernetes plugin)
# → Check pod quota: kubectl get resourcequota -n jenkins
# → Check pending pods: kubectl get pods -n jenkins --field-selector=status.phase=Pending

# Credential not found
# → Credential ID mismatch between Jenkinsfile and Jenkins credential store
# → Check: Jenkins → Credentials → look for the exact ID

# "java.io.IOException: remote file operation failed: /workspace on <agent>"
# → Agent disk full or path doesn't exist
# → Check agent pod: kubectl exec -it <agent-pod> -- df -h
```

### ArgoCD Sync Failures

```bash
# Check sync status
kubectl -n argocd get application myapp

# Detailed sync info
kubectl -n argocd describe application myapp

# Common issues:
# "ComparisonError: failed to load initial state"
# → ArgoCD can't read from Git (auth failure, network, repo not found)

# "OutOfSync" with "timed out waiting for health"
# → Deployment rollout is failing (pods not becoming ready)
# → Check: kubectl get pods -n <app-namespace>

# "Unknown" status
# → ArgoCD lost connection to cluster
# → Check: kubectl -n argocd get secret -l argocd.argoproj.io/secret-type=cluster

# "InvalidSpecError: request for resource 'apps' not found"
# → ArgoCD service account doesn't have permission to manage this resource type
# → Check: kubectl -n argocd get rolebinding

# To force sync (bypass normal checks)
argocd app sync myapp --force
```

---

## Terraform Troubleshooting

```bash
# State lock
# "Error: Error acquiring the state lock"
# → Another apply is running, or previous apply crashed
# Solution: check DynamoDB for lock, remove if no apply is running
aws dynamodb scan --table-name terraform-locks

# Provider authentication
# "Error: No valid credential sources found"
# → AWS credentials not configured
# → In CI: IRSA not set up, or AWS_* env vars not set

# State drift
# "Error: Provider produced inconsistent result after apply"
# → Resource was modified outside Terraform
# Solution: terraform refresh, then plan again

# Dependency errors
# "Error: Reference to undeclared resource"
# → Referencing a resource that doesn't exist in config
# → Often caused by removing a resource that others depend on

# Plan shows unexpected destroy
# → Resource has been renamed/refactored → Terraform sees old gone, new to create
# → Use "terraform state mv" to rename in state without destroying

# Provider version constraints
# "Installed version 5.0.0 is not compatible with constraint ~> 4.0"
# → Update terraform lock file: terraform init -upgrade
```

---

## Security Tool Errors

### Trivy / Snyk Scan Failures

```bash
# "FATAL Fatal error init error: no such file or directory"
# → Trivy database download failed (network issue in CI)
# → Cache the Trivy DB in CI artifacts

# High/Critical CVEs blocking build
trivy image myapp:latest --severity CRITICAL,HIGH --exit-code 1
# If you need to understand the CVEs:
trivy image myapp:latest --format json | jq '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL")'

# Suppress false positives
trivy image myapp:latest --ignorefile .trivyignore
# .trivyignore:
# CVE-2021-44228     # Log4Shell - not applicable (not using Java)
# CVE-2022-0001      # Intel microcode - not applicable (containers)

# Check if a specific package is affected
trivy image myapp:latest --pkg-types library | grep log4j
```

### Certificate Manager (cert-manager) Errors

```bash
# Check certificate status
kubectl describe certificate myapp-tls -n production

# "certificate not yet due for renewal"  → ok
# "Issuing" → renewal in progress
# "False" → problem, look at reason

# Check CertificateRequest
kubectl describe certificaterequest -n production
# Common: "Failed to create Order: rate limited" → Let's Encrypt rate limit hit
# Wait 1 hour for rate limit to reset; use staging LE issuer for testing

# Check ACME challenge
kubectl describe challenge -n cert-manager
# "Waiting for HTTP-01 challenge propagation" → HTTP path not reachable from ACME server
# Check: Ingress is serving the /.well-known/acme-challenge/ path

# View cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager -f | grep -i error
```

### RBAC Errors

```bash
# "Error from server (Forbidden): pods is forbidden: User cannot list resource"
# → The user/service account doesn't have the required permissions

# Find what roles are bound to a service account
kubectl get rolebinding,clusterrolebinding -A -o json | \
  jq '.items[] | select(.subjects[]? | select(.name=="my-service-account"))'

# Check what permissions a service account has
kubectl auth can-i --list --as=system:serviceaccount:production:checkout-api

# Check specific permission
kubectl auth can-i create pods --as=system:serviceaccount:production:checkout-api -n production

# Fix: create role with required permissions, bind to service account
kubectl create role pod-reader --verb=get,list --resource=pods -n production
kubectl create rolebinding checkout-pod-reader \
  --role=pod-reader \
  --serviceaccount=production:checkout-api \
  -n production
```

---

## Systematic Diagnosis Patterns

### The Dependency Chain Pattern

Most errors are a failure in a dependency chain. Walk the chain:

```
Application fails → Check: is the application process running?
    → Process running, but error → Check: what dependency is failing?
    → Database connection error → Check: can app reach DB port?
    → Port reachable, auth fails → Check: credentials correct?
    → Credentials correct, TLS error → Check: cert valid, CA trusted?
```

Each layer is a hypothesis. Test one at a time.

### The "Works on My Machine" Pattern

When something works in development but fails in production:
- Environment variables: missing, wrong value, wrong format
- Secrets: not mounted, wrong key name
- Network policies: dev has permissive rules, prod has default deny
- Image: different tag, built on different base, different architecture (arm64 vs amd64)
- Resource limits: dev has no limits, prod enforces them → OOM kill

Checklist:
```bash
# Compare env vars
kubectl exec prod-pod -- env | sort > prod-env.txt
docker run dev-image env | sort > dev-env.txt
diff dev-env.txt prod-env.txt

# Compare images
docker inspect dev-image --format '{{.Config.Env}}'
kubectl get pod prod-pod -o jsonpath='{.spec.containers[*].env}'
```

### The "It Was Working Before" Pattern

Something changed. Find what:
```bash
# What was deployed recently?
kubectl rollout history deployment/myapp -n production

# Recent Kubernetes events
kubectl get events --sort-by='.lastTimestamp' -n production | tail -30

# Recent changes in git
git log --since="2 hours ago" --oneline

# Recent CloudTrail events (AWS)
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=ModifyDBInstance

# Did certificates just expire?
kubectl get certificate -A
```

---

## Key Questions and Answers

**Q: A service is returning 503 errors. Walk through your diagnosis.**

Start at the load balancer: are backends healthy? Check ALB/NLB target group health. If backends are unhealthy: check Kubernetes: `kubectl get pods -n production` — any CrashLoopBackOff or Pending? If pods look healthy: check readiness probe — is the `/ready` endpoint returning 200? Check `kubectl get endpoints` — are there any endpoints? If no endpoints, no pods match the service selector. Check network policies — does traffic from the ingress controller reach the pods? Check application logs for errors.

**Q: A Terraform plan shows a resource being destroyed that you don't want destroyed. What do you do?**

Stop and investigate before applying. Common causes: resource was renamed (Terraform sees old address as delete, new address as create), resource block was removed from config, `count` or `for_each` index changed. Options: (1) `terraform state mv old-address new-address` to rename without destroying; (2) add the resource block back if it was accidentally removed; (3) `lifecycle { prevent_destroy = true }` to prevent destruction of critical resources. Never blindly apply a plan that destroys production resources.

**Q: How do you debug a container that crashes immediately on startup?**

Check `docker logs <container-id>` or `kubectl logs <pod> --previous`. Common causes: missing environment variable (`KeyError`, `undefined environment variable`), wrong entrypoint (exit code 127 = command not found), permission denied on a file, failed to connect to a dependency (database not ready). If the container has no shell, build a debug image with a shell added, copy the failing binary into it, and run it manually. Use `docker run --entrypoint /bin/sh myimage -c "env && ls -la /app && /app/binary"` to inspect the environment before running the application.

**Q: A pod is stuck in Pending state. What are the possible causes and how do you diagnose?**

Run `kubectl describe pod <pod>` and read the Events section. Most common causes: (1) Insufficient resources — no node has enough CPU/memory matching the request; (2) Node taint mismatch — nodes have taints the pod doesn't tolerate; (3) Node affinity mismatch — pod requires a label that no node has; (4) Volume mounting failure — PVC not bound, storage class not available; (5) Pod disruption budget — cluster is at capacity and PDB prevents scaling down. The Events section will tell you exactly which of these applies.

---

## Points to Remember

- Always read `kubectl describe pod <name>` Events section for pod issues
- `kubectl logs --previous` for logs from the last crash
- `kubectl auth can-i` to test RBAC permissions
- DNS issues: check `nslookup`, CoreDNS pods, `ndots:5` amplification
- Exit 137 = SIGKILL (OOM); 143 = SIGTERM (graceful); 127 = command not found
- Terraform: never apply a destroy you don't understand — use `state mv` for renames
- TLS errors: always check cert expiry and hostname match with `openssl s_client`
- ArgoCD sync failures: usually either Git auth failure or the app's pods not becoming ready
- CI secrets: scope matters — repository vs environment secrets, check environment protection rules
- The dependency chain: walk from symptom backwards through each dependency layer
- "Works on my machine": compare env vars, image tags, resource limits, network policies

## What to Study Next

- [Linux and Network Administration](./linux-and-network-administration) — system-level debugging
- [Observability, SLOs, and Incident Response](./observability-slos-and-incident-response) — structured incident response
- [Kubernetes Networking Deep Dive](./kubernetes-networking-deep-dive) — network path debugging
