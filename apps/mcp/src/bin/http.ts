#!/usr/bin/env node
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import { FlamaApiError, FlamaClient } from '../client';
import { loadConfig, type McpConfig } from '../config';
import { createServer } from '../server';

/**
 * Remote entrypoint: a Streamable HTTP MCP server.
 *
 * Each request carries its own credential — an OAuth 2.1 access token obtained
 * through the consent screen, or a scoped API token — so the server is
 * stateless and one deployment serves every user at their own permission
 * level. A fresh transport and MCP server are built per request from that
 * credential's effective scopes.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(originGuard(config));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', api: config.apiUrl });
  });

  app.all('/mcp', async (req: Request, res: Response) => {
    const token = bearerToken(req);

    if (!token) {
      unauthorized(res, config, 'A bearer token is required.');
      return;
    }

    const client = new FlamaClient({
      apiUrl: config.apiUrl,
      token,
      timeoutMs: config.timeoutMs,
    });

    let scopes: Awaited<ReturnType<FlamaClient['currentCredential']>>;
    try {
      scopes = await client.currentCredential();
    } catch (error) {
      if (error instanceof FlamaApiError && error.isPermissionError) {
        unauthorized(res, config, error.message);
        return;
      }
      res.status(502).json({
        error: 'upstream_unavailable',
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const { server } = createServer({ client, scopes: scopes.effectiveScopes });
    // Stateless: no session id, so nothing is retained between requests and the
    // credential is re-checked every time.
    const transport = new StreamableHTTPServerTransport({});

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(config.port, () => {
    console.error(`[flama-mcp] listening on :${config.port}, proxying ${config.apiUrl}`);
  });
}

/** `Authorization: Bearer <token>`, or null. */
function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, ...rest] = header.split(' ');
  if (scheme.toLowerCase() !== 'bearer') return null;

  return rest.join(' ').trim() || null;
}

/**
 * A 401 that points the client at the OAuth server, as the MCP authorization
 * spec requires — this is what lets a client discover where to send the user
 * for consent instead of just failing.
 */
function unauthorized(res: Response, config: McpConfig, message: string): void {
  const metadata = `${config.apiUrl.replace(/\/+$/, '')}/api/auth/.well-known/oauth-protected-resource`;
  res
    .status(401)
    .set('WWW-Authenticate', `Bearer resource_metadata="${metadata}"`)
    .json({ error: 'unauthorized', message });
}

/**
 * Rejects browser requests from origins that were not explicitly allowed.
 * Without an `Origin` header the request is not browser-initiated (a native MCP
 * client), so it passes; this is the DNS-rebinding protection the MCP spec
 * calls for on locally reachable servers.
 */
function originGuard(config: McpConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (!origin) {
      next();
      return;
    }

    if (config.allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Headers', 'authorization, content-type, mcp-session-id');
      res.set('Access-Control-Expose-Headers', 'mcp-session-id');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
      return;
    }

    res.status(403).json({
      error: 'origin_not_allowed',
      message: `Origin ${origin} is not allowed. Set FLAMA_ALLOWED_ORIGINS to permit it.`,
    });
  };
}

main().catch((error: unknown) => {
  console.error(`[flama-mcp] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
