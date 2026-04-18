# AIOPS-04: Build the ai-alert-router Service (Shadow Mode)

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 1
**Type:** Service Build
**Risk:** Low — service runs in shadow mode (logs only, no Slack output) until AIOPS-07/09 are complete
**Estimated effort:** 7 hours (4h scaffold + 3h tests)
**Dependencies:** AIOPS-03 (ConfigMap schema must be finalised before service code)

---

## Objective

Create the `allex-ai-alert-router` Node.js/TypeScript service. In this first iteration the service runs in **shadow mode**: it receives Alertmanager webhook payloads, normalises them to an internal model, looks up team ownership from the mounted ConfigMap, and logs the enriched payload as structured JSON. It does not send any messages to Slack and does not call OpenAI. This lets you verify end-to-end webhook connectivity and team-lookup logic before introducing external dependencies.

---

## Prerequisites

- Node.js 20+ and npm installed locally
- Docker installed locally (for building the image)
- Access to create a new GitHub repository in the `actano` organisation: `allex-ai-alert-router`
- The ConfigMap schema from AIOPS-03 is finalised
- GCP Artifact Registry push credentials (same as used by existing services)

---

## Background

### Repository to mirror

Mirror the repository structure of `allex-ai-assistant-service` (referenced in [`kubernetes-resources/releases/allex-ai-assistant/ai-assistant.helm-release.yaml`](../../kubernetes-resources/releases/allex-ai-assistant/ai-assistant.helm-release.yaml)). Key characteristics of that service:

- Node.js/TypeScript
- Multi-stage Docker build
- Helm chart in `./charts/ai-alert-router/` within the service repo
- Image published to `europe-west3-docker.pkg.dev/allex-artifacts/allex-artifacts-docker/`
- GitRepository source pointed at by the HelmRelease in this GitOps repo

### Shadow mode design

In shadow mode:
- Webhook requests are accepted and processed fully
- Team lookup, payload normalisation, and structured logging all happen
- OpenAI API is NOT called
- Elasticsearch is NOT queried
- Slack is NOT notified
- The service returns HTTP 200 to Alertmanager immediately (within the webhook timeout)

Shadow mode is controlled by the `SHADOW_MODE` environment variable (`true` by default in this sprint).

---

## Implementation Steps

### Step 1: Create the GitHub repository

Create a new private repository `allex-ai-alert-router` in the `actano` GitHub organisation. Initialise with a README.

```bash
gh repo create actano/allex-ai-alert-router --private --description "AI-powered alert enrichment and routing service"
git clone git@github.com:actano/allex-ai-alert-router.git
cd allex-ai-alert-router
```

### Step 2: Initialise the TypeScript project

```bash
npm init -y
npm install express @types/express typescript ts-node js-yaml @types/js-yaml zod
npm install --save-dev @types/node ts-jest jest @types/jest eslint
npx tsc --init
```

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Step 3: Define TypeScript interfaces

Create `src/types/alertmanager.ts`:

```typescript
/**
 * Standard Alertmanager v2 webhook payload schema.
 * Reference: https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
 */

export interface AlertmanagerWebhookPayload {
  version: string;           // "4"
  groupKey: string;          // key identifying the group of alerts
  truncatedAlerts: number;   // number of alerts omitted due to max_alerts
  status: 'firing' | 'resolved';
  receiver: string;          // name of the receiver that triggered this hook
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;       // backlink to the Alertmanager web UI
  alerts: AlertmanagerAlert[];
}

export interface AlertmanagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;          // ISO 8601 datetime
  endsAt: string;            // ISO 8601 datetime (0001-01-01T00:00:00Z if still firing)
  generatorURL: string;      // link to the Prometheus expression
  fingerprint: string;       // unique fingerprint for this alert instance
}
```

Create `src/types/incident.ts`:

```typescript
/**
 * Normalised internal alert model — flattened from the Alertmanager payload
 * so that downstream enrichment steps work with a single object.
 */
export interface Alert {
  alertName: string;
  status: 'firing' | 'resolved';
  severity: string;
  namespace: string;
  team: string;           // resolved from ConfigMap
  service: string;        // from alert labels (added by AIOPS-02)
  component: string;      // from alert labels (added by AIOPS-02)
  environment: string;    // from alert labels (added by AIOPS-02)
  summary: string;
  description: string;
  businessImpact: string;
  runbookUrl: string;
  suggestedQuery: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  fingerprint: string;
  generatorURL: string;
  activeDurationMinutes: number;
}

/**
 * Output model after AI enrichment (populated in AIOPS-07).
 * In shadow mode, all AI fields are null.
 */
export interface EnrichedIncident {
  // Source alert data
  alert: Alert;

  // AI-generated fields (null in shadow mode)
  team: string | null;
  category: string | null;           // capacity|dependency|deployment|application|data|infrastructure
  severityOverride: string | null;   // AI may suggest a different severity
  summary: string | null;            // 1-2 sentence human-readable summary
  impact: string | null;             // business impact statement
  probableCauses: string[] | null;   // ordered list of probable causes
  recommendedActions: string[] | null; // ordered list of remediation steps
  confidence: number | null;         // 0.0 to 1.0
  needsHumanReview: boolean | null;  // true if AI is uncertain

  // Context fields (populated in AIOPS-08)
  recentLogContext: LogLine[] | null;
  logContextAvailable: boolean;

  // Routing
  targetSlackChannel: string;
  pilotMode: boolean;

  // Telemetry
  enrichmentLatencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  shadowMode: boolean;
}

export interface LogLine {
  timestamp: string;
  message: string;
  count: number;  // deduplicated count
}
```

### Step 4: Implement the team ownership loader

Create `src/config/teamOwnership.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface TeamConfig {
  slackChannel: string;
  namespaces: string[];
}

export interface OwnershipConfig {
  fallbackChannel: string;
  pilotMode: boolean;
  pilotChannel: string;
  teams: Record<string, TeamConfig>;
  serviceOverrides: Record<string, { team: string; slackChannel: string }>;
}

let cachedConfig: OwnershipConfig | null = null;
let lastModified = 0;

function loadConfig(): OwnershipConfig {
  const configPath = process.env.TEAMS_CONFIG_PATH || '/config/teams.yaml';

  let mtime = 0;
  try {
    mtime = fs.statSync(configPath).mtimeMs;
  } catch {
    // File not found — return a safe default
    return {
      fallbackChannel: '#allex-staging-alerts-k8s',
      pilotMode: true,
      pilotChannel: '#allex-aiops-test',
      teams: {},
      serviceOverrides: {},
    };
  }

  if (cachedConfig && mtime === lastModified) {
    return cachedConfig;
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw) as any;

  cachedConfig = {
    fallbackChannel: parsed.fallback_channel || '#allex-staging-alerts-k8s',
    pilotMode: parsed.pilot_mode ?? true,
    pilotChannel: parsed.pilot_channel || '#allex-aiops-test',
    teams: Object.fromEntries(
      Object.entries(parsed.teams || {}).map(([name, data]: [string, any]) => [
        name,
        {
          slackChannel: data.slack_channel,
          namespaces: data.namespaces || [],
        },
      ])
    ),
    serviceOverrides: Object.fromEntries(
      Object.entries(parsed.service_overrides || {}).map(([svc, data]: [string, any]) => [
        svc,
        {
          team: data.team,
          slackChannel: data.slack_channel,
        },
      ])
    ),
  };
  lastModified = mtime;
  return cachedConfig;
}

export function resolveOwnership(namespace: string, service?: string): { team: string; slackChannel: string } {
  const config = loadConfig();

  // 1. Service label override (added by AIOPS-02)
  if (service) {
    const override = config.serviceOverrides[service];
    if (override) {
      const channel = config.pilotMode ? config.pilotChannel : override.slackChannel;
      return { team: override.team, slackChannel: channel };
    }
  }

  // 2. Namespace lookup
  for (const [teamName, teamData] of Object.entries(config.teams)) {
    if (teamData.namespaces.includes(namespace)) {
      const channel = config.pilotMode ? config.pilotChannel : teamData.slackChannel;
      return { team: teamName, slackChannel: channel };
    }
  }

  // 3. Fallback
  return { team: 'unknown', slackChannel: config.fallbackChannel };
}
```

### Step 5: Implement the alert normaliser

Create `src/normaliser/normaliseAlert.ts`:

```typescript
import { AlertmanagerWebhookPayload, AlertmanagerAlert } from '../types/alertmanager';
import { Alert } from '../types/incident';
import { resolveOwnership } from '../config/teamOwnership';

export function normaliseAlert(
  raw: AlertmanagerAlert,
  payload: AlertmanagerWebhookPayload
): Alert {
  const labels = { ...payload.commonLabels, ...raw.labels };
  const annotations = { ...payload.commonAnnotations, ...raw.annotations };

  const namespace = labels.namespace || labels.exported_namespace || 'unknown';
  const service = labels.service || '';
  const { team } = resolveOwnership(namespace, service);

  const startsAt = new Date(raw.startsAt);
  const now = new Date();
  const activeDurationMinutes = Math.round((now.getTime() - startsAt.getTime()) / 60000);

  return {
    alertName: labels.alertname || 'UnknownAlert',
    status: raw.status,
    severity: labels.severity || 'unknown',
    namespace,
    team,
    service: labels.service || 'unknown',
    component: labels.component || 'unknown',
    environment: labels.environment || 'staging',
    summary: annotations.summary || '',
    description: annotations.description || '',
    businessImpact: annotations.business_impact || '',
    runbookUrl: annotations.runbook_url || '',
    suggestedQuery: annotations.suggested_query || '',
    labels,
    annotations,
    startsAt,
    fingerprint: raw.fingerprint,
    generatorURL: raw.generatorURL,
    activeDurationMinutes: Math.max(0, activeDurationMinutes),
  };
}
```

### Step 6: Implement the webhook handler

Create `src/routes/webhook.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { AlertmanagerWebhookPayload } from '../types/alertmanager';
import { EnrichedIncident } from '../types/incident';
import { normaliseAlert } from '../normaliser/normaliseAlert';
import { resolveOwnership } from '../config/teamOwnership';

const router = Router();

/**
 * POST /webhook/alertmanager
 *
 * Receives Alertmanager v2 webhook payloads.
 * Returns 200 immediately. All enrichment is synchronous but non-blocking
 * from Alertmanager's perspective because we respond before any external calls.
 *
 * In shadow mode: logs enriched payload, does NOT call OpenAI or Slack.
 */
router.post('/alertmanager', (req: Request, res: Response) => {
  // Respond to Alertmanager immediately to avoid webhook timeout
  res.status(200).json({ status: 'accepted' });

  const startTime = Date.now();
  const shadowMode = process.env.SHADOW_MODE !== 'false';

  let payload: AlertmanagerWebhookPayload;
  try {
    payload = req.body as AlertmanagerWebhookPayload;

    if (!payload.alerts || !Array.isArray(payload.alerts)) {
      console.error({ event: 'webhook_invalid_payload', body: JSON.stringify(req.body).slice(0, 200) });
      return;
    }
  } catch (err) {
    console.error({ event: 'webhook_parse_error', error: String(err) });
    return;
  }

  // Process each alert in the group
  for (const rawAlert of payload.alerts) {
    try {
      const alert = normaliseAlert(rawAlert, payload);
      const { slackChannel } = resolveOwnership(alert.namespace, alert.service !== 'unknown' ? alert.service : undefined);

      const incident: EnrichedIncident = {
        alert,
        // AI fields — null in shadow mode
        team: alert.team,
        category: null,
        severityOverride: null,
        summary: null,
        impact: null,
        probableCauses: null,
        recommendedActions: null,
        confidence: null,
        needsHumanReview: null,
        // Context fields — null until AIOPS-08
        recentLogContext: null,
        logContextAvailable: false,
        // Routing
        targetSlackChannel: slackChannel,
        pilotMode: process.env.PILOT_MODE !== 'false',
        // Telemetry
        enrichmentLatencyMs: Date.now() - startTime,
        promptTokens: null,
        completionTokens: null,
        shadowMode,
      };

      // Structured log — this is the primary output in shadow mode
      console.log(JSON.stringify({
        event: 'alert_processed',
        shadow_mode: shadowMode,
        alert_name: incident.alert.alertName,
        status: incident.alert.status,
        severity: incident.alert.severity,
        namespace: incident.alert.namespace,
        team: incident.alert.team,
        service: incident.alert.service,
        component: incident.alert.component,
        environment: incident.alert.environment,
        target_channel: incident.targetSlackChannel,
        active_duration_minutes: incident.alert.activeDurationMinutes,
        enrichment_latency_ms: incident.enrichmentLatencyMs,
        fingerprint: incident.alert.fingerprint,
        // Do NOT log full annotations/labels — may contain sensitive info
        summary_present: !!incident.alert.summary,
        business_impact_present: !!incident.alert.businessImpact,
        runbook_present: !!incident.alert.runbookUrl,
      }));

      if (shadowMode) {
        console.log(JSON.stringify({
          event: 'shadow_mode_skip_slack',
          alert_name: incident.alert.alertName,
          would_route_to: incident.targetSlackChannel,
        }));
      }
    } catch (err) {
      console.error(JSON.stringify({
        event: 'alert_processing_error',
        fingerprint: rawAlert.fingerprint,
        error: String(err),
      }));
    }
  }
});

export default router;
```

### Step 7: Create the Express app entry point

Create `src/app.ts`:

```typescript
import express from 'express';
import webhookRouter from './routes/webhook';

const app = express();

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-alert-router',
    timestamp: new Date().toISOString(),
    shadow_mode: process.env.SHADOW_MODE !== 'false',
  });
});

app.use('/webhook', webhookRouter);

export default app;
```

Create `src/index.ts`:

```typescript
import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

console.log(JSON.stringify({
  event: 'service_starting',
  service: 'ai-alert-router',
  port: PORT,
  log_level: LOG_LEVEL,
  shadow_mode: process.env.SHADOW_MODE !== 'false',
  teams_config_path: process.env.TEAMS_CONFIG_PATH || '/config/teams.yaml',
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    event: 'service_started',
    port: PORT,
  }));
});

process.on('SIGTERM', () => {
  console.log(JSON.stringify({ event: 'graceful_shutdown', signal: 'SIGTERM' }));
  process.exit(0);
});
```

### Step 8: Create the Dockerfile (multi-stage)

Create `Dockerfile`:

```dockerfile
# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --build

# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Step 9: Create environment variable documentation

Create `.env.example`:

```bash
# Required
TEAMS_CONFIG_PATH=/config/teams.yaml   # Path to the mounted team-ownership ConfigMap

# Optional — defaults shown
PORT=3000
LOG_LEVEL=info
SHADOW_MODE=true                        # Set to 'false' only after AIOPS-09 is complete
PILOT_MODE=true                         # Set to 'false' only for Phase 2

# Added in AIOPS-07
# AZURE_OPENAI_API_KEY=<from secret>
# AZURE_OPENAI_ENDPOINT=https://allex-openai-rg.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview
# OPENAI_TIMEOUT_MS=5000

# Added in AIOPS-08
# ELASTICSEARCH_URL=http://elasticsearch.monitoring.svc.cluster.local:9200
# ELASTICSEARCH_INDEX_PATTERN=logstash-*
# ES_TIMEOUT_MS=3000

# Added in AIOPS-09
# SLACK_WEBHOOK_URL=<from secret>
```

### Step 10: Write unit tests

Create `src/__tests__/normaliseAlert.test.ts`:

```typescript
import { normaliseAlert } from '../normaliser/normaliseAlert';
import { AlertmanagerWebhookPayload, AlertmanagerAlert } from '../types/alertmanager';

// Mock teamOwnership to avoid file dependency in unit tests
jest.mock('../config/teamOwnership', () => ({
  resolveOwnership: jest.fn().mockReturnValue({ team: 'platform', slackChannel: '#allex-aiops-test' }),
}));

const makePayload = (overrides: Partial<AlertmanagerWebhookPayload> = {}): AlertmanagerWebhookPayload => ({
  version: '4',
  groupKey: 'test-group',
  truncatedAlerts: 0,
  status: 'firing',
  receiver: 'ai-enricher',
  groupLabels: { namespace: 'allex-redis' },
  commonLabels: { namespace: 'allex-redis', severity: 'critical', team: 'platform', service: 'redis', component: 'cache', environment: 'staging' },
  commonAnnotations: { summary: 'Redis is down', business_impact: 'Cache unavailable' },
  externalURL: 'http://alertmanager.monitoring:9093',
  alerts: [],
  ...overrides,
});

const makeAlert = (overrides: Partial<AlertmanagerAlert> = {}): AlertmanagerAlert => ({
  status: 'firing',
  labels: { alertname: 'RedisDown' },
  annotations: {},
  startsAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
  endsAt: '0001-01-01T00:00:00Z',
  generatorURL: 'http://prometheus.monitoring:9090',
  fingerprint: 'abc123',
  ...overrides,
});

describe('normaliseAlert', () => {
  it('extracts alertname from labels', () => {
    const result = normaliseAlert(makeAlert(), makePayload());
    expect(result.alertName).toBe('RedisDown');
  });

  it('merges common labels with alert-specific labels (alert-specific takes precedence)', () => {
    const result = normaliseAlert(
      makeAlert({ labels: { alertname: 'RedisDown', severity: 'warning' } }),
      makePayload()
    );
    expect(result.severity).toBe('warning'); // alert label overrides common
  });

  it('calculates activeDurationMinutes correctly', () => {
    const result = normaliseAlert(makeAlert(), makePayload());
    expect(result.activeDurationMinutes).toBeGreaterThanOrEqual(4);
    expect(result.activeDurationMinutes).toBeLessThanOrEqual(6);
  });

  it('extracts business_impact from annotations', () => {
    const result = normaliseAlert(makeAlert(), makePayload());
    expect(result.businessImpact).toBe('Cache unavailable');
  });

  it('returns unknown for missing fields with graceful defaults', () => {
    const result = normaliseAlert(
      makeAlert({ labels: { alertname: 'SomeAlert' } }),
      { ...makePayload(), commonLabels: {}, commonAnnotations: {} }
    );
    expect(result.namespace).toBe('unknown');
    expect(result.service).toBe('unknown');
    expect(result.summary).toBe('');
  });

  it('resolves team from teamOwnership module', () => {
    const result = normaliseAlert(makeAlert(), makePayload());
    expect(result.team).toBe('platform');
  });
});
```

### Step 11: Unit test checklist

Beyond the automated tests above, manually verify:

- [ ] Service starts with `npx ts-node src/index.ts` and `GET /health` returns 200
- [ ] `POST /webhook/alertmanager` with the test payload below returns 200 and logs `event: alert_processed`
- [ ] Logs contain `shadow_mode: true` when `SHADOW_MODE` env var is unset
- [ ] Logs contain `shadow_mode: false` when `SHADOW_MODE=false`
- [ ] Service does not crash when `TEAMS_CONFIG_PATH` points to a non-existent file
- [ ] Service does not crash when receiving an empty `alerts: []` array

Test payload for manual testing:

```bash
curl -s -X POST http://localhost:3000/webhook/alertmanager \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "4",
    "groupKey": "test-group-1",
    "truncatedAlerts": 0,
    "status": "firing",
    "receiver": "ai-enricher",
    "groupLabels": {"namespace": "allex-redis"},
    "commonLabels": {
      "namespace": "allex-redis",
      "severity": "critical",
      "team": "platform",
      "service": "redis",
      "component": "cache",
      "environment": "staging"
    },
    "commonAnnotations": {
      "summary": "Redis instance is down",
      "business_impact": "Cache and stream processing unavailable"
    },
    "externalURL": "http://alertmanager.monitoring:9093",
    "alerts": [{
      "status": "firing",
      "labels": {"alertname": "RedisDown"},
      "annotations": {},
      "startsAt": "2026-04-07T10:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://prometheus.monitoring:9090",
      "fingerprint": "test-fingerprint-001"
    }]
  }'
```

Expected response: `{"status":"accepted"}`

Expected log line (formatted for readability):
```json
{
  "event": "alert_processed",
  "shadow_mode": true,
  "alert_name": "RedisDown",
  "status": "firing",
  "severity": "critical",
  "namespace": "allex-redis",
  "team": "platform",
  "service": "redis",
  "component": "cache",
  "environment": "staging",
  "target_channel": "#allex-aiops-test",
  "active_duration_minutes": 0,
  "enrichment_latency_ms": 1,
  "fingerprint": "test-fingerprint-001",
  "summary_present": true,
  "business_impact_present": true,
  "runbook_present": false
}
```

---

## Verification

Once the service is running locally, run the full unit test suite:

```bash
npm test
```

All tests should pass. Build the Docker image:

```bash
docker build -t ai-alert-router:local .
docker run -e SHADOW_MODE=true -e PORT=3000 -p 3000:3000 ai-alert-router:local
curl http://localhost:3000/health
```

---

## Rollback

This task only creates a new service repo and a local Docker image. There is nothing to roll back in the cluster at this stage — that is handled in AIOPS-05.

---

## Acceptance Criteria

- [ ] GitHub repository `actano/allex-ai-alert-router` exists and contains the service code
- [ ] `npm test` passes with all unit tests green
- [ ] `docker build -t ai-alert-router:local .` succeeds with a multi-stage build
- [ ] `GET /health` returns `{"status":"ok"}` with HTTP 200
- [ ] `POST /webhook/alertmanager` with the test payload returns HTTP 200 within 50ms
- [ ] Log output for the test webhook contains `event: alert_processed` with all expected fields
- [ ] Log output contains `event: shadow_mode_skip_slack`
- [ ] Service starts cleanly when `TEAMS_CONFIG_PATH` does not exist (uses defaults)
- [ ] Service does not log any secrets, full annotation values, or full label sets
- [ ] Docker image runs as non-root user
