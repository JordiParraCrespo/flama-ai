import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountBullBoard } from '../bull-board.adapter';

/**
 * Bull Board is an admin surface over live queues. What matters about the
 * mount is not visible at a glance: that the router is mounted under the same
 * base path the adapter was told about — a mismatch renders a dashboard whose
 * own asset and API URLs 404 — and that nothing is mounted without credentials.
 */

const createBullBoard = vi.fn();
const setBasePath = vi.fn();
const getRouter = vi.fn(() => 'the-router');
const BullMQAdapterCtor = vi.fn();

vi.mock('@bull-board/api', () => ({
  createBullBoard: (options: unknown) => createBullBoard(options),
}));

vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: class {
    constructor(queue: unknown) {
      BullMQAdapterCtor(queue);
    }
  },
}));

vi.mock('@bull-board/express', () => ({
  ExpressAdapter: class {
    setBasePath = setBasePath;
    getRouter = getRouter;
  },
}));

const queue = (name: string) => ({ name }) as unknown as Queue;

function host() {
  const use = vi.fn();
  return { host: { use }, use };
}

describe('mountBullBoard', () => {
  const auth = { username: 'operator', password: 'correct horse battery staple' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps every queue in an adapter and hands them to the board', () => {
    const { host: target } = host();
    const email = queue('email');

    mountBullBoard(target, [email, queue('webhook'), queue('notifications')], { auth });

    expect(BullMQAdapterCtor).toHaveBeenCalledTimes(3);
    expect(BullMQAdapterCtor).toHaveBeenCalledWith(email);
    expect(createBullBoard).toHaveBeenCalledWith(
      expect.objectContaining({ queues: expect.any(Array) }),
    );
  });

  it('mounts the router at the same base path the adapter was given', () => {
    // The adapter builds its own asset and API URLs from the base path. Mounting
    // elsewhere produces a page that loads and then 404s on everything it needs.
    const { host: target, use } = host();

    mountBullBoard(target, [queue('email')], { basePath: '/ops/queues', auth });

    expect(setBasePath).toHaveBeenCalledWith('/ops/queues');
    expect(use).toHaveBeenCalledWith('/ops/queues', expect.any(Function), 'the-router');
  });

  it('defaults the base path to /admin/queues', () => {
    const { host: target, use } = host();

    mountBullBoard(target, [queue('email')], { auth });

    expect(setBasePath).toHaveBeenCalledWith('/admin/queues');
    expect(use).toHaveBeenCalledWith('/admin/queues', expect.any(Function), 'the-router');
  });

  it('mounts a board with no queues rather than failing', () => {
    // A deployment may register no queues at all. The route should still exist
    // and say so, instead of the call throwing during bootstrap.
    const { host: target, use } = host();

    expect(() => mountBullBoard(target, [], { auth })).not.toThrow();
    expect(use).toHaveBeenCalled();
  });

  it('does not mount the dashboard when credentials are omitted', () => {
    const { host: target, use } = host();

    expect(mountBullBoard(target, [queue('email')])).toBe(false);
    expect(createBullBoard).not.toHaveBeenCalled();
    expect(use).not.toHaveBeenCalled();
  });

  it('guards the dashboard with HTTP Basic authentication', () => {
    const { host: target, use } = host();
    mountBullBoard(target, [queue('email')], { auth });
    const middleware = use.mock.calls[0]?.[1] as (
      request: { headers: { authorization?: string } },
      response: {
        setHeader: ReturnType<typeof vi.fn>;
        status: ReturnType<typeof vi.fn>;
        send: ReturnType<typeof vi.fn>;
      },
      next: ReturnType<typeof vi.fn>,
    ) => void;
    const next = vi.fn();
    const send = vi.fn();
    const status = vi.fn(() => ({ send }));
    const setHeader = vi.fn();

    middleware({ headers: {} }, { setHeader, status, send }, next);

    expect(setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="Bull Board", charset="UTF-8"',
    );
    expect(status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith('Authentication required.');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows valid HTTP Basic credentials, including colons in the password', () => {
    const { host: target, use } = host();
    mountBullBoard(target, [queue('email')], {
      auth: { username: 'operator', password: 'part:two' },
    });
    const middleware = use.mock.calls[0]?.[1] as (
      request: { headers: { authorization?: string } },
      response: unknown,
      next: ReturnType<typeof vi.fn>,
    ) => void;
    const next = vi.fn();
    const response = {
      setHeader: vi.fn(),
      status: vi.fn(() => ({ send: vi.fn() })),
      send: vi.fn(),
    };
    const encoded = Buffer.from('operator:part:two').toString('base64');

    middleware({ headers: { authorization: `Basic ${encoded}` } }, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
});
