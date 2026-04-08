# Expert: Release Engineering, Trusted Delivery, Platform Security, And Governance

This file is for staff-level conversations about how a company safely turns source code into production reality.

## Mentor Mode

Trusted delivery is about both authenticity and operational safety.

A signed release can still be:

- logically broken
- operationally dangerous
- badly rolled out
- built by an over-privileged or compromised system

Expert answers should cover:

- trust chain
- rollout chain
- runtime verification
- break-glass path
- organizational contract between security and engineering

## Where To Study And Simulate

Official references:

- Cloud Build overview: https://cloud.google.com/build/docs/overview
- Cloud Deploy overview: https://cloud.google.com/deploy/docs/overview
- Binary Authorization overview: https://cloud.google.com/binary-authorization/docs/overview
- GitHub Actions security: https://docs.github.com/en/actions/concepts/security
- Security hardening for GitHub Actions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- Security hardening your deployments: https://docs.github.com/actions/deployment/security-hardening-your-deployments
- OIDC for GitHub Actions: https://docs.github.com/actions/concepts/security/about-security-hardening-with-openid-connect
- SLSA: https://slsa.dev/
- Sigstore Cosign overview: https://docs.sigstore.dev/cosign/overview/

## Challenge 1: End-To-End Trusted Delivery

Scenario: Design a release system where every production deployment must be traceable to reviewed source, verified build steps, and approved runtime policy.

Your task:

- describe the trust chain end to end
- explain how provenance, signing, policy checks, and deployment controllers interact
- explain where emergency bypass exists and how it is audited

Mentor hints:

- separate "was it built by the right system" from "is it safe to run now"

## Challenge 2: Break-Glass Design

Scenario: A critical production outage requires fast manual action outside the normal deployment pipeline.

Your task:

- explain how to support break-glass safely
- describe approval, logging, expiration, and post-incident reconciliation
- explain how to avoid normalizing bypass culture

Mentor hints:

- good break-glass preserves speed without destroying trust

## Challenge 3: Multi-Tenant CI Platform

Scenario: You run a CI platform for many teams with different trust levels and dependencies.

Your task:

- explain the security and isolation model
- explain how you would design runner placement, credential boundaries, network access, and artifact trust
- explain where strong isolation is mandatory

Mentor hints:

- shared runners are shared infrastructure risk, not just a cost optimization

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

## Challenge 7: Signing Key Compromise

Your task:

- explain containment, rotation, trust recovery, and audit steps after suspected signing key compromise

## Challenge 8: Fast But Safe Rollback

Your task:

- explain how you make rollback operationally easy without letting it become unsafe or confusing

## Challenge 9: Runtime Policy And Continuous Validation

Scenario: You want to block untrusted images at deploy time and also detect if running workloads later drift away from allowed policy.

Your task:

- explain deploy-time enforcement versus runtime or continuous validation
- explain where each helps and where each cannot help
- explain how you would avoid alert fatigue from policy monitoring

## Challenge 10: Staff-Level Delivery Platform Review

Scenario: You inherit a platform with GitHub Actions, self-hosted runners, a container registry, several cluster admission policies, and manual break-glass deploys used too often.

Your task:

- identify the highest-risk fault lines
- explain what you would simplify, harden, or redesign first
- explain how you would improve security without making the platform unlivable
