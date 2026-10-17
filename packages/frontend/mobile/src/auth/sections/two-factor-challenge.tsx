import { useErrorMessage, useVerifyTwoFactor } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { AuthSubtitle, AuthTitle } from '../components/auth-primitives';
import { TwoFactorChallengeForm } from '../forms/two-factor-challenge-form';

/**
 * The code step of a password sign-in, whole: heading, form and the
 * verification it owns. Both mobile apps' login screens render it in place of
 * the password form while `useLogin` holds `isTwoFactorRequired`, so the
 * challenge lives here once rather than in each screen. Mirrors the web kit's.
 */
export function TwoFactorChallenge({
  onSuccess,
  onCancel,
}: {
  /** The session exists: go where the password sign-in would have gone. */
  onSuccess: () => void;
  /** Back to the password step; the screen forgets the attempt. */
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const verify = useVerifyTwoFactor({ onSuccess });

  return (
    <>
      <AuthTitle>{t('auth.twoFactor.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.twoFactor.description')}</AuthSubtitle>

      <TwoFactorChallengeForm
        isPending={verify.isPending}
        error={
          verify.error
            ? resolveError(verify.error, t('auth.twoFactor.invalidCode')).message
            : undefined
        }
        onSubmit={(values) => verify.mutate(values)}
        onCancel={onCancel}
      />
    </>
  );
}
