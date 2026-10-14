import { AppError, type ErrorDefinition } from '../core/errors';

export const AuthErrors = {
  LOGIN_FAILED: {
    code: 'AUTH_CLIENT_001',
    message: 'Login failed',
  },
  REGISTER_FAILED: {
    code: 'AUTH_CLIENT_002',
    message: 'Registration failed',
  },
  REFRESH_FAILED: {
    code: 'AUTH_CLIENT_003',
    message: 'Token refresh failed',
  },
  TWO_FACTOR_REQUIRED: {
    code: 'AUTH_CLIENT_004',
    message: 'Enter the code from your authenticator app to finish signing in',
  },
} as const satisfies Record<string, ErrorDefinition>;

/**
 * A sign-in whose password was right, on an account with two-factor on.
 *
 * Thrown rather than returned so a login screen that does not know about
 * two-factor fails safe: it shows the message instead of navigating into an
 * app it has no session for. A screen that does catches it with
 * {@link isTwoFactorRequired} and asks for the code.
 */
export class TwoFactorRequiredError extends AppError {
  constructor() {
    super(AuthErrors.TWO_FACTOR_REQUIRED);
    this.name = 'TwoFactorRequiredError';
  }
}

/**
 * Whether a failed sign-in is the two-factor challenge rather than a failure.
 * By code as well as class, so it holds across two copies of this package.
 */
export function isTwoFactorRequired(error: unknown): error is TwoFactorRequiredError {
  return (
    error instanceof TwoFactorRequiredError ||
    (error instanceof Error &&
      (error as { code?: unknown }).code === AuthErrors.TWO_FACTOR_REQUIRED.code)
  );
}
