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
      ],
    },
    'errors',
    // A tooling category exists only when something fills it: Docusaurus
    // rejects a category with no items, so a plugin inserts the whole thing.
    // flama:plugins docs-tooling
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/tier-1-cheap',
      ],
    },
  ],
};

export default sidebars;
