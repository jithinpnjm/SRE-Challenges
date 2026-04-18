# CI/CD, Trusted Delivery, and Platform Security

## What It Is and Why It Matters

CI/CD (Continuous Integration / Continuous Delivery) is the practice of automating the path from a code commit to a running production system. CI handles building and testing. CD handles packaging, deployment, and release.

At a deeper level, CI/CD is a **control system**: it enforces quality gates, security checks, and deployment policies on every change. A mature CI/CD system ensures that nothing reaches production without passing defined tests, security scans, and approval processes. This is what "trusted delivery" means — you can trust that anything in production went through your gates.

Platform security woven into CI/CD means: secrets management, image signing, supply chain verification, and policy enforcement are automated — not left to individual developers to remember.

---

## Mental Model

The pipeline is a series of gates. Each gate either passes the artifact forward or stops it.

```
Code Commit (git push)
    → CI Trigger
    → Build (compile, package)
    → Test (unit, integration, security scan)
    → Artifact (Docker image, binary)
    → Deliver to registry
    → Deploy to staging
    → Deploy to production
```

Key principle: **fail fast, fail left**. Cheap checks (unit tests, lint) run first. Expensive checks (integration tests, security scans) run after the cheap ones pass. Prod deploys only happen after all gates succeed.

---

## Continuous Integration

### What CI Should Validate

Every commit should trigger:
1. **Syntax and format** (`terraform fmt`, `go vet`, `pylint`, `eslint`)
2. **Unit tests** (fast, isolated, no external dependencies)
3. **Security scanning** (SAST: static analysis; dependency scanning: known CVEs)
4. **Build** (does the artifact compile/build cleanly?)
5. **Integration tests** (against real services, may run on staging branch only)
6. **Container image scan** (if building Docker images)

### GitHub Actions CI Example

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test and Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Lint
        run: |
          flake8 src/
          black --check src/

      - name: Unit tests
        run: pytest tests/unit/ -v --cov=src --cov-report=xml
        env:
          TESTING: "true"

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  security:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Dependency vulnerability scan
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: SAST scan
        uses: github/codeql-action/analyze@v3
        with:
          languages: python

  build-image:
    name: Build and Scan Image
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Scan image for CVEs
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

      - name: Push to registry
        if: github.ref == 'refs/heads/main'
        run: |
          echo ${{ secrets.REGISTRY_TOKEN }} | docker login registry.io -u _ --password-stdin
          docker tag myapp:${{ github.sha }} registry.io/org/myapp:${{ github.sha }}
          docker push registry.io/org/myapp:${{ github.sha }}
```

### Branch Strategy

```
main         → production deployments (protected, requires PR approval)
staging      → staging environment (auto-deploy from main via CD)
feature/*    → developer branches (CI only, no deploy)
hotfix/*     → emergency fixes (bypass staging, go straight to prod with approval)
```

Branch protection rules on `main`:
- Require PR with at least 1 approval
- Require status checks to pass (CI must succeed)
- Require linear history (no merge commits, force rebase)
- No force push

---

## Continuous Delivery vs Continuous Deployment

| | Continuous Delivery | Continuous Deployment |
|--|---|---|
| Definition | Every change is ready to deploy, but deploy is manual | Every successful build automatically deploys to prod |
| Best for | Services with regulatory compliance, staged rollouts | Fast-moving products with high test confidence |
| Risk | Manual step can cause delay or be forgotten | A bad commit can reach prod before humans notice |

Most teams use **continuous delivery**: code is always deployable, but prod deploy requires a manual trigger or approval step.

---

## Deployment Strategies

### Blue-Green Deployment

Two identical production environments. Traffic switches from "blue" (current) to "green" (new) atomically.

```
Before: 100% traffic → blue (v1.2)
During: deploy v1.3 to green, run smoke tests
After:  100% traffic → green (v1.3)
Old:    blue now idle, kept for 30 minutes for instant rollback
```

Rollback: switch traffic back to blue (seconds, not minutes).

Downsides: requires 2x infrastructure, database schema changes must be backward compatible with both versions.

### Canary Deployment

Gradually roll out to a percentage of users:

```
Deploy v1.3 to 5% of pods
Monitor error rate and latency for 30 minutes
If healthy: increase to 20%, then 50%, then 100%
If degraded: immediately route 100% back to v1.2
```

In Kubernetes, implement via weighted routing (Argo Rollouts, Flagger, or manual with two Deployments + Service splitting):

```yaml
# Argo Rollouts canary strategy
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  strategy:
    canary:
      canaryService: myapp-canary
      stableService: myapp-stable
      steps:
        - setWeight: 10      # 10% to canary
        - pause:
            duration: 10m    # wait 10 minutes
        - setWeight: 50
        - pause:
            duration: 10m
        - setWeight: 100
      analysis:
        templates:
          - templateName: error-rate-check
        startingStep: 1
```

### Rolling Update (Kubernetes Default)

Kubernetes default deployment strategy: replace old pods gradually.

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # can create 1 extra pod above desired count
      maxUnavailable: 0    # never reduce below desired count (ensures capacity)
```

With `maxUnavailable: 0`, Kubernetes creates a new pod, waits for it to pass readiness, then terminates an old pod. Zero-downtime.

### Feature Flags

Feature flags decouple deployment from release. Code is deployed everywhere but inactive. Feature is activated independently, per user segment or percentage:

```python
import flagsmith  # or LaunchDarkly, Unleash, etc.

client = flagsmith.Flagsmith(environment_key="...")

def handle_checkout(request):
    flags = client.get_environment_flags()
    if flags.is_feature_enabled("new_checkout_flow"):
        return new_checkout_handler(request)
    return legacy_checkout_handler(request)
```

Benefits: immediate rollback (disable flag, no redeploy), A/B testing, dark launches (deploy to 0%, verify metrics, then activate).

---

## Supply Chain Security

### Software Supply Chain Attacks

Supply chain attacks compromise the build process rather than the deployed code:
- Malicious dependency (npm, pip) included in a legitimate package
- Compromised CI system that injects malicious code during build
- Stolen signing keys that allow publishing fake legitimate packages

High-profile examples: SolarWinds (CI compromise), Log4Shell (dependency), XZ Utils backdoor (supply chain).

### SLSA Framework

SLSA (Supply-chain Levels for Software Artifacts) is a framework for measuring supply chain security:

- **Level 1**: Build process is documented
- **Level 2**: Build is hosted on a dedicated build service, not developer machines
- **Level 3**: Build is tamper-resistant, source integrity verified
- **Level 4**: Two-person review, hermetic builds, reproducible

For most organizations, target SLSA Level 2 or 3.

### Image Signing with Cosign

Sign container images to ensure they haven't been tampered with:

```bash
# Generate signing key pair
cosign generate-key-pair

# Sign image after building and pushing
cosign sign --key cosign.key registry.io/org/myapp:sha256-<digest>

# Verify image signature before deploying
cosign verify --key cosign.pub registry.io/org/myapp:sha256-<digest>
```

In Kubernetes, use admission webhooks to enforce that only signed images can run:

```yaml
# Kyverno policy: only allow signed images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  rules:
    - name: check-image-signature
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - imageReferences:
            - "registry.io/org/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      <your-cosign-public-key>
                      -----END PUBLIC KEY-----
```

### Dependency Pinning and SBOM

**Pin dependency versions** to prevent unexpected updates:
```
# requirements.txt — pin exact versions in production
flask==3.0.0
requests==2.31.0
# Not: flask>=2.0 (allows any version >= 2.0)
```

**SBOM (Software Bill of Materials)**: a machine-readable list of all components in your software. Generate at build time:

```bash
# Generate SBOM for a Docker image
syft registry.io/org/myapp:latest -o spdx-json > sbom.json

# Attach SBOM to image (discoverable via OCI)
cosign attach sbom --sbom sbom.json registry.io/org/myapp:latest

# Scan SBOM for vulnerabilities
grype sbom:sbom.json
```

---

## Secrets Management

### What Not to Do

```bash
# Never commit secrets to git
echo "DB_PASSWORD=supersecret" > .env   # if .env is in the repo: breach

# Never put secrets in Docker images
ENV DB_PASSWORD=supersecret   # visible in image layers, in image manifest

# Never log secrets
print(f"Connecting to DB with password: {password}")

# Never pass secrets via command line arguments
psql -h db-host -U user -p password   # visible in ps aux
```

### Vault (HashiCorp)

Vault is the standard secrets management solution for cloud-native systems:

```bash
# Store a secret
vault kv put secret/prod/database \
  password="supersecret" \
  username="appuser"

# Read a secret (for humans)
vault kv get secret/prod/database

# Dynamic secrets: Vault generates short-lived DB credentials
# Application gets a credential that expires in 1 hour
vault read database/creds/myapp-role
# Key             Value
# username        v-appuser-abc123
# password        A1b2C3d4E5f6...
# lease_duration  1h
```

Applications authenticate to Vault using Kubernetes service account tokens (IRSA on AWS, Workload Identity on GCP):

```yaml
# Vault Agent as sidecar — injects secrets as files
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: myapp
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
    vault.hashicorp.com/agent-inject-secret-db: "secret/prod/database"
    vault.hashicorp.com/agent-inject-template-db: |
      {{- with secret "secret/prod/database" -}}
      DB_PASSWORD={{ .Data.data.password }}
      {{- end }}
```

### Kubernetes Secrets

Kubernetes Secrets are base64-encoded (not encrypted at rest by default). Always:
- Enable etcd encryption at rest
- Or use External Secrets Operator to pull secrets from Vault/AWS Secrets Manager/GCP Secret Manager

```yaml
# External Secrets Operator: sync AWS Secrets Manager → Kubernetes Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: prod/database
        property: password
```

---

## Platform Security Policies

### OPA/Gatekeeper — Policy as Code

Open Policy Agent (OPA) with Gatekeeper enforces policies on Kubernetes resources at admission time:

```yaml
# ConstraintTemplate: define the policy logic
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requireresourcelimits
spec:
  crd:
    spec:
      names:
        kind: RequireResourceLimits
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requireresourcelimits

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container '%v' must have memory limits", [container.name])
        }

---
# Constraint: apply the policy
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireResourceLimits
metadata:
  name: require-resource-limits
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["prod", "staging"]
```

Common policies to enforce:
- Container resource limits required
- No privileged containers
- No `hostNetwork` or `hostPID`
- Image must come from approved registry
- Image must be signed
- No `latest` image tag

### RBAC

Kubernetes RBAC: controls who can do what to which resources.

```yaml
# Role: permissions within a namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deploy-operator
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list"]

---
# RoleBinding: assign the role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deploy-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: ci-system
roleRef:
  kind: Role
  name: deploy-operator
  apiGroup: rbac.authorization.k8s.io
```

Principle of least privilege: CI/CD service accounts should only be able to update images in specific deployments, not have cluster-admin.

---

## GitOps

GitOps is the practice of using Git as the single source of truth for both application and infrastructure configuration. The Git repository is the desired state; automated operators ensure the running system matches it.

```
Developer pushes to Git
    → CI builds and tests
    → CI updates image tag in manifests repo
    → ArgoCD / Flux detects manifest change
    → ArgoCD applies change to Kubernetes
    → Kubernetes reconciles
```

Key property: the cluster never runs anything that isn't in Git. Drift is automatically corrected.

ArgoCD Application:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-prod
spec:
  project: production
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: main
    path: apps/myapp/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true       # remove resources deleted from git
      selfHeal: true    # correct manual changes in cluster
    syncOptions:
      - CreateNamespace=true
```

---

## Common Failure Modes

**Flaky tests blocking deploys:** Tests that intermittently fail unrelated to code changes block the pipeline. Fix: identify flaky tests (quarantine them), investigate root cause (usually race conditions, external service timeouts). Never skip flaky tests permanently — they hide real bugs.

**Secrets in CI logs:** A `set -x` in a shell script, or an overly verbose error message, prints an env var containing a secret. Fix: use `set +x` around secret-handling code, use `::add-mask::` in GitHub Actions to mask values in logs.

**Slow pipelines:** Full pipeline taking 45 minutes → developers stop waiting for CI → bypass safety. Fix: parallelize jobs, cache dependencies, use incremental builds, split tests into fast/slow suites.

**No rollback capability:** Deploy goes wrong, no easy way back. Fix: always keep the previous artifact version, test rollback as part of your deploy runbook, use blue-green or canary to reduce blast radius.

**Supply chain compromise via unpinned dependencies:** `pip install -r requirements.txt` with `flask>=2.0` installs a malicious flask version published after your last test. Fix: pin exact versions in production, use `pip-compile` to generate locked requirements, periodically update and re-test.

---

## Key Questions and Answers

**Q: What is the difference between continuous delivery and continuous deployment?**

Continuous delivery means every build is ready to deploy, but production deployment is triggered by a human decision (button click, approval step). Continuous deployment means every successful build automatically deploys to production with no human gate. Most regulated or large-scale environments use continuous delivery: you want a human to confirm before prod impact, especially for major changes. Continuous deployment is more common in fast-moving consumer products with high automated test confidence.

**Q: How do you handle database migrations in a CI/CD pipeline?**

The deploy should be backward-compatible with the previous schema during the migration window. Three-phase approach: (1) expand migration — add new columns/tables, keeping old ones; (2) deploy new code that reads from both old and new schema; (3) contract migration — remove old columns once no code references them. Never do a single migration that requires code and schema to change simultaneously — that requires a maintenance window. Tools like Flyway and Liquibase manage migration tracking.

**Q: A secret was accidentally committed to git. What do you do?**

Treat it as compromised immediately — assume it was seen. Steps: (1) rotate the secret (generate a new one) before you do anything else; (2) revoke the old secret; (3) remove it from git history (`git filter-branch` or `git filter-repo`); (4) force-push the cleaned history; (5) notify stakeholders that a rotation happened. The rotation must happen first — cleaning git history doesn't help if the secret was already used by an attacker.

**Q: What is SLSA and why does it matter?**

SLSA (Supply-chain Levels for Software Artifacts) is a framework for measuring how trustworthy your build process is. At low levels, anyone who can access your CI system can inject malicious code into your builds. At higher levels, builds are tamper-resistant, every build is logged with provenance, and two-person review is required for code changes. It matters because software supply chain attacks have become a major attack vector — compromise the build pipeline instead of the running code.

**Q: How do you enforce image provenance (that only internally-built, signed images run in production)?**

Use an admission webhook (Kyverno or OPA/Gatekeeper) that requires images to be signed by your internal CI key. Images are signed during the CI build using Cosign. The signing key is protected (stored in Vault, accessed only by CI). Even if someone has push access to the registry, they can't push an image that will pass the admission check without the private signing key. Combine with registry restriction: only allow images from your internal registry, not public Docker Hub.

---

## Points to Remember

- CI = build + test + scan; CD = deploy + release management
- Fail fast: cheap checks first (lint, unit tests), expensive checks last
- Blue-green: instant rollback; canary: gradual rollout with automatic analysis
- Feature flags decouple deployment from release — activate independently, rollback by disabling flag
- Never commit secrets to git; never put secrets in Docker image layers
- Use external secrets (Vault, AWS Secrets Manager) with External Secrets Operator in Kubernetes
- SLSA framework measures supply chain trust level
- Sign images with Cosign; enforce signatures at admission with Kyverno/Gatekeeper
- OPA/Gatekeeper enforces security policies at Kubernetes admission time
- GitOps: Git is the single source of truth; ArgoCD/Flux ensures cluster matches
- Principle of least privilege: CI service accounts can update deployments, not everything
- Test rollback procedure — not just deploy procedure

## What to Study Next

- [Delivery Systems: Jenkins, GitHub Actions, and ArgoCD](./delivery-systems-jenkins-github-actions-and-argocd) — deep dive on the tools
- [Terraform and Infrastructure as Code](./terraform-infrastructure-as-code) — IaC in CI/CD pipelines
- [YAML and Kubernetes Manifest Design](./yaml-and-kubernetes-manifest-design) — Kubernetes manifests in GitOps repos
