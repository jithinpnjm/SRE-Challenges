import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  aiopsSidebar: [
    'overview',
    'readme',
    {
      type: 'category',
      label: 'Foundation And Routing',
      items: [
        'aiops-01-alertmanager-webhook-receiver',
        'aiops-02-alert-label-enrichment',
        'aiops-03-team-ownership-configmap',
      ],
    },
    {
      type: 'category',
      label: 'Service And Delivery',
      items: [
        'aiops-04-service-build',
        'aiops-05-gitops-deployment',
        'aiops-06-azure-openai-secret',
      ],
    },
    {
      type: 'category',
      label: 'Enrichment And Routing Logic',
      items: [
        'aiops-07-openai-enrichment',
        'aiops-08-elasticsearch-context',
        'aiops-09-slack-routing',
      ],
    },
    {
      type: 'category',
      label: 'Validation',
      items: ['aiops-10-pilot-validation'],
    },
  ],
};

export default sidebars;
