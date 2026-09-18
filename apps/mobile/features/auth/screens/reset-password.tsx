import { ResetPasswordScreen as SharedResetPasswordScreen } from '@flama/frontend-mobile';

export function ResetPasswordScreen() {
  return (
    <SharedResetPasswordScreen
      forgotPasswordHref="/(auth)/forgot-password"
      loginHref="/(auth)/login"
    />
  );
}
