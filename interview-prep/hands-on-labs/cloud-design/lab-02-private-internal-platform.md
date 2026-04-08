# Cloud Design Lab 2: Private Internal Platform

## Scenario

Design an internal developer platform for private services, internal dashboards, and event-driven workers.

Requirements:

- no public internet exposure for core services
- private DNS and internal service discovery
- internal load balancing
- GKE and Cloud Run both available
- Cloud SQL or equivalent relational store
- Pub/Sub or queue-based async processing
- strong identity and least privilege
- centralized observability
- safe multi-team platform guardrails

## Your Task

Write and sketch:

1. private network and service boundaries
2. internal traffic path
3. identity model for humans and workloads
4. where you use GKE, Cloud Run, or VMs
5. how private database connectivity works
6. how you protect shared platform components
7. what guardrails are mandatory versus optional
8. what an incident response path looks like

## Interviewer Pressure Questions

- how do engineers reach internal dashboards safely
- what is your egress strategy
- what is your blast radius if one workload is compromised
- how do you avoid the platform team becoming a blocking team

## Deliverable

- diagram
- control-plane and data-plane explanation
- security boundary explanation

## Model-Answer Rubric

- private network design: are internal-only boundaries explicit
- identity model: are workload and human access clearly separated
- platform choice: is GKE versus Cloud Run versus VM usage justified
- data access: is private database connectivity realistic
- security model: are egress, segmentation, and blast radius addressed
- operability: are observability, guardrails, and ownership clear

Strong answer signs:

- minimal public exposure
- thoughtful internal access patterns
- guardrails without over-centralization
