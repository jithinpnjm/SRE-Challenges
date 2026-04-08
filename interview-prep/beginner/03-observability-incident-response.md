# Beginner: Observability, SLOs, Alerting, And Incident Response

## Challenge 1: Metrics, Logs, Traces, Profiles

Prompt:

- explain what each signal is best for
- explain when metrics are insufficient
- explain how logs can help but also hurt under incident pressure
- explain one example where traces reveal the dependency bottleneck faster than logs

## Challenge 2: Noisy Alert

Scenario: A `5xx > 0` alert pages the on-call many times each week, but most pages self-resolve in under 2 minutes with no customer impact.

Your task:

- explain why the alert is weak
- propose a better alert based on rate, duration, and user impact
- explain how SLOs help here

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
