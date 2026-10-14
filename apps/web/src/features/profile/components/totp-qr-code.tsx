import { toQR } from 'toqr';

/** Modules of light margin around the code, as the QR specification asks. */
const QUIET_ZONE = 4;

/**
 * The enrolment's `otpauth://` URI as a QR code an authenticator app scans.
 * Drawn as one SVG path, so it stays sharp at any size and needs no canvas.
 * Dark on light in both themes (`qr-ink` on `qr-paper`): not every scanner
 * reads an inverted code.
 */
export function TotpQrCode({ value, label }: { value: string; label: string }) {
  const modules = toQR(value);
  const size = Math.sqrt(modules.length);
  const extent = size + QUIET_ZONE * 2;

  let path = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y * size + x]) path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
    }
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className="size-44 rounded-xl border border-border-subtle bg-qr-paper text-qr-ink"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
