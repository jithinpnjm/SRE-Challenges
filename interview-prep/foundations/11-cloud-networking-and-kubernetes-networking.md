# Foundations: Cloud Networking And Kubernetes Networking

This guide connects Linux networking, cloud networking, and Kubernetes packet flow into one operational model.

## Mentor Mode

Cloud networking problems often look like application problems.

Kubernetes networking problems often look like "the cluster is weird."

The fix is the same in both cases:

1. identify the traffic path
2. identify where policy is enforced
3. identify where state is tracked
4. compare healthy and unhealthy paths

## Cloud Networking Building Blocks

### GCP

Senior-level topics:

- global VPC with regional subnets
- firewall rules and hierarchy
- internal versus external load balancing
- Cloud NAT and egress behavior
- private service connectivity
- route behavior and custom routes

### AWS

Senior-level topics:

- VPC and subnet boundaries
- route tables
- internet gateway, NAT gateway, private egress
- security groups
- network ACLs
- internal versus internet-facing load balancers

## Security Group Versus NACL

Senior-level summary:

- SG: resource-level, stateful
- NACL: subnet-level, stateless

This matters because:

- return traffic handling differs
- troubleshooting scope differs
- blast radius differs

## Load Balancer Thinking

Ask:

- L4 or L7
- internal or external
- regional or global
- health checks shallow or user-realistic
- cross-zone or cross-region behavior

## Kubernetes Networking In Cloud Environments

You need to understand both:

- cluster-local packet flow
- how cloud load balancers and VPC routing feed that packet flow

Common joined failure modes:

- Pod healthy, Service bad
- LB healthy, user path bad
- one node pool bad due to dataplane skew
- one zone bad due to hidden dependency or cloud path issue

## Cloud Networking Practice Questions

1. Explain the path from internet client to GKE service behind external HTTP(S) LB.
2. Explain the path from internal app subnet to private database.
3. Explain why SG and NACL misconfiguration feel different operationally.
4. Explain how a health check can stay green while user traffic fails.
