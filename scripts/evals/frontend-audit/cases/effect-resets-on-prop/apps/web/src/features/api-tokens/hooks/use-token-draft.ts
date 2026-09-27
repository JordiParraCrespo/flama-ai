import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { useEffect, useState } from 'react';

/**
 * The name being typed for a token, starting from its current one. Opening the
 * panel on another token starts the draft over from that token's name.
 */
export function useTokenDraft(token: ApiTokenEntity) {
  const [draft, setDraft] = useState(token.name);

  useEffect(() => {
    setDraft(token.name);
  }, [token.name]);

  return { draft, setDraft, dirty: draft !== token.name };
}
