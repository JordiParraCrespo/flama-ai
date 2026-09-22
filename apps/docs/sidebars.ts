import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/project-structure',
        'getting-started/google-sign-in',
      ],
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
        // flama:begin runner
        'architecture/go-services',
        // flama:end runner
      ],
    },
    'errors',
    // flama:begin mcp
    {
      type: 'category',
      label: 'CLI & MCP',
      items: [
        'tooling/permissions',
        // flama:plugins docs-tooling
        // flama:begin mcp
        'tooling/mcp',
        // flama:end mcp
      ],
    },
    // flama:end mcp
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/tier-1-cheap',
        // flama:begin helm
        'deployment/tier-2-production',
        // flama:end helm
      ],
    },
  ],
};

export default sidebars;
