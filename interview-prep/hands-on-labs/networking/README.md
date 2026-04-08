# Networking Labs

These labs teach traffic flow, protocol reasoning, DNS, routing, TLS, and packet-level troubleshooting.

## Labs

1. [lab-01-http-dns-flow.md](lab-01-http-dns-flow.md)
2. [lab-02-ssh-latency.md](lab-02-ssh-latency.md)
3. [lab-03-routing-firewall-and-capture.md](lab-03-routing-firewall-and-capture.md)

## What Good Looks Like

- you describe the request path before troubleshooting
- you separate DNS, TCP, TLS, and HTTP timing
- you explain what packet capture is proving, not just that you ran it

## Where To Run These

- your laptop against public endpoints for DNS, TLS, and HTTP timing drills
- a pair of VMs for SSH and routing experiments
- GCP Connectivity Tests for cloud path reasoning

Helpful references:

- GCP Connectivity Tests overview: https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/overview
- VPC overview: https://cloud.google.com/vpc/docs/overview
- AWS VPC security overview: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html
