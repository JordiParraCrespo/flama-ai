import { Button } from '@flama/design-system-mobile/button';
import { Text } from '@flama/design-system-mobile/text';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

/** One invitation addressed to the caller, with the button that accepts it. */
export function InvitationRow({
  role,
  disabled,
  joining,
  onJoin,
}: {
  role: string;
  disabled: boolean;
  joining: boolean;
  onJoin: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-border-subtle p-3.5">
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-ink-900" numberOfLines={1}>
          {t('onboarding.invitation.title')}
        </Text>
        <Text className="mt-px text-xs text-ink-400" numberOfLines={1}>
          {t('onboarding.invitation.role', { role })}
        </Text>
      </View>
      <Button size="sm" disabled={disabled} onPress={onJoin}>
        <Text>
          {joining ? t('onboarding.invitation.joining') : t('onboarding.invitation.join')}
        </Text>
      </Button>
    </View>
  );
}
