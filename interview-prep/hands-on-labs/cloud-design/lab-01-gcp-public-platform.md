# Cloud Design Lab 1: GCP Public Platform

## Scenario

Design a public production platform on GCP for a customer-facing API product.

Requirements:

- global users
- public DNS
- CDN for cacheable content
- WAF and DDoS protection
- L7 load balancing
- stateless API tier on GKE or Cloud Run, your choice
- private relational database
- Pub/Sub for async work
- centralized logs, metrics, traces, and alerting
- high availability with zonal failure tolerance
- secure CI/CD and rollout controls

## Your Task

Write and sketch:

1. requirements and assumptions
2. edge and traffic path
3. network layout
4. stateless versus stateful split
5. database and async design
6. observability architecture
7. security controls
8. rollout and rollback model
9. zonal failure behavior
10. what you would deliberately keep simple

## Interviewer Pressure Questions

- why GKE versus Cloud Run here
- what exactly is public and what is private
- where does TLS terminate
- how do you avoid the database becoming the real SPOF
- what if Cloud CDN caches something dangerous or stale
- what if one zone is healthy enough for health checks but bad for real traffic

## Deliverable

- one architecture diagram
- one page of reasoning
- one incident note for zonal degradation

## Model-Answer Rubric

I will score answers roughly like this:

- requirements clarity: did you clarify traffic, latency, HA, and security assumptions
- end-to-end flow: did you describe DNS, CDN, WAF, LB, compute, app, data, and async paths
- state boundaries: did you clearly separate stateless and stateful parts
- failure domains: did you explain zonal, regional, and shared dependency risks
- security model: did you cover public/private boundaries, identity, secrets, and edge protection
- observability and operations: did you include metrics, logs, traces, SLOs, and rollout safety
- tradeoff quality: did you justify why each major layer exists

Strong answer signs:

- clear stateful core
- realistic zonal degradation handling
- avoids overcomplicating global design
- explains what stays private and why

## Use Me As Interviewer

Send me:

- your diagram summary
- your reasoning
- the top three tradeoffs you chose

I can then review it as a senior interviewer.
