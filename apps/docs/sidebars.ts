import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/project-structure'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/backend-packages',
        'architecture/api-architecture',
        'architecture/frontend-architecture',
        'architecture/query-keys',
        'architecture/analytics',
      ],
    },
    {
      type: 'category',
      label: 'CLI & MCP',
      items: ['tooling/permissions', 'tooling/cli', 'tooling/mcp'],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: ['deployment/tier-1-cheap', 'deployment/tier-2-production'],
    },
  ],
};

export default sidebars;
