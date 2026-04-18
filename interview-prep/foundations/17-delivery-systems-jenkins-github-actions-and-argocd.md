# Delivery Systems: Jenkins, GitHub Actions, and ArgoCD

## What It Is and Why It Matters

Delivery systems are the infrastructure that takes code from a developer's commit and turns it into a running service in production. Three tools dominate this space at different layers:

- **Jenkins**: self-hosted, highly flexible CI/CD orchestrator. Still dominant in enterprise environments, on-premise setups, and teams that need full control.
- **GitHub Actions**: cloud-hosted CI/CD tightly integrated with GitHub. The default choice for greenfield projects and open source.
- **ArgoCD**: GitOps-based Kubernetes deployment operator. Continuously reconciles Kubernetes cluster state with Git.

Understanding all three — their architecture, tradeoffs, and how they compose — is a core platform engineering competency.

---

## Jenkins

### Architecture

Jenkins has a controller-agent (formerly master-slave) architecture:

```
Jenkins Controller
    → Manages jobs, UI, plugin coordination, build queue
    → Stores job config, build history, credentials
    ↓
Agents (executors)
    → Run the actual build steps
    → Can be VMs, containers, or Kubernetes pods
    → Connected to controller via JNLP, SSH, or WebSocket
```

The controller should not run builds — only coordinate them. Running builds on the controller is a security risk (builds get access to controller's filesystem and credentials) and a stability risk (a bad build can kill the controller).

### Jenkinsfile (Declarative Pipeline)

```groovy
pipeline {
    agent none   // no default agent — each stage declares its own

    environment {
        REGISTRY = 'registry.internal'
        IMAGE    = "${REGISTRY}/myapp"
    }

    stages {
        stage('Test') {
            agent {
                docker {
                    image 'python:3.11-slim'
                    args '--network=ci-network'
                }
            }
            steps {
                sh 'pip install -r requirements.txt'
                sh 'pytest tests/unit/ -v --junitxml=test-results.xml'
            }
            post {
                always {
                    junit 'test-results.xml'
                }
            }
        }

        stage('Security Scan') {
            agent { label 'security-scanner' }
            steps {
                sh "trivy fs --severity CRITICAL,HIGH --exit-code 1 ."
            }
        }

        stage('Build Image') {
            agent { label 'docker-builder' }
            steps {
                script {
                    def image = docker.build("${IMAGE}:${env.GIT_COMMIT}")
                    docker.withRegistry("https://${REGISTRY}", 'registry-credentials') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            agent { label 'kubernetes' }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-staging', variable: 'KUBECONFIG')]) {
                    sh """
                        kubectl set image deployment/myapp \
                          myapp=${IMAGE}:${env.GIT_COMMIT} \
                          -n staging
                        kubectl rollout status deployment/myapp -n staging --timeout=5m
                    """
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            agent { label 'kubernetes' }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-prod', variable: 'KUBECONFIG')]) {
                    sh """
                        kubectl set image deployment/myapp \
                          myapp=${IMAGE}:${env.GIT_COMMIT} \
                          -n production
                        kubectl rollout status deployment/myapp -n production --timeout=10m
                    """
                }
            }
        }
    }

    post {
        failure {
            slackSend(
                color: 'danger',
                message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### Jenkins Security Model

**Credentials store:** Jenkins stores credentials (passwords, tokens, SSH keys) in its credential store. Access via `withCredentials()` block — credentials are available as env vars only within the block scope, not in build logs (masked).

**Folder-based access control:** Use the Folder-based Authorization Strategy plugin. Different teams get access to their folders only, not each other's jobs.

**Agent trust:** Agents should not have direct access to production credentials. Use a least-privilege model: staging agents have staging credentials, production agents have production credentials.

### Jenkins Kubernetes Plugin

Run builds as ephemeral Kubernetes pods:

```yaml
# Jenkinsfile with kubernetes agent
pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                    - name: python
                      image: python:3.11-slim
                      command: [sleep, infinity]
                    - name: docker
                      image: docker:24-dind
                      securityContext:
                        privileged: true
                  volumes:
                    - name: docker-socket
                      emptyDir: {}
            '''
            defaultContainer 'python'
        }
    }
    stages {
        stage('Test') {
            steps {
                sh 'pytest'
            }
        }
        stage('Build') {
            steps {
                container('docker') {
                    sh 'docker build -t myapp:latest .'
                }
            }
        }
    }
}
```

Each build gets its own pod, cleaned up after. No state pollution between builds.

---

## GitHub Actions

### Architecture

GitHub Actions is event-driven CI/CD. Workflows are triggered by GitHub events (push, PR, tag, schedule, manual) and run on GitHub-hosted or self-hosted runners.

```
GitHub Event (push to main)
    → Triggers Workflow
    → Workflow has Jobs
    → Jobs have Steps
    → Steps run on Runners (VMs or containers)
```

Each job starts a fresh runner VM (GitHub-hosted) or runs on your configured self-hosted runner.

### Core YAML Structure

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, 'release/*']
  pull_request:
    branches: [main]
  workflow_dispatch:             # manual trigger
    inputs:
      environment:
        type: choice
        options: [staging, production]

env:
  REGISTRY: ghcr.io
  IMAGE: ghcr.io/${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:                    # sidecar services (like Docker Compose)
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip

      - run: pip install -r requirements.txt
      - run: pytest --cov=src tests/
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost/test

  build-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
      id-token: write    # for OIDC authentication

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE }}:latest
            ${{ env.IMAGE }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Sign image
        uses: sigstore/cosign-installer@v3
        run: |
          cosign sign --yes ${{ env.IMAGE }}@${{ steps.build-push.outputs.digest }}

  deploy-staging:
    needs: build-push
    runs-on: ubuntu-latest
    environment: staging   # requires environment protection rules

    steps:
      - uses: actions/checkout@v4

      - name: Update image tag in manifests
        run: |
          cd k8s-manifests/apps/myapp/staging
          kustomize edit set image myapp=${{ env.IMAGE }}:${{ github.sha }}
          git config user.email "ci@company.com"
          git config user.name "CI Bot"
          git add .
          git commit -m "Update myapp image to ${{ github.sha }}"
          git push
```

### Secrets and Environments

GitHub Actions provides two levels of secrets:
- **Repository secrets**: available to all workflows in the repo
- **Environment secrets**: only available to jobs targeting that environment

Environments can have required reviewers (approval gates) and deployment rules:

```yaml
# In GitHub repository settings → Environments → production
# Required reviewers: [alice, bob]
# Wait timer: 30 minutes (cool-down after deploy)
# Deployment branches: main only
```

In the workflow, reference the environment:
```yaml
jobs:
  deploy-production:
    environment:
      name: production
      url: https://myapp.company.com
    # This job will pause until required reviewers approve
```

### OIDC — No Long-Lived Secrets

Instead of storing cloud credentials as GitHub secrets, use OIDC (OpenID Connect). GitHub Actions gets a short-lived token (15 min) that proves "this is GitHub Actions running workflow X in repo Y":

```yaml
# No AWS credentials in secrets!
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions-deploy
    aws-region: us-east-1
    # GitHub provides the OIDC token automatically
```

AWS IAM role trust policy:
```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:org/myrepo:ref:refs/heads/main"
    }
  }
}
```

### Self-Hosted Runners

For builds that need access to internal resources (VPNs, private registries, on-premise), use self-hosted runners:

```yaml
jobs:
  deploy-internal:
    runs-on: [self-hosted, linux, prod-network]
```

Self-hosted runners run as a service on your infrastructure. Security considerations:
- Run in isolated environments (containers, VMs) — not bare metal shared with other workloads
- Never use self-hosted runners on public repositories — anyone who forks the repo can trigger builds
- Rotate runner registration tokens
- Use runner groups to restrict which repositories can use which runners

---

## ArgoCD

### Architecture and GitOps Model

ArgoCD runs inside Kubernetes and continuously reconciles the cluster state with Git:

```
Git repository (desired state)
    → ArgoCD Application CR (defines what to watch and where to deploy)
    → ArgoCD reconciliation loop (every 3 minutes or on webhook)
    → Kubernetes API (actual state)
```

If someone manually changes a resource in Kubernetes, ArgoCD detects the drift and can auto-heal (revert to Git) or just report the drift.

### Application CR

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  project: production

  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: main
    path: apps/myapp/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true        # delete resources removed from git
      selfHeal: true     # revert manual changes
      allowEmpty: false  # don't sync if manifests directory is empty
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true   # delete resources after creating new ones
      - ApplyOutOfSyncOnly=true  # only sync resources that differ

  # Ignore differences in fields that are set by controllers
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas    # managed by HPA, ignore in drift detection
```

### Projects

ArgoCD Projects restrict what an Application can do:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  # Only allow deploying to production namespace on prod cluster
  destinations:
    - namespace: production
      server: https://prod-cluster.example.com

  # Only allow manifests from specific repos
  sourceRepos:
    - 'https://github.com/org/k8s-manifests'
    - 'https://charts.helm.sh/stable'

  # What Kubernetes resources can this project deploy
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  namespaceResourceWhitelist:
    - group: 'apps'
      kind: Deployment
    - group: ''
      kind: Service

  # RBAC for who can sync/deploy in this project
  roles:
    - name: deployer
      policies:
        - p, proj:production:deployer, applications, sync, production/*, allow
      groups:
        - platform-team
```

### Sync Waves and Hooks

For complex deployments with ordering requirements:

```yaml
# Database migration Job — must complete before application starts
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync        # run before main sync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded  # delete on success
    argocd.argoproj.io/sync-wave: "-1"      # negative wave runs first
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:latest
          command: ["python", "manage.py", "migrate"]
      restartPolicy: Never

---
# Application Deployment — runs in wave 0 (default)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

### Image Updater

ArgoCD Image Updater watches container registries and automatically updates image tags in Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=registry.io/org/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: digest  # or semver, latest
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
```

When a new image is pushed, Image Updater commits the new digest to Git, ArgoCD picks up the change and deploys.

### Notifications

```yaml
# ArgoCD Notifications — alert on sync failures
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [slack-sync-failed]
  template.slack-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync failed.
      Error: {{.app.status.operationState.message}}
```

---

## Comparing the Tools

| Aspect | Jenkins | GitHub Actions | ArgoCD |
|--------|---------|---------------|--------|
| Self-hosted | Yes (required) | Optional | Yes (required, runs in K8s) |
| Cloud-native | Plugin-based | Native | Native |
| Kubernetes deploy | Via kubectl plugin | Via kubectl steps | Built-in GitOps |
| Audit trail | Build logs | Workflow logs | Git history + sync logs |
| RBAC | Plugin-based | GitHub teams/environments | Native, project-based |
| Drift detection | Manual | Manual | Automated |
| Best for | Complex pipelines, on-prem | Cloud, GitHub-centric teams | K8s deployment management |

### How They Compose

A common modern architecture:

```
GitHub Actions (CI)
    → Build, test, scan, push image
    → Update image tag in manifests repo (git commit)
ArgoCD (CD)
    → Watches manifests repo
    → Deploys to Kubernetes when manifests change
```

CI and CD are cleanly separated. CI doesn't need Kubernetes credentials. ArgoCD is the only thing that touches Kubernetes.

---

## Common Failure Modes

**Jenkins agent zombie processes:** Agent containers from failed builds not cleaned up. Causes resource exhaustion. Fix: configure pod cleanup on timeout, use the Kubernetes plugin with ephemeral pods.

**GitHub Actions secret leakage:** A step prints an env var containing a secret. GitHub masks known secret values in logs, but only values that match exactly. Use `::add-mask::` for dynamic secrets, avoid `set -x` in scripts.

**ArgoCD OutOfSync but not auto-healing:** Check the diff first — if ArgoCD is fighting with an HPA over `spec.replicas`, add an `ignoreDifferences` for that field. Never set `selfHeal: true` before understanding what ArgoCD is managing.

**ArgoCD sync storm on network partition:** If ArgoCD can't reach the cluster, it queues up retries. On reconnect, multiple syncs may fire. Configure retry limits in the Application CR.

**Slow GitHub Actions due to missing cache:** Without dependency caching, every run reinstalls all packages. Use `actions/cache` or built-in cache options in setup actions (`cache: pip` in setup-python).

---

## Key Questions and Answers

**Q: What is GitOps and how does ArgoCD implement it?**

GitOps is the practice of using Git as the single source of truth for both application and infrastructure desired state. Changes to the system happen only through Git (PR → merge → auto-deploy). ArgoCD implements this by running inside Kubernetes as an operator. It watches Git repositories, compares manifests in Git to actual Kubernetes state, and automatically reconciles differences. If someone makes a manual change in the cluster, ArgoCD detects drift and (with `selfHeal: true`) reverts it to match Git.

**Q: How do you securely give GitHub Actions access to AWS without storing credentials?**

Use OIDC (OpenID Connect). GitHub Actions generates a short-lived OIDC token that proves the identity of the workflow. AWS has an IAM OIDC identity provider configured for GitHub's token endpoint. The IAM role trust policy specifies exactly which repository and branch can assume the role. The workflow uses `aws-actions/configure-aws-credentials` with `role-to-assume`. No long-lived credentials are stored in GitHub Secrets — the OIDC token expires in 15 minutes.

**Q: Jenkins vs GitHub Actions — how do you choose?**

Jenkins is better when: you need builds to access private network resources (internal artifact stores, on-premise databases), you need complex custom plugin integrations, your organization is already heavily invested in Jenkins, or you're not using GitHub. GitHub Actions is better when: you use GitHub for source control, you want minimal ops overhead (no infra to manage), you need cloud-native integrations (OIDC, direct GitHub integration), and your builds can reach resources over the internet. Many teams use both: GitHub Actions for CI, Jenkins for complex deployment pipelines that need VPN access.

**Q: How do you handle ArgoCD managing resources that are also modified by controllers (like HPA changing replica count)?**

Use `ignoreDifferences` in the Application spec to tell ArgoCD to ignore specific fields that are legitimately managed by other controllers. For replica count managed by HPA:
```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas
```
Without this, ArgoCD continuously fights with HPA — ArgoCD sets replicas to the value in Git, HPA changes it, ArgoCD detects drift and resets it, repeat forever.

---

## Points to Remember

- Jenkins: controller coordinates, agents execute — never run builds on the controller
- Jenkinsfile defines pipelines as code: stages, steps, post-conditions
- GitHub Actions: event-driven, jobs run on runners (hosted or self-hosted)
- Use OIDC for cloud authentication in GitHub Actions — no long-lived secrets
- GitHub Environments provide approval gates and scoped secrets for production deployments
- ArgoCD: GitOps operator that continuously reconciles cluster to match Git
- ArgoCD Projects restrict what repos and namespaces an Application can use
- Sync waves control deployment ordering (migrations before app, etc.)
- Use `ignoreDifferences` for fields managed by HPA, operators, or controllers
- Separate CI (build/test/push) from CD (deploy) — clean boundary at the image registry
- Always test rollback; not just deploy

## What to Study Next

- [CI/CD and Trusted Delivery](./cicd-trusted-delivery-and-platform-security) — security and deployment strategies
- [YAML and Kubernetes Manifest Design](./yaml-and-kubernetes-manifest-design) — manifests in GitOps repos
- [Git and Version Control](./git-and-version-control-for-platform-engineers) — branching strategies for delivery pipelines
