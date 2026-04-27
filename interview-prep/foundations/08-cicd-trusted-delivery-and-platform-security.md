# CI/CD, Trusted Delivery, and Platform Security

CI/CD is the system that moves an idea from source code into safe production reality.

The easiest way to remember it is as a factory assembly line with quality control.

---

## What This Foundation Must Help You Do

By the end of this guide, you should be able to:

- explain CI vs CD clearly
- design pipelines that are fast, safe, and trusted
- choose rollout strategies such as rolling, canary, blue-green, and feature flags
- understand GitOps reconciliation models
- secure the software supply chain
- answer platform delivery interviews like a senior engineer

---

## Memory Palace: CI/CD Is A Factory Assembly Line

Imagine a modern factory producing high-value equipment.

| CI/CD concept | Factory analogy | Production meaning |
|---|---|---|
| Git commit | Raw materials arriving | New change request |
| Pull request | Design review desk | Human review before build |
| CI trigger | Conveyor starts | Pipeline begins |
| Lint / unit tests | Basic quality checks | Fast validation |
| Integration tests | Full-system test chamber | Real interaction validation |
| Security scan | Safety inspection | SAST / dependency / image scan |
| Build artifact | Finished product | Binary/container/image |
| Registry | Warehouse | Artifact storage |
| Deploy pipeline | Shipping dock | Release path |
| Canary release | Pilot shipment | Small rollout first |
| Blue-green | Two warehouses, traffic switch | Instant rollback strategy |
| Feature flag | Product switch disabled until launch | Release separate from deploy |
| Rollback | Product recall | Restore previous good version |
| GitOps controller | Automated warehouse robot | Reconciles desired state |
| Signing / provenance | Tamper seal | Trusted artifact verification |

### Story: Customers Report Defects

A junior engineer says: “Ship faster.”

A senior engineer asks:

1. Did raw materials change? Commit history.
2. Did inspection fail but get ignored? Test gate bypass.
3. Was the product tampered with? Supply chain trust.
4. Did only one shipment batch fail? Canary cohort.
5. Can we recall safely now? Rollback path.

Technical translation:

- speed without gates creates outages
- slow pipelines cause engineers to bypass process
- no rollback means high deployment risk
- provenance matters as much as functionality

---

## Senior Mental Model

A mature delivery system optimizes four things simultaneously:

1. **Speed** — developers get feedback quickly.
2. **Safety** — broken changes stop early.
3. **Trust** — only verified artifacts deploy.
4. **Recoverability** — rollback is easy.

If you improve speed while harming safety, you created risk.
If you improve safety while making pipelines unusably slow, engineers route around you.

---

## CI vs CD

| Term | Meaning |
|---|---|
| Continuous Integration | Every change is built, tested, scanned |
| Continuous Delivery | Every good change is deployable, prod release usually approved |
| Continuous Deployment | Every successful change auto-reaches production |

Most mature enterprises prefer continuous delivery with strong automation.

---

## Fast Pipeline Flow

```text
Commit -> PR Review -> CI -> Build -> Scan -> Artifact Registry -> Staging -> Production -> Observe
```

Golden rule:

> Fail fast and fail left.

Cheap checks first, expensive checks later.

---

## Pipeline Gates That Matter

## Early Gates (Fast)

- formatting
- linting
- unit tests
- secret scanning
- policy checks

## Mid Gates

- build success
- dependency vulnerability scan
- image scan
- contract tests

## Late Gates

- integration tests
- staging smoke tests
- approval gates
- progressive rollout analysis

---

## Deployment Strategies

## Rolling Update

Replace instances gradually.

Best for:

- common stateless services
- Kubernetes Deployments

Risk:

- bad version spreads if metrics are not watched.

## Canary

Ship to a small percentage first.

Best for:

- risky changes
- high-traffic systems with observability

Use progression like:

5% -> 25% -> 50% -> 100%

## Blue-Green

Two production environments.

Traffic flips from blue to green.

Best for:

- instant rollback needs
- stable infra patterns

Tradeoff:

- double capacity cost.

## Feature Flags

Deploy code dark. Release later.

Best for:

- decoupling deploy from release
- rapid rollback without redeploy
- experiments / cohort rollout

---

## GitOps: The Automated Warehouse Robot

Desired state lives in Git.

Flow:

```text
Developer change -> CI builds image -> manifest updated in Git -> ArgoCD/Flux detects drift -> cluster reconciles
```

Benefits:

- auditable history
- easy rollback via Git revert
- drift correction
- safer operations model

---

## Supply Chain Security: Tamper Seals

Ask:

- who built this artifact?
- from what source commit?
- were dependencies trusted?
- was the image signed?
- can production verify provenance?

Useful controls:

- pinned dependencies
- SBOM generation
- image signing (Cosign)
- SLSA maturity practices
- registry restrictions
- admission policies

---

## Secrets Handling

Never:

- commit secrets to Git
- bake secrets into images
- print secrets in logs
- overgrant CI credentials

Prefer:

- Vault / cloud secret manager
- workload identity
- short-lived credentials
- least privilege service accounts

---

## Real Incident Stories

## Scenario 1: Pipeline Takes 45 Minutes

Wrong assumption: more checks = safer.

Better path:

- parallelize jobs
- cache dependencies
- split fast vs slow suites
- run targeted tests by change scope

Why it matters:

Slow pipelines cause human bypass behavior.

## Scenario 2: Deploy Caused Error Spike

Wrong assumption: keep debugging in prod immediately.

Better path:

1. compare deploy timestamp with metrics shift
2. rollback or pause rollout
3. confirm recovery
4. inspect diff afterward

## Scenario 3: Registry Compromise Concern

Wrong assumption: image exists, so trust it.

Better path:

- verify signature
- verify source provenance
- verify digest pinned in manifests

## Scenario 4: Hotfix Needed During Incident

Wrong assumption: bypass all controls.

Better path:

- use emergency branch/process
- keep minimum tests
- require visible approval
- follow with retrospective cleanup PR

---

## Command / Tool Interpretation Table

| Tool | What it answers | Bad signs | Next step |
|---|---|---|---|
| CI run history | Which gate failed? | repeated flaky stage | stabilize tests |
| Coverage report | What changed untested? | critical path uncovered | add tests |
| Image scan | Is artifact vulnerable? | critical CVEs | patch/rebuild |
| Registry digest | Exactly what will deploy? | mutable tag only | pin digest |
| ArgoCD sync status | Is cluster at desired state? | OutOfSync/Degraded | inspect manifests/events |
| Deploy metrics | Did rollout hurt users? | errors/latency rise | rollback/pause |
| Audit log | Who approved/released? | unclear ownership | tighten controls |

---

## Kubernetes / Cloud Connection

- Rolling updates depend on readiness probes.
- Canary depends on observability quality.
- GitOps depends on healthy controllers and RBAC.
- Secret managers depend on IAM/workload identity.
- Multi-region rollout should sequence blast radius.

---

## Hands-On Drill

Take one service and design:

1. CI stages under 10 minutes.
2. Security gates.
3. Artifact signing.
4. Canary rollout with rollback rule.
5. GitOps promotion flow.

Then explain why each step exists.

---

## Interview Answer Shape

If asked, “How would you design a safe deployment platform?” a strong answer is:

> I would optimize for fast feedback, strong trust, and easy recovery. Every change should pass lint, tests, scans, and produce an immutable signed artifact. Production rollout would use progressive delivery such as canary or blue-green with automated metric checks. Desired state would live in Git and be reconciled by ArgoCD or Flux. Secrets would come from a dedicated manager with least privilege identities. Most importantly, rollback must be faster than root-cause analysis.

---

## Recall Prompts

- In the factory model, what is a registry?
- Why is slow CI dangerous culturally?
- When is canary better than blue-green?
- Why pin image digests instead of mutable tags?
- Why should rollback be faster than debugging?

---

## What To Study Next

- Delivery systems: Jenkins, GitHub Actions, and ArgoCD
- Terraform and Infrastructure as Code
- YAML and Kubernetes manifest design
- Git and version control for platform engineers
