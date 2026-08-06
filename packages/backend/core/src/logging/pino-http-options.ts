import type { Options } from 'pino-http';

export interface LoggingOptions {
  /** Render through `pino-pretty` instead of emitting JSON (development only). */
  pretty?: boolean;
}

/**
 * Headers that carry credentials. The serializers below drop headers entirely,
 * but the redaction stays as a backstop so a future serializer change (or a
 * log call passing a raw request) can never leak a session cookie or bearer
 * token into the log sink.
 */
const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
];

/** Query strings routinely carry tokens (password reset, OAuth callbacks). */
function stripQuery(url: string): string {
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

/**
 * Hardened `pino-http` options shared by the request logger and the Better
 * Auth route logger: headers, query strings, and request bodies routinely
 * carry session cookies and personal data, so a request log line contains
 * only the fields known to be safe.
 */
export function buildPinoHttpOptions(options: LoggingOptions = {}): Options {
  return {
    redact: { paths: REDACT_PATHS, remove: true },
    serializers: {
      // pino-http wraps these, so `req`/`res` arrive already serialized by the
      // std serializers; returning a subset is what drops the rest.
      req(req: { id?: unknown; method?: string; url?: string; remoteAddress?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url === undefined ? undefined : stripQuery(req.url),
          remoteAddress: req.remoteAddress,
        };
      },
      res(res: { statusCode?: number }) {
        return { statusCode: res.statusCode };
      },
    },
    transport: options.pretty ? { target: 'pino-pretty' } : undefined,
  };
}
