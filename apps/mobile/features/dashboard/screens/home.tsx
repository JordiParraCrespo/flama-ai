import { useProfile } from '@flama/frontend-core/react';
import { LanguageSwitcher, SignOutButton } from '@flama/frontend-mobile';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { AccountHero } from '../components/account-hero';
import { AccountCard } from '../sections/account-card';

export function HomeScreen() {
  const { t } = useTranslation();
  // Read once here because two siblings render it: the hero's greeting and the
  // account card below it.
  const profile = useProfile();

  return (
    <ScrollView contentContainerClassName="p-6 gap-6">
      <AccountHero user={profile.data} isLoading={profile.isLoading} />
      <AccountCard
        user={profile.data}
        isLoading={profile.isLoading}
        isFetching={profile.isFetching}
        onRetry={() => void profile.refetch()}
      />
      <LanguageSwitcher />
      <SignOutButton
        variant="destructive"
        loginHref="/(auth)/login"
        label={t('home.signOut')}
        pendingLabel={t('home.signingOut')}
      />
    </ScrollView>
  );
}
