import { BrandMark } from '@flama/design-system-web/brand-mark';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/language-switcher';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: AuthLayout,
});

/**
 * The shell every auth screen sits in: a half-and-half split, form on the left
 * and a brand panel on the right.
 *
 * The panel carries the brand's aurora ramp — the one place in the product a
 * gradient is allowed to fill a surface. It reads from `--gradient-aurora`
 * rather than a literal so the dark theme can swap it: the light pastel under
 * dark-theme ink is unreadable.
 *
 * Copy uses `text-ink-*` rather than `text-on-inverse`, because the inks flip
 * with the theme and land the right way up on both ramps.
 *
 * Below `lg` the panel is dropped entirely rather than stacked — on a phone it
 * would push the form below the fold to show decoration.
 */
function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh">
      <div className="relative flex flex-1 flex-col items-center justify-center bg-surface-canvas px-4 py-10 sm:px-6 lg:w-1/2 lg:flex-none">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="flex w-full max-w-100 flex-col gap-7">
          <a href="/" className="flex items-center justify-center gap-2 self-center text-ink-900">
            <BrandMark size={22} />
            <span className="text-2xl font-medium tracking-tight">{t('common.appName')}</span>
          </a>
          <Outlet />
        </div>
      </div>

      <div className="hidden w-1/2 flex-col justify-between bg-[image:var(--gradient-aurora)] p-12 lg:flex">
        <BrandMark size={26} className="text-ink-900" />
        <div className="max-w-105">
          <p className="text-2xl leading-snug font-medium text-ink-900">{t('auth.panelTitle')}</p>
          <p className="mt-3 text-base text-ink-600">{t('auth.panelBody')}</p>
        </div>
        <span className="text-xs text-ink-600">{t('common.appName')}</span>
      </div>
    </div>
  );
}
