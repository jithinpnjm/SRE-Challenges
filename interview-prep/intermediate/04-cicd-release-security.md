# Intermediate: CI/CD, Release Engineering, And Supply Chain Security

## Challenge 1: Progressive Delivery Design

Scenario: A critical platform service must be deployed many times per week without risking fleet-wide regression.

Your task:

- design a rollout strategy using canary or phased rollout
- define promotion and abort signals
- explain how you handle low-volume services where metric confidence is weak

## Challenge 2: Artifact Trust

Scenario: Security asks how you know the container running in production was built from reviewed source and not replaced in transit.

Your task:

- explain provenance, signing, and policy enforcement
- explain where attestations should be checked
- explain what gaps remain even after signing

## Challenge 3: CI Runner Compromise

Scenario: A shared CI runner is suspected compromised.

Your task:

- describe your immediate containment steps
- explain blast radius analysis
- explain how isolation, ephemeral runners, least privilege, and short-lived credentials change the response

## Challenge 4: Release Train Versus Trunk-Based Delivery

Prompt:

- compare the two approaches for a platform team
- explain which failure modes each approach makes better or worse
- explain what governance you still need even with fast delivery

## Challenge 5: Drift Between Terraform And Reality

Scenario: Your cloud environment drifts from IaC state due to manual emergency changes.

Your task:

- explain detection, review, and reconciliation options
- explain when a manual fix is acceptable
- explain how you would preserve emergency response speed without normalizing unsafe drift

## Challenge 6: Dependency Upgrade Risk

Scenario: A base image and several libraries need urgent security updates, but the platform runs many latency-sensitive services.

Your task:

- explain how you would batch, stage, test, and observe the upgrades
- explain why even "simple" dependency changes can cause production regressions
