import { Button } from '@flama/design-system-web';
import { useDeploymentCapabilities, useSocialLogin } from '@flama/frontend/react';
import { useTranslation } from 'react-i18next';

/**
 * Social sign-in section of the login card, driven by the deployment's
 * capability set (`GET /health/capabilities`) so only providers that are
 * actually configured render a button.
 *
 * Failure semantics matter here: until the capability read *succeeds* we
 * assume every provider is available, because an unreachable API is not a
 * missing configuration. The "nothing configured" hint — which names the env
 * vars to set, for the self-hoster who is the one person able to fix it —
 * only ever renders from a successful read reporting no providers.
 */
export function SocialLoginButtons({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const social = useSocialLogin();
  const { data, error } = useDeploymentCapabilities();

  // TanStack Query retains the last successful data after a failed refetch,
  // so `data` alone can be stale (e.g. read before an operator enabled OAuth
  // and restarted the API). Trust it only while the latest read succeeded;
  // any error means "unknown", which falls back to showing every provider.
  const capabilities = error == null ? data : undefined;

  const google = capabilities?.google_oauth ?? true;
  const github = capabilities?.github_oauth ?? true;

  if (!google && !github) {
    return (
      <p className="mt-5 text-center text-xs text-ink-400">{t('auth.login.noSocialProviders')}</p>
    );
  }

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-ink-400">{t('common.orContinueWith')}</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
      <div className={google && github ? 'grid grid-cols-2 gap-2.5' : 'grid gap-2.5'}>
        {google && (
          <Button
            variant="secondary"
            size="lg"
            type="button"
            disabled={disabled || social.isPending}
            onClick={() => social.mutate('google')}
          >
            {t('common.google')}
          </Button>
        )}
        {github && (
          <Button
            variant="secondary"
            size="lg"
            type="button"
            disabled={disabled || social.isPending}
            onClick={() => social.mutate('github')}
          >
            {t('common.github')}
          </Button>
        )}
      </div>
    </>
  );
}
