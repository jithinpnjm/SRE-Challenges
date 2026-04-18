# AIOPS-09: Route Enriched Alerts to Slack

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 2
**Type:** Service Build
**Risk:** Medium — first time the service sends live Slack messages; test channel must be used before enabling team channels
**Estimated effort:** 5 hours
**Dependencies:** AIOPS-06 (Slack webhook secret), AIOPS-07 (OpenAI enrichment), AIOPS-08 (log context)

---

## Objective

Implement Slack message delivery in the `ai-alert-router` service. In Phase 1 (pilot), all enriched alerts are sent to `#allex-aiops-test` regardless of team. The message uses Slack Block Kit to present the AI-generated summary, probable causes, recommended actions, and a confidence score in a structured, scannable format. When AI enrichment fails, the service falls back to forwarding the original alert data as a clean plain-text message.

---

## Prerequisites

- AIOPS-06 complete: `SLACK_WEBHOOK_URL` environment variable is available in the pod
- AIOPS-07 complete: `EnrichedIncident` object is fully populated (or null for fallback path)
- AIOPS-08 complete: log context field exists in the incident object
- A Slack channel `#allex-aiops-test` has been created and the webhook is configured for it
- `SHADOW_MODE` is set to `false` in the HelmRelease (AIOPS-05)

> **Before enabling Slack delivery:** Create the `#allex-aiops-test` channel in Slack and update the `allex-secret-slack-alerts-webhook-url` GCP secret with the webhook URL for that channel, OR create a new GCP secret `allex-secret-slack-aiops-test-webhook` and update AIOPS-06's ExternalSecret to reference it.

---

## Background

### Why Block Kit instead of plain text

The existing Alertmanager Slack config uses plain text with markdown. Block Kit provides:
- Collapsible sections (so the message is skimmable without overwhelming the channel)
- Action buttons (View Runbook, View Dashboard, Silence Alert)
- Severity emoji header for instant visual triage
- Resolution message when `send_resolved: true` fires

### Rate limiting and Alertmanager's group_interval

Alertmanager's `group_interval: 5m` means grouped alerts are not re-sent more than once every 5 minutes. The `ai-alert-router` does not need additional rate limiting for the same alert fingerprint — Alertmanager handles this. However, if multiple alerts fire simultaneously in a group, the service will receive one webhook with multiple alerts. Each alert in the payload is processed individually.

### Fallback message

When AI enrichment fails (OpenAI timeout, schema error, etc.), the service must still notify the on-call engineer. The fallback message includes the raw alert labels formatted as a clean list, similar to the existing Alertmanager Slack template.

---

## Implementation Steps

### Step 1: Implement the Slack Block Kit formatter

Create `src/slack/formatter.ts`:

```typescript
import { EnrichedIncident } from '../types/incident';

const SEVERITY_EMOJI: Record<string, string> = {
  critical: ':red_circle:',
  warning: ':large_yellow_circle:',
  info: ':large_blue_circle:',
  error: ':red_circle:',
  unknown: ':white_circle:',
};

const CATEGORY_EMOJI: Record<string, string> = {
  capacity: ':chart_with_upwards_trend:',
  dependency: ':link:',
  deployment: ':rocket:',
  application: ':computer:',
  data: ':floppy_disk:',
  infrastructure: ':building_construction:',
};

function severityEmoji(severity: string): string {
  return SEVERITY_EMOJI[severity.toLowerCase()] || ':white_circle:';
}

function confidenceBadge(confidence: number | null, needsHumanReview: boolean | null): string {
  if (confidence === null) return '';
  const pct = Math.round(confidence * 100);
  const badge = needsHumanReview ? ':eyes: *Needs human review*' : ':robot_face: AI confident';
  return `${badge} (${pct}%)`;
}

function labelBlock(labels: Record<string, string>): string {
  return Object.entries(labels)
    .filter(([k]) => !['alertname', '__name__'].includes(k))
    .map(([k, v]) => `• *${k}:* \`${v}\``)
    .join('\n');
}

/**
 * Builds a Slack Block Kit payload for an enriched alert.
 * Returns the blocks array (not the full webhook body).
 */
export function buildEnrichedBlocks(incident: EnrichedIncident): object[] {
  const { alert } = incident;
  const severity = incident.severityOverride || alert.severity;
  const emoji = severityEmoji(severity);
  const catEmoji = incident.category ? (CATEGORY_EMOJI[incident.category] || '') : '';
  const isResolved = alert.status === 'resolved';
  const statusPrefix = isResolved ? ':white_check_mark: RESOLVED: ' : `${emoji} `;

  const blocks: object[] = [
    // Header
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusPrefix}${alert.alertName}`,
        emoji: true,
      },
    },
    // Meta row: team, environment, duration
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*Team:* ${incident.team || alert.team}` },
        { type: 'mrkdwn', text: `*Env:* ${alert.environment}` },
        { type: 'mrkdwn', text: `*Namespace:* ${alert.namespace}` },
        { type: 'mrkdwn', text: `*Active:* ${alert.activeDurationMinutes}m` },
        ...(incident.category ? [{ type: 'mrkdwn', text: `${catEmoji} *Category:* ${incident.category}` }] : []),
      ],
    },
    { type: 'divider' },
  ];

  // AI Summary section (only if enrichment succeeded)
  if (incident.summary) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary*\n${incident.summary}` },
    });
  } else {
    // Fallback to original annotation summary
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary*\n${alert.summary || '_No summary available_'}` },
    });
  }

  // Impact section
  if (incident.impact || alert.businessImpact) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Impact*\n${incident.impact || alert.businessImpact}` },
    });
  }

  // Probable Causes
  if (incident.probableCauses && incident.probableCauses.length > 0) {
    const causesList = incident.probableCauses.map((c, i) => `${i + 1}. ${c}`).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Probable Causes*\n${causesList}` },
    });
  }

  // Recommended Actions
  if (incident.recommendedActions && incident.recommendedActions.length > 0) {
    const actionsList = incident.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Recommended Actions*\n${actionsList}` },
    });
  }

  // Confidence + human review badge
  const badge = confidenceBadge(incident.confidence, incident.needsHumanReview);
  if (badge) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: badge }],
    });
  }

  blocks.push({ type: 'divider' });

  // Action buttons
  const actions: object[] = [];

  if (alert.runbookUrl) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: ':book: View Runbook', emoji: true },
      url: alert.runbookUrl,
      action_id: 'view_runbook',
    });
  }

  // Grafana dashboard link
  actions.push({
    type: 'button',
    text: { type: 'plain_text', text: ':bar_chart: View Dashboard', emoji: true },
    url: `https://grafana.staging.allex.ai/explore?orgId=1&left={"datasource":"prometheus","queries":[{"refId":"A","expr":"${encodeURIComponent(alert.suggestedQuery || '')}"}]}`,
    action_id: 'view_dashboard',
  });

  // Silence alert link (Alertmanager silence UI)
  actions.push({
    type: 'button',
    text: { type: 'plain_text', text: ':mute: Silence Alert', emoji: true },
    url: `http://alertmanager.monitoring.svc.cluster.local:9093/#/silences/new?filter=%7Balertname%3D%22${encodeURIComponent(alert.alertName)}%22%7D`,
    action_id: 'silence_alert',
    style: 'danger',
    confirm: {
      title: { type: 'plain_text', text: 'Silence this alert?' },
      text: { type: 'mrkdwn', text: `This will silence *${alert.alertName}* for 2 hours.` },
      confirm: { type: 'plain_text', text: 'Silence' },
      deny: { type: 'plain_text', text: 'Cancel' },
    },
  });

  if (actions.length > 0) {
    blocks.push({ type: 'actions', elements: actions });
  }

  // Collapsed labels section
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `*Labels:* ${Object.entries(alert.labels)
          .filter(([k]) => !['__name__'].includes(k))
          .slice(0, 8)
          .map(([k, v]) => `\`${k}=${v}\``)
          .join(' ')}`,
      },
    ],
  });

  // Pilot mode footer
  if (incident.pilotMode) {
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: ':test_tube: *AIOps Pilot* — enriched alert. Send feedback to #allex-aiops-feedback' },
      ],
    });
  }

  return blocks;
}

/**
 * Fallback message when AI enrichment fails.
 * Formats the original alert cleanly without AI fields.
 */
export function buildFallbackBlocks(incident: EnrichedIncident): object[] {
  const { alert } = incident;
  const emoji = severityEmoji(alert.severity);
  const isResolved = alert.status === 'resolved';
  const statusPrefix = isResolved ? ':white_check_mark: RESOLVED: ' : `${emoji} `;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusPrefix}${alert.alertName} (unenriched)`,
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*Namespace:* ${alert.namespace}` },
        { type: 'mrkdwn', text: `*Severity:* ${alert.severity}` },
        { type: 'mrkdwn', text: `*Active:* ${alert.activeDurationMinutes}m` },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary*\n${alert.summary || '_No summary available_'}`,
      },
    },
    ...(alert.businessImpact ? [{
      type: 'section',
      text: { type: 'mrkdwn', text: `*Impact*\n${alert.businessImpact}` },
    }] : []),
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Labels*\n${labelBlock(alert.labels)}`,
      },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: ':warning: AI enrichment was unavailable for this alert.' },
      ],
    },
  ];
}

/**
 * Resolution message when an alert resolves.
 */
export function buildResolutionBlocks(incident: EnrichedIncident): object[] {
  const { alert } = incident;
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `:white_check_mark: RESOLVED: ${alert.alertName}`,
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*Team:* ${incident.team || alert.team}` },
        { type: 'mrkdwn', text: `*Namespace:* ${alert.namespace}` },
        { type: 'mrkdwn', text: `*Was active for:* ${alert.activeDurationMinutes}m` },
      ],
    },
  ];
}
```

### Step 2: Implement the Slack sender

Create `src/slack/sender.ts`:

```typescript
import { EnrichedIncident } from '../types/incident';
import { buildEnrichedBlocks, buildFallbackBlocks, buildResolutionBlocks } from './formatter';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const SLACK_TIMEOUT_MS = 5000;

export interface SlackSendResult {
  success: boolean;
  channel: string;
  latencyMs: number;
  error?: string;
}

async function sendToSlack(webhookUrl: string, payload: object): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function sendIncidentToSlack(incident: EnrichedIncident): Promise<SlackSendResult> {
  const startTime = Date.now();

  if (!SLACK_WEBHOOK_URL) {
    console.error(JSON.stringify({ event: 'slack_send_error', reason: 'SLACK_WEBHOOK_URL not set' }));
    return { success: false, channel: incident.targetSlackChannel, latencyMs: 0, error: 'Webhook URL not configured' };
  }

  // Determine which blocks to use
  let blocks: object[];
  if (incident.alert.status === 'resolved') {
    blocks = buildResolutionBlocks(incident);
  } else if (incident.summary && incident.probableCauses) {
    blocks = buildEnrichedBlocks(incident);
  } else {
    blocks = buildFallbackBlocks(incident);
  }

  const payload = {
    channel: incident.targetSlackChannel,
    username: 'AIOps Alert Router',
    icon_emoji: ':robot_face:',
    blocks,
    // Fallback text for notifications
    text: `${incident.alert.status === 'resolved' ? 'RESOLVED' : 'ALERT'}: ${incident.alert.alertName} in ${incident.alert.namespace}`,
  };

  try {
    const success = await sendToSlack(SLACK_WEBHOOK_URL, payload);
    const latencyMs = Date.now() - startTime;

    if (success) {
      console.log(JSON.stringify({
        event: 'slack_message_sent',
        alert_name: incident.alert.alertName,
        channel: incident.targetSlackChannel,
        enriched: !!(incident.summary && incident.probableCauses),
        resolved: incident.alert.status === 'resolved',
        latency_ms: latencyMs,
      }));
    } else {
      console.error(JSON.stringify({
        event: 'slack_send_failed',
        alert_name: incident.alert.alertName,
        channel: incident.targetSlackChannel,
        latency_ms: latencyMs,
      }));
    }

    return { success, channel: incident.targetSlackChannel, latencyMs };

  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error(JSON.stringify({
      event: 'slack_send_error',
      alert_name: incident.alert.alertName,
      channel: incident.targetSlackChannel,
      error: String(err),
      latency_ms: latencyMs,
    }));
    return { success: false, channel: incident.targetSlackChannel, latencyMs, error: String(err) };
  }
}
```

### Step 3: Wire Slack delivery into the webhook handler

In `src/routes/webhook.ts`, after constructing the `incident` object, add:

```typescript
import { sendIncidentToSlack } from '../slack/sender';

// After incident is constructed:
if (!shadowMode) {
  // Send to Slack asynchronously (don't await — we already returned 200)
  sendIncidentToSlack(incident).catch(err => {
    console.error(JSON.stringify({
      event: 'slack_delivery_unhandled_error',
      alert_name: incident.alert.alertName,
      error: String(err),
    }));
  });
} else {
  console.log(JSON.stringify({
    event: 'shadow_mode_skip_slack',
    alert_name: incident.alert.alertName,
    would_route_to: incident.targetSlackChannel,
    enriched: !!(incident.summary && incident.probableCauses),
  }));
}
```

### Step 4: Disable shadow mode in the HelmRelease

Once you have verified the service works correctly in shadow mode with real webhook payloads, update the HelmRelease to disable shadow mode:

In `kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml`:

```yaml
      - name: SHADOW_MODE
        value: "false"   # Changed from "true"
```

Commit:
```bash
git add kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml
git commit -m "feat(aiops): disable shadow mode - enable live Slack delivery to #allex-aiops-test"
git push origin master
```

---

## Verification

### Verify the Slack message format locally

Before deploying, test the Block Kit formatter locally:

```bash
node -e "
const { buildEnrichedBlocks } = require('./dist/slack/formatter');
const testIncident = {
  alert: {
    alertName: 'RedisDown', status: 'firing', severity: 'critical',
    namespace: 'allex-redis', team: 'platform', service: 'redis',
    component: 'cache', environment: 'staging',
    summary: 'Redis instance is down', description: '',
    businessImpact: 'Cache unavailable', runbookUrl: 'https://wiki.allex.ai/runbooks/redis/RedisDown',
    suggestedQuery: 'redis_up', labels: {alertname:'RedisDown',severity:'critical',namespace:'allex-redis'},
    annotations: {}, startsAt: new Date(), fingerprint: 'test', generatorURL: 'http://prom:9090',
    activeDurationMinutes: 5
  },
  team: 'platform', category: 'infrastructure', severityOverride: null,
  summary: 'The Redis instance has become unavailable, likely due to a pod crash or OOM kill.',
  impact: 'All caching and stream processing dependent on this Redis instance is down.',
  probableCauses: ['Pod OOM kill', 'Node eviction', 'Configuration error'],
  recommendedActions: ['Check pod status: kubectl get pod -n allex-redis', 'Check recent events: kubectl describe pod -n allex-redis <pod>', 'Check node pressure: kubectl describe node <node>'],
  confidence: 0.8, needsHumanReview: false,
  recentLogContext: null, logContextAvailable: false,
  targetSlackChannel: '#allex-aiops-test', pilotMode: true,
  enrichmentLatencyMs: 2100, promptTokens: 350, completionTokens: 180, shadowMode: false
};
console.log(JSON.stringify(buildEnrichedBlocks(testIncident), null, 2));
" 2>/dev/null | head -80
```

Use the [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) to paste the output and preview the message visually.

### Send a real test alert and check Slack

```bash
# Port-forward Alertmanager
kubectl port-forward -n monitoring svc/prometheus-operated 9093:9093 &

# Fire the test alert
curl -s -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "RedisDown",
      "severity": "critical",
      "namespace": "allex-redis",
      "team": "platform",
      "service": "redis",
      "component": "cache",
      "environment": "staging"
    },
    "annotations": {
      "summary": "Redis instance is down (AIOps pilot test)",
      "business_impact": "Cache and stream processing unavailable",
      "runbook_url": "https://wiki.allex.ai/runbooks/redis/RedisDown"
    },
    "generatorURL": "http://prometheus.monitoring:9090"
  }]'
```

Wait up to 60 seconds for Alertmanager's `group_wait: 30s` to fire, then check:
1. `#allex-aiops-test` channel in Slack — should show the enriched Block Kit message
2. `#allex-staging-alerts-k8s` channel — should show the original Alertmanager message (proving `continue: true` works)

### Check pod logs for the send event

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=50 | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('event') in ('slack_message_sent', 'slack_send_failed', 'slack_send_error', 'enrichment_complete'):
            print(json.dumps(obj, indent=2))
    except:
        pass
"
```

### Verify resolved alerts also post a message

```bash
# Resolve the test alert (set endsAt to a past time)
curl -s -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "RedisDown",
      "severity": "critical",
      "namespace": "allex-redis"
    },
    "annotations": {"summary": "Redis instance is down (AIOps pilot test)"},
    "generatorURL": "http://prometheus.monitoring:9090",
    "endsAt": "2026-04-07T00:00:01Z"
  }]'
```

Check `#allex-aiops-test` for the resolution message within 30 seconds.

---

## Rollback

```bash
# Re-enable shadow mode immediately
kubectl set env deployment -n monitoring -l app.kubernetes.io/name=ai-alert-router SHADOW_MODE=true

# Then update the GitOps repo to make it permanent
# Edit kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml
# Set SHADOW_MODE: "true"
git add kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml
git commit -m "revert(aiops): re-enable shadow mode on ai-alert-router"
git push origin master
```

---

## Acceptance Criteria

- [ ] An enriched alert appears in `#allex-aiops-test` within 60 seconds of `amtool alert add` or the Alertmanager API test
- [ ] The Slack message contains: alert name header, Summary section, Impact section, Probable Causes list, Recommended Actions list, confidence badge, team/environment context
- [ ] The `#allex-staging-alerts-k8s` channel ALSO receives the same alert (proving fallback path is active)
- [ ] When OpenAI enrichment fails (tested with `OPENAI_TIMEOUT_MS=1`), the fallback format message is delivered to `#allex-aiops-test`
- [ ] Resolution messages appear in `#allex-aiops-test` when an alert resolves
- [ ] `event: slack_message_sent` appears in pod logs with `enriched: true`
- [ ] No duplicate Slack messages for the same alert fingerprint within a 5-minute window
- [ ] `GET /health` returns 200 after Slack delivery
- [ ] Slack messages do NOT expose raw alert annotation values (e.g., no full description strings with pod names)
