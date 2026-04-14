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
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: ['deployment/tier-1-cheap', 'deployment/tier-2-production'],
    },
  ],
};

export default sidebars;
