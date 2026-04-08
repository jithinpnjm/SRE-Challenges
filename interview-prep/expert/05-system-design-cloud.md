# Expert: Distributed Systems, End-To-End Cloud Architecture, HA, Low Latency, Security, And Operability

This file is for the kind of system design interview where you are expected to think like an owner of production architecture, not just a consumer of cloud products.

## Mentor Mode

Expert answers should:

## Answer This In The Portal

- Draft your architecture answer here: [/workspace?challenge=Design%20a%20production%20cloud%20platform%20end%20to%20end](/workspace?challenge=Design%20a%20production%20cloud%20platform%20end%20to%20end)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- GCP public-platform reference answer: [hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md](../hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md)

- start with requirements and failure domains
- identify the stateful core early
- describe the full request path end to end
- justify every major layer
- explain how the system fails and how operators respond
- balance resilience against complexity and cost

## Where To Study And Simulate

Official architecture references:

- GCP Architecture Framework: https://cloud.google.com/architecture/framework
- GCP Reliability pillar: https://cloud.google.com/architecture/framework/reliability
- Cloud Load Balancing overview: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/application-load-balancer
- Cloud CDN overview: https://cloud.google.com/cdn/docs/overview
- Cloud Armor overview: https://cloud.google.com/armor/docs/cloud-armor-overview
- VPC overview: https://cloud.google.com/vpc/docs/overview
- Cloud Run overview: https://cloud.google.com/run/docs/overview/what-is-cloud-run
- Pub/Sub docs: https://cloud.google.com/pubsub/docs
- Cloud SQL overview: https://cloud.google.com/sql/docs/introduction
- AWS Reliability pillar: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
- AWS VPC security: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html
- AWS NACLs: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_ACLs.html
- AWS Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html
- AWS Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html
- Route 53: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/getting-started.html
- AWS WAF: https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html
- EKS networking best practices: https://docs.aws.amazon.com/eks/latest/best-practices/networking.html

Observability references:

- OpenTelemetry: https://opentelemetry.io/docs/
- Elastic Observability: https://www.elastic.co/guide/en/observability/current/index.html
- Elastic Stack overview: https://www.elastic.co/guide/en/kibana/current/index.html/

## Challenge 1: Public Multi-Region API Platform

Scenario: Design a globally used public API platform with:

- public DNS
- CDN for cacheable and semi-cacheable content
- WAF and DDoS protection
- global or regional load balancing as appropriate
- stateless API tier
- private relational database
- async messaging
- centralized observability

Traffic is global, p99 matters, and regulatory constraints may force some regional boundaries.

Your task:

- explain the full path from client DNS lookup to backend response
- explain which layers are global and which are regional
- explain where you cache and where you do not
- explain how you handle failover, partial regional degradation, and stale edge state
- explain the operator workflow during an incident

Mentor hints:

- do not say "multi-region" without explaining data and control implications
- edge, app, and data layers fail differently

## Challenge 2: Private Internal Platform For Developer Workloads

Scenario: Design an internal-only platform for engineering workloads. Some services are private HTTP APIs, some are event-driven workers, and some are internal dashboards. The company uses GCP primarily, with one strategically important AWS footprint.

Your task:

- explain network boundaries for internal, private, and shared services
- explain identity for workloads and humans
- explain how DNS, internal load balancing, service discovery, and private database access work
- explain what belongs on GKE, Cloud Run, or VM-based workloads
- explain how you would make this operable for many teams

Mentor hints:

- staff-level quality often shows up in what you standardize and what you leave flexible

## Challenge 3: Stateless And Stateful Split

Scenario: You inherit a platform where web APIs, workers, caches, queues, and databases are all described as one "microservices platform," but reliability work is stalled because nobody distinguishes stateless and stateful concerns.

Your task:

- redraw the system around state boundaries
- explain how availability, failover, backup, and latency change by layer
- explain which parts should scale horizontally and which parts need stronger recovery planning

Mentor hints:

- the stateful core usually controls the real RTO and RPO

## Challenge 4: Low-Latency Global Control Plane

Scenario: Design a low-latency control plane for compute scheduling metadata across GCP and AWS. Most workloads are in GCP, but some premium tenants run in AWS. Strong availability is required, but correctness matters more than vanity multi-cloud symmetry.

Your task:

- explain control-plane versus data-plane responsibilities
- explain the state model and consistency choices
- explain how DNS, LB, regional placement, cache, and replication affect latency
- explain what degrades if one cloud loses control-plane health but still serves local traffic

Mentor hints:

- cross-cloud design is not a product-mapping exercise
- decide what remains provider-specific on purpose

## Challenge 5: Full Edge-To-Database Threat Model

Scenario: You need to explain the security architecture of a production web platform to both engineering and security leadership.

Your task:

- walk from edge to origin to service to data store
- explain DNS, CDN, WAF, LB, firewall, segmentation, workload identity, secrets, and auditability
- explain how you reduce blast radius for a compromised service
- explain how you protect admin and CI/CD paths separately from normal user traffic

Mentor hints:

- identity and control-plane protection matter as much as request filtering

## Challenge 6: End-To-End Cloud Resource Mapping

Prompt:

- design the same architecture once for GCP-first and once for AWS-first
- include DNS, CDN, WAF, LB, public and private networking, compute, database, async messaging, monitoring, and alerting
- call out which mappings are direct and which are only rough analogies

Mentor hints:

- GCP VPC, firewall, and LB behavior differ materially from AWS VPC, SG, and NACL design
- do not flatten those differences away

## Challenge 7: ELK, OpenTelemetry, And Alerting Architecture

Scenario: A platform needs centralized logs, metrics, traces, service dashboards, SLOs, and alert routing. Some teams love Elastic, others want vendor-neutral telemetry pipelines.

Your task:

- explain how you would structure collection, transport, storage, query, and alerting
- explain where ELK or Elastic Observability fits well
- explain where OpenTelemetry adds value
- explain how to prevent observability cost and cardinality from becoming the next outage

Mentor hints:

- observability architecture is part of system design, not an afterthought

## Challenge 8: AI Ops And Operational Automation

Scenario: Leadership asks for "AIOps" to reduce incident burden across a growing platform.

Your task:

- explain which problems are good candidates for automation or ML-assisted correlation
- explain where deterministic automation is better than AI
- explain the safety boundaries for auto-remediation
- explain how you would use AI-assisted triage without creating false confidence

Mentor hints:

- seniority here means resisting magical thinking while still using automation intelligently

## Challenge 9: Cloud SQL Or Managed RDBMS In HA Design

Scenario: A mission-critical service depends on a managed relational database. Availability matters, but the application has connection storms and query spikes.

Your task:

- explain HA behavior of the managed DB layer
- explain connection pooling, private versus public connectivity, read scaling, backup strategy, and failover testing
- explain how app behavior can make a healthy database look broken

## Challenge 10: Staff-Level Architecture Synthesis

Prompt:

- design a production system with DNS, CDN, WAF, LB, public and private networks, route control, firewall layers, Kubernetes or Cloud Run, stateful and stateless services, relational storage, async messaging, observability, Python-based automation, and safe delivery
- explain the architecture, not as boxes, but as flows, failure domains, and operating rules
- answer as if the interviewer interrupts you with: zonal loss, regional loss, partial dependency slowness, deploy regression, and security incident
