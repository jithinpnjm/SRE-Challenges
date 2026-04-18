# AIOPS-07: Add Azure OpenAI Enrichment to ai-alert-router

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 2
**Type:** Service Build
**Risk:** Medium — OpenAI calls are in the critical path for enrichment; a hard dependency would block alert delivery. Must be implemented with 5-second timeout and complete fallback.
**Estimated effort:** 4 hours
**Dependencies:** AIOPS-04 (service scaffold), AIOPS-06 (Azure OpenAI secret in cluster)

---

## Objective

Add Azure OpenAI (GPT-4o) enrichment to the `ai-alert-router` service. For each incoming alert, the service assembles a structured prompt containing alert metadata, team context, and active duration, then calls the Azure OpenAI API to generate a structured JSON incident summary. If the OpenAI call fails for any reason — network timeout, API error, invalid JSON response — the service falls back to forwarding the original alert to `#allex-staging-alerts-k8s` without enrichment. Alert delivery is never blocked by OpenAI unavailability.

---

## Prerequisites

- AIOPS-04 complete: service is running in shadow mode
- AIOPS-06 complete: `AZURE_OPENAI_API_KEY` is available to the pod
- AIOPS-08 will inject `recent_log_context` into the prompt after this task; for now the field will be null in the prompt

---

## Background

### Why structured JSON output from the LLM

Free-text LLM output cannot be reliably parsed. By instructing GPT-4o to output only valid JSON conforming to a defined schema, and validating that schema before use, the service can treat AI output as structured data throughout the Slack formatter and logging pipeline. This also makes it easy to add schema validation tests and detect prompt regressions.

### Azure OpenAI endpoint

From the existing `ai-assistant` service configuration:
- **Endpoint:** `https://allex-openai-rg.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview`
- **Model:** `gpt-4o`
- **API key:** from secret `azure-openai-credentials` → env var `AZURE_OPENAI_API_KEY`

### Timeout budget

Alertmanager's `group_interval` is set to 5 minutes in the current config. The service returns 200 to Alertmanager immediately, so the 5-second OpenAI timeout does not affect alert grouping. However, if enrichment takes longer than 5 seconds, the Slack message will be delayed. Set `OPENAI_TIMEOUT_MS=5000`.

---

## Implementation Steps

### Step 1: Install the OpenAI SDK

In the `allex-ai-alert-router` service repo:

```bash
npm install openai
```

The `openai` npm package supports Azure OpenAI natively via `AzureOpenAI` client.

### Step 2: Define the prompt template

Create `src/enrichment/prompt.ts`:

```typescript
import { Alert } from '../types/incident';

export interface PromptInput {
  alertName: string;
  severity: string;
  team: string;
  service: string;
  component: string;
  environment: string;
  namespace: string;
  summary: string;
  description: string;
  businessImpact: string;
  runbookUrl: string;
  activeDurationMinutes: number;
  groupedAlertsCount: number;
  recentLogContext: string | null;
}

export const OUTPUT_SCHEMA = `{
  "team": "<string — team name from input>",
  "category": "<one of: capacity, dependency, deployment, application, data, infrastructure>",
  "severity_override": "<null | critical | warning | info — only set if you have strong evidence the severity label is wrong>",
  "summary": "<string — 1-2 sentences maximum, plain English, no jargon>",
  "impact": "<string — 1-2 sentences describing the business/user impact>",
  "probable_causes": ["<string>", "<string>", "<string>"],
  "recommended_actions": ["<string>", "<string>", "<string>"],
  "confidence": <float 0.0 to 1.0>,
  "needs_human_review": <boolean>
}`;

export function buildSystemPrompt(): string {
  return `You are an expert SRE analyst for a SaaS project management platform called Allex. Your job is to analyse Kubernetes/infrastructure alert data and produce a concise, actionable incident summary for the on-call engineer.

RULES:
1. Output ONLY valid JSON — no markdown, no code blocks, no explanation text. The output must be parseable by JSON.parse().
2. Do not invent facts not present in the input. If you are uncertain, say so in the summary and set needs_human_review to true.
3. Keep the summary to a maximum of 2 sentences.
4. probable_causes and recommended_actions must each contain 1-5 items, ordered by likelihood/priority.
5. confidence reflects how certain you are about the probable_causes (0.0 = wild guess, 1.0 = near certain).
6. Set needs_human_review to true if: confidence < 0.5, or the alert has no description/summary, or you see contradictory signals.
7. category must be exactly one of: capacity, dependency, deployment, application, data, infrastructure.
8. severity_override must be null unless you have clear evidence the original severity is wrong.
9. The JSON output must match this schema exactly:

${OUTPUT_SCHEMA}`;
}

export function buildUserPrompt(input: PromptInput): string {
  const logSection = input.recentLogContext
    ? `\nRECENT ERROR LOGS (last 15 minutes, top errors by frequency):\n${input.recentLogContext}`
    : '\nRECENT ERROR LOGS: Not available.';

  return `ALERT DATA:
- Alert name: ${input.alertName}
- Severity: ${input.severity}
- Team: ${input.team}
- Service: ${input.service}
- Component: ${input.component}
- Environment: ${input.environment}
- Namespace: ${input.namespace}
- Summary: ${input.summary || 'Not provided'}
- Description: ${input.description || 'Not provided'}
- Business impact: ${input.businessImpact || 'Not provided'}
- Runbook: ${input.runbookUrl || 'Not available'}
- Active duration: ${input.activeDurationMinutes} minutes
- Grouped alerts count: ${input.groupedAlertsCount}
${logSection}

Analyse this alert and respond with ONLY the JSON object described in your instructions.`;
}

export function buildPromptInput(alert: Alert, groupedAlertsCount: number, recentLogContext: string | null): PromptInput {
  return {
    alertName: alert.alertName,
    severity: alert.severity,
    team: alert.team,
    service: alert.service,
    component: alert.component,
    environment: alert.environment,
    namespace: alert.namespace,
    summary: alert.summary,
    description: alert.description,
    businessImpact: alert.businessImpact,
    runbookUrl: alert.runbookUrl,
    activeDurationMinutes: alert.activeDurationMinutes,
    groupedAlertsCount,
    recentLogContext,
  };
}
```

### Step 3: Define and validate the AI response schema

Create `src/enrichment/schema.ts`:

```typescript
import { z } from 'zod';

export const EnrichmentResponseSchema = z.object({
  team: z.string(),
  category: z.enum(['capacity', 'dependency', 'deployment', 'application', 'data', 'infrastructure']),
  severity_override: z.enum(['critical', 'warning', 'info']).nullable(),
  summary: z.string().max(500),
  impact: z.string().max(500),
  probable_causes: z.array(z.string()).min(1).max(5),
  recommended_actions: z.array(z.string()).min(1).max(5),
  confidence: z.number().min(0).max(1),
  needs_human_review: z.boolean(),
});

export type EnrichmentResponse = z.infer<typeof EnrichmentResponseSchema>;
```

### Step 4: Implement the OpenAI enrichment client

Create `src/enrichment/openAiClient.ts`:

```typescript
import { AzureOpenAI } from 'openai';
import { EnrichmentResponseSchema, EnrichmentResponse } from './schema';
import { buildSystemPrompt, buildUserPrompt, buildPromptInput } from './prompt';
import { Alert } from '../types/incident';

const TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '5000', 10);
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ||
  'https://allex-openai-rg.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview';
const MODEL = 'gpt-4o';

function createClient(): AzureOpenAI {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('AZURE_OPENAI_API_KEY environment variable is not set');
  }
  // Extract base endpoint (without deployment/api-version path)
  const baseEndpoint = ENDPOINT.split('/openai/deployments')[0];
  return new AzureOpenAI({
    apiKey,
    endpoint: baseEndpoint,
    apiVersion: '2025-01-01-preview',
    timeout: TIMEOUT_MS,
  });
}

let clientInstance: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export interface EnrichmentResult {
  response: EnrichmentResponse | null;
  success: boolean;
  error?: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export async function enrichAlert(
  alert: Alert,
  groupedAlertsCount: number,
  recentLogContext: string | null
): Promise<EnrichmentResult> {
  const startTime = Date.now();

  try {
    const client = getClient();
    const promptInput = buildPromptInput(alert, groupedAlertsCount, recentLogContext);

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(promptInput) },
      ],
      temperature: 0.1,  // Low temperature for consistent, factual output
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const latencyMs = Date.now() - startTime;
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const rawContent = completion.choices[0]?.message?.content || '';

    // Log telemetry — never log the full prompt (may contain log data from AIOPS-08)
    console.log(JSON.stringify({
      event: 'openai_call_success',
      alert_name: alert.alertName,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
    }));

    // Parse and validate JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error(JSON.stringify({
        event: 'openai_response_parse_error',
        alert_name: alert.alertName,
        error: String(parseErr),
        // Do NOT log rawContent — it may reflect sensitive log data
      }));
      return { response: null, success: false, error: 'JSON parse failed', promptTokens, completionTokens, latencyMs };
    }

    // Validate against schema
    const validation = EnrichmentResponseSchema.safeParse(parsed);
    if (!validation.success) {
      console.error(JSON.stringify({
        event: 'openai_response_schema_error',
        alert_name: alert.alertName,
        validation_errors: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      }));
      return { response: null, success: false, error: 'Schema validation failed', promptTokens, completionTokens, latencyMs };
    }

    // Log key fields for monitoring (NOT the full response)
    console.log(JSON.stringify({
      event: 'enrichment_complete',
      alert_name: alert.alertName,
      category: validation.data.category,
      confidence: validation.data.confidence,
      needs_human_review: validation.data.needs_human_review,
      severity_override: validation.data.severity_override,
      latency_ms: latencyMs,
    }));

    return {
      response: validation.data,
      success: true,
      promptTokens,
      completionTokens,
      latencyMs,
    };

  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = String(err).includes('timeout') || String(err).includes('ETIMEDOUT');

    console.error(JSON.stringify({
      event: isTimeout ? 'openai_timeout' : 'openai_call_error',
      alert_name: alert.alertName,
      error: String(err),
      latency_ms: latencyMs,
    }));

    return {
      response: null,
      success: false,
      error: isTimeout ? 'OpenAI call timed out' : String(err),
      promptTokens: 0,
      completionTokens: 0,
      latencyMs,
    };
  }
}
```

### Step 5: Integrate enrichment into the webhook handler

Update `src/routes/webhook.ts` to call the enrichment function after normalising the alert. Replace the section after `const incident: EnrichedIncident = { ... }` construction:

```typescript
// After normalising the alert, attempt AI enrichment
const shadowMode = process.env.SHADOW_MODE !== 'false';

let enrichmentResult: EnrichmentResult = {
  response: null, success: false, promptTokens: 0, completionTokens: 0, latencyMs: 0
};

if (!shadowMode) {
  // Only call OpenAI when not in shadow mode
  enrichmentResult = await enrichAlert(alert, payload.alerts.length, null /* log context added in AIOPS-08 */);
}

const incident: EnrichedIncident = {
  alert,
  team: enrichmentResult.response?.team || alert.team,
  category: enrichmentResult.response?.category || null,
  severityOverride: enrichmentResult.response?.severity_override || null,
  summary: enrichmentResult.response?.summary || null,
  impact: enrichmentResult.response?.impact || null,
  probableCauses: enrichmentResult.response?.probable_causes || null,
  recommendedActions: enrichmentResult.response?.recommended_actions || null,
  confidence: enrichmentResult.response?.confidence ?? null,
  needsHumanReview: enrichmentResult.response?.needs_human_review ?? null,
  recentLogContext: null,        // populated in AIOPS-08
  logContextAvailable: false,   // updated in AIOPS-08
  targetSlackChannel: slackChannel,
  pilotMode: process.env.PILOT_MODE !== 'false',
  enrichmentLatencyMs: enrichmentResult.latencyMs,
  promptTokens: enrichmentResult.promptTokens,
  completionTokens: enrichmentResult.completionTokens,
  shadowMode,
};

// If enrichment failed, log fallback event
if (!shadowMode && !enrichmentResult.success) {
  console.log(JSON.stringify({
    event: 'enrichment_fallback',
    alert_name: alert.alertName,
    reason: enrichmentResult.error,
    fallback_channel: config.fallbackChannel,
  }));
  // In AIOPS-09: send original alert to fallback channel here
}
```

### Step 6: Update environment variables in HelmRelease

In `kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml`, set `SHADOW_MODE: "false"` ONLY after you have verified enrichment works correctly in a test environment. During Week 2 validation, keep `SHADOW_MODE: "true"` and test the enrichment logic locally.

Add the timeout variable:
```yaml
      - name: OPENAI_TIMEOUT_MS
        value: "5000"
```

### Step 7: Fallback behaviour summary

```
OpenAI call result     → Service action
─────────────────────────────────────────────────────────────────
Success + valid JSON   → Populate EnrichedIncident, route to team channel
Success + invalid JSON → Log schema error, route original to fallback channel
Timeout (> 5000ms)     → Log timeout, route original to fallback channel
Network error          → Log error, route original to fallback channel
SHADOW_MODE=true       → Skip OpenAI entirely, log shadow_mode_skip_openai
```

---

## Verification

### Test locally with a real OpenAI call

```bash
export AZURE_OPENAI_API_KEY="<key from GCP secret>"
export AZURE_OPENAI_ENDPOINT="https://allex-openai-rg.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview"
export SHADOW_MODE=false
export TEAMS_CONFIG_PATH=./test-data/teams.yaml
npx ts-node src/index.ts &

curl -s -X POST http://localhost:3000/webhook/alertmanager \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "4",
    "groupKey": "test",
    "truncatedAlerts": 0,
    "status": "firing",
    "receiver": "ai-enricher",
    "groupLabels": {},
    "commonLabels": {"namespace":"allex-redis","severity":"critical","team":"platform","service":"redis","component":"cache","environment":"staging"},
    "commonAnnotations": {"summary":"Redis instance is down","business_impact":"Cache and stream processing unavailable"},
    "externalURL": "http://alertmanager:9093",
    "alerts": [{
      "status": "firing",
      "labels": {"alertname": "RedisDown"},
      "annotations": {},
      "startsAt": "2026-04-07T10:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://prometheus:9090",
      "fingerprint": "test-001"
    }]
  }'
```

Check logs for:
- `event: openai_call_success` with `prompt_tokens` and `completion_tokens`
- `event: enrichment_complete` with `category`, `confidence`, `needs_human_review`

### Test the fallback path by simulating a timeout

```bash
export OPENAI_TIMEOUT_MS=1  # 1ms — will always time out
# Send same webhook payload as above
# Check logs for: event: openai_timeout
# Check logs for: event: enrichment_fallback
```

### Check enriched JSON structure appears in logs

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=50 | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('event') in ('enrichment_complete', 'openai_call_success', 'enrichment_fallback'):
            print(json.dumps(obj, indent=2))
    except:
        pass
"
```

---

## Rollback

Enrichment is additive — if it fails, the original alert is still forwarded. To fully disable:

```bash
# Set SHADOW_MODE back to true in the HelmRelease
# Edit kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml:
#   SHADOW_MODE: "true"
git add kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml
git commit -m "revert(aiops): set ai-alert-router back to shadow mode"
git push origin master
```

---

## Acceptance Criteria

- [ ] `event: openai_call_success` appears in logs with `prompt_tokens` and `completion_tokens` when a test alert is processed with `SHADOW_MODE=false`
- [ ] `event: enrichment_complete` appears in logs with `category`, `confidence`, and `needs_human_review` fields
- [ ] Zod schema validation passes for the OpenAI response (no `event: openai_response_schema_error` for well-formed inputs)
- [ ] When `OPENAI_TIMEOUT_MS=1`, `event: openai_timeout` appears in logs and the service does not hang
- [ ] When `OPENAI_TIMEOUT_MS=1`, `event: enrichment_fallback` appears in logs with `fallback_channel`
- [ ] `GET /health` still returns 200 after a failed OpenAI call
- [ ] No full prompt text, API keys, or raw alert annotation values appear in any log line
- [ ] `confidence` field in logs is between 0.0 and 1.0
- [ ] `category` field in logs is one of the 6 valid categories
