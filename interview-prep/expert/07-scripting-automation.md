# Expert: Automation Strategy, Python Tooling, And Operability

## Mentor Mode

Expert automation is as much about what it refuses to do automatically as what it does do.

## Challenge 1: Fleet Triage Toolkit

Scenario: You need a small toolkit for incident responders that gathers the most important signals across hosts, containers, and services fast.

Your task:

- define what the toolkit should collect by default
- explain how to keep it safe, read-only, and trustworthy
- explain when local scripts should evolve into real internal tools

## Challenge 2: Python Reliability Utility

Scenario: You are writing a Python tool that talks to cloud APIs and internal services during incidents.

Your task:

- explain how you structure retries, timeouts, logging, auth refresh, and partial failure handling
- explain how you test a script that interacts with unreliable dependencies

## Challenge 3: Safe Automation Boundaries

Scenario: Engineers want a script that can restart failed workloads across many clusters automatically.

Your task:

- explain why this is dangerous
- define guardrails, approvals, blast-radius controls, and auditability
- explain when automation should suggest rather than act

## Challenge 4: Build Versus Buy

Prompt:

- explain when a shell script is enough
- explain when Python is better
- explain when you need a service, operator, or platform product instead of more scripts
