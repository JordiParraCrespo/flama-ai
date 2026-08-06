/**
 * Better Auth client methods resolve with `{ data, error }` instead of
 * rejecting. `unwrap` turns the error half into a thrown `Error` so the
 * `IAuthClient` adapters can expose plain rejecting promises.
 */
export function unwrap(result: { error?: { message?: string } | null }): void {
  if (result.error) {
    throw new Error(result.error.message ?? 'Authentication request failed');
  }
}
