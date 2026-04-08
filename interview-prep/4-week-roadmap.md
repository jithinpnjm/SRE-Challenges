# 4-Week Roadmap

This roadmap assumes about 60 to 120 minutes per day. If you have more time, add mock interview repetitions rather than trying to read everything at once.

## Week 1: Core Foundations

Goal: become crisp on Linux, networking, Kubernetes basics, and observability building blocks.

### Day 1

- read [beginner/01-linux-networking.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/beginner/01-linux-networking.md)
- answer Challenges 1 to 3 aloud
- write one page on TCP handshake, retransmits, and what `TIME_WAIT` means operationally

### Day 2

- finish beginner Linux and networking challenges
- practice explaining DNS resolution path, NAT, and packet filtering
- review one production incident you have seen and map it to OSI layers

### Day 3

- read [beginner/02-kubernetes.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/beginner/02-kubernetes.md)
- answer all fundamentals and troubleshooting prompts
- explain Pod, Deployment, Service, Ingress, and probe interactions without notes

### Day 4

- read [beginner/03-observability-incident-response.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/beginner/03-observability-incident-response.md)
- write sample alert improvements for two noisy alerts you have seen before
- practice distinguishing logs, metrics, traces, and profiles

### Day 5

- read [beginner/04-cicd-release-security.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/beginner/04-cicd-release-security.md)
- summarize a secure CI/CD pipeline from commit to production
- map image signing and provenance to one service you know

### Day 6

- read [beginner/05-system-design-cloud.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/beginner/05-system-design-cloud.md)
- answer the GCP and AWS crossover prompts
- sketch one HA design and one low-latency design

### Day 7

- run [mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md)
- keep the interview to 45 minutes
- review weak spots and note the exact concepts to revisit in Week 2

## Week 2: Troubleshooting And Incident Depth

Goal: become strong at production debugging, alert triage, and incident reasoning.

### Day 8

- read [intermediate/01-linux-networking.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/intermediate/01-linux-networking.md)
- work the packet loss, conntrack, and CPU steal scenarios

### Day 9

- finish intermediate Linux and networking
- drill command-first debugging plans for CPU, memory, disk, and network symptoms
- explain when you would use `ss`, `ip`, `tcpdump`, `strace`, `journalctl`, and `perf`

### Day 10

- read [intermediate/02-kubernetes.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/intermediate/02-kubernetes.md)
- focus on kube-scheduler, kubelet, evictions, and service networking

### Day 11

- read [intermediate/03-observability-incident-response.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/intermediate/03-observability-incident-response.md)
- design one SLO set and a paging strategy for a customer-facing API

### Day 12

- read [intermediate/04-cicd-release-security.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/intermediate/04-cicd-release-security.md)
- rehearse rollback, progressive delivery, and supply-chain risk answers

### Day 13

- read [intermediate/05-system-design-cloud.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/intermediate/05-system-design-cloud.md)
- compare regional HA patterns in GCP and AWS

### Day 14

- run [mock-interviews/02-distributed-systems-and-resilience.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/mock-interviews/02-distributed-systems-and-resilience.md)
- keep answers concise and structured
- score yourself on clarity, tradeoffs, and failure analysis

## Week 3: Expert Design And Senior-Level Tradeoffs

Goal: think like an owner of high-scale, high-availability, low-latency production systems.

### Day 15

- read [expert/01-linux-networking.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/expert/01-linux-networking.md)
- work the tail-latency, kernel tuning, and noisy-neighbor scenarios

### Day 16

- read [expert/02-kubernetes.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/expert/02-kubernetes.md)
- answer control plane degradation and multi-cluster resilience prompts

### Day 17

- read [expert/03-observability-incident-response.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/expert/03-observability-incident-response.md)
- practice translating SLO burn into executive and engineer language

### Day 18

- read [expert/04-cicd-release-security.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/expert/04-cicd-release-security.md)
- prepare answers on break-glass, provenance, policy enforcement, and release governance

### Day 19

- read [expert/05-system-design-cloud.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/expert/05-system-design-cloud.md)
- focus on low latency, cross-region design, data consistency, and cloud failure domains

### Day 20

- rehearse your strongest three stories:
- one incident you led
- one reliability improvement you drove
- one difficult debugging case

### Day 21

- run [mock-interviews/03-platform-cloud-and-security.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/mock-interviews/03-platform-cloud-and-security.md)
- follow up with a written architecture summary in under one page

## Week 4: Interview Simulation And Targeted Repair

Goal: convert knowledge into confident, interviewer-friendly performance.

### Day 22

- re-run the beginner prompts you found hardest
- force yourself to answer in concise senior language

### Day 23

- re-run the intermediate prompts you found hardest
- add one diagram per system design answer

### Day 24

- re-run the expert prompts you found hardest
- explicitly state tradeoffs, blast radius, and rollback plans

### Day 25

- run a 60-minute mixed mock from all three mock files
- record your answers if possible

### Day 26

- review [sources-and-references.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/sources-and-references.md) for weak domains only
- do not try to reread everything

### Day 27

- create short cheat sheets for:
- Linux debugging flow
- Kubernetes pod-to-packet path
- SLO and alert design
- deployment safety and rollback
- GCP to AWS service mapping

### Day 28

- do one final Nebius-focused mock
- sleep, simplify, and optimize for calm execution rather than last-minute breadth
