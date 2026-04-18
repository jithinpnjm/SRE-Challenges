# Terraform and Infrastructure as Code

## What It Is and Why It Matters

Terraform is an infrastructure-as-code (IaC) tool that lets you define cloud and on-premises infrastructure in declarative configuration files and manage it through a consistent lifecycle: plan → apply → destroy.

The key insight behind IaC is treating infrastructure the same way you treat application code: version-controlled, code-reviewed, tested, and deployed via CI/CD. This eliminates configuration drift (the gradual divergence between what's documented and what's actually deployed), enables reproducible environments, and provides an audit trail of infrastructure changes.

Terraform specifically uses a **declarative model**: you describe the desired state, Terraform figures out how to get there. This is different from imperative scripts (bash, Python) where you describe the steps.

---

## Mental Model

Terraform maintains a **state file** that maps your configuration to real infrastructure. The workflow is:

```
1. Write configuration (.tf files)
2. terraform init   — download providers, set up backend
3. terraform plan   — compare config vs state, show what will change
4. terraform apply  — execute the changes, update state
```

The state file is Terraform's understanding of "what currently exists". If reality drifts from the state (someone manually changed something in the AWS console), `terraform plan` will show a diff.

```
.tf files (desired state)
    ↓
terraform plan
    ↓ compares against
State file (what Terraform thinks exists)
    ↓ also compares against (for refresh)
Real infrastructure (AWS/GCP/Azure APIs)
    ↓
terraform apply → updates real infra + state
```

---

## Core Concepts

### Providers

Providers are plugins that translate Terraform resources into API calls for a specific platform. Each provider is published on the Terraform Registry.

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"        # ~> 5.0 means >= 5.0, < 6.0
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"   # for state locking
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = var.environment
      Team        = "platform"
    }
  }
}
```

### Resources

Resources are the core building blocks — each one represents a real infrastructure object:

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id    # reference to another resource
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-${count.index + 1}"
  }
}
```

Reference syntax: `<resource_type>.<name>.<attribute>` — e.g., `aws_vpc.main.id`.

### Variables and Outputs

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "instance_count" {
  description = "Number of application instances"
  type        = number
  default     = 2
}

# outputs.tf
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

### Locals

Locals are computed values you want to reuse within a module:

```hcl
locals {
  name_prefix = "${var.environment}-${var.region}"

  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Timestamp   = timestamp()
  }

  # Compute subnet CIDRs based on VPC CIDR
  private_subnet_cidrs = [
    for i in range(3) : cidrsubnet(var.vpc_cidr, 4, i)
  ]
}
```

---

## Modules

Modules are reusable, composable units of Terraform configuration. They are the primary mechanism for DRY (Don't Repeat Yourself) infrastructure code.

### Module Structure

```
modules/
└── eks-cluster/
    ├── main.tf        # resources
    ├── variables.tf   # input variables
    ├── outputs.tf     # outputs (passed to callers)
    └── versions.tf    # provider version constraints
```

### Calling a Module

```hcl
# In root module (e.g., environments/prod/main.tf)
module "eks" {
  source = "../../modules/eks-cluster"

  cluster_name    = "${local.name_prefix}-eks"
  kubernetes_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  node_groups     = {
    general = {
      instance_types = ["m5.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
    gpu = {
      instance_types = ["g4dn.xlarge"]
      min_size       = 0
      max_size       = 5
      desired_size   = 0
    }
  }
}

# Use module output
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
```

### Remote Modules

```hcl
# Terraform Registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"
  # ...
}

# Git repository
module "vpc" {
  source = "git::https://github.com/org/terraform-modules.git//vpc?ref=v2.3.0"
}
```

**Version-pin remote modules.** Never use `latest` or unpinned references in production — a module update can change your infrastructure.

---

## State Management

### Remote State Backend

Never store state locally in production. Use a remote backend:

```hcl
# S3 backend with DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/eks/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/..."
    dynamodb_table = "terraform-state-lock"
  }
}
```

DynamoDB provides state locking — prevents two `terraform apply` runs from modifying state simultaneously (which corrupts it).

### State File Contents

The state file contains:
- Every resource Terraform manages, with its attributes
- Metadata (serial number, Terraform version, lineage)
- Module structure

The state file may contain secrets (database passwords, certificates). Always enable encryption at rest for state backends.

### State Operations

```bash
# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show aws_instance.web

# Move resource to different address (e.g., after renaming)
terraform state mv aws_instance.web aws_instance.app

# Remove resource from state without destroying it
# Use when you want Terraform to "forget" a resource (e.g., migrating to new management)
terraform state rm aws_instance.old

# Import existing resource into state
# Use when you have existing infra not created by Terraform
terraform import aws_instance.web i-1234567890abcdef0

# Refresh state to match real infrastructure
terraform refresh   # deprecated in 1.x; use terraform apply -refresh-only
terraform apply -refresh-only
```

### Splitting State for Scale

Monolithic state files are hard to manage — one mistake can destroy everything. Split by:
- **Layer**: networking (VPC, subnets), compute (EKS, EC2), services (RDS, S3)
- **Environment**: prod/, staging/, dev/
- **Region**: us-east-1/, eu-west-1/

Pass outputs between states using `terraform_remote_state`:

```hcl
# In services layer: read VPC ID from networking layer state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "company-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_db_subnet_group" "main" {
  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

---

## Workspaces

Workspaces allow multiple state files for the same configuration. Useful for environment management:

```bash
# Create and switch to staging workspace
terraform workspace new staging
terraform workspace select staging

# Apply — uses staging.tfvars automatically if named correctly
terraform apply -var-file=staging.tfvars

# List workspaces
terraform workspace list
```

Inside config, reference workspace:
```hcl
resource "aws_instance" "app" {
  count = terraform.workspace == "prod" ? 3 : 1
  # ...
}
```

Note: Workspaces are not a replacement for separate state files for isolated environments. Use them for short-lived environments (feature branches), not for prod/staging separation (separate directories are cleaner for that).

---

## The Plan/Apply Workflow

### Reading a Plan

```bash
terraform plan
```

Output symbols:
- `+` resource will be created
- `-` resource will be destroyed
- `~` resource will be updated in-place
- `-/+` resource must be destroyed and recreated (forces replacement)
- `<=` data source will be read

**Forces replacement** is the dangerous case: Terraform must destroy the existing resource and create a new one. This causes downtime for databases, load balancers, etc.

```
# Example: changing VPC ID on a subnet forces replacement
  # aws_subnet.app must be replaced
-/+ resource "aws_subnet" "app" {
    ~ cidr_block = "10.0.1.0/24" -> "10.0.2.0/24"  # forces replacement
      id         = "subnet-abc123"
    + vpc_id     = "vpc-new123" -> (forces replacement)
```

### Targeted Apply

Apply only specific resources (use sparingly — can cause state inconsistency):

```bash
# Apply only one resource
terraform apply -target=aws_instance.web

# Apply only a module
terraform apply -target=module.eks
```

Useful for: initial setup of a dependency, testing changes to one resource. Not for production workflows — always apply the full plan for production changes.

### Plan Files

Save a plan and apply exactly what was planned:

```bash
# Save plan to file
terraform plan -out=tfplan.bin

# Apply saved plan (no interactive approval)
terraform apply tfplan.bin
```

This is the correct CI/CD workflow: plan in PR review, apply the saved plan on merge.

---

## Writing Idiomatic Terraform

### for_each vs count

`count` creates numbered instances (breaking changes when items removed):
```hcl
# Adding item to middle of list shifts all indices — DESTROYS and RECREATES
resource "aws_subnet" "private" {
  count = 3
  cidr_block = "10.0.${count.index}.0/24"
}
```

`for_each` creates named instances (safer for sets of named resources):
```hcl
# Adding/removing specific items doesn't affect others
variable "subnets" {
  default = {
    "us-east-1a" = "10.0.1.0/24"
    "us-east-1b" = "10.0.2.0/24"
    "us-east-1c" = "10.0.3.0/24"
  }
}

resource "aws_subnet" "private" {
  for_each = var.subnets

  availability_zone = each.key
  cidr_block        = each.value
  vpc_id            = aws_vpc.main.id
}
```

Rule: use `for_each` for production resources. Use `count` only for simple scaling (n identical instances where order doesn't matter).

### Dynamic Blocks

Generate repeated nested blocks from a variable:

```hcl
variable "ingress_rules" {
  default = [
    { port = 80, cidr = "0.0.0.0/0" },
    { port = 443, cidr = "0.0.0.0/0" },
    { port = 22, cidr = "10.0.0.0/8" },
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = [ingress.value.cidr]
    }
  }
}
```

### Data Sources

Data sources read existing infrastructure without managing it:

```hcl
# Read existing VPC by tag
data "aws_vpc" "existing" {
  tags = {
    Name = "prod-vpc"
  }
}

# Read current AWS region
data "aws_region" "current" {}

# Read available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Read latest Amazon Linux AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}
```

---

## CI/CD Integration

### Recommended Pipeline

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.4"

      - name: Terraform Init
        run: terraform init
        working-directory: environments/prod

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        run: terraform plan -out=tfplan -no-color
        working-directory: environments/prod

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📋
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  apply:
    name: Terraform Apply
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production   # requires approval
    steps:
      - name: Terraform Apply
        run: terraform apply tfplan
```

### Drift Detection

Run `terraform plan` on a schedule to detect infrastructure drift:

```yaml
# Scheduled drift detection
on:
  schedule:
    - cron: '0 8 * * *'   # 8am daily

jobs:
  drift:
    steps:
      - run: terraform plan -detailed-exitcode
        # Exit code 0: no changes
        # Exit code 1: error
        # Exit code 2: changes detected (drift)
```

---

## Common Failure Modes

**State lock not released:** If `terraform apply` crashes mid-run, the DynamoDB lock may persist. Check DynamoDB table for the lock item and delete it manually if no other apply is running.

**Accidental destroy of prod resources:** Trigger: someone runs `terraform destroy` or removes a resource block without realizing it's in production. Prevention: use `prevent_destroy = true` lifecycle rule on critical resources, require explicit approval in CI for destroy operations.

```hcl
resource "aws_rds_instance" "main" {
  # ...
  lifecycle {
    prevent_destroy = true
  }
}
```

**State file corruption:** Causes: concurrent applies without locking, manual edits to state file. Fix: restore from S3 versioning backup. Always enable versioning on the state bucket.

**Provider version upgrade breaks existing resources:** Providers sometimes add required fields or change defaults between major versions. Always test provider upgrades in non-production first. Pin to a minor version range: `~> 5.0` allows patches but not major changes.

**For_each with count mix:** Terraform cannot change between `count` and `for_each` without destroying and recreating resources. Plan carefully before migrating.

---

## Key Questions and Answers

**Q: What is Terraform state and why is it important?**

Terraform state is a JSON file that maps your configuration resources to real infrastructure IDs and attributes. Without state, Terraform can't know that `aws_instance.web` in your config corresponds to `i-1234567890abcdef0` in AWS. State is also where Terraform stores attributes that AWS only returns after creation (like auto-assigned IPs or endpoint URLs). It must be stored remotely in production (S3, GCS) with locking (DynamoDB) to prevent concurrent apply corruption.

**Q: What happens if someone manually changes infrastructure that Terraform manages?**

Terraform will detect the drift on the next `terraform plan`. It will show a diff between what's in state (what Terraform last set) and what's actually in the cloud (the manual change). On `terraform apply`, Terraform will revert the change to match configuration. This is intentional — Terraform configuration is the source of truth. Prevent manual changes by restricting cloud console access and enforcing IaC-only change processes.

**Q: What is the difference between `count` and `for_each` and when do you use each?**

`count` creates N copies of a resource indexed by integer. If you remove an item from the middle of the list, Terraform renumbers the remaining items, causing unnecessary destroy/recreate. `for_each` creates resources indexed by a string key from a map or set. Removing one key only affects that one resource. Use `for_each` for named resources (subnets, security groups, IAM roles) where each item has identity. Use `count` only when all instances are identical and order doesn't matter.

**Q: How do you manage multiple environments (dev, staging, prod) with Terraform?**

Two common approaches: (1) **Separate directories** — `environments/dev/`, `environments/staging/`, `environments/prod/`, each calling shared modules with different variable values. This is the safest: prod and dev configs are completely independent, a change to one doesn't affect the other. (2) **Workspaces** — one configuration, multiple state files. Simpler but risky: a config bug affects all environments. Separate directories are the recommended approach for environments with different security requirements.

**Q: What is a Terraform module and when should you create one?**

A module is a directory of `.tf` files with input variables, resources, and outputs. Create a module when: (1) you're repeating the same resource pattern with slight variations across multiple places, (2) you want to provide a standardized, tested component for other teams (e.g., a standard EKS cluster with all required addons), (3) you want to enforce compliance (security settings, tagging) in a single place. Don't create modules for one-time use — complexity without benefit.

---

## Points to Remember

- Terraform is declarative: describe desired state, not steps to achieve it
- State file maps config to real resources — must be stored remotely and locked
- `terraform plan` shows changes; always review before `terraform apply`
- `-/+` in plan = destroy and recreate (potential downtime)
- Use `for_each` instead of `count` for named resources
- `prevent_destroy = true` protects critical resources from accidental deletion
- Version-pin all providers and remote modules
- Split state by layer and environment — never one giant monolith
- CI/CD workflow: plan on PR, apply on merge, require approval for prod
- Import existing resources with `terraform import`; remove from management with `terraform state rm`
- Validate with `terraform validate`; format with `terraform fmt`
- Enable S3 bucket versioning for state backup and recovery

## What to Study Next

- [CI/CD and Trusted Delivery](./cicd-trusted-delivery-and-platform-security) — Terraform in deployment pipelines
- [AWS Cloud Services and Platform Design](./aws-cloud-services-and-platform-design) — AWS resources commonly managed with Terraform
- [Git and Version Control](./git-and-version-control-for-platform-engineers) — GitOps workflows for IaC
