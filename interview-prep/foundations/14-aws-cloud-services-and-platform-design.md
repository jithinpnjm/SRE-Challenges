# Foundations: AWS Cloud Services And Platform Design Zero To Hero

AWS is not just a catalog of services. For SRE and platform engineering, AWS is a set of building blocks for secure networking, compute, storage, identity, reliability, observability, and cost-aware operations.

This guide is designed as a complete path:

- Beginner: accounts, regions, AZs, VPC, compute, storage
- Intermediate: IAM, load balancers, RDS, S3, EKS, CloudWatch
- Advanced: multi-account design, networking patterns, DR, PrivateLink, IRSA, cost controls
- SRE Level: debug AWS outages, IAM failures, pod IP exhaustion, NAT cost spikes, RDS failovers
- Interview Level: explain AWS architecture decisions and tradeoffs clearly

---

# Part 1: AWS Mental Model

Think of AWS as a global airport and city grid.

| AWS concept | Analogy | Production meaning |
|---|---|---|
| Account | separate company/site | security and billing boundary |
| Region | country hub | geographic deployment area |
| Availability Zone | independent terminal | isolated failure domain |
| VPC | private campus | network boundary |
| Subnet | terminal wing | network segment |
| Route table | road signs | traffic path rules |
| Security group | badge-controlled door | stateful allow rules |
| IAM | staff badge system | identity and permissions |
| Load balancer | traffic controller | distribute requests |
| RDS | records office | managed database |
| S3 | archive warehouse | object storage |

---

# Part 2: Accounts And Organizations

Use AWS Organizations to separate environments and blast radius.

Common structure:

```text
AWS Organization
  management account
  security/logging account
  network account
  dev account
  staging account
  prod account
```

Why separate accounts?

- IAM isolation
- billing visibility
- service quota boundaries
- safer experimentation
- clearer audit trails

Production rule:

> Do not mix production and personal experimentation in the same AWS account.

---

# Part 3: Regions And Availability Zones

A Region is a geographic area.

An Availability Zone is an isolated data-center group inside a Region.

Production design:

- use at least 2 AZs for important services
- use 3 AZs when possible
- treat one AZ failure as normal design input

Single-AZ dependencies are common outage causes.

---

# Part 4: VPC Fundamentals

A VPC is your private network in AWS.

Example:

```text
VPC 10.0.0.0/16
  public subnet 10.0.1.0/24
  private app subnet 10.0.10.0/24
  private db subnet 10.0.20.0/24
```

## Public subnet

Has route to Internet Gateway.

## Private subnet

No direct inbound internet route. Outbound internet usually uses NAT Gateway.

## Database subnet

Usually private and only reachable from app tier.

---

# Part 5: Routing And Gateways

Important components:

| Component | Purpose |
|---|---|
| Internet Gateway | public internet access |
| NAT Gateway | outbound access from private subnets |
| Route Table | decides next hop |
| VPC Endpoint | private access to AWS services |
| Transit Gateway | hub for many VPCs/on-prem networks |
| PrivateLink | expose private service across VPC/accounts |

Cost note:

NAT Gateway can become expensive when large traffic volumes pass through it. Use VPC endpoints for S3, ECR, CloudWatch, and other AWS services where appropriate.

---

# Part 6: Security Groups And NACLs

| Feature | Security Group | NACL |
|---|---|---|
| Scope | ENI/instance/load balancer | subnet |
| State | stateful | stateless |
| Rules | allow only | allow and deny |
| Main use | workload access control | subnet guardrail |

Use security groups for most traffic control.

Good pattern:

```text
ALB SG -> allows 443 from internet
App SG -> allows app port from ALB SG
DB SG -> allows DB port from App SG
```

This is better than using broad CIDRs everywhere.

---

# Part 7: IAM Fundamentals

IAM answers:

> Who can do what to which AWS resource under what conditions?

Core concepts:

- users
- groups
- roles
- policies
- trust policies
- permission boundaries
- SCPs

Production rule:

> Prefer roles and temporary credentials. Avoid long-lived access keys.

Explicit deny always wins.

---

# Part 8: Compute Options

| Service | Best for | Tradeoff |
|---|---|---|
| EC2 | full VM control | more operations |
| Auto Scaling Group | resilient EC2 fleet | image/patch management |
| ECS | managed container orchestration | AWS-specific patterns |
| EKS | Kubernetes workloads | cluster/platform complexity |
| Lambda | event-driven/serverless | runtime/time limits |
| Batch | batch jobs | job-oriented platform |

Choose the smallest platform that satisfies the constraints.

---

# Part 9: EC2 And Auto Scaling

EC2 is virtual machines.

Important choices:

- instance family
- AMI
- user data
- security group
- subnet/AZ
- EBS volume
- IAM instance profile

Auto Scaling Groups provide:

- desired capacity
- health replacement
- multi-AZ spread
- scale policies

Purchasing:

- Savings Plans/Reserved for baseline
- Spot for interruptible batch
- On-Demand for burst

---

# Part 10: EKS

EKS is AWS-managed Kubernetes control plane.

Worker options:

- managed node groups
- self-managed node groups
- Fargate profiles
- Karpenter-provisioned nodes

EKS-specific concerns:

- VPC CNI pod IP limits
- IRSA / Pod Identity
- managed add-ons
- cluster version upgrades
- node AMI upgrades
- AWS Load Balancer Controller
- EBS CSI driver

Pod IP exhaustion is common with AWS VPC CNI.

---

# Part 11: S3

S3 is object storage, not a filesystem.

Use for:

- static assets
- backups
- logs
- data lakes
- model artifacts
- Terraform state

Production settings:

- block public access
- versioning
- encryption
- lifecycle rules
- access logging or CloudTrail data events where needed

S3 durability is extremely high, but access misconfiguration is a common security incident source.

---

# Part 12: EBS And EFS

## EBS

Block storage for EC2.

Use for:

- instance disks
- databases on EC2
- Kubernetes PVCs via EBS CSI

EBS is AZ-scoped.

## EFS

Managed NFS filesystem.

Use for:

- shared file access
- multi-node read/write workloads
- some Kubernetes RWX volumes

Tradeoff:

EFS is convenient but can surprise you on performance and cost if not measured.

---

# Part 13: Databases

## RDS / Aurora

Use for relational workloads.

Important:

- Multi-AZ for HA
- read replicas for read scaling
- backups/PITR
- parameter groups
- maintenance windows
- connection limits

## DynamoDB

Use for key-value/document access at scale.

Design around:

- partition key
- sort key
- access patterns
- GSIs
- hot partitions

## ElastiCache

Redis/Memcached for:

- cache
- sessions
- rate limits
- queues/light pub-sub

Cache reduces load but introduces invalidation and consistency tradeoffs.

---

# Part 14: Load Balancing And Edge

## Route 53

DNS and health-check-based routing.

## CloudFront

CDN for global caching, TLS, edge performance.

## WAF

Protects edge HTTP traffic.

## ALB

Layer 7 HTTP routing.

## NLB

Layer 4 TCP/UDP, lower latency, source IP preservation.

Common path:

```text
Route53 -> CloudFront/WAF -> ALB -> App tier -> DB/cache/queue
```

---

# Part 15: Queues And Events

| Service | Use |
|---|---|
| SQS | durable queue |
| SNS | pub/sub fanout |
| EventBridge | event bus/routing |
| Kinesis | streaming data |
| MSK | managed Kafka |

Queues decouple systems.

They help absorb spikes, but you must monitor backlog, age of oldest message, dead-letter queues, and consumer health.

---

# Part 16: Observability And Audit

## CloudWatch

Metrics, logs, alarms, dashboards.

## CloudTrail

AWS API audit log.

Enable across all regions.

## VPC Flow Logs

Network flow evidence.

Useful for:

- unexpected traffic
- denied connections
- NAT usage
- security investigations

## X-Ray / OpenTelemetry

Distributed tracing.

---

# Part 17: High Availability And DR

## HA

Survive common component failure.

Examples:

- ALB across AZs
- ASG across AZs
- RDS Multi-AZ
- S3 durable storage

## DR

Recover from larger failure.

Questions:

- RTO?
- RPO?
- backup restore tested?
- multi-region needed?
- failback plan?

Do not claim DR if restores are not tested.

---

# Part 18: Cost Management

Track:

- NAT Gateway data processing
- cross-AZ data transfer
- idle EC2/EBS
- unattached EBS volumes
- overprovisioned RDS
- excessive CloudWatch log ingestion
- S3 lifecycle gaps

Tools:

- Cost Explorer
- Budgets
- CUR reports
- Trusted Advisor
- Compute Optimizer

SREs should treat cost as a reliability dimension because waste reduces platform sustainability.

---

# Part 19: Real Incident Stories

## One AZ Outage Took Down Service

Cause:

- database or app tier effectively single-AZ

Fix:

- multi-AZ architecture
- test AZ evacuation

## Pods Cannot Start In EKS

Cause:

- VPC CNI IP exhaustion

Fix:

- prefix delegation
- larger instance types
- custom networking
- Karpenter/node scaling

## NAT Gateway Bill Spiked

Cause:

- private workloads pulling images/logs through NAT

Fix:

- ECR/S3/CloudWatch VPC endpoints
- inspect VPC Flow Logs

## IAM Access Denied After Deploy

Cause:

- wrong role trust policy or missing action/resource

Fix:

- inspect CloudTrail denied event
- validate role assumption path

---

# Part 20: AWS CLI Commands To Know

```bash
aws sts get-caller-identity
aws ec2 describe-instances
aws ec2 describe-route-tables
aws ec2 describe-security-groups
aws elbv2 describe-target-health --target-group-arn ARN
aws rds describe-db-instances
aws cloudtrail lookup-events
aws logs start-query
aws s3 ls s3://bucket/prefix/
```

`aws sts get-caller-identity` is the cloud equivalent of `whoami`.

---

# Part 21: Interview Questions

- Public vs private subnet?
- Security group vs NACL?
- How would you design a multi-AZ web app?
- Why use VPC endpoints?
- How does IRSA work?
- Why can EKS pods run out of IPs?
- RDS Multi-AZ vs read replica?
- How would you investigate unexpected AWS cost spike?

---

# Part 22: Labs

## Beginner

- create VPC with public/private subnets
- launch EC2 behind ALB
- store object in S3 securely

## Intermediate

- create RDS Multi-AZ
- configure IAM role for EC2
- create CloudWatch alarm
- inspect CloudTrail events

## Advanced

- deploy EKS with IRSA
- add VPC endpoints
- debug security group path
- simulate pod IP exhaustion
- design multi-region DR plan

---

# Part 23: Senior Answer Shape

> I design AWS platforms around failure domains, identity boundaries, and traffic paths. Production services should use separate accounts, multi-AZ architecture, private app/data subnets, least-privilege IAM, observable load balancers and databases, tested backups, and cost-aware networking. When debugging I first identify identity, network path, dependency health, and regional/AZ scope before changing resources.

---

# Recall Prompts

- Why are accounts security boundaries?
- Why does private subnet outbound traffic often cost money?
- Why is IRSA safer than static AWS keys?
- Why can one-AZ dependencies break multi-AZ apps?
- What does CloudTrail tell you that CloudWatch does not?
