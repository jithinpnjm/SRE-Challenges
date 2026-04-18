# AWS Cloud Services and Platform Design

## What It Is and Why It Matters

Amazon Web Services (AWS) is the world's most widely used cloud platform. Even if you primarily work on GCP or Azure, understanding AWS is essential: most organizations run multi-cloud, customers expect AWS knowledge, and AWS services define the vocabulary of cloud-native infrastructure.

AWS provides compute (EC2, Lambda, ECS, EKS), storage (S3, EBS, EFS), networking (VPC, ALB/NLB, Route 53, CloudFront), databases (RDS, DynamoDB, ElastiCache), and managed services across every infrastructure domain.

The core AWS skill for SRE and platform engineers is **designing systems that are secure by default, highly available across failure domains, observable, and cost-efficient** — and being able to reason about where AWS services fit into that design.

---

## Mental Model: AWS Account Structure and Failure Domains

```
AWS Organization
├── Management Account (billing, SCPs)
├── Production Account
│   ├── us-east-1 (Region)
│   │   ├── us-east-1a (AZ)
│   │   ├── us-east-1b (AZ)
│   │   └── us-east-1c (AZ)
│   └── eu-west-1 (Region)
├── Staging Account
└── Development Account
```

**AWS failure domain hierarchy:**

| Scope | Failure domain | Design pattern |
|-------|---------------|----------------|
| AZ | Independent power/cooling/networking | Spread across 2-3 AZs |
| Region | Independent infrastructure, separate data | Multi-region for global services |
| Account | IAM, billing, service limits | Separate accounts for prod/staging |

Rule: any single-AZ resource is a potential outage. Always deploy across at least 2 AZs for production.

---

## Core Networking: VPC

### VPC Basics

A VPC (Virtual Private Cloud) is your private network inside AWS. You define the CIDR range, subnets, routing, and access controls.

```
VPC: 10.0.0.0/16

Public subnets (have route to Internet Gateway):
  us-east-1a: 10.0.1.0/24
  us-east-1b: 10.0.2.0/24

Private subnets (no direct internet route):
  us-east-1a: 10.0.10.0/24
  us-east-1b: 10.0.11.0/24

Database subnets (isolated, only accessible from app tier):
  us-east-1a: 10.0.20.0/24
  us-east-1b: 10.0.21.0/24
```

**Public subnet** = has a route to an Internet Gateway (IGW). Resources in public subnets can have public IP addresses.

**Private subnet** = no route to IGW. Resources can only be reached from within the VPC (or via VPN/Direct Connect). Outbound internet access goes through a NAT Gateway.

**NAT Gateway** = enables private subnet resources to reach the internet for outbound traffic (OS updates, pulling from Docker Hub) without being directly reachable from the internet. Lives in a public subnet, has an Elastic IP.

### Security Groups vs NACLs

| | Security Groups | NACLs |
|--|--|--|
| Type | Stateful (return traffic auto-allowed) | Stateless (both directions must be explicitly allowed) |
| Applies to | EC2 instance, ENI | Subnet |
| Rules | Allow only (no deny rules) | Allow and deny |
| Default | Deny all inbound, allow all outbound | Allow all |
| Evaluation | All rules evaluated | Rules evaluated in order by number |

Best practice:
- Security groups for instance-level access control (primary mechanism)
- NACLs for subnet-level blocking (e.g., block known malicious IP ranges at subnet boundary)

```
# Security group for application tier
Inbound:
  Allow 443 from 0.0.0.0/0      (HTTPS from internet via ALB)
  Allow 22 from 10.0.0.0/8      (SSH from internal only)

Outbound:
  Allow 5432 to database-sg     (PostgreSQL to database tier)
  Allow 443 to 0.0.0.0/0        (HTTPS to external APIs)

# Security group for database tier
Inbound:
  Allow 5432 from app-sg        (only application tier can connect)
```

### VPC Connectivity Options

| Pattern | Use case |
|---------|---------|
| VPC Peering | Connect two VPCs (same or different account/region) |
| AWS Transit Gateway | Hub-and-spoke: connect many VPCs and on-prem networks |
| PrivateLink | Expose a service privately across VPC/account boundaries |
| Site-to-Site VPN | Connect on-premises to AWS over IPSec |
| Direct Connect | Dedicated private fiber to AWS (lower latency, consistent bandwidth) |

VPC Peering is simple but doesn't scale (N² connections for N VPCs). Transit Gateway is the scalable multi-VPC solution.

---

## Compute

### EC2

EC2 instances are virtual machines. Key concepts:

**Instance types:**
- `t3.medium`: general purpose, burstable (good for dev/staging)
- `m5.xlarge`: general purpose, stable (production applications)
- `c5.2xlarge`: compute-optimized (CPU-intensive workloads)
- `r5.4xlarge`: memory-optimized (in-memory databases, ML inference)
- `p3.8xlarge`: GPU instances (ML training)
- `g4dn.xlarge`: GPU instances (ML inference, video processing)

**Purchasing models:**
| Model | Cost | Commitment | Use case |
|-------|------|-----------|---------|
| On-Demand | Full price | None | Variable/unpredictable workloads |
| Reserved (1yr/3yr) | 30-60% discount | 1-3 years | Steady baseline workloads |
| Savings Plans | 20-60% discount | 1-3 years | Flexible across instance types |
| Spot | 70-90% discount | None (interruptible) | Batch jobs, stateless workloads |

Typical cost strategy: Reserved/Savings Plans for the baseline, Spot for scale-out, On-Demand for burst.

**Auto Scaling Groups (ASG):**

```json
{
  "AutoScalingGroupName": "app-asg",
  "MinSize": 2,
  "MaxSize": 20,
  "DesiredCapacity": 4,
  "VPCZoneIdentifier": "subnet-aaa,subnet-bbb",
  "HealthCheckType": "ELB",
  "HealthCheckGracePeriod": 300,
  "TargetGroupARNs": ["arn:aws:elasticloadbalancing:..."],
  "Policies": [{
    "PolicyType": "TargetTrackingScaling",
    "TargetTrackingConfiguration": {
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ASGAverageCPUUtilization"
      },
      "TargetValue": 60.0
    }
  }]
}
```

### EKS (Elastic Kubernetes Service)

EKS is the AWS-managed Kubernetes control plane. You pay for the control plane; worker nodes are EC2 instances in node groups.

```
EKS Control Plane (managed by AWS)
    → API server, etcd, scheduler, controller manager
    → Runs in AWS's own account, not yours

Worker Nodes (in your account)
    → EC2 instances in managed node groups or self-managed
    → Or AWS Fargate (serverless, no EC2 management)

Node group types:
    Managed Node Groups: AWS updates nodes, respects PodDisruptionBudgets
    Self-managed: full control, more operational overhead
    Fargate profiles: pods run on AWS Fargate, no EC2 nodes to manage
```

EKS-specific considerations:
- **VPC CNI**: AWS uses its own CNI that assigns real VPC IPs to pods (each pod gets a VPC IP). This is why pod density per node is limited by the number of ENIs + IPs per ENI (e.g., m5.xlarge supports ~29 pods).
- **IRSA (IAM Roles for Service Accounts)**: pods authenticate to AWS services (S3, DynamoDB) using OIDC — no long-lived credentials needed.
- **EKS Add-ons**: managed versions of CoreDNS, kube-proxy, VPC CNI, EBS CSI driver.

---

## Storage

### S3

S3 is object storage: files (objects) stored in buckets, identified by key. Not a filesystem — no directory structure (just key prefixes), no in-place modification (replace the whole object).

```bash
# Upload object
aws s3 cp local-file.txt s3://my-bucket/path/to/file.txt

# Download
aws s3 cp s3://my-bucket/path/to/file.txt ./local-file.txt

# Sync directory
aws s3 sync ./local-dir s3://my-bucket/prefix/

# List
aws s3 ls s3://my-bucket/prefix/ --recursive

# Presigned URL (time-limited download without auth)
aws s3 presign s3://my-bucket/file.txt --expires-in 3600
```

**S3 storage classes:**
| Class | Use case | Cost |
|-------|---------|------|
| Standard | Frequently accessed | High |
| Standard-IA | Infrequent access, rapid retrieval | Lower storage, retrieval fee |
| Glacier Instant | Archives, retrieved in milliseconds | Very low |
| Glacier Flexible | Long-term archives, retrieved in hours | Minimal |
| Intelligent-Tiering | Unknown access pattern, auto-tiers | Small monitoring fee |

Lifecycle policies move objects between tiers automatically:
```json
{
  "Rules": [{
    "ID": "archive-old-logs",
    "Status": "Enabled",
    "Filter": {"Prefix": "logs/"},
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER"}
    ],
    "Expiration": {"Days": 365}
  }]
}
```

**S3 security:**
- Bucket policies + IAM policies control access
- Block Public Access settings prevent accidental public exposure (enable by default in all accounts)
- Server-side encryption (SSE-S3, SSE-KMS) encrypts at rest
- Versioning enables recovery from accidental deletes
- Object Lock (WORM) for compliance

### EBS

EBS (Elastic Block Store) is block storage attached to EC2 instances — like a disk. One EBS volume attaches to one instance at a time (exception: multi-attach for io2 Block Express).

```bash
# Create volume
aws ec2 create-volume --volume-type gp3 --size 100 --availability-zone us-east-1a

# Attach to instance
aws ec2 attach-volume --volume-id vol-xxx --instance-id i-xxx --device /dev/sdf

# On the instance
lsblk                          # list block devices
mkfs.ext4 /dev/nvme1n1         # format
mount /dev/nvme1n1 /data        # mount
```

EBS volume types:
- `gp3`: general purpose SSD, 3,000 IOPS baseline (independent of size), 125 MB/s throughput
- `io2`: provisioned IOPS SSD, up to 64,000 IOPS — for databases requiring consistent high IOPS
- `st1`: throughput-optimized HDD — sequential workloads (large data sets, MapReduce)
- `sc1`: cold HDD — lowest cost, rarely accessed data

### EFS

EFS (Elastic File System) is a managed NFS service — multiple EC2 instances can mount the same filesystem simultaneously. Useful for shared configuration, media processing, or applications that need a shared filesystem.

---

## Load Balancers

### ALB (Application Load Balancer)

Layer 7 (HTTP/HTTPS) load balancer. Routes based on path, headers, hostname:

```
ALB Listener: 443 HTTPS
├── Rule: path /api/* → Target Group: API servers
├── Rule: path /static/* → Target Group: Static servers
├── Rule: host api.example.com → Target Group: API v2
└── Default rule → Target Group: Frontend
```

ALB features:
- SSL termination (certificate on ALB, backend gets HTTP)
- WebSocket support
- HTTP/2 to clients
- Request routing by path, host, headers
- Target groups: EC2, ECS tasks, Lambda, IP addresses, Pods

### NLB (Network Load Balancer)

Layer 4 (TCP/UDP/TLS) load balancer. Extremely low latency, passes source IP to backends. Used for:
- High-performance TCP applications
- Non-HTTP protocols (gRPC, databases)
- When you need to preserve client source IP

### Gateway Load Balancer

For transparent insertion of third-party appliances (firewalls, IDS/IPS). Traffic flows through the appliance transparently.

---

## Identity and Access Management (IAM)

IAM is the authorization system for all AWS API calls. Every API call must be authenticated and authorized.

### Principal Types

- **IAM Users**: long-lived identities for humans (avoid in favor of SSO + roles)
- **IAM Roles**: temporary credentials, assumed by services/users/federated identities
- **Service-Linked Roles**: managed by AWS services (e.g., EKS control plane)

### IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-app-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": "s3:DeleteObject",
      "Resource": "*"
    }
  ]
}
```

Policy evaluation: explicit deny overrides everything. Default deny for anything not explicitly allowed.

### IRSA — IAM Roles for Service Accounts

Pods in EKS authenticate to AWS using OIDC — no access keys in the pod:

```yaml
# Create the IAM role trust policy
{
  "Principal": {
    "Federated": "arn:aws:iam::123456789:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/XXXX"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "oidc.eks.us-east-1.amazonaws.com/id/XXXX:sub":
        "system:serviceaccount:production:myapp"
    }
  }
}

---
# Kubernetes service account annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/myapp-role
```

The pod's service account gets temporary credentials scoped to the IAM role. Credentials rotate automatically. No static access keys.

---

## Managed Databases

### RDS

RDS is managed relational database (MySQL, PostgreSQL, Oracle, SQL Server, MariaDB).

Key features:
- Automated backups (point-in-time restore up to 35 days)
- Multi-AZ standby (synchronous replication, automatic failover in 60-120 seconds)
- Read replicas (asynchronous, for read scale-out or cross-region copy)
- Parameter groups (tune database config without SSH access)
- Aurora: AWS-optimized MySQL/PostgreSQL compatible, 6-way replication, faster failover

```
Multi-AZ RDS deployment:

Primary: us-east-1a
    ↓ synchronous replication
Standby: us-east-1b

On primary failure: standby becomes primary, DNS TTL flips (60-120s)

Read replica: separate instance, asynchronous lag, separate endpoint
```

### DynamoDB

DynamoDB is AWS's managed NoSQL key-value and document database. Single-digit millisecond latency at any scale, serverless (no capacity planning with on-demand mode).

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('users')

# Put item
table.put_item(Item={
    'user_id': 'u-123',       # partition key
    'email': 'alice@example.com',
    'created_at': '2024-01-15T10:00:00Z',
    'preferences': {'theme': 'dark', 'notifications': True}
})

# Get item
response = table.get_item(Key={'user_id': 'u-123'})
user = response['Item']

# Query (requires knowing partition key, can filter by sort key)
response = table.query(
    KeyConditionExpression='user_id = :uid',
    ExpressionAttributeValues={':uid': 'u-123'}
)
```

DynamoDB concepts:
- **Partition key**: determines which DynamoDB partition stores the item (hash key)
- **Sort key**: secondary key within a partition, enables range queries
- **GSI (Global Secondary Index)**: query on non-key attributes, eventual consistency
- **Streams**: capture item-level change log, triggers Lambda or consumers

### ElastiCache

Managed Redis or Memcached. Use for:
- Session storage
- Database result caching (reduce DB load)
- Rate limiting counters
- Pub/sub messaging

---

## Observability on AWS

### CloudWatch

CloudWatch is AWS's native monitoring, logging, and alerting service.

```bash
# Publish custom metric
aws cloudwatch put-metric-data \
  --namespace "MyApp/Performance" \
  --metric-name "RequestLatencyMs" \
  --value 123 \
  --dimensions Service=Checkout,Environment=prod

# Create alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HighErrorRate" \
  --metric-name "5XXError" \
  --namespace "AWS/ApplicationELB" \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:..."
```

**CloudWatch Logs Insights query:**
```
fields @timestamp, @message
| filter status >= 500
| stats count() as error_count by bin(5m)
| sort error_count desc
| limit 20
```

### AWS X-Ray

Distributed tracing for AWS services. Instruments Lambda, API Gateway, ECS. SDK for custom instrumentation in Go, Python, Java, Node.

### CloudTrail

API audit log: every AWS API call recorded (who, what, when, from where). Essential for security investigations and compliance. Enable in all regions, store in S3, enable log file integrity validation.

---

## Common Platform Architectures

### Three-Tier Web Application

```
Internet
    → Route 53 (DNS)
    → CloudFront (CDN + WAF)
    → ALB (HTTPS termination, path routing)
    → EC2/ECS/EKS in private subnets (auto scaling)
    → RDS Multi-AZ in database subnets
    → ElastiCache for session/cache
    → S3 for static assets, user uploads
```

### Event-Driven Architecture

```
Source events → EventBridge (event bus)
    → SQS queues (buffering)
    → Lambda / ECS workers (processing)
    → DynamoDB / RDS (persistence)
    → SNS (fan-out notifications)
    → SES (email)
```

### Kubernetes on EKS

```
Route 53
    → ALB Ingress Controller (AWS Load Balancer Controller)
    → Kubernetes Ingress
    → Service → Pods
    → RDS via PrivateLink
    → S3 via VPC Endpoint (no internet traffic)
    → Secrets Manager via IRSA
```

---

## Common Failure Modes

**Single-AZ dependency:** Forgetting to deploy across AZs. One AZ outage takes down the service. Fix: always use multi-AZ for databases (RDS Multi-AZ), auto scaling groups across AZs, ALB targets in multiple AZs.

**Overly permissive IAM:** Roles with `Action: "*" Resource: "*"`. Creates blast radius if credentials are compromised. Fix: least privilege — define exactly which actions on which resources are needed. Use IAM Access Analyzer to find overly permissive policies.

**Security group sprawl:** Hundreds of SGs with overlapping rules, unclear purpose. Hard to audit, leads to accidentally open ports. Fix: SG per tier (alb-sg, app-sg, db-sg), document purpose, review quarterly.

**NAT Gateway costs:** All outbound traffic from private subnets goes through NAT Gateway, which charges per GB. Large log volumes, image pulls, or telemetry can cause unexpectedly high NAT costs. Fix: use S3 VPC endpoints (free) for S3 traffic, ECR VPC endpoints for image pulls, evaluate traffic patterns with VPC Flow Logs.

**RDS storage autoscale not enabled:** Database fills up, hard stop. Fix: enable storage autoscaling with a maximum, monitor `FreeStorageSpace` metric, alert at 80%.

**EKS pod IP exhaustion:** VPC CNI assigns VPC IPs to pods. Instance with few ENIs or IPs runs out of pod capacity. Fix: choose instance types with many IPs per ENI, use prefix delegation (CIDR blocks per ENI instead of individual IPs), or use custom networking.

---

## Key Questions and Answers

**Q: How does AWS VPC security differ from traditional firewall?**

Traditional firewalls are network perimeter devices with explicit rules evaluated top-to-bottom. AWS security groups are instance-level, stateful (return traffic automatically allowed), and use allow-only rules (no deny, implicit deny for everything else). NACLs are subnet-level, stateless, and support both allow and deny. The practical model: security groups handle most access control, NACLs handle subnet-level blocking. The biggest difference from traditional firewalls: security groups can reference other security groups (not just CIDRs) — "allow traffic from app-sg" means any instance with that security group, regardless of IP address.

**Q: What is the difference between IAM roles and IAM users, and which should you use?**

IAM users have long-lived credentials (password + access keys) tied to a specific identity. IAM roles provide temporary credentials (15 minutes to 12 hours) assumed by services, applications, or federated identities. For production services, always use roles — no long-lived access keys in applications. For humans: use IAM Identity Center (SSO) that federates from your identity provider (Okta, Azure AD) and provides temporary role credentials. Long-lived access keys are a significant security risk (can be stolen, leaked to git, hard to rotate).

**Q: How do you achieve high availability for a web application on AWS?**

Multiple layers: (1) Deploy across at least 2 AZs (instances in different AZs behind ALB). (2) Use Auto Scaling to replace unhealthy instances and scale capacity. (3) RDS Multi-AZ for database (synchronous standby, automatic failover). (4) Read replicas for read scaling. (5) ElastiCache for caching (reduces DB load). (6) S3 for static assets (99.999999999% durability). (7) CloudFront CDN to serve cached content from edge locations when origin is slow. (8) Health checks on ALB target groups — automatically routes away from unhealthy instances.

**Q: What is IRSA and why is it better than using access keys in pods?**

IRSA (IAM Roles for Service Accounts) lets EKS pods authenticate to AWS services using Kubernetes service account tokens, which AWS validates via OIDC. The pod gets temporary credentials (auto-rotated every 15 minutes) scoped exactly to an IAM role. Unlike access keys: no long-lived credentials to leak (no `.aws/credentials` file, no env vars with `AWS_SECRET_ACCESS_KEY`), credentials scope to the specific pod via service account, and every AWS API call is attributed to the specific IAM role making it. If a pod is compromised, the attacker only gets 15-minute credentials for one specific role.

---

## Points to Remember

- Region → AZs → services; always deploy across 2+ AZs for production
- Public subnets have IGW route; private subnets use NAT Gateway for outbound
- Security groups are stateful (allow-only); NACLs are stateless (allow and deny)
- EC2 purchasing: Reserved/Savings Plans for baseline, Spot for batch, On-Demand for burst
- EKS VPC CNI assigns real VPC IPs to pods — pod density limited by ENIs per instance
- IRSA: pods authenticate to AWS via OIDC, no access keys needed
- S3 lifecycle policies automate tiering and expiration
- RDS Multi-AZ: synchronous standby, automatic failover in 60-120 seconds
- DynamoDB: partition key + sort key, single-digit ms latency at any scale
- CloudTrail: mandatory API audit log, enable in all regions, store in S3
- VPC endpoints for S3 and ECR eliminate NAT Gateway costs for those services
- Least privilege IAM: define exactly what actions on what resources

## What to Study Next

- [Cloud Networking and Kubernetes Networking](./cloud-networking-and-kubernetes-networking) — deep dive on VPC and EKS networking
- [Terraform and Infrastructure as Code](./terraform-infrastructure-as-code) — provisioning AWS resources
- [System Design and Cloud Architecture](./system-design-cloud-architecture) — AWS in system design contexts
