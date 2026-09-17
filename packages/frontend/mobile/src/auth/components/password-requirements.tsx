import { Icon } from '@flama/design-system-mobile/icon';
import { Check } from '@flama/design-system-mobile/icons';
import { Text } from '@flama/design-system-mobile/text';
import { cn } from '@flama/design-system-mobile/utils';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type PasswordRule = 'length' | 'case' | 'number' | 'match';

/**
 * The rules the checklist reports on. They mirror what the API enforces on a
 * new password; `match` is the confirm-field rule and is only asked for on the
 * screens that have one.
 *
 * Kept byte-for-byte in step with `@flama/frontend-web`'s copy: a password the
 * web app accepts and the mobile app refuses is the kind of difference nobody
 * reports, they just give up.
 */
export function checkPassword(
  password: string,
  confirmation?: string,
): Record<PasswordRule, boolean> {
  return {
    length: password.length >= 8,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirmation,
  };
}

/** True once every rule the given screen shows is satisfied. */
export function meetsRequirements(
  results: Record<PasswordRule, boolean>,
  rules: readonly PasswordRule[],
) {
  return rules.every((rule) => results[rule]);
}

/**
 * The live checklist under a password field. Rules read tertiary until they
 * pass, then fill green and take primary ink — the only place colour carries
 * meaning on these screens.
 */
export function PasswordRequirements({
  results,
  rules,
  className,
}: {
  results: Record<PasswordRule, boolean>;
  rules: readonly PasswordRule[];
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <View className={cn('gap-[7px]', className)}>
      {rules.map((rule) => {
        const passed = results[rule];

        return (
          <View key={rule} className="flex-row items-center gap-2">
            <View
              className={cn(
                'size-4 items-center justify-center rounded-full border-[1.5px]',
                passed ? 'border-status-active bg-status-active' : 'border-border-default',
              )}
            >
              {passed ? <Icon as={Check} size={9} strokeWidth={3} className="text-white" /> : null}
            </View>
            <Text className={cn('text-sm', passed ? 'text-ink-900' : 'text-ink-400')}>
              {t(`auth.passwordRules.${rule}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
