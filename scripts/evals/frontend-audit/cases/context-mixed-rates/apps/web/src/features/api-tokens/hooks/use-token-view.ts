import { createContext, useContext } from 'react';

export type TokenDensity = 'comfortable' | 'compact';

/** How the token board is being looked at: its density, and the card under the pointer. */
export interface TokenView {
  density: TokenDensity;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}

export const TokenViewContext = createContext<TokenView>({
  density: 'comfortable',
  hoveredId: null,
  setHoveredId: () => {},
});

export function useTokenView(): TokenView {
  return useContext(TokenViewContext);
}
