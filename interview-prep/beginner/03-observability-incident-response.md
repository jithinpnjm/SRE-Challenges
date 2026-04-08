# Beginner: Observability, SLOs, Alerting, And Incident Response

This file builds the first reliable mental models for how we see and respond to production systems.

## Mentor Mode

Observability should help you answer:

- what is broken
- who is affected
- where to look next

Incident response should help you:

- reduce user impact
- coordinate work
- avoid chaos

## Challenge 1: Metrics, Logs, Traces, Profiles

Prompt:

- explain what each signal is best for
- explain when metrics are insufficient
- explain how logs can help but also hurt under incident pressure
- explain one example where traces reveal the dependency bottleneck faster than logs

Mentor hints:

- metrics tell you that something is wrong
- traces often tell you where the time went
- logs give detail but can drown you if opened too early without a question

## Challenge 2: Noisy Alert

Scenario: A `5xx > 0` alert pages the on-call many times each week, but most pages self-resolve in under 2 minutes with no customer impact.

Your task:

- explain why the alert is weak
- propose a better alert based on rate, duration, and user impact
- explain how SLOs help here

Mentor hints:

- an alert is only good if someone should actually act on it

## Challenge 3: Basic SLO Design

Scenario: You own an internal API that serves deployment metadata to CI/CD pipelines.

Your task:

- define one availability SLI and one latency SLI
- propose a reasonable SLO target
- explain the tradeoffs of setting the target too high or too low
- explain what you would exclude, if anything, from the measurement

## Challenge 4: First Five Minutes Of An Incident

Scenario: Error rate spikes across several services after a configuration rollout. Engineers are already debating the root cause in chat.

Your task:

- describe your first five minutes as incident lead
- explain how you control communication and parallel work
- explain when you would pause rollout, rollback, or hold

Mentor hints:

- stop active harm first if evidence is strong enough
- role clarity matters more than perfect diagnosis in minute five

## Challenge 5: Dashboard Review

Prompt:

- describe the minimum dashboard you want for a customer-facing service
- include saturation, errors, latency, traffic, and dependency health
- explain which panels help with diagnosis versus status reporting

## Challenge 6: Postmortem Basics

Prompt:

- explain what makes a good blameless postmortem
- distinguish timeline, root cause, contributing factors, and action items
- explain how you prevent "add more monitoring" from becoming a low-quality action item

## Challenge 7: Golden Signals

Your task:

- explain latency, traffic, errors, and saturation
- explain one real example metric for each

## Challenge 8: Metrics Versus Logs During A Page

Your task:

- explain what you open first and why
- explain when logs can mislead because of sampling, noise, or missing context

## Challenge 9: User Impact Versus Internal Health

Your task:

- explain how dashboards can look green while users still suffer
- explain why blackbox checks help

## Challenge 10: Incident Update Writing

Your task:

- write a short incident status update with user impact, current action, and next update time
