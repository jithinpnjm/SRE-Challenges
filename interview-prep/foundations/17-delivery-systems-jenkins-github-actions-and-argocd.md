# Foundations: Delivery Systems, Jenkins, GitHub Actions, And ArgoCD Zero To Hero

Delivery systems are the machinery that turns a code change into a running, observable, rollbackable production service.

For SRE and platform engineers, delivery is not only automation. It is risk management: who can ship, what gets verified, where artifacts are stored, how production changes are approved, how rollback works, and how drift is corrected.

This guide is designed as a complete path:

- Beginner: CI, CD, pipelines, jobs, artifacts, environments
- Intermediate: Jenkins, GitHub Actions, ArgoCD, registries, secrets, approvals
- Advanced: GitOps, OIDC, self-hosted runners, sync waves, progressive delivery, supply chain controls
- SRE Level: debug broken pipelines, failed deploys, ArgoCD drift, runner issues, rollback failures
- Interview Level: explain safe delivery architecture and tradeoffs clearly

---

# Part 1: Delivery System Mental Model

A delivery system is a factory line.

```text
Commit -> CI -> Tests -> Security Checks -> Build Artifact -> Registry -> Deploy -> Observe -> Rollback if needed
```

| Delivery concept | Factory analogy | Production meaning |
|---|---|---|
| Commit | raw material | proposed change |
| Pull request | design review | human review and discussion |
| CI job | inspection station | validation automation |
| Artifact | finished product | image/binary/package |
| Registry | warehouse | artifact storage |
| CD | shipping line | release automation |
| ArgoCD | warehouse robot | reconciles Git to cluster |
| Rollback | product recall | restore known-good version |

---

# Part 2: CI vs CD vs GitOps

## CI — Continuous Integration

Validates every change:

- lint
- test
- build
- scan
- package

## CD — Continuous Delivery / Deployment

Moves validated changes toward environments.

Continuous delivery means production deploy is automated but may need approval.
Continuous deployment means every passing change can go to production automatically.

## GitOps

Git stores desired production state. A controller reconciles actual state to Git.

```text
CI builds image -> CI updates manifest Git repo -> ArgoCD syncs cluster
```

---

# Part 3: Jenkins Zero To Hero

Jenkins is a self-hosted CI/CD orchestrator.

## Architecture

```text
Jenkins Controller -> Build Queue -> Agents/Executors -> Workspace -> Artifacts/Reports
```

Rules:

- controller coordinates
- agents run builds
- do not run untrusted builds on the controller
- isolate agents by trust level

## Jenkinsfile Basics

```groovy
pipeline {
  agent any
  stages {
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npm test'
      }
    }
  }
}
```

## Production Jenkinsfile Pattern

```groovy
pipeline {
  agent none
  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }
  environment {
    IMAGE = "registry.example.com/app:${env.GIT_COMMIT}"
  }
  stages {
    stage('Test') {
      agent { label 'linux' }
      steps {
        sh 'npm ci'
        sh 'npm test'
      }
    }
    stage('Scan') {
      agent { label 'security' }
      steps {
        sh 'trivy fs --exit-code 1 --severity HIGH,CRITICAL .'
      }
    }
    stage('Build Image') {
      agent { label 'docker' }
      steps {
        sh 'docker build -t $IMAGE .'
        sh 'docker push $IMAGE'
      }
    }
  }
}
```

## Jenkins Strengths

- very flexible
- strong on-prem/internal network use cases
- mature plugin ecosystem
- customizable agents

## Jenkins Risks

- plugin sprawl
- credential leakage
- controller as single point of failure
- slow shared agents
- snowflake pipeline logic

---

# Part 4: GitHub Actions Zero To Hero

GitHub Actions is event-driven CI/CD integrated with GitHub.

## Workflow Shape

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
```

## Key Concepts

| Concept | Meaning |
|---|---|
| workflow | YAML automation file |
| event | trigger such as push/PR/tag |
| job | group of steps on one runner |
| step | command or action |
| runner | machine executing job |
| environment | deployment target with approvals/secrets |
| artifact | file output saved from workflow |

## Production Pattern

```yaml
name: Build and Publish
on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/org/app:${{ github.sha }}
```

---

# Part 5: OIDC And Secretless Cloud Auth

Avoid long-lived cloud keys in CI.

Use OIDC:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
      aws-region: eu-central-1
```

Benefits:

- short-lived credentials
- scoped trust policy
- branch/repo/environment restrictions
- less secret rotation burden

---

# Part 6: Self-Hosted Runners

Use self-hosted runners when workflows need:

- private network access
- special hardware
- large build machines
- custom compliance controls

Risks:

- untrusted PRs can attack runners
- credentials may persist on disk
- shared runners can leak state
- runner fleet must be patched and isolated

Production guidance:

- ephemeral runners where possible
- separate runner groups by trust level
- no public repo untrusted jobs on sensitive runners

---

# Part 7: ArgoCD Zero To Hero

ArgoCD is a GitOps controller for Kubernetes.

It compares:

```text
Git desired state <-> Kubernetes actual state
```

Then reports or reconciles drift.

## Application Example

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: checkout-api
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/org/platform-manifests
    targetRevision: main
    path: apps/checkout/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: checkout
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Important ArgoCD Terms

| Term | Meaning |
|---|---|
| Synced | cluster matches Git |
| OutOfSync | cluster differs from Git |
| Healthy | resources report healthy state |
| Degraded | rollout/resource problem |
| Prune | delete resources removed from Git |
| Self-heal | revert manual cluster changes |

---

# Part 8: ArgoCD Projects And RBAC

Projects restrict what apps can deploy.

They define:

- allowed repos
- allowed clusters
- allowed namespaces
- allowed resource types
- project roles

Use projects to prevent a team app from deploying cluster-admin resources accidentally.

---

# Part 9: Sync Waves And Hooks

Use sync waves to control order.

Example:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
```

Use hooks for lifecycle actions:

- PreSync migrations
- Sync jobs
- PostSync smoke tests
- SyncFail cleanup

Be careful with database migrations. Rollback of schema changes is harder than rollback of containers.

---

# Part 10: Clean CI/CD + GitOps Architecture

Recommended pattern:

```text
App repo:
  PR -> tests -> scans -> image build -> push immutable image

Manifest repo:
  image tag/digest update via PR or bot commit

Cluster:
  ArgoCD watches manifest repo -> syncs cluster
```

Benefits:

- CI does not need cluster admin credentials
- Git history records production desired state
- rollback is Git revert
- drift is visible

---

# Part 11: Artifact And Registry Strategy

Artifacts should be immutable and traceable.

Use:

- image digests
- SBOMs
- vulnerability scans
- signatures
- provenance
- retention policies

Avoid:

- mutable `latest` for production
- rebuilding the same tag differently
- deploying unscanned images

---

# Part 12: Deployment Strategies

| Strategy | Best for | Risk |
|---|---|---|
| rolling | normal stateless apps | bad version spreads gradually |
| blue-green | fast rollback | double capacity/cost |
| canary | risky changes | needs good metrics |
| feature flags | release control | flag debt |
| GitOps sync | Kubernetes desired state | bad Git change propagates |

Safe delivery depends on observability.

---

# Part 13: Pipeline Security

Controls:

- least-privilege tokens
- pin third-party actions
- OIDC instead of static secrets
- dependency scanning
- container scanning
- secret scanning
- branch protection
- required checks
- protected environments
- signed artifacts where possible

Supply chain question:

> Can production prove what source commit produced this artifact?

---

# Part 14: Rollback Thinking

Rollback must be designed before outage.

Types:

- Git revert
- image tag rollback
- ArgoCD rollback/sync previous revision
- Helm rollback
- feature flag disable
- traffic shift away from canary

Important:

- app rollback may not rollback database schema
- rollback must be tested
- fast mitigation is better than perfect root cause during incident

---

# Part 15: Troubleshooting By Symptom

## Jenkins Build Stuck

Check:

- build queue
- agent availability
- executor labels
- controller health
- credentials/plugins

## GitHub Actions Slow

Check:

- dependency cache
- runner availability
- matrix explosion
- network/package registry latency

## GitHub Actions Cannot Access AWS

Check:

- OIDC permissions
- IAM trust policy `sub`
- environment protection
- branch condition
- role permissions

## ArgoCD OutOfSync

Check:

```bash
argocd app diff APP
argocd app get APP
kubectl describe application APP -n argocd
```

Likely causes:

- manual cluster change
- HPA changing replicas
- controller-mutated fields
- failed sync

## ArgoCD Degraded

Check:

- Deployment rollout
- Pod readiness
- invalid manifests
- missing CRDs
- RBAC denied

---

# Part 16: Real Incident Stories

## CI Passed But Production Failed

Cause:

- tests did not cover config/manifest path
- image built but wrong env var missing

Fix:

- staging smoke test
- manifest validation
- rollout health gate

## ArgoCD Fought HPA

Cause:

- Git defined `spec.replicas`, HPA changed it, ArgoCD reverted it

Fix:

- ignore differences for replicas or manage replicas consistently

## Static Cloud Key Leaked In CI

Fix:

- revoke key
- rotate affected credentials
- migrate to OIDC
- audit CloudTrail

## Production Deploy Blocked By Runner Outage

Fix:

- runner autoscaling
- fallback runner pool
- separate critical deploy runners

---

# Part 17: Tool Comparison

| Tool | Strength | Weakness |
|---|---|---|
| Jenkins | maximum flexibility/internal control | operational burden/plugin risk |
| GitHub Actions | GitHub-native/simple | runner/secrets governance needed |
| ArgoCD | Kubernetes GitOps/drift detection | only manages declared desired state |

Best modern pattern:

> GitHub Actions for CI, ArgoCD for Kubernetes CD, Jenkins where legacy/internal workflows require it.

---

# Part 18: Labs

## Beginner

- create GitHub Actions test workflow
- create basic Jenkinsfile
- deploy simple ArgoCD Application

## Intermediate

- build/push container image
- add environment approval gate
- use OIDC to assume AWS role
- deploy through ArgoCD from manifest repo

## Advanced

- add image signing
- add SBOM generation
- simulate ArgoCD drift and self-heal
- configure sync waves for migration + app
- debug failed ArgoCD sync

---

# Part 19: Interview Questions

- CI vs CD vs GitOps?
- Jenkins vs GitHub Actions?
- Why separate CI from CD?
- How does ArgoCD detect drift?
- Why use OIDC instead of cloud keys?
- How do you rollback a bad deployment?
- How do you secure a pipeline?
- What causes ArgoCD OutOfSync or Degraded?

---

# Part 20: Senior Answer Shape

> I design delivery systems around fast feedback, trusted artifacts, least-privilege credentials, clear approvals, observable rollout, and fast rollback. CI should validate and produce immutable artifacts. CD should deploy only verified artifacts. For Kubernetes, I prefer GitOps with ArgoCD so Git records desired state and drift is visible. I avoid long-lived cloud secrets by using OIDC and protect production with branch rules, environment approvals, scans, and rollback paths.

---

# Recall Prompts

- Why should CI not need cluster-admin credentials?
- Why is ArgoCD useful for drift detection?
- Why are mutable image tags dangerous?
- Why can database migrations make rollback difficult?
- Why are self-hosted runners risky with untrusted code?
