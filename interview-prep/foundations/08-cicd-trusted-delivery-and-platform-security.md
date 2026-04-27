# Foundations: CI/CD, Trusted Delivery, And Platform Security Zero To Hero

CI/CD is the system that moves a change from source code into safe production reality.

For SRE and platform engineers, CI/CD is not only about automation. It is about reducing deployment risk, proving artifact trust, shortening feedback loops, and making rollback faster than panic.

This guide is designed as a complete path:

- Beginner: CI, CD, pipelines, artifacts, environments
- Intermediate: tests, builds, registries, approvals, rollout strategies
- Advanced: GitOps, OIDC, SBOM, signing, provenance, policy gates, progressive delivery
- SRE Level: debug failed deploys, bad rollouts, flaky pipelines, secrets issues, rollback gaps
- Interview Level: explain safe delivery systems and tradeoffs clearly

---

# Part 1: Memory Palace — CI/CD Is A Factory

| CI/CD concept | Factory analogy | Production meaning |
|---|---|---|
| Commit | raw material | proposed change |
| Pull request | design review desk | human review |
| CI pipeline | inspection conveyor | automated validation |
| Unit test | small quality check | local behavior check |
| Integration test | assembly test chamber | system interaction check |
| Security scan | safety inspection | dependency/code/image risk check |
| Artifact | finished product | image/binary/package |
| Registry | warehouse | artifact storage |
| Deployment | shipping dock | release to environment |
| Canary | pilot shipment | small rollout first |
| Blue-green | two warehouses | fast traffic switch/rollback |
| Rollback | product recall | restore previous safe version |
| Signature | tamper seal | artifact trust proof |

---

# Part 2: CI vs CD

## Continuous Integration

Every change is integrated and validated frequently.

Typical CI checks:

- format
- lint
- unit tests
- type checks
- build
- dependency scan
- secret scan

## Continuous Delivery

Every validated change is deployable, but production may require approval.

## Continuous Deployment

Every validated change automatically deploys to production.

Most teams should mature toward continuous delivery first.

---

# Part 3: Pipeline Anatomy

Typical path:

```text
PR -> lint -> test -> build -> scan -> sign -> publish artifact -> deploy staging -> smoke test -> approve -> production -> observe
```

Principle:

> Cheap checks early, expensive checks later.

Fast feedback prevents engineers from bypassing the system.

---

# Part 4: Artifact Strategy

An artifact is what you deploy.

Examples:

- container image
- binary
- package
- Helm chart
- Terraform plan
- static site build

Production artifacts should be:

- immutable
- versioned
- traceable to source commit
- scanned
- optionally signed
- stored in a trusted registry

Avoid deploying from a developer laptop.

---

# Part 5: Testing Strategy

| Test type | Purpose | Placement |
|---|---|---|
| unit | small logic | early CI |
| integration | components together | mid pipeline |
| contract | API compatibility | mid pipeline |
| e2e | user journey | staging/pre-prod |
| smoke | basic production health | after deploy |
| load | capacity/regression | scheduled or gated |

Do not rely only on e2e tests. They are useful but slow and flaky if overused.

---

# Part 6: Security Gates

Trusted delivery needs security checks.

Common gates:

- secret scanning
- dependency vulnerability scan
- SAST
- container image scan
- IaC scan
- license policy
- SBOM generation
- artifact signing
- admission policy

Goal:

> Block clearly unsafe changes without making normal delivery unusable.

---

# Part 7: Secrets And Credentials

Avoid:

- static cloud keys in CI
- secrets printed in logs
- secrets baked into images
- broad deployment credentials
- shared admin tokens

Prefer:

- OIDC federation
- short-lived credentials
- environment-scoped secrets
- least privilege roles
- workload identity
- external secret managers

A pipeline credential should have only the permissions required for that stage.

---

# Part 8: OIDC For CI/CD

OIDC lets CI systems request short-lived cloud credentials without storing long-lived keys.

Example GitHub Actions permission:

```yaml
permissions:
  contents: read
  id-token: write
```

AWS example:

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/deploy-role
    aws-region: eu-central-1
```

Trust policy should restrict repository, branch, environment, and workflow where possible.

---

# Part 9: Deployment Strategies

## Rolling Update

Gradually replaces old instances.

Best for normal stateless services.

## Canary

Routes small traffic percentage to new version.

Best when metrics are strong.

## Blue-Green

Two environments. Traffic switches from old to new.

Best when rollback speed matters and capacity cost is acceptable.

## Feature Flags

Deploy code disabled, release behavior separately.

Best for risky product behavior, experiments, and quick rollback.

---

# Part 10: Progressive Delivery

Progressive delivery increases rollout only if health remains good.

Example progression:

```text
1% -> 5% -> 25% -> 50% -> 100%
```

Promotion should check:

- error rate
- p95/p99 latency
- saturation
- business transaction success
- logs/traces for new errors

Canary without observability is just delayed failure.

---

# Part 11: GitOps Delivery

GitOps stores desired deployment state in Git.

Flow:

```text
CI builds image -> updates manifest repo -> ArgoCD/Flux syncs cluster -> cluster matches Git
```

Benefits:

- Git audit trail
- drift detection
- rollback via Git revert
- CI does not need broad cluster access

---

# Part 12: Supply Chain Trust

Ask:

- which source commit produced this artifact?
- who approved the change?
- what dependencies were included?
- was the image scanned?
- was the artifact signed?
- can production verify it?

Useful concepts:

- SBOM
- SLSA
- provenance
- Cosign
- admission controller
- digest pinning

Production should prefer image digests over mutable tags.

---

# Part 13: Platform Security Controls

Delivery systems need guardrails:

- protected branches
- required reviews
- required status checks
- CODEOWNERS
- environment approvals
- separate prod credentials
- audit logs
- restricted runners
- artifact retention policy

The goal is not bureaucracy. The goal is safe change at speed.

---

# Part 14: Rollback Design

Rollback options:

- Git revert
- previous image digest
- ArgoCD rollback
- Helm rollback
- blue-green traffic switch
- feature flag disable
- database migration rollback or forward fix

Important:

> Application rollback is easy only if data/schema changes were designed for rollback.

Use expand-and-contract migrations for safer database changes.

---

# Part 15: Common Failure Modes

## Pipeline Too Slow

Symptoms:

- engineers avoid CI
- large PRs accumulate
- hotfixes bypass checks

Fix:

- cache dependencies
- parallelize tests
- split fast/slow suites
- run targeted tests

## Flaky Tests Block Delivery

Fix:

- quarantine flaky tests
- track ownership
- fix root cause
- do not normalize rerun culture

## Deploy Passed But App Broken

Likely gaps:

- shallow health checks
- missing config validation
- no smoke tests
- weak observability

## Rollback Failed

Likely causes:

- database schema incompatibility
- artifact not retained
- no tested rollback path
- config drift

---

# Part 16: Incident Stories

## Bad Deploy Caused Error Spike

Response:

- compare deploy timestamp to metrics
- pause rollout
- rollback if confidence is high
- confirm recovery with user-facing metrics
- investigate after mitigation

## Static Cloud Key Leaked

Response:

- revoke/rotate credential
- audit usage
- replace with OIDC
- tighten permissions

## Mutable Latest Tag Deployed Wrong Image

Response:

- pin image digest
- enforce immutable tags
- improve release metadata

## Canary Failed But Still Promoted

Cause:

- no automated metric gate

Fix:

- gate promotion on SLO-aligned metrics

---

# Part 17: Troubleshooting By Symptom

## CI Fails At Lint

Check:

- formatting rules
- local tool version
- generated files
- changed config

## Image Build Fails

Check:

- Dockerfile order
- dependency registry
- build cache
- platform architecture
- credentials to private packages

## Deploy Fails

Check:

- artifact exists
- manifest references right tag/digest
- cluster credentials
- namespace/RBAC
- rollout events

## Production Degraded After Deploy

Check:

- deploy timeline
- error and latency metrics
- logs/traces by version
- dependency behavior
- rollback readiness

---

# Part 18: Command And Tool Interpretation Table

| Signal/tool | What it answers | Bad signs |
|---|---|---|
| CI run logs | where validation failed | repeated flaky stage |
| test report | what behavior broke | critical path uncovered |
| image scan | artifact risk | critical vulnerability |
| SBOM | dependency inventory | unknown dependency source |
| registry digest | exact artifact | mutable tag only |
| ArgoCD sync | cluster desired state | OutOfSync/Degraded |
| deploy metrics | user impact | errors/latency increase |
| audit log | who changed what | unclear approval path |

---

# Part 19: Labs

## Beginner

- create CI workflow for lint/test
- publish test report
- build container image

## Intermediate

- add image scan
- add environment approval
- deploy to staging
- add smoke test

## Advanced

- configure OIDC cloud auth
- generate SBOM
- sign image
- deploy via GitOps
- implement canary gate
- test rollback from bad version

---

# Part 20: Interview Questions

- CI vs continuous delivery vs continuous deployment?
- Why separate build from deploy?
- Why are mutable tags risky?
- What is OIDC and why is it safer than static keys?
- How do you design rollback?
- What is progressive delivery?
- How do you secure a pipeline?
- Why can database migrations break rollback?

---

# Part 21: Senior Answer Shape

> I design CI/CD around fast feedback, trusted immutable artifacts, least-privilege credentials, observable rollout, and tested rollback. CI validates and publishes the artifact once. CD promotes that artifact through environments using approvals, policy checks, and deployment strategies such as canary or blue-green. For Kubernetes, I prefer GitOps so production desired state is reviewed in Git and drift is visible. I avoid static credentials by using OIDC and make rollback a first-class requirement, especially when database changes are involved.

---

# Recall Prompts

- Why is a registry like a warehouse?
- Why should CI produce one immutable artifact?
- Why is canary weak without metrics?
- Why should production use short-lived credentials?
- Why is rollback a design requirement, not an afterthought?
