export const repoBase =
  'https://github.com/jithinpjoseph/SRE-Challenges/blob/main/';

export const aiopsFiles = [
  ['README.md', 'Project overview, architecture, sprint plan, and guardrails'],
  ['AIOPS-01-alertmanager-webhook-receiver.md', 'Webhook receiver setup and Alertmanager path'],
  ['AIOPS-02-alert-label-enrichment.md', 'Alert label enrichment for routing and context'],
  ['AIOPS-03-team-ownership-configmap.md', 'Team ownership mapping design'],
  ['AIOPS-04-service-build.md', 'Build the AI alert router service'],
  ['AIOPS-05-gitops-deployment.md', 'Deploy through GitOps and platform controls'],
  ['AIOPS-06-azure-openai-secret.md', 'Azure OpenAI secret handling and wiring'],
  ['AIOPS-07-openai-enrichment.md', 'AI enrichment flow and failure handling'],
  ['AIOPS-08-elasticsearch-context.md', 'Elasticsearch log context retrieval'],
  ['AIOPS-09-slack-routing.md', 'Slack routing and enriched message delivery'],
  ['AIOPS-10-pilot-validation.md', 'Pilot validation, safety checks, and rollout review'],
] as const;
