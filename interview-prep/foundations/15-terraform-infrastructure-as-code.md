# Foundations: Terraform And Infrastructure As Code Zero To Hero

Terraform is an infrastructure-as-code tool for defining, reviewing, building, and maintaining infrastructure through version-controlled configuration instead of manual console work.

For SRE and platform engineers, Terraform is a safety system: it makes infrastructure reviewable, reproducible, auditable, and recoverable.

This guide is designed as a complete path:

- Beginner: IaC, providers, resources, variables, plan/apply
- Intermediate: modules, remote state, environments, imports, data sources
- Advanced: state operations, lifecycle rules, for_each, CI/CD, drift detection, policy checks
- SRE Level: avoid risky applies, recover state, debug drift, manage blast radius
- Interview Level: explain Terraform tradeoffs and production workflows clearly

---

# Part 1: Terraform Mental Model

Terraform is declarative.

You describe desired state. Terraform compares desired state with recorded state and real infrastructure, then proposes changes.

```text
Configuration (.tf files) -> terraform plan -> provider API calls -> real infrastructure
                         -> state file records mapping
```

Terraform manages three realities:

| Reality | Meaning |
|---|---|
| Desired state | what your code says should exist |
| Recorded state | what Terraform state believes exists |
| Actual reality | what the cloud/provider API reports |

`terraform plan` compares these worlds.

---

# Part 2: Memory Palace — Terraform Is A City Planner

| Terraform concept | City planner analogy | Production meaning |
|---|---|---|
| `.tf` files | approved blueprints | desired infrastructure |
| Provider | construction contractor | API translator |
| Resource | building or utility | real infrastructure object |
| Module | reusable building design | standardized component |
| Variable | permit parameter | input value |
| Output | utility map | exported value |
| State file | master city ledger | resource mapping and metadata |
| Plan | construction proposal | preview of changes |
| Apply | construction execution | make changes |
| Destroy | demolition permit | remove resources |
| Drift | untracked construction | manual change outside code |
| Locking | single permit desk | prevent concurrent applies |

---

# Part 3: Install And First Workflow

Core commands:

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
terraform destroy
```

Workflow:

```text
write config -> init -> fmt -> validate -> plan -> review -> apply -> verify
```

Never treat `apply` as a blind next button. Read the plan.

---

# Part 4: Providers

Providers are plugins that talk to external APIs.

Example:

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

Pin provider versions. Provider upgrades can change behavior.

---

# Part 5: Resources

Resources define real infrastructure objects.

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "example-prod-logs"

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}
```

Reference syntax:

```hcl
aws_s3_bucket.logs.id
```

Think carefully before renaming resources. Terraform addresses are part of state mapping.

---

# Part 6: Variables, Locals, And Outputs

## Variables

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}
```

## Locals

```hcl
locals {
  name_prefix = "${var.environment}-${var.service}"
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Outputs

```hcl
output "bucket_name" {
  value       = aws_s3_bucket.logs.bucket
  description = "Log bucket name"
}
```

Outputs connect modules and layers.

---

# Part 7: State

State maps Terraform resource addresses to real provider objects.

It may contain sensitive values.

Production state should use:

- remote backend
- encryption
- versioning
- locking
- restricted access

AWS example:

```hcl
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Never store production state only on a laptop.

---

# Part 8: Reading Plans Safely

Plan symbols:

| Symbol | Meaning | Risk |
|---|---|---|
| `+` | create | usually low |
| `~` | update in place | medium |
| `-` | remove | high |
| `-/+` | replace | very high |
| `<=` | read data source | low |

Danger:

> `-/+` often means downtime or data loss if the resource is stateful.

Always review changes to databases, load balancers, subnets, clusters, IAM policies, security groups, and DNS records.

---

# Part 9: Modules

A module is a reusable Terraform package.

```text
modules/vpc/
  main.tf
  variables.tf
  outputs.tf
  versions.tf

environments/prod/
  main.tf
  terraform.tfvars
```

Use modules for repeated patterns:

- VPC
- EKS baseline
- RDS
- S3 bucket with security defaults
- IAM role pattern

Good modules have clear inputs, useful outputs, sane defaults, minimal hidden behavior, and versioning.

---

# Part 10: for_each vs count

Use `for_each` for named resources.

```hcl
resource "aws_subnet" "private" {
  for_each = var.private_subnets

  cidr_block        = each.value.cidr
  availability_zone = each.value.az
  vpc_id            = aws_vpc.main.id
}
```

`count` can cause index-shift replacement problems when list order changes.

Use `count` only when instances are truly identical and order does not matter.

---

# Part 11: Data Sources

Data sources read existing things without managing them.

```hcl
data "aws_region" "current" {}

data "aws_vpc" "shared" {
  tags = {
    Name = "shared-vpc"
  }
}
```

Use data sources when another layer or team owns the resource.

---

# Part 12: Import And State Operations

Import existing infrastructure:

```bash
terraform import aws_s3_bucket.logs example-prod-logs
```

Inspect state:

```bash
terraform state list
terraform state show aws_s3_bucket.logs
```

Move resource address safely:

```bash
terraform state mv aws_instance.web aws_instance.app
```

Remove from Terraform management without changing the real resource:

```bash
terraform state rm aws_instance.legacy
```

State commands are powerful. Use them with review and backups.

---

# Part 13: Lifecycle Rules

Protect critical resources:

```hcl
resource "aws_db_instance" "main" {
  lifecycle {
    prevent_destroy = true
  }
}
```

Other lifecycle controls:

```hcl
lifecycle {
  ignore_changes = [tags]
  create_before_destroy = true
}
```

Use carefully. Lifecycle rules can hide real drift if abused.

---

# Part 14: Drift

Drift means actual infrastructure changed outside Terraform.

Examples:

- manual security group edit
- console change to database setting
- subnet route modified manually
- tag changed by another system

Detect:

```bash
terraform plan
terraform plan -detailed-exitcode
```

Response:

- codify intended change
- revert unintended change
- import or move state if ownership changed
- reduce manual access if drift repeats

---

# Part 15: Environment Strategy

Recommended layout:

```text
environments/
  dev/
  staging/
  prod/
modules/
  vpc/
  eks/
  rds/
```

Why separate environments?

- smaller blast radius
- clearer approvals
- different state files
- easier access control
- safer promotion path

Workspaces can be useful for temporary copies, but separate directories and states are usually clearer for prod/staging/dev.

---

# Part 16: CI/CD For Terraform

Safe pattern:

```text
PR -> terraform fmt -check -> validate -> plan -> review plan -> merge -> apply with approval
```

GitHub Actions sketch:

```yaml
name: Terraform
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
        working-directory: environments/prod
      - run: terraform fmt -check -recursive
      - run: terraform validate
        working-directory: environments/prod
      - run: terraform plan -out=tfplan
        working-directory: environments/prod
```

Use OIDC or workload identity instead of static cloud keys.

---

# Part 17: Policy And Guardrails

Useful controls:

- branch protection
- required plan review
- production approval environments
- OPA/Conftest policies
- Checkov or tfsec scanning
- cost estimation
- drift detection
- protected state backend

Policy examples:

- storage should not be publicly exposed by accident
- SSH access should be tightly scoped
- databases should have backups
- prod resources should have tags
- critical resources should have lifecycle protection

---

# Part 18: Real Incident Stories

## Plan Wants To Replace Database

Do not approve automatically.

Check:

- which attribute forces replacement
- whether migration path exists
- whether lifecycle protection should exist
- whether change belongs in a maintenance window

## State Lock Stuck

Likely cause:

- interrupted apply

Action:

- verify no active apply
- inspect backend lock
- unlock carefully

## Console Hotfix Disappeared

Cause:

- Terraform reverted drift on next apply

Fix:

- codify hotfix in Terraform
- review access process

## Giant Monolithic State Caused Fear

Cause:

- too many unrelated resources in one state

Fix:

- split by environment, layer, or ownership

---

# Part 19: Troubleshooting By Symptom

## Init Fails

Check:

- backend access
- provider registry access
- Terraform version
- credentials

## Plan Shows Unexpected Removal

Check:

- resource removed or renamed
- provider version changed
- replacement-causing attribute
- state mismatch

## Apply Fails Midway

Check:

- provider error
- partial real infrastructure changes
- state update status
- rerun plan before retry

## Access Denied

Check:

- assumed role
- cloud audit logs
- provider config
- organization policies or permission boundary

---

# Part 20: Command Interpretation Table

| Command | What it answers | Bad signs |
|---|---|---|
| `terraform fmt` | code style | inconsistent formatting |
| `terraform validate` | syntax/schema | invalid config |
| `terraform plan` | proposed change | unexpected remove/replace |
| `terraform apply` | execute approved plan | partial failure |
| `terraform state list` | what is managed | missing/unexpected resources |
| `terraform import` | add existing resource | wrong address/id |
| `terraform output` | exported values | stale or missing data |
| `terraform providers` | provider dependency view | old/unpinned providers |

---

# Part 21: Labs

## Beginner

- create local file resource
- create S3 bucket in dev
- use variables and outputs

## Intermediate

- configure remote state
- write reusable VPC module
- import existing bucket
- split dev/prod states

## Advanced

- add CI plan workflow
- detect drift with scheduled plan
- add policy checks
- recover from renamed resource with `state mv`
- protect database resource with lifecycle rule

---

# Part 22: Interview Questions

- What is Terraform state and why does it matter?
- Declarative vs imperative infrastructure?
- Why is `-/+` dangerous?
- How do you manage multiple environments?
- When would you use a module?
- `count` vs `for_each`?
- How do you handle drift?
- How would you safely import existing infrastructure?

---

# Part 23: Senior Answer Shape

> I treat Terraform as the source of truth for infrastructure, with remote locked state, separated environment/layer boundaries, plan review in pull requests, and approval gates for production applies. I pay special attention to remove and replacement operations, protect critical resources, avoid manual console drift, and use modules to standardize safe infrastructure patterns without hiding important details.

---

# Recall Prompts

- Why is state sensitive?
- Why use remote locking?
- Why is `for_each` safer than `count` for named resources?
- Why should prod state be separate from dev?
- Why should policy checks run before apply?
