import { Alert, AlertDescription, Card, Skeleton } from '@flama/design-system-web';
import {
  Lock,
  type LucideIcon,
  Monitor,
  SlidersHorizontal,
  UserRound,
} from '@flama/design-system-web/icons';
import { useMyProfile, useUploadAvatar } from '@flama/frontend-consumer/react';
import { PageHead, SectionNav, useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { ProfileHero } from '@/features/profile/components/profile-hero';
import type { ProfilePane } from '@/features/profile/lib/panes';
import { DetailsSection } from '@/features/profile/sections/details';
import { PasswordSection } from '@/features/profile/sections/password';
import { PreferencesSection } from '@/features/profile/sections/preferences';
import { SessionsSection } from '@/features/profile/sections/sessions';

const SECTIONS = [
  { key: 'details', icon: UserRound },
  { key: 'password', icon: Lock },
  { key: 'sessions', icon: Monitor },
  { key: 'preferences', icon: SlidersHorizontal },
] as const satisfies readonly { key: ProfilePane; icon: LucideIcon }[];

/**
 * The signed-in user's own account: one hero card, then a sub-navigation into
 * four panes. The open pane is the route's, kept in the URL.
 *
 * The hero and the details pane both need the profile, so it is fetched once
 * here and handed down — the panes below it own their own data (sessions,
 * preferences), which is what lets a slow session list keep the rest of the
 * page interactive.
 */
export function ProfileScreen({
  section,
  onSectionChange,
}: {
  section: ProfilePane;
  onSectionChange: (next: ProfilePane) => void;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const profile = useMyProfile();
  const upload = useUploadAvatar();

  return (
    <>
      <PageHead title={t('pages.profile.title')} sub={t('pages.profile.description')} />

      {profile.isPending && (
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-4.5 px-5.5 py-5">
            <Skeleton className="size-16 flex-none rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        </Card>
      )}

      {profile.error && (
        <Alert variant="destructive">
          <AlertDescription>{resolveError(profile.error).message}</AlertDescription>
        </Alert>
      )}

      {profile.data && (
        <>
          <ProfileHero
            profile={profile.data}
            uploading={upload.isPending}
            uploadError={upload.error ? resolveError(upload.error).message : undefined}
            onPickPhoto={(file) => upload.mutate(file)}
          />

          <SectionNav
            className="mt-6"
            label={t('pages.profile.title')}
            items={SECTIONS.map(({ key, icon }) => ({
              key,
              icon,
              label: t(`profile.sections.${key}`),
            }))}
            active={section}
            onSelect={onSectionChange}
          >
            {section === 'details' && <DetailsSection profile={profile.data} />}
            {section === 'password' && <PasswordSection profile={profile.data} />}
            {section === 'sessions' && <SessionsSection />}
            {section === 'preferences' && <PreferencesSection />}
          </SectionNav>
        </>
      )}
    </>
  );
}
