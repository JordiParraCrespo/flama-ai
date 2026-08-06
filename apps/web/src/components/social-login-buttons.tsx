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
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t('auth.login.noSocialProviders')}
      </p>
    );
  }

  return (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t('common.orContinueWith')}</span>
        </div>
      </div>
      <div className={google && github ? 'grid grid-cols-2 gap-4' : 'grid gap-4'}>
        {google && (
          <Button
            variant="outline"
            type="button"
            disabled={disabled || social.isPending}
            onClick={() => social.mutate('google')}
          >
            {t('common.google')}
          </Button>
        )}
        {github && (
          <Button
            variant="outline"
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
