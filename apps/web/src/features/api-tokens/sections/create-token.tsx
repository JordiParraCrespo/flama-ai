import { useState } from 'react';
import { SecretPanel } from '@/features/api-tokens/components/secret-panel';
import { CreateTokenCard } from '@/features/api-tokens/sections/create-token-card';

/**
 * Making a token, and the one look anybody gets at the result.
 *
 * The secret lives here rather than on the screen because these two are the
 * only things that touch it: the card produces it, the panel shows it. Held one
 * level up, dismissing the panel re-rendered the token table underneath, which
 * has nothing to do with it.
 */
export function CreateTokenSection() {
  const [secret, setSecret] = useState<string | null>(null);

  return (
    <>
      {secret && <SecretPanel secret={secret} onDismiss={() => setSecret(null)} />}
      <CreateTokenCard onCreated={setSecret} />
    </>
  );
}
