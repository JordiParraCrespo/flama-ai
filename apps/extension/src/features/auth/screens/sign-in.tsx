import { isTwoFactorRequired, useLogin } from '@flama/frontend-core/react';
import { AuthSubtitle, AuthTitle, TwoFactorChallenge, useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { SignInForm } from '@/features/auth/forms/sign-in-form';
import { LINKS } from '@/lib/nav';
import { broadcast } from '@/runtime/messaging';

/**
 * Sign-in, in whichever page asked: the popup, the side panel, the options
 * page. Password and two-factor only; creating an account and resetting a
 * password open the web app, which has the screens for them.
 *
 * Success needs no navigation — the session gate above re-renders on the auth
 * store — only a word to the other open pages.
 */
export function SignInScreen() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const login = useLogin();

  const signedIn = () => void broadcast('session/changed');

  if (isTwoFactorRequired(login.error)) {
    return <TwoFactorChallenge onSuccess={signedIn} onCancel={login.reset} />;
  }

  return (
    <>
      <AuthTitle className="text-xl">{t('extension.signIn.title')}</AuthTitle>
      <AuthSubtitle className="mb-6">{t('extension.signIn.description')}</AuthSubtitle>

      <SignInForm
        isPending={login.isPending}
        error={
          login.error
            ? resolveError(login.error, t('auth.login.invalidCredentials')).message
            : undefined
        }
        onForgotPassword={() => void LINKS.forgotPassword()}
        onSubmit={(values) => login.mutate(values, { onSuccess: signedIn })}
      />

      <p className="mt-6 text-center text-sm text-ink-600">
        {t('extension.signIn.noAccount')}{' '}
        <button
          type="button"
          onClick={() => void LINKS.register()}
          className="text-accent-blue transition-opacity hover:opacity-80"
        >
          {t('extension.signIn.createAccount')}
        </button>
      </p>
    </>
  );
}
