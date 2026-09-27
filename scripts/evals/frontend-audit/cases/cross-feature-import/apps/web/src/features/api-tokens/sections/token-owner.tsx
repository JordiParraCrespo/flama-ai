import { useMyProfile } from '@flama/frontend-consumer/react';
import { ProfileHero } from '@/features/profile/components/profile-hero';

/** The token screen reuses the profile page's hero to say whose tokens these are. */
export function TokenOwner() {
  const { data: profile } = useMyProfile();
  if (!profile) return null;

  return <ProfileHero profile={profile} uploading={false} onPickPhoto={() => {}} />;
}
