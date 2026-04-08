# Foundations: Observability, SLOs, And Incident Response

This file is the senior/staff foundation for how to detect, understand, manage, and learn from production failure.

## Mentor Mode

Observability is not a dashboard collection. It is the system that lets operators answer:

- what is broken
- who is affected
- where in the request path the problem sits
- what changed
- whether mitigation helped

Incident response is not just debugging. It is structured coordination under uncertainty.

## The Five Layers Of Observability Maturity

### Layer 1: Raw Signals

- metrics
- logs
- traces
- events
- profiles

### Layer 2: Useful Questions

- is the service healthy from the user perspective
- is the dependency healthy
- is the system saturated
- did a release correlate with the symptom
- is the issue local, zonal, regional, or global

### Layer 3: Actionable Detection

- alerting tied to user pain or fast-burn risk
- severity and routing logic
- ownership
- de-duplication and inhibition

### Layer 4: Coordinated Response

- clear on-call paths
- incident roles
- status updates
- mitigation and rollback playbooks

### Layer 5: Learning And Adaptation

- blameless postmortems
- SLO review
- recurring pattern analysis
- reliability investment based on evidence

## Signal Types And What They Are Good For

### Metrics

Best for:

- rates
- trends
- saturation
- SLO math
- alerting

Weakness:

- can hide per-request nuance
- averages can hide tail pain

### Logs

Best for:

- event detail
- errors with context
- reconstruction of specific actions

Weakness:

- noisy under scale
- easy to drown in during an incident

### Traces

Best for:

- latency breakdown
- dependency fan-out
- showing which hop is slow

Weakness:

- sampling can hide edge cases
- not every service is instrumented well

### Profiles

Best for:

- hot code paths
- CPU and memory behavior

Weakness:

- often underused
- best after you know the issue is inside the process

### Events

Best for:

- rollout changes
- config changes
- autoscaling
- infrastructure transitions

## Whitebox And Blackbox

### Whitebox

Internal service metrics and internals.

Use for:

- queue depth
- error categories
- thread pools
- dependency durations

### Blackbox

External probing from the user point of view.

Use for:

- DNS resolution
- TLS reachability
- full-path HTTP success
- region-specific user health

Senior habit:

- use both
- internal success with external failure is common

## SLO Thinking

Strong SLO work is about decision quality, not vanity percentages.

Ask:

- what user journey matters
- what counts as success
- what latency matters to the user
- what traffic should or should not be excluded
- what error budget policy changes behavior

## Alert Design Principles

Page for:

- real or fast-approaching user impact
- urgent platform risk requiring prompt action

Do not page for:

- every single failure
- dashboards disguised as alerts
- symptoms with no owner or action

Senior alert design habit:

- connect alert to mitigation path

## Multi-Window Burn-Rate Thinking

Burn-rate alerting helps because:

- fast windows catch sharp failure
- slow windows catch quieter but sustained pain
- together they reduce blind spots

## Dashboard Design

A useful service dashboard usually needs:

- traffic
- errors
- latency by percentile
- saturation
- dependency health
- rollout markers
- zone or region breakdown
- top failure dimensions

Bad dashboards:

- show only averages
- hide recent deploys
- force responders into raw logs for basic triage

## Incident Management

Google-style incident management emphasizes the three Cs:

- coordinate
- communicate
- control

Useful roles:

- incident commander
- operations lead
- communications lead
- subject matter responders

Senior habit:

- mitigation and coordination are separate jobs during serious incidents

## First 10 Minutes Of A Serious Incident

1. confirm user impact and blast radius
2. declare and assign roles if needed
3. stop harmful change if evidence supports it
4. gather high-signal dashboards and known recent changes
5. send first status update with facts, not guesses

## Communication Quality

Strong status update:

- what users see
- scope known so far
- what responders are doing now
- next update time

Weak status update:

- guesses framed as certainty
- deep technical noise with no user impact summary
- no timing for next update

## Postmortem Quality

A strong postmortem includes:

- impact
- timeline
- root cause
- contributing factors
- what worked
- what did not
- concrete follow-up actions

Senior habit:

- fix detection, mitigation, and coordination gaps, not just the immediate trigger

## Staff-Level Practice Drills

1. Explain why a metrics-only monitoring strategy fails in complex incidents.
2. Explain how a good SLO changes engineering behavior.
3. Explain how you choose between page, ticket, and dashboard-only alerts.
4. Explain how to communicate uncertainty without sounding lost.
5. Explain how to detect whether postmortems are improving reliability or just producing documents.
