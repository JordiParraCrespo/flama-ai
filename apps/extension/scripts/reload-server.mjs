/**
 * The development reload channel: a WebSocket server that says "reload" when
 * a rebuild lands, and the service worker on the other end calls
 * `chrome.runtime.reload()` (`src/runtime/dev-reload.ts`).
 *
 * Hand-written rather than a dependency because the server's side of the
 * protocol it needs is small and fixed — the RFC 6455 handshake and an
 * unmasked text frame — and a library for it would be the largest thing in the
 * dev toolchain that nobody reads. It only ever sends; what a client sends is
 * read for its close frame and otherwise dropped.
 *
 * A WebSocket rather than a stream or a poll for one reason: since Chrome 116
 * a message arriving on one keeps an extension's service worker alive, and a
 * worker that has gone to sleep cannot hear that it should reload. The server
 * sends a heartbeat inside Chrome's 30-second idle window for the same reason.
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

/** The port livereload made conventional; nothing else in the repo listens on it. */
export const RELOAD_PORT = 35729;
const HEARTBEAT_MS = 20_000;
const DEBOUNCE_MS = 150;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** The `Sec-WebSocket-Accept` value for a client's key (RFC 6455 §4.2.2). */
export function acceptKey(key) {
  return createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
}

/** One unmasked text frame (RFC 6455 §5.2). Server frames are never masked. */
export function textFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length < 65_536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  throw new Error('reload-server: frames over 64KB are never sent');
}

/**
 * Start listening. `changed()` is called for every bundle written; nothing is
 * sent until `ready()`, so the first full build does not reload an extension
 * that has not been loaded yet, and a burst of writes is one reload.
 */
export function startReloadServer(port = RELOAD_PORT) {
  const sockets = new Set();
  let live = false;
  let timer = null;

  const send = (text) => {
    const frame = textFrame(text);
    for (const socket of sockets) socket.write(frame);
  };

  const server = createServer((_request, response) => {
    response.writeHead(426, { 'content-type': 'text/plain' });
    response.end('This port speaks WebSocket only: the Flama extension reloader.\n');
  });

  server.on('upgrade', (request, socket) => {
    const key = request.headers['sec-websocket-key'];
    if (request.headers.upgrade?.toLowerCase() !== 'websocket' || !key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey(key)}`,
        '',
        '',
      ].join('\r\n'),
    );
    sockets.add(socket);
    // Opcode 0x8 in the first byte is a close frame: drop the socket.
    socket.on('data', (chunk) => {
      if ((chunk[0] & 0x0f) === 0x8) socket.end();
    });
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => sockets.delete(socket));
  });

  server.on('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `reload-server: port ${port} is taken — is another \`pnpm dev\` of the extension running? Builds continue; reload by hand.`
        : `reload-server: ${error.message}`,
    );
  });
  server.listen(port, '127.0.0.1');

  const heartbeat = setInterval(() => send('ping'), HEARTBEAT_MS);
  heartbeat.unref();

  return {
    changed(target) {
      if (!live) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log(`  ↻ ${target} rebuilt — reloading the extension`);
        send('reload');
      }, DEBOUNCE_MS);
    },
    ready() {
      live = true;
    },
    close() {
      clearInterval(heartbeat);
      for (const socket of sockets) socket.destroy();
      return new Promise((done) => server.close(done));
    },
  };
}
