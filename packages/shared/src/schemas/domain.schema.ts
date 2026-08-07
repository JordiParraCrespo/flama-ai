import { z } from 'zod';
import { paginationSchema } from './pagination.schema';

/**
 * Lifecycle of a tracked domain. `draft` is a domain that has been added but
 * never verified or crawled; `paused` keeps the record and its history but
 * stops ingesting new metrics.
 */
export const DOMAIN_STATUSES = ['draft', 'active', 'paused'] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

/** Scheme used when linking out to a tracked domain. */
export const DOMAIN_PROTOCOLS = ['https', 'http'] as const;
export type DomainProtocol = (typeof DOMAIN_PROTOCOLS)[number];

/**
 * A bare hostname — no scheme, no path, no trailing dot. Subdomains are tracked
 * as separate domains, so `blog.example.com` is a distinct record from
 * `example.com`.
 */
export const hostnameSchema = z
  .string()
  .min(4)
  .max(253)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i);

export const createDomainSchema = z.object({
  hostname: hostnameSchema,
  protocol: z.enum(DOMAIN_PROTOCOLS).default('https'),
  /** Member who owns the domain. Omit to leave it unassigned. */
  ownerId: z.string().uuid().optional(),
  /** Pull Search Console data for this property once it is connected. */
  importSearchConsole: z.boolean().default(true),
  /** Queue an initial technical crawl once it is connected. */
  runInitialCrawl: z.boolean().default(true),
});

export const updateDomainSchema = z.object({
  protocol: z.enum(DOMAIN_PROTOCOLS).optional(),
  status: z.enum(DOMAIN_STATUSES).optional(),
  /** `null` unassigns the current owner. */
  ownerId: z.string().uuid().nullable().optional(),
});

export const findDomainsSchema = paginationSchema.extend({
  status: z.enum(DOMAIN_STATUSES).optional(),
  ownerId: z.string().uuid().optional(),
  /** Matches hostname. */
  search: z.string().optional(),
});

/**
 * Replace the set of domains a user may reach. An empty array means "no
 * domains"; grant workspace-wide access by giving the user a role whose
 * `Domain` permission carries no `domainId` condition instead.
 */
export const setUserDomainAccessSchema = z.object({
  domainIds: z.array(z.string().uuid()),
});

export const domainResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  hostname: z.string(),
  protocol: z.enum(DOMAIN_PROTOCOLS),
  status: z.enum(DOMAIN_STATUSES),
  ownerId: z.string().nullable(),
  /** Canonical URL, derived from protocol + hostname. */
  url: z.string().url(),
  importSearchConsole: z.boolean(),
  runInitialCrawl: z.boolean(),
  verifiedAt: z.string().datetime().nullable(),
  lastCrawledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateDomainDto = z.infer<typeof createDomainSchema>;
export type UpdateDomainDto = z.infer<typeof updateDomainSchema>;
export type FindDomainsDto = z.infer<typeof findDomainsSchema>;
export type SetUserDomainAccessDto = z.infer<typeof setUserDomainAccessSchema>;
export type DomainResponse = z.infer<typeof domainResponseSchema>;
