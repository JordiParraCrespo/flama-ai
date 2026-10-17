/**
 * The base32 secret inside an `otpauth://` URI, for typing into an
 * authenticator app that cannot scan. Empty when the URI does not parse.
 */
export function totpSecretOf(uri: string): string {
  try {
    return new URL(uri).searchParams.get('secret') ?? '';
  } catch {
    return '';
  }
}

/** In groups of four, the way authenticator apps print a secret. */
export function groupSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? '';
}
