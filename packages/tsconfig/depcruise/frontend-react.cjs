/**
 * Dependency-cruiser rules for the package below the design systems
 * (`packages/frontend/react-hooks`). It is React and nothing else: both design
 * systems import it, so a DOM, a React Native or a workspace import here would
 * drag one platform into the other, or the kernel under the design system.
 */
module.exports = function frontendReact() {
  // Specs render with Testing Library and jsdom; only shipped code is held.
  const shipped = { pathNot: '(^|/)__tests__/|\\.spec\\.tsx?$' };
  return {
    forbidden: [
      {
        name: 'no-circular',
        severity: 'error',
        from: {},
        to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
      },
      {
        name: 'react-and-nothing-else',
        comment:
          'Every design system and every app imports this package, so it imports React alone: no workspace package (the kernel, a kit, a design system), no DOM, no React Native, no library. A hook that needs one of those belongs in the layer that already has it.',
        severity: 'error',
        from: shipped,
        to: {
          dependencyTypes: [
            'npm',
            'npm-dev',
            'npm-optional',
            'npm-peer',
            'npm-no-pkg',
            'npm-unknown',
          ],
          pathNot: 'node_modules/react/',
        },
      },
      {
        name: 'knows-no-workspace-package',
        severity: 'error',
        from: shipped,
        // A workspace package resolves outside this one (`../core/src/…`), and
        // an npm one through `node_modules/`, which the rule above holds.
        to: { path: ['node_modules/@flama/', '^\\.\\./'], pathNot: 'node_modules/(?!@flama/)' },
      },
    ],
    options: {
      doNotFollow: { path: 'node_modules|^../' },
      tsConfig: { fileName: 'tsconfig.json' },
      tsPreCompilationDeps: 'specify',
      enhancedResolveOptions: {
        exportsFields: ['exports'],
        conditionNames: ['import', 'require', 'types', 'default'],
      },
      reporterOptions: { text: { highlightFocused: true } },
    },
  };
};
