# Intermediate: CI/CD, Trusted Delivery, Release Engineering, And Platform Security

This file moves from pipeline steps to platform-level reasoning about trusted delivery and safe release behavior.

## Mentor Mode

At this level, always connect release mechanics to:

- incident prevention
- blast-radius control
- trust in the artifact
- trust in the build system
- recovery speed under pressure

## Where To Study And Simulate

Official references:

- Cloud Build overview: https://cloud.google.com/build/docs/overview
- Cloud Deploy overview: https://cloud.google.com/deploy/docs/overview
- Binary Authorization overview: https://cloud.google.com/binary-authorization/docs/overview
- GitHub Actions security: https://docs.github.com/en/actions/concepts/security
- Security hardening for GitHub Actions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- OIDC for GitHub Actions: https://docs.github.com/actions/concepts/security/about-security-hardening-with-openid-connect
- SLSA: https://slsa.dev/
- Sigstore Cosign overview: https://docs.sigstore.dev/cosign/overview/

## Challenge 1: Progressive Delivery Design

Scenario: A critical platform service must be deployed many times per week without risking fleet-wide regression.

Your task:

- design a rollout strategy using canary or phased rollout
- define promotion and abort signals
- explain how you handle low-volume services where metric confidence is weak

Mentor hints:

- low-volume services often need synthetic verification, narrow-scope rollout, and human review of a few key signals

## Challenge 2: Artifact Trust

Scenario: Security asks how you know the container running in production was built from reviewed source and not replaced in transit.

Your task:

- explain provenance, signing, and policy enforcement
- explain where attestations should be checked
- explain what gaps remain even after signing

Mentor hints:

- explain source trust, build trust, artifact identity, and deployment enforcement as separate links

## Challenge 3: CI Runner Compromise

Scenario: A shared CI runner is suspected compromised.

Your task:

- describe your immediate containment steps
- explain blast radius analysis
- explain how isolation, ephemeral runners, least privilege, and short-lived credentials change the response

Mentor hints:

- ask what secrets, tokens, artifacts, and networks that runner could access

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

Mentor hints:

- staff-level thinking here balances emergency response with post-incident reconciliation discipline

## Challenge 6: Dependency Upgrade Risk

Scenario: A base image and several libraries need urgent security updates, but the platform runs many latency-sensitive services.

Your task:

- explain how you would batch, stage, test, and observe the upgrades
- explain why even "simple" dependency changes can cause production regressions

## Challenge 7: Pipeline Latency As Developer Friction

Your task:

- explain how slow CI pipelines create pressure to bypass safety
- explain what you would optimize first

## Challenge 8: Policy Enforcement Location

Your task:

- explain what belongs in CI, what belongs in artifact policy, and what belongs at deploy time

## Challenge 9: GitHub Actions Hardening

Scenario: A team uses GitHub Actions heavily, including third-party actions and self-hosted runners.

Your task:

- explain the main risks
- explain how OIDC changes secret handling
- explain what controls you would apply to workflow files, runner trust, and third-party actions

## Challenge 10: Deployment Credentials Re-Design

Scenario: A legacy pipeline uses long-lived cloud keys stored as CI secrets.

Your task:

- explain why this is dangerous
- explain the migration path to short-lived identity
- explain rollout and breakage risks during the migration
