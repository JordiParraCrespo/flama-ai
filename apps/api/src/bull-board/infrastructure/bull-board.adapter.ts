import { timingSafeEqual } from 'node:crypto';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Queue } from 'bullmq';
import type { NextFunction, Request, Response } from 'express';

/** HTTP Basic credentials guarding the dashboard. Both fields are required. */
export interface BullBoardAuth {
  username: string;
  password: string;
}

export interface BullBoardOptions {
  basePath?: string;
  /**
   * When set, the dashboard is guarded by HTTP Basic auth with these
   * credentials. When omitted, the dashboard is NOT mounted at all — its job
   * payloads carry tokenized password-reset/invitation URLs, so an
   * unauthenticated dashboard is an account-takeover surface.
   */
  auth?: BullBoardAuth;
}

/** The part of the Express app the dashboard is mounted on. */
export interface BullBoardHost {
  use: (path: string, ...handlers: unknown[]) => void;
}

/** Constant-time comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function basicAuthMiddleware(auth: BullBoardAuth) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, ...passParts] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      const pass = passParts.join(':');
      // Compare both fields regardless of the first result so the response time
      // does not reveal whether the username matched.
      const userOk = safeEqual(user, auth.username);
      const passOk = safeEqual(pass, auth.password);
      if (userOk && passOk) {
        next();
        return;
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board", charset="UTF-8"');
    res.status(401).send('Authentication required.');
  };
}

/**
 * Mount the Bull Board dashboard over `queues`. Returns `true` if it was
 * mounted, `false` if it was skipped because no credentials were supplied — the
 * caller logs the outcome so a self-hoster learns the dashboard is off.
 *
 * The dashboard is raw Express middleware on the HTTP adapter, so NestJS global
 * guards (`AuthGuard`/`ScopesGuard`) never see it. That is exactly why it must
 * carry its own auth: without the Basic-auth gate it would expose every queued
 * job — including password-reset and invitation tokens — to anyone who can
 * reach the host.
 */
export function mountBullBoard(
  host: BullBoardHost,
  queues: Queue[],
  options: BullBoardOptions = {},
): boolean {
  const basePath = options.basePath ?? '/admin/queues';
  if (!options.auth) return false;

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);
  createBullBoard({ queues: queues.map((queue) => new BullMQAdapter(queue)), serverAdapter });

  // Express's `use` is variadic, so the Basic-auth gate runs before the
  // dashboard router.
  host.use(basePath, basicAuthMiddleware(options.auth), serverAdapter.getRouter());
  return true;
}
