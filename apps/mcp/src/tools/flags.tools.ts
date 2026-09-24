import { z } from 'zod';
import { defineTool } from './tool';

const flagKey = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/)
  .describe('A flag key from the code’s catalog, e.g. api_token_creation');

export const flagTools = [
  defineTool({
    name: 'list_feature_flags',
    title: 'List feature flags',
    description:
      'Every feature flag the code declares — kind, owner, default, expiry — with its targeting on this deployment once someone has saved any. A flag with no targeting serves its default.',
    requiredScopes: ['flags:read'],
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: (_args, { client }) => client.get('/feature-flags/admin'),
  }),

  defineTool({
    name: 'get_feature_flag',
    title: 'Get a feature flag',
    description: 'Read one feature flag: its definition and its full targeting rules.',
    requiredScopes: ['flags:read'],
    inputSchema: z.object({ key: flagKey }),
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: ({ key }, { client }) => client.get(`/feature-flags/admin/${key}`),
  }),

  defineTool({
    name: 'explain_feature_flag',
    title: 'Explain a feature flag',
    description:
      'What a flag would serve to a given user, organization, platform or app build — and why (the rule that matched, a percentage split, switched off, or the default).',
    requiredScopes: ['flags:read'],
    inputSchema: z.object({
      key: flagKey,
      userId: z.string().optional(),
      organizationId: z.string().optional(),
      email: z.string().optional(),
      platformRole: z.string().optional(),
      platform: z.enum(['web', 'ios', 'android', 'server']).optional(),
      appVersion: z.string().optional().describe('Semver, e.g. 2.1.0'),
    }),
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: ({ key, ...context }, { client }) =>
      client.get(`/feature-flags/admin/${key}/evaluate`, context),
  }),

  defineTool({
    name: 'list_feature_flag_changes',
    title: 'Feature flag audit trail',
    description:
      'Who changed which flag or segment, when, why, and what it was before and after — newest first.',
    requiredScopes: ['flags:read'],
    inputSchema: z.object({
      subjectType: z.enum(['flag', 'segment']).optional(),
      subjectKey: z.string().optional().describe('A flag or segment key'),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: (args, { client }) => client.get('/feature-flags/changes', args),
  }),

  defineTool({
    name: 'set_feature_flag_enabled',
    title: 'Switch a feature flag on or off',
    description:
      'Flip a flag’s master switch — the kill switch. Off serves false (or the default variant) to every user of this deployment at once; targeting is left as it is. Always give a comment saying why: it goes on the audit trail.',
    requiredScopes: ['flags:write'],
    inputSchema: z.object({
      key: flagKey,
      enabled: z.boolean(),
      comment: z.string().max(500).optional().describe('Why — recorded on the audit trail'),
    }),
    annotations: { destructiveHint: true, idempotentHint: true },
    handler: ({ key, ...body }, { client }) => client.patch(`/feature-flags/admin/${key}`, body),
  }),
];
