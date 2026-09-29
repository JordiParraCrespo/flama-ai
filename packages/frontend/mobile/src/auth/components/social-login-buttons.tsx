import { AppIcon } from '@flama/design-system-mobile/app-icon';
import { Button } from '@flama/design-system-mobile/button';
import { Text } from '@flama/design-system-mobile/text';
import { cn } from '@flama/design-system-mobile/utils';
import type { SocialAuthIntent } from '@flama/frontend-core';
import { useErrorMessage, useSocialLogin, useSocialProviders } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AuthDivider, AuthFormError, authControlClass } from './auth-primitives';

/**
 * Social sign-in section of the login and register screens: a button for each
 * provider the app offers (`FlamaApp.create({ socialProviders })`) that the
 * deployment's capability read reports configured, drawn with the provider's
 * name and its mark from the design system's brand set. With none to offer it
 * renders nothing. The web kit's component of the same name makes the same
 * decisions from the same hook.
 *
 * `intent` is what separates the two screens that render this. The API refuses
 * a provider identity it has never seen unless the caller asks for a sign-up,
 * so the login screen's buttons sign in only, and the register screen's are
 * the one place an account can be created from a provider.
 */
export function SocialLoginButtons({
  disabled,
  intent = 'sign-in',
  onSuccess,
}: {
  disabled?: boolean;
  intent?: SocialAuthIntent;
  /** Where the round-trip lands when it comes back signed in. */
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const social = useSocialLogin({ onSuccess });
  const { available } = useSocialProviders();

  if (available.length === 0) return null;

  const providerButton = cn(authControlClass, 'gap-2.5');

  return (
    <>
      <AuthDivider label={t('common.or')} />
      {/* Starting the round-trip can fail before the browser ever opens — the
          API unreachable, the provider rejected server-side. It used to fail
          into a native alert the form knew nothing about. */}
      {social.error ? (
        <AuthFormError className="mb-2.5">
          {resolveError(social.error, t('auth.login.socialFailed')).message}
        </AuthFormError>
      ) : null}
      <View className="gap-2.5">
        {available.map(({ id, name, icon }) => (
          <Button
            key={id}
            variant="outline"
            disabled={disabled || social.isPending}
            onPress={() => social.mutate({ provider: id, intent })}
            className={providerButton}
          >
            {/* A bare mark: the tile's box keeps the 17px logo centred, and
                the negative margin gives the label back the box's padding. */}
            <AppIcon app={icon} label={name} size={34} className="-mx-2 bg-transparent" />
            <Text>{t('auth.login.continueWith', { provider: name })}</Text>
          </Button>
        ))}
      </View>
    </>
  );
}
