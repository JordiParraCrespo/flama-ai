import { useSessionRestore } from '@flama/frontend-core/react';
import { ScreenErrorFallback } from '@flama/frontend-mobile';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

/**
 * What covers the app while the stored session is being restored at launch.
 *
 * Its own component because it runs on the restore's clock (loading, failing,
 * retrying), which the navigator beside it has no reason to follow.
 */
export function SessionRestoreOverlay() {
  const { t } = useTranslation();
  const { isLoading, isError, isFetching, refetch } = useSessionRestore();

  if (isError) {
    // Restoring the session failed (network/server error). Surface it with a
    // retry instead of treating the reader as signed out.
    return (
      <View className="absolute inset-0 z-50">
        <ScreenErrorFallback
          title={t('auth.session.errorTitle')}
          message={t('auth.session.errorMessage')}
          isRetrying={isFetching}
          onReset={() => void refetch()}
        />
      </View>
    );
  }

  if (isLoading) {
    // The design system ships no spinner, so this is the platform's own.
    return (
      <View className="absolute inset-0 z-50 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}
