import { BrandMark, Card, CardContent, CardHeader, CardTitle } from '@flama/design-system-web';
import { useTranslation } from 'react-i18next';
import { SignInScreen } from '@/features/auth/screens/sign-in';
import { SessionGate } from '@/features/auth/sections/session-gate';
import { AccountCard } from '@/features/profile/sections/account-card';
import { Appearance } from '@/features/user-settings/sections/appearance';
import { Privacy } from '@/features/user-settings/sections/privacy';
import { Shortcuts } from '@/features/user-settings/sections/shortcuts';
import { mount } from '@/providers/mount';

/**
 * The options page, in a tab of its own. Also what a first install opens
 * (`background/index.ts`): the place to sign in, and to read what the
 * extension can and cannot see before it is ever used.
 */
function Options() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center gap-3">
        <BrandMark size={28} />
        <div>
          <h1 className="text-2xl font-medium text-ink-900">{t('extension.options.title')}</h1>
          <p className="text-sm text-ink-600">{t('extension.options.description')}</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('extension.options.accountTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionGate signedOut={<SignInScreen />}>
            <AccountCard />
          </SessionGate>
        </CardContent>
      </Card>

      <Appearance />
      <Shortcuts />
      <Privacy />
    </main>
  );
}

mount(<Options />);
