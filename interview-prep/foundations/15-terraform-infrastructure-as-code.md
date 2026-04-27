# Terraform and Infrastructure as Code

Terraform is how modern teams design, review, build, and maintain infrastructure like code instead of tribal memory.

The easiest way to remember it is as city planning with approved blueprints.

---

## What This Foundation Must Help You Do

By the end of this guide, you should be able to:

- explain declarative infrastructure clearly
- understand state, plan, apply, drift, and modules
- build safer multi-environment cloud platforms
- integrate Terraform into CI/CD and GitOps workflows
- avoid destructive mistakes in production
- answer IaC interviews like a senior engineer

---

## Memory Palace: Terraform Is A City Planner

Imagine building and operating a growing city.

| Terraform concept | City planner analogy | Production meaning |
|---|---|---|
| `.tf` files | Approved blueprints | Desired infrastructure definition |
| Provider | Construction contractor | Cloud/API translator |
| Resource | Building / road / utility | Real infra object |
| Module | Reusable building design | Standardized component |
| Variable | Permit parameters | Inputs per environment |
| Output | Utility map / handoff docs | Exported values |
| State file | Master city ledger | What Terraform believes exists |
| Plan | Proposed construction changes | Preview diff |
| Apply | Approved construction phase | Execute changes |
| Destroy | Demolition permit | Remove resources |
| Drift | Illegal/untracked construction | Manual changes outside code |
| Locking | Single permit desk | Prevent concurrent changes |
| Workspace | Alternate city instance | Separate state context |

### Story: Buildings Do Not Match The Blueprint

A junior engineer says: “Just click in the console.”

A senior engineer asks:

1. Does the blueprint define the change?
2. Does the city ledger already know this building exists?
3. Will this change replace a bridge or edit it safely?
4. Is another construction crew already applying changes?
5. Can we roll back if this plan is wrong?

Technical translation:

- console edits create drift
- state determines safe reconciliation
- replacement resources can cause downtime
- concurrent applies corrupt workflows

---

## Senior Mental Model

Terraform manages three realities:

1. **Desired state** — your code.
2. **Recorded state** — Terraform state file.
3. **Actual reality** — cloud provider resources.

`terraform plan` compares these worlds.

A senior engineer never applies blindly. They read the diff and understand blast radius.

---

## Core Workflow

```text
Write config -> terraform init -> terraform plan -> review -> terraform apply -> verify
```

## init

Downloads providers and configures backend.

## plan

Shows proposed changes.

## apply
nMakes approved changes and updates state.

## destroy

Removes managed resources (dangerous in production).

---

## Reading A Plan Safely

| Symbol | Meaning |
|---|---|
| `+` | create |
| `~` | update in place |
| `-` | destroy |
| `-/+` | replace resource |

Most dangerous symbol:

> `-/+` means destroy then recreate or forced replacement.

Examples where replacement may hurt:

- load balancers
- databases
- IP-bound resources
- node groups

---

## State: The Master City Ledger

State answers:

- what resources are managed?
- what IDs map to code objects?
- what outputs exist?
- what changed last run?

Best practices:

- remote backend (S3/GCS/etc.)
- encryption at rest
- versioning enabled
- locking enabled
- limited access

Never store critical prod state only on a laptop.

---

## Modules: Reusable Building Designs

Use modules for repeated patterns.

Examples:

- standard VPC
- EKS cluster baseline
- secure S3 bucket
- RDS with alarms and backups

Good modules provide:

- sane defaults
- variables for environment differences
- outputs for composition
- documented contracts

Bad modules hide everything and over-abstract.

---

## Drift: Illegal Construction

Drift occurs when someone changes infrastructure outside Terraform.

Examples:

- security group edited in console
- manual subnet route change
- instance resized manually
- bucket policy changed ad hoc

Detection:

```bash
terraform plan
```

Response:

- codify desired change in Terraform
- or intentionally import/update state strategy
- reduce manual access patterns

---

## Multi-Environment Strategy

Prefer clear separation:

```text
environments/
  dev/
  staging/
  prod/
modules/
  network/
  eks/
  observability/
```

Why:

- smaller blast radius
- clearer approvals
- easier ownership boundaries

---

## CI/CD Integration

Safe pattern:

```text
PR -> terraform fmt -> validate -> plan -> human review -> merge -> apply with approval
```

Strong controls:

- production approval gates
- plan attached to PR
- OIDC/workload identity instead of static cloud keys
- audit logs enabled

---

## Real Incident Stories

## Scenario 1: Someone Changed Security Group In Console

Wrong assumption: quick fix complete.

Better path:

- run plan
- inspect drift
- codify intended rule in Terraform
- apply cleanly

## Scenario 2: Apply Wants To Replace Database

Wrong assumption: approve quickly.

Better path:

- inspect why replacement required
- consider lifecycle protections
- redesign migration path
- schedule maintenance if unavoidable

## Scenario 3: Two Engineers Apply Simultaneously

Wrong assumption: harmless.

Likely outcome:

- state conflict
- partial changes
- confusion

Use backend locking.

## Scenario 4: Giant Monolithic State Slows Everything

Better path:

Split by layer/environment.

---

## Command Interpretation Table

| Command | What it answers | Bad signs | Next step |
|---|---|---|---|
| `terraform fmt` | Is code standardized? | noisy diff | format before review |
| `terraform validate` | Is config structurally valid? | schema errors | fix config |
| `terraform plan` | What will change? | unexpected destroy/replace | inspect diff |
| `terraform apply` | Execute approved change | partial failure | inspect logs/state |
| `terraform state list` | What is managed? | missing resources | import/reconcile |
| `terraform output` | What values exported? | stale/missing values | inspect apply/state |

---

## Kubernetes / Cloud Connection

- Terraform often creates VPCs, clusters, IAM, registries, DNS, observability foundations.
- Kubernetes apps may deploy via GitOps while clusters are provisioned by Terraform.
- Cloud drift can appear as Kubernetes incidents later.
- IAM mistakes in Terraform can break CI/CD or workloads instantly.

---

## Hands-On Drill

Design a small production stack:

1. VPC/network module
2. Kubernetes or compute module
3. Database module
4. Monitoring module
5. Separate dev/prod states
6. PR-based plan/apply flow

Then explain where blast radius exists.

---

## Interview Answer Shape

If asked, “How would you manage production cloud infrastructure safely?” a strong answer is:

> I would define infrastructure declaratively in Terraform, separate environments and layers into clear state boundaries, store state remotely with locking and versioning, and run plan output through pull-request review before apply. I would treat unexpected destroy or replacement actions as high-risk events requiring explicit review. Manual console changes would be minimized because drift reduces trust in the system.

---

## Recall Prompts

- In the planner model, what is state?
- Why is drift dangerous?
- Why is `-/+` in a plan high risk?
- Why split state by layer/environment?
- Why should prod apply require approval?

---

## What To Study Next

- CI/CD and trusted delivery
- AWS cloud services and platform design
- Git and version control for platform engineers
- System design and cloud architecture
