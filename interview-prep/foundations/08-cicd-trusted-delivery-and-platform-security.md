# Foundations: CI/CD, Trusted Delivery, And Platform Security

This file upgrades CI/CD from "pipeline steps" thinking into a senior/staff model of trusted delivery, release safety, and platform governance.

## Mentor Mode

At senior level, CI/CD is not just automation. It is the control system for how code becomes production behavior.

A strong answer should cover:

- source trust
- build trust
- artifact trust
- deployment safety
- runtime policy
- rollback safety
- operator workflow during incidents

## The Trusted Delivery Chain

Think of the chain as:

1. source is reviewed and protected
2. build is reproducible and isolated
3. artifacts are identified by digest
4. provenance or attestations prove origin and build path
5. deployments only allow trusted artifacts
6. rollout policy limits blast radius
7. runtime monitoring validates behavior

If one link is weak, the whole release system becomes weaker than it looks.

## Source Control Security

Senior-level expectations:

- protected branches
- CODEOWNERS or equivalent review controls
- restrictions on workflow changes
- dependency update hygiene
- clear separation between contributor code and privileged workflows

Mentor tip:

- a compromised workflow file can be more dangerous than compromised application code

## Build System Trust

Build systems should be:

- automated
- isolated
- ephemeral where possible
- least-privileged
- observable
- auditable

Questions to ask:

- who can trigger builds
- what secrets the build can access
- whether untrusted pull request code runs on privileged runners
- whether self-hosted runners are isolated by trust boundary
- whether builds can reach private networks they do not need

## Provenance, Signing, And Attestations

These concepts are often blended together, but they are not identical.

- provenance: verifiable metadata about how an artifact was built
- signing: cryptographic assertion that something came from a trusted signer
- attestation: signed statement about a property, such as build origin or scan result

Senior interview rule:

- being signed does not guarantee the software is safe or correct
- it proves a trust statement, not functional quality

## Policy Enforcement Layers

You can enforce policy at several layers:

- CI
- artifact registry
- deploy controller
- cluster admission
- runtime continuous validation

Good senior answers explain what belongs where.

Typical pattern:

- CI checks quality and produces metadata
- registry stores immutable digests and metadata
- deployment policy checks trust and environment requirements
- rollout policy checks behavior
- runtime validation watches drift or policy violation later

## Release Safety Model

A mature delivery model usually includes:

- immutable artifacts
- environment promotion by digest, not rebuild
- canary or phased rollout
- fast stop and rollback path
- release verification signals
- deploy freeze or controlled change rate during severe incidents

## Platform Security For Delivery Systems

Senior/staff-level platform security means thinking about the delivery platform itself as production infrastructure.

Protect:

- CI runners
- build logs
- artifact registries
- signing keys or keyless signing path
- deploy credentials
- secrets managers
- admission or deployment policy systems
- break-glass access paths

## Common Failure Modes

### Fast Pipeline, Unsafe Delivery

Looks good until:

- wrong environment credentials are used
- build provenance is missing
- rollout verification is shallow
- rollback is manual and slow

### Strong Security, Fragile Operations

Looks good until:

- policies block emergency response without safe override
- teams bypass controls because latency is too high
- too many policy checks exist in too many places
- nobody can explain the trust chain end to end

## Cloud-Specific Patterns

### GCP

Common senior patterns:

- Cloud Build for isolated builds
- Artifact Registry for immutable artifacts
- Binary Authorization for policy enforcement
- Cloud Deploy or similar for staged delivery
- workload identity and short-lived auth over static secrets

### AWS

Common senior patterns:

- CodeBuild or equivalent isolated builds
- ECR for artifacts
- IAM roles and short-lived credentials
- admission or deploy-time policy controls in EKS environments
- staged rollout with ALB, mesh, or deployment controller patterns

## Platform Guardrail Checklist

- workflow file review controls
- ephemeral or strongly isolated runners
- OIDC or short-lived cloud auth
- immutable image digests
- provenance or attestation generation
- policy enforcement before deploy
- progressive rollout
- rollback drills
- audit trail for normal and break-glass paths

## Staff-Level Practice Drills

1. Explain the difference between "a build succeeded" and "this artifact is safe to deploy."
2. Explain where you would enforce provenance policy and why.
3. Explain how self-hosted runners can become a fleet-wide risk.
4. Explain how to design break-glass without normalizing bypass.
5. Explain why rollout safety and supply-chain security are separate but connected concerns.
