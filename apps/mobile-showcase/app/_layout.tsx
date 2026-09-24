import '../global.css';
import 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

import { MobileRoot } from '@flama/design-system-mobile/mobile-root';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Text, View } from 'react-native';
import { NAV_THEME, THEME } from '../lib/theme';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = THEME[isDark ? 'dark' : 'light'];

  return (
    <MobileRoot>
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <View
        className={isDark ? 'dark flex-1 bg-background' : 'flex-1 bg-background'}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.foreground,
            contentStyle: { backgroundColor: palette.background },
            headerTitle(props) {
              const title =
                typeof props.children === 'string'
                  ? props.children
                  : typeof props.children === 'number'
                    ? String(props.children)
                    : '';

              return <Text className="text-xl font-medium text-foreground">{title}</Text>;
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerTitle: 'Showcase',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="buttons" options={{ headerTitle: 'Buttons' }} />
          <Stack.Screen name="components/[slug]" options={{ headerTitle: 'Component' }} />
        </Stack>
      </View>
    </ThemeProvider>
    </MobileRoot>
  );
}
