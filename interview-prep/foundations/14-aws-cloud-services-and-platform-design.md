# Foundations: AWS Premium Teaching Guide For SRE And Platform Engineers

AWS is not a catalog to memorize. It is a set of building blocks for identity, networking, compute, storage, observability, resilience, and cost-aware operations.

Strong engineers think in systems:

- failure domains
- trust boundaries
- traffic paths
- scaling models
- recovery plans
- cost tradeoffs

This guide teaches AWS from first principles to production-grade platform thinking.

---

# How To Use This Module

Study in layers:

1. **Beginner Layer** — accounts, regions, VPC, compute, storage.
2. **Intermediate Layer** — IAM, load balancers, databases, EKS, monitoring.
3. **Advanced Layer** — multi-account design, private networking, DR, cost optimization.
4. **Production SRE Layer** — debugging real AWS incidents.
5. **Interview Layer** — explain architecture tradeoffs clearly.

---

# Memory Palace: AWS Is A Global Airport City

| AWS Concept | Analogy | Real Meaning |
|---|---|---|
| Account | Separate company campus | Security + billing boundary |
| Region | Country hub | Geographic deployment area |
| AZ | Independent terminal | Failure domain |
| VPC | Private campus roads | Network boundary |
| Subnet | Terminal wing | Network segment |
| Route Table | Road signs | Traffic path rules |
| Security Group | Badge-controlled doors | Stateful allow rules |
| IAM | Staff identity system | Permissions |
| ALB | Passenger dispatcher | HTTP load balancing |
| RDS | Managed records office | Managed database |
| S3 | Archive warehouse | Object storage |
| CloudWatch | Operations center | Metrics/logs/alarms |
| CloudTrail | Security camera logs | API audit trail |

When incidents happen ask: did it fail in identity, roads, building, dispatcher, database, or region?

---

# Beginner Layer: AWS Mental Model

Design around boundaries:

## Security Boundary

Accounts and IAM.

## Failure Boundary

AZs and Regions.

## Network Boundary
nVPCs, subnets, route tables.

## Cost Boundary

Accounts, tags, budgets.

## Operational Boundary

Separate teams, environments, blast radius.

---

# Beginner Layer: Accounts And Organizations

Recommended structure:

```text
AWS Organization
  Management
  Security / Logging
  Shared Network
  Dev
  Staging
  Prod
```

Why multiple accounts?

- blast radius reduction
- clearer billing
- quota separation
- safer experimentation
- easier least privilege
- cleaner audits

Never mix production with personal experiments.

---

# Beginner Layer: Regions And Availability Zones

## Region

Geographic deployment area.

## Availability Zone (AZ)

Independent data-center group inside a region.

Production habit:

- use at least 2 AZs
- prefer 3 AZs when practical
- assume one AZ can fail

If your app dies when one AZ fails, architecture is incomplete.

---

# Beginner Layer: VPC Fundamentals

A VPC is your private network.

Example:

```text
10.0.0.0/16
 public subnet   10.0.1.0/24
 private app     10.0.10.0/24
 private db      10.0.20.0/24
```

## Public Subnet

Route to Internet Gateway.

## Private Subnet

No direct inbound internet route.

## Database Subnet

Private and tightly restricted.

---

# Beginner Layer: Route Tables And Gateways

| Component | Purpose |
|---|---|
| Internet Gateway | Public internet access |
| NAT Gateway | Outbound internet from private subnets |
| Route Table | Decides next hop |
| VPC Endpoint | Private access to AWS services |
| Transit Gateway | Hub for many networks |
| PrivateLink | Private service sharing |

---

# Intermediate Layer: Security Groups vs NACLs

| Feature | Security Group | NACL |
|---|---|---|
| Scope | ENI/resource | Subnet |
| Stateful | Yes | No |
| Rules | Allow only | Allow + Deny |
| Main Use | Primary workload control | Coarse subnet guardrail |

Best practice:

```text
ALB SG -> allow 443 from internet
App SG -> allow app port from ALB SG
DB SG -> allow DB port from App SG
```

Use SG references over broad CIDRs when possible.

---

# Intermediate Layer: IAM Properly Explained

IAM answers:

> Who can do what to which resource under what conditions?

Core concepts:

- roles
- policies
- trust policies
- permission boundaries
- SCPs
- temporary credentials

Best practice:

- use roles, not long-lived keys
- least privilege
- explicit trust boundaries
- short sessions

Important truth:

Explicit deny wins.

Useful command:

```bash
aws sts get-caller-identity
```

Cloud equivalent of `whoami`.

---

# Intermediate Layer: Compute Choices

| Service | Best For | Tradeoff |
|---|---|---|
| EC2 | Full control | More ops burden |
| ASG | Resilient VM fleet | AMI/patch mgmt |
| ECS | Containers w/ AWS simplicity | AWS-specific patterns |
| EKS | Kubernetes platform | More complexity |
| Lambda | Event/serverless | Runtime limits |
| Batch | Job workloads | Batch oriented |

Choose the smallest platform meeting requirements.

---

# Intermediate Layer: Storage Choices

## S3

Object storage.

Use for:

- backups
- logs
- artifacts
- static content
- Terraform state

## EBS

Block storage for EC2.

AZ scoped.

## EFS

Managed shared filesystem.

Convenient, but benchmark cost/performance.

---

# Intermediate Layer: Databases

## RDS / Aurora

Managed relational databases.

Important:

- backups
- Multi-AZ
- parameter groups
- maintenance windows
- connection limits

## DynamoDB

Key-value/document scale.

Think by access patterns.

## ElastiCache

Caching, sessions, rate limiting.

---

# Intermediate Layer: Edge And Load Balancing

## Route53

DNS + routing policies.

## CloudFront

CDN + edge performance.

## WAF

HTTP protection.

## ALB

Layer 7 HTTP routing.

## NLB

Layer 4 TCP/UDP.

Common path:

```text
Route53 -> CloudFront/WAF -> ALB -> App -> DB/Cache
```

---

# Advanced Layer: EKS Platform Thinking

EKS = managed Kubernetes control plane.

Worker choices:

- managed node groups
- self-managed nodes
- Fargate
- Karpenter

Important AWS/EKS topics:

- VPC CNI IP limits
- IRSA / Pod Identity
- ALB controller
- EBS CSI driver
- upgrades
- node AMIs

---

# Advanced Layer: Observability And Audit

## CloudWatch

Metrics, logs, alarms.

## CloudTrail
nAPI audit log.

## VPC Flow Logs

Network evidence.

Use for:

- denied traffic
- unexpected egress
- NAT spikes
- incident investigations

---

# Advanced Layer: HA And Disaster Recovery

## HA

Survive common failures.

Examples:

- ALB across AZs
- ASG across AZs
- RDS Multi-AZ

## DR

Recover from larger failures.

Questions:

- RTO?
- RPO?
- restore tested?
- region failover?
- failback plan?

No tested restore = no real DR.

---

# Advanced Layer: Cost Engineering

Watch for:

- NAT Gateway charges
- cross-AZ transfer
- idle EC2/EBS
- oversized RDS
- excessive logs
- missing S3 lifecycle rules

SREs should treat cost as a platform reliability metric.

---

# Production SRE Layer: Real Incidents

## One AZ Failure Took Down App

Cause:

Single-AZ dependency hidden inside “multi-AZ” app.

Fix:

Spread all tiers, test AZ evacuation.

## EKS Pods Cannot Start

Cause:

VPC CNI pod IP exhaustion.

Fix:

- prefix delegation
- larger nodes
- custom networking
- autoscaling

## NAT Bill Exploded

Cause:

Private workloads using NAT for S3/ECR/logs.

Fix:

Use VPC endpoints. Inspect flow logs.

## IAM Access Denied After Deploy

Cause:

Broken trust policy or missing permission.

Fix:

Use CloudTrail + IAM policy simulator reasoning.

---

# Production SRE Layer: Troubleshooting Flow

## Can’t Access Service

Check:

- DNS
- SG path
- target group health
- route tables
- listener rules
- app logs

## High Latency

Check:

- ALB metrics
- DB latency
- cross-region path
- CPU/memory saturation
- connection pools

## Cost Spike

Check:

- CUR / Cost Explorer
- NAT data transfer
- new autoscaling behavior
- logs ingestion
- orphan resources

---

# Interview Layer: Strong Answers

## Public vs Private Subnet?

> Public subnet has route to Internet Gateway. Private subnet does not expose workloads directly and typically uses NAT for outbound access.

## Security Group vs NACL?

> Security Groups are stateful resource-level allow controls. NACLs are stateless subnet-level controls.

## Why IRSA safer than static keys?

> It uses scoped temporary credentials tied to workload identity instead of long-lived secrets.

## How would you design a resilient web app?

> Multi-AZ ALB, stateless app tier across AZs, managed DB Multi-AZ, private app/data tiers, autoscaling, observability, tested backups, least-privilege IAM.

---

# Labs

## Beginner

1. Build VPC with public/private subnets.
2. Launch EC2 behind ALB.
3. Store encrypted S3 object.

## Intermediate

1. Create IAM role for EC2.
2. Create RDS Multi-AZ.
3. Create CloudWatch alarm.
4. Inspect CloudTrail events.

## Advanced

1. Deploy EKS with IRSA.
2. Add VPC endpoints.
3. Debug SG traffic path.
4. Simulate pod IP exhaustion.
5. Write DR runbook.

---

# Memory Review

## Beginner Recall

- Why multiple accounts?
- Why multiple AZs?

## Intermediate Recall

- SG vs NACL?
- Why use private subnets?
- Why prefer IAM roles?

## Advanced Recall

- Why can NAT be expensive?
- Why is tested restore essential?
- Why can EKS run out of IPs?

## Production Recall

- How do you debug AccessDenied?
- How do you debug one-region slowdown?

---

# Senior Summary

> I design AWS platforms around clear trust boundaries, resilient failure domains, private-by-default networking, observable dependencies, and cost-aware traffic paths. During incidents I first classify identity, network, dependency, and AZ/region scope before changing resources.
