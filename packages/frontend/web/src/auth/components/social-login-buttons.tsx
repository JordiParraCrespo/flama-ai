import { Alert, AlertDescription, AppIcon, Button, cn } from '@flama/design-system-web';
import type { SocialAuthIntent } from '@flama/frontend-core';
import { useErrorMessage, useSocialLogin, useSocialProviders } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { AuthDivider, authControlClass } from './auth-primitives';

/**
 * Social sign-in section of the login and register screens: a button for each
 * provider the app offers (`FlamaApp.create({ socialProviders })`) that the
 * deployment's capability read reports configured, drawn with the provider's
 * name and its mark from the design system's brand set. With none to offer it
 * renders nothing.
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
  const { available } = useSocialProviders();

  if (available.length === 0) return null;

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
        {available.map(({ id, name, icon }) => (
          <Button
            key={id}
            variant="outline"
            type="button"
            disabled={disabled || social.isPending}
            onClick={() => social.mutate({ provider: id, intent })}
            className={providerButton}
          >
            {/* A bare mark: the tile's box keeps the 17px logo centred, and
                the negative margin gives the label back the box's padding. */}
            <AppIcon app={icon} label={name} size={34} className="-mx-2 bg-transparent" />
            {t('auth.login.continueWith', { provider: name })}
          </Button>
        ))}
      </div>
    </>
  );
}
