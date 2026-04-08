# Interview Prep Pack

This pack is a production-oriented interview system for Senior SRE, DevOps Engineer, and Platform Engineer preparation.

It is designed for:

- SRE and platform breadth across Linux, networking, Kubernetes, observability, CI/CD, cloud, resilience, security, and incident work
- deep interview practice in distributed production design, low-latency systems, and high-availability tradeoffs
- Nebius-style preparation with extra emphasis on Linux, networking principles, Kubernetes internals, troubleshooting, and distributed system reasoning
- GCP-first scenarios with AWS crossover challenges so you can translate principles across cloud providers

## How To Use This Pack

Use the levels in order unless you already know a topic cold:

1. `beginner/`
2. `intermediate/`
3. `expert/`
4. `mock-interviews/`

Work challenge-by-challenge, not file-by-file. For each prompt:

- answer aloud in 10 to 20 minutes
- write a short architecture or incident note
- list assumptions before solutions
- name failure modes before optimizations
- explain how you would validate your answer in production
- compare a GCP choice with an AWS equivalent when relevant

## Recommended Study Rhythm

- Week 1: close gaps in Linux, networking, Kubernetes fundamentals, and observability basics
- Week 2: focus on troubleshooting, incident response, production debugging, and alert quality
- Week 3: push into system design, resilience, low latency, HA, and cloud architecture
- Week 4: run timed mock interviews, review weak spots, and rehearse concise senior-level communication

The detailed schedule is in [4-week-roadmap.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/4-week-roadmap.md).

## Structure

- [beginner](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/beginner)
- [intermediate](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/intermediate)
- [expert](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/expert)
- [mock-interviews](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/mock-interviews)
- [sources-and-references.md](/Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/interview-prep/sources-and-references.md)

## Interview Answer Standards

For senior-level answers, aim to consistently cover:

- requirements and constraints
- failure domains
- observability and diagnostics
- rollback and safe rollout strategy
- security and least privilege
- operational ownership and on-call impact
- capacity and cost tradeoffs
- regional and zonal blast radius
- how you would test, verify, and game-day the design

## Nebius Bias

For Nebius-oriented prep, spend extra time on:

- Linux process, memory, IO, and network debugging
- DNS, TCP, routing, MTU, conntrack, load balancing, and packet flow reasoning
- Kubernetes scheduling, kubelet behavior, probes, QoS, evictions, CNI, and control plane interactions
- distributed service design under latency and failure pressure
- incident handling with incomplete information

## How I Can Help You Next

You can use this pack with me as a learning partner later. I can:

- run live mock interviews from any file
- review your answers and score them like an interviewer
- give hints instead of solutions
- turn a prompt into a hands-on repo exercise
- create follow-up drills only for the areas where you struggle
