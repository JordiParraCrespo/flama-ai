import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', 'f32'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '8f7'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', 'd19'),
            routes: [
              {
                path: '/architecture/frontend-architecture',
                component: ComponentCreator('/architecture/frontend-architecture', 'd10'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/overview',
                component: ComponentCreator('/architecture/overview', 'f3c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/deployment/tier-1-cheap',
                component: ComponentCreator('/deployment/tier-1-cheap', '19c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/deployment/tier-2-production',
                component: ComponentCreator('/deployment/tier-2-production', 'ac0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/installation',
                component: ComponentCreator('/getting-started/installation', 'e0c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/project-structure',
                component: ComponentCreator('/getting-started/project-structure', '508'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', '7da'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
