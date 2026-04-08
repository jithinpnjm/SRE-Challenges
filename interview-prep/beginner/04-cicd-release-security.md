# Beginner: CI/CD, Release Engineering, And Supply Chain Security

This file teaches the fundamentals of safe software delivery. Even at beginner level, the goal is to build habits that scale to senior ownership.

## Mentor Mode

The right question is not "did the deploy succeed." It is:

- did the right code get reviewed
- did the right artifact get built
- did the right artifact get deployed
- did users stay healthy during rollout
- can we prove and reverse what happened

## What Interviewers Are Testing

- whether you understand a production-worthy pipeline end to end
- whether you treat secrets and deploy credentials carefully
- whether you understand rollback and canary basics
- whether you understand why trusted artifacts matter

## Challenge 1: Safe Pipeline Walkthrough

Prompt:

- describe a basic but production-worthy CI/CD pipeline from pull request to production
- include tests, image build, vulnerability scanning, artifact storage, deployment, and rollback
- explain where approvals should and should not exist

Mentor hints:

- separate build from deploy
- deploy the same immutable artifact to each environment, do not rebuild differently each time

## Challenge 2: Broken Release

Scenario: A release passed unit tests but caused a spike in request latency in production.

Your task:

- explain what checks were missing before rollout
- explain how canary analysis or progressive delivery could help
- explain what rollback trigger you would define

Mentor hints:

- tests proving correctness are not the same as proving production safety
- rollout checks should look at user-facing latency and errors, not only pod health

## Challenge 3: Secret Handling

Prompt:

- explain what not to do with secrets in CI/CD
- describe a better approach for build-time and runtime secrets
- explain how you would rotate a leaked secret with minimum blast radius

Mentor hints:

- avoid long-lived static credentials in workflow systems
- explain the difference between build-time secret need and runtime identity need

## Challenge 4: Supply Chain Basics

Prompt:

- explain why image signing and provenance matter
- explain what problem SLSA is trying to solve
- explain what policy you might enforce before a deployment is allowed

Mentor hints:

- "signed" does not mean "safe"
- provenance answers "where did this artifact come from and how was it built?"

## Challenge 5: Release Communication

Scenario: A team wants to merge on Friday evening because "the change is small."

Your task:

- explain how you assess risk instead of arguing from habit
- identify what information you need before approving
- explain what makes a small code change operationally dangerous

Mentor hints:

- risk is about blast radius, reversibility, system sensitivity, and timing

## Challenge 6: CI Platform Reliability

Prompt:

- explain how your CI/CD platform itself should be monitored
- include queue depth, runner health, success rate, artifact push failures, and deployment duration

Mentor hints:

- if the delivery platform fails, product teams will often try unsafe manual workarounds

## Challenge 7: Canary Basics

Your task:

- explain what a canary rollout is
- explain what metrics you would watch
- explain when not to trust early canary data

## Challenge 8: Secret Leak Response

Your task:

- explain the first five steps after discovering a secret in logs or CI output

## Challenge 9: Digest Versus Tag

Your task:

- explain why image tags are convenient but risky
- explain why digests matter in promotion and rollback

## Challenge 10: Workflow File As Production Risk

Your task:

- explain why changing a CI workflow file can be more dangerous than changing app code
- explain what review controls you would require
