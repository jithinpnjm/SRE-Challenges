# Expert: Release Engineering, Platform Security, And Governance

## Challenge 1: End-To-End Trusted Delivery

Scenario: Design a release system where every production deployment must be traceable to reviewed source, verified build steps, and approved runtime policy.

Your task:

- describe the trust chain end to end
- explain how provenance, signing, policy checks, and deployment controllers interact
- explain where emergency bypass exists and how it is audited

## Challenge 2: Break-Glass Design

Scenario: A critical production outage requires fast manual action outside the normal deployment pipeline.

Your task:

- explain how to support break-glass safely
- describe approval, logging, expiration, and post-incident reconciliation
- explain how to avoid normalizing bypass culture

## Challenge 3: Multi-Tenant CI Platform

Scenario: You run a CI platform for many teams with different trust levels and dependencies.

Your task:

- explain the security and isolation model
- explain how you would design runner placement, credential boundaries, network access, and artifact trust
- explain where strong isolation is mandatory

## Challenge 4: Policy Fatigue

Scenario: Security keeps adding admission and pipeline policies, and engineering velocity drops. Teams start looking for workarounds.

Your task:

- explain how you would redesign the platform contract
- explain the difference between non-negotiable guardrails and high-friction review steps
- explain how to measure whether policy is effective rather than merely strict

## Challenge 5: Fleet-Wide Rollback Under Uncertainty

Scenario: A newly signed and approved release may still be functionally bad. Half the fleet is already updated.

Your task:

- explain how you decide between stop, partial rollback, full rollback, or hold
- explain what telemetry and business signals matter most
- explain how artifact trust and functional correctness are different concerns

## Challenge 6: Supply Chain Threat Model

Prompt:

- present a threat model for modern build and release infrastructure
- include source control compromise, dependency poisoning, runner escape, artifact store tampering, signing key misuse, and insider abuse
- explain preventive, detective, and recovery controls
