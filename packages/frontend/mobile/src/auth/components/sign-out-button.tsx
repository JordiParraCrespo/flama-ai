import { Button, type ButtonProps } from '@flama/design-system-mobile/button';
import { Text } from '@flama/design-system-mobile/text';
import { useLogout } from '@flama/frontend-core/react';
import { type Href, useRouter } from 'expo-router';

export interface SignOutButtonProps {
  /** Where a signed-out reader lands; each app names its own login route. */
  loginHref: Href;
  label: string;
  /** Shown while the sign-out is in flight; defaults to `label`. */
  pendingLabel?: string;
  variant?: ButtonProps['variant'];
  className?: string;
}

/**
 * Signs out and leaves for the login screen.
 *
 * It owns the mutation so that its pending state re-renders this button and
 * nothing else: held by the screen, every press redrew the whole page beside
 * it. The home screen and onboarding both render one.
 */
export function SignOutButton({
  loginHref,
  label,
  pendingLabel,
  variant,
  className,
}: SignOutButtonProps) {
  const router = useRouter();
  const logout = useLogout({ onSuccess: () => router.replace(loginHref) });

  return (
    <Button
      variant={variant}
      className={className}
      disabled={logout.isPending}
      onPress={() => logout.mutate()}
    >
      <Text>{logout.isPending ? (pendingLabel ?? label) : label}</Text>
    </Button>
  );
}
