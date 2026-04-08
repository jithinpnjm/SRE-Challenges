# Cloud Networking Drill 2: GCP VPC And Load Balancing Design

## Goal

Explain a GCP-first network architecture clearly.

## Scenario

Design networking for a public service on GCP using:

- public DNS
- CDN
- WAF
- external HTTP(S) load balancing
- GKE or Cloud Run backend
- private database

## Tasks

1. Explain the request path end to end.
2. Explain global VPC and regional subnet implications.
3. Explain internal versus external load balancing choices.
4. Explain where Cloud NAT or private connectivity matter.
5. Explain what health checks can and cannot prove.

## Model-Answer Rubric

- does the answer explain the path, not just the products
- does it handle private database access realistically
- does it identify zonal and regional failure implications
