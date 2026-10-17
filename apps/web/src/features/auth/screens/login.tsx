import { isTwoFactorRequired, useLogin } from '@flama/frontend-core/react';
import {
  AuthSubtitle,
  AuthTitle,
  OAuthCallbackNotice,
  SocialLoginButtons,
  TwoFactorChallenge,
  useErrorMessage,
} from '@flama/frontend-web';
import type { LoginDto } from '@flama/shared/schemas/auth';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/features/auth/forms/login-form';

export function LoginScreen({
  redirectTo,
  email,
  oauthError,
}: {
  redirectTo?: string;
  /** Prefills the form for an invitee who already has an account. */
  email?: string;
  /** Better Auth's `?error=<code>` from a failed social round-trip. */
  oauthError?: string;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const navigate = useNavigate();
  const login = useLogin();

  const enterApp = () => {
    // Split rather than pass the whole string as `to`: the target may
    // carry search params (`/settings?section=security`), and `to` is a
    // path — everything after the `?` would be swallowed into the pathname.
    const [pathname, query] = (redirectTo ?? '/dashboard').split('?');
    navigate({
      to: pathname,
      search: Object.fromEntries(new URLSearchParams(query ?? '')),
    });
  };

  const onSubmit = (values: LoginDto) => {
    // The social banner describes the round-trip that just failed, not this
    // attempt. Drop it from the URL as the password attempt starts, or the two
    // failures stack and the reader cannot tell which one they are looking at.
    if (oauthError) {
      navigate({ to: '/login', search: (prev) => ({ ...prev, error: undefined }), replace: true });
    }

    login.mutate(values, { onSuccess: enterApp });
  };

  // The password was right and the account has two-factor on: the sign-in is
  // not a failure, it owes a code. Derived from the mutation rather than kept
  // as state, so "back" is just forgetting that attempt.
  if (isTwoFactorRequired(login.error)) {
    return <TwoFactorChallenge onSuccess={enterApp} onCancel={login.reset} />;
  }

  return (
    <>
      <AuthTitle>{t('auth.login.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.login.description')}</AuthSubtitle>

      <OAuthCallbackNotice code={oauthError} className="mb-4" />

      <LoginForm
        defaultEmail={email}
        isPending={login.isPending}
        error={
          login.error
            ? resolveError(login.error, t('auth.login.invalidCredentials')).message
            : undefined
        }
        forgotPasswordLink={
          <Link
            to="/forgot-password"
            className="text-sm text-accent-blue transition-opacity hover:opacity-80"
          >
            {t('auth.login.forgotPassword')}
          </Link>
        }
        onSubmit={onSubmit}
      />

      <SocialLoginButtons disabled={login.isPending} />
    </>
  );
}
