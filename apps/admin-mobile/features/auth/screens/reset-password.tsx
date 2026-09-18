import { ResetPasswordScreen as SharedResetPasswordScreen } from '@flama/frontend-mobile';
import { useTranslation } from 'react-i18next';

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  return (
    <SharedResetPasswordScreen
      brandLabel={t('common.controlAppName')}
      forgotPasswordHref="/(auth)/forgot-password"
      loginHref="/(auth)/login"
    />
  );
}
