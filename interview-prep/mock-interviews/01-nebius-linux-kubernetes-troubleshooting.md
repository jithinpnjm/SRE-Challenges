# Mock Interview 1: Nebius-Style Linux, Networking, Kubernetes, Troubleshooting

Run this as a 45 to 60 minute mock. Answer verbally first, then write a short debrief.

## Interviewer Guidance

- push for concrete commands and packet-level reasoning
- interrupt vague answers and ask for the next command or next metric
- ask "what changed your mind?" when the candidate shifts hypotheses

## Questions

1. A service is timing out only from some nodes in a cluster. Walk me through your first ten minutes.
2. Explain how a packet reaches a Pod from a client outside the cluster.
3. A Pod is Ready, but requests still fail. Give me five causes and how you would disprove each one.
4. Why can memory pressure hurt latency before any OOM kill occurs?
5. What does the kubelet do that matters operationally during a bad rollout?
6. A DNS issue is suspected, but application teams insist "network is down." How do you arbitrate with evidence?
7. You see retransmits, elevated tail latency, and partial rack impact. What layers do you test first and why?
8. What are requests, limits, and QoS really buying you in a multi-tenant platform?
9. A probe configuration caused cascading failure during peak load. Explain the mechanism.
10. Give me an example of a production issue where Linux, networking, and Kubernetes all interacted.

## Scoring Rubric

- strong: answers are structured, operational, and evidence-driven
- medium: concepts are mostly right but too generic or object-focused
- weak: answers stay at the YAML layer and do not reach node, network, or process behavior

## Self-Review

- did you name commands and signals without fishing
- did you talk about failure domains
- did you avoid jumping to a single root cause too early
