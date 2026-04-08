# Intermediate: Automation, Tooling, And Reliability Scripts

## Mentor Mode

At this level, scripts are operational tools. Think about trust, failure modes, and who will use them at 3 a.m.

## Challenge 1: Incident Triage Script

Task:

- write a Bash or Python tool that collects CPU, memory, disk, and top processes from a host
- print a short summary suitable for first response

Mentor tip:

- first-response tools should optimize for speed and signal, not completeness

## Challenge 2: Kubernetes Triage Helper

Task:

- build a script that lists Pods in bad states across namespaces
- summarize restarts, Pending pods, and warning events

Hints:

- use `kubectl get pods -A -o json`
- aggregate, do not dump raw JSON

## Challenge 3: Retry Wrapper

Task:

- implement a command wrapper with capped exponential backoff
- include timeout, logging, and max-attempt behavior
- explain where such a wrapper is helpful and where it is dangerous

## Challenge 4: Log Correlation

Task:

- given app logs and reverse proxy logs, correlate by request ID
- print a timeline for failed requests

## Challenge 5: Python API Automation

Task:

- call a cloud API
- paginate results
- handle rate limits
- write output to JSON

Useful concepts:

- retries with jitter
- backoff
- token expiry
- pagination
- partial failure handling
