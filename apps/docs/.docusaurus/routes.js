import ComponentCreator from '@docusaurus/ComponentCreator';
import React from 'react';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true,
  },
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
                sidebar: 'docs',
              },
              {
                path: '/architecture/overview',
                component: ComponentCreator('/architecture/overview', 'f3c'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/deployment/tier-1-cheap',
                component: ComponentCreator('/deployment/tier-1-cheap', '19c'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/deployment/tier-2-production',
                component: ComponentCreator('/deployment/tier-2-production', 'ac0'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/getting-started/installation',
                component: ComponentCreator('/getting-started/installation', 'e0c'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/getting-started/project-structure',
                component: ComponentCreator('/getting-started/project-structure', '508'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/',
                component: ComponentCreator('/', '7da'),
                exact: true,
                sidebar: 'docs',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
