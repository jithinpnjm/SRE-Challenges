# Beginner: CI/CD, Release Engineering, And Supply Chain Security

## Challenge 1: Safe Pipeline Walkthrough

Prompt:

- describe a basic but production-worthy CI/CD pipeline from pull request to production
- include tests, image build, vulnerability scanning, artifact storage, deployment, and rollback
- explain where approvals should and should not exist

## Challenge 2: Broken Release

Scenario: A release passed unit tests but caused a spike in request latency in production.

Your task:

- explain what checks were missing before rollout
- explain how canary analysis or progressive delivery could help
- explain what rollback trigger you would define

## Challenge 3: Secret Handling

Prompt:

- explain what not to do with secrets in CI/CD
- describe a better approach for build-time and runtime secrets
- explain how you would rotate a leaked secret with minimum blast radius

## Challenge 4: Supply Chain Basics

Prompt:

- explain why image signing and provenance matter
- explain what problem SLSA is trying to solve
- explain what policy you might enforce before a deployment is allowed

## Challenge 5: Release Communication

Scenario: A team wants to merge on Friday evening because "the change is small."

Your task:

- explain how you assess risk instead of arguing from habit
- identify what information you need before approving
- explain what makes a small code change operationally dangerous

## Challenge 6: CI Platform Reliability

Prompt:

- explain how your CI/CD platform itself should be monitored
- include queue depth, runner health, success rate, artifact push failures, and deployment duration
