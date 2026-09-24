import '../global.css';
import '@flama/frontend-mobile/i18n';
import 'react-native-gesture-handler';
import 'reflect-metadata';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

import { MobileRoot } from '@flama/design-system-mobile/mobile-root';
import { FlamaProvider } from '@flama/frontend-core/react';
import {
  AppErrorFallback,
  ConfigManagerContext,
  configManager,
  ErrorBoundary,
  initPurchases,
  NAV_THEME,
  ScreenErrorFallback,
  ScreenViewTracker,
} from '@flama/frontend-mobile';
import { ThemeProvider } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { View } from 'react-native';
import { AuthGate } from '../features/auth/screens/auth-gate';
import { app } from '../lib/flama';
import { persistOptions, queryClient } from '../lib/query';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Synchronises with systems outside React: the remote config manager and
  // the RevenueCat purchases SDK, both initialised once per app launch.
  useEffect(() => {
    void configManager.load();
    void initPurchases();
  }, []);

  return (
    <ErrorBoundary fallback={() => <AppErrorFallback />}>
      <MobileRoot>
        <ConfigManagerContext.Provider value={configManager}>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions as never}>
            <FlamaProvider app={app}>
              <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
                <View className={isDark ? 'dark flex-1 bg-background' : 'flex-1 bg-background'}>
                  <StatusBar style={isDark ? 'light' : 'dark'} />
                  <ScreenViewTracker />
                  <ErrorBoundary fallback={(reset) => <ScreenErrorFallback onReset={reset} />}>
                    <AuthGate />
                  </ErrorBoundary>
                </View>
              </ThemeProvider>
            </FlamaProvider>
          </PersistQueryClientProvider>
        </ConfigManagerContext.Provider>
      </MobileRoot>
    </ErrorBoundary>
  );
}
