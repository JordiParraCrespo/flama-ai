import { Text } from '@flama/design-system-mobile/text';
import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * A label on the left, its value on the right. A string value is set as text;
 * anything else (a badge) is placed as given, so every row shares one layout.
 */
export function AccountRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm text-ink-600">{label}</Text>
      {typeof children === 'string' ? (
        <Text className="flex-1 text-right text-sm font-medium text-ink-900" numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
