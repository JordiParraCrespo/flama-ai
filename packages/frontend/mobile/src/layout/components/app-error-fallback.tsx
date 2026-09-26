import { Text } from '@flama/design-system-mobile/text';
import i18next from 'i18next';
import { View } from 'react-native';

/** Outside providers — no hooks from them. */
export function AppErrorFallback() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Text className="text-center text-xl font-medium text-ink-900">
        {i18next.t('common.error')}
      </Text>
    </View>
  );
}
