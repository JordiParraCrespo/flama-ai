import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-web';
import { useProfile } from '@flama/frontend-core/react';
import { PageHead } from '@flama/frontend-web';
import { Trans, useTranslation } from 'react-i18next';

/**
 * The landing page after sign-in. It reads the profile once for the greeting
 * and the account line: two readers of one result, so the query stays here.
 * Metrics arrive with the endpoints that serve them, never as placeholders.
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const { data: user } = useProfile();

  return (
    <>
      <PageHead
        title={t('dashboard.title')}
        sub={t('dashboard.welcome', { name: user?.firstName ?? '' })}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.gettingStarted')}</CardTitle>
          <CardDescription>{t('dashboard.gettingStartedDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-600">
            <Trans
              i18nKey="dashboard.accountStatus"
              values={{
                role: user?.role ?? '',
                status: user?.isActive ? t('dashboard.active') : t('dashboard.inactive'),
              }}
              components={{ role: <strong />, status: <strong /> }}
            />
          </p>
        </CardContent>
      </Card>
    </>
  );
}
