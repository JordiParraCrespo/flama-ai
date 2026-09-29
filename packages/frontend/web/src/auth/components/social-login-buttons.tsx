import { Alert, AlertDescription, Button, cn } from '@flama/design-system-web';
import { Info } from '@flama/design-system-web/icons';
import type { SocialAuthIntent } from '@flama/frontend-core';
import { useErrorMessage, useSocialLogin, useSocialProviders } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { AuthDivider, authControlClass } from './auth-primitives';

/**
 * Social sign-in section of the login and register screens: a button for each
 * provider the app offers (`FlamaApp.create({ socialProviders })`, with its
 * name and mark) that the deployment's capability read reports configured.
 * The kit names no provider; an app that offers none gets no section at all.
 *
 * Until the capability read *succeeds* every offered provider shows, because
 * an unreachable API is not a missing configuration. The "nothing configured"
 * hint, for the self-hoster who is the one person able to fix it, only ever
 * renders from a successful read reporting none of them.
 *
 * `intent` is what separates the two screens that render this. The API refuses
 * a provider identity it has never seen unless the caller asks for a sign-up,
 * so the login screen's buttons sign in only, and the register screen's are
 * the one place an account can be created from a provider.
 */
export function SocialLoginButtons({
  disabled,
  intent = 'sign-in',
}: {
  disabled?: boolean;
  intent?: SocialAuthIntent;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const social = useSocialLogin();
  const { offered, available } = useSocialProviders();

  if (offered.length === 0) return null;

  if (available.length === 0) {
    // A notice, not a failure — nobody signing in did anything wrong — so it is
    // the plain `Alert`, not the destructive one. It was a centred grey
    // paragraph, which is the shape this screen is not allowed to invent.
    return (
      <Alert icon={Info} className="mt-4">
        <AlertDescription>{t('auth.login.noSocialProviders')}</AlertDescription>
      </Alert>
    );
  }

  const providerButton = cn(authControlClass, 'gap-2.5');

  return (
    <>
      <AuthDivider label={t('common.or')} />
      {/* Starting the round-trip can fail before the redirect ever happens —
          the API unreachable, the provider rejected server-side. It used to
          fail silently: the button simply stopped spinning. */}
      {social.error && (
        <Alert variant="destructive" className="mb-2.5">
          <AlertDescription>
            {resolveError(social.error, t('auth.login.socialFailed')).message}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2.5">
        {available.map(({ id, name, mark: Mark }) => (
          <Button
            key={id}
            variant="outline"
            type="button"
            disabled={disabled || social.isPending}
            onClick={() => social.mutate({ provider: id, intent })}
            className={providerButton}
          >
            <Mark />
            {t('auth.login.continueWith', { provider: name })}
          </Button>
        ))}
      </div>
    </>
  );
}
