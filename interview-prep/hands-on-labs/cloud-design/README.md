# Cloud Design Labs

These labs are architecture-review exercises rather than command-only labs. You sketch the design, write the reasoning, and then use me as the interviewer and reviewer.

## Labs

1. [lab-01-gcp-public-platform.md](lab-01-gcp-public-platform.md)
2. [lab-02-private-internal-platform.md](lab-02-private-internal-platform.md)
3. [lab-03-aws-crossover-rebuild.md](lab-03-aws-crossover-rebuild.md)
4. [lab-04-low-latency-multi-region-control-plane.md](lab-04-low-latency-multi-region-control-plane.md)
5. [reference-answer-gcp-public-platform.md](reference-answer-gcp-public-platform.md)

## How To Use These

For each lab:

1. write requirements and constraints first
2. sketch the architecture
3. write the traffic flow
4. identify stateful and stateless boundaries
5. identify failure domains
6. identify observability, security, and rollout controls
7. send me your answer for review

## Where To Study And Simulate

Official references:

- GCP Architecture Framework: https://cloud.google.com/architecture/framework
- Cloud Load Balancing overview: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- Cloud CDN overview: https://cloud.google.com/cdn/docs/overview
- Cloud Armor overview: https://cloud.google.com/armor/docs/cloud-armor-overview
- VPC overview: https://cloud.google.com/vpc/docs/overview
- Cloud Run overview: https://cloud.google.com/run/docs/overview/what-is-cloud-run
- Cloud SQL overview: https://cloud.google.com/sql/docs/introduction
- Pub/Sub docs: https://cloud.google.com/pubsub/docs
- AWS Reliability pillar: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
- AWS VPC security: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html
- AWS NACLs: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_ACLs.html
- AWS WAF: https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html
- Route 53: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/getting-started.html
- ALB overview: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html
- NLB overview: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html

Mentor tip:

- these labs are for reasoning quality, not memorizing every product name
