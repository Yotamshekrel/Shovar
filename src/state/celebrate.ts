import { create } from 'zustand';

export type CelebrationKind = 'confetti' | 'used';

interface CelebrateState {
  /** Bumped every time something worth celebrating happens; the ConfettiHost plays one animation per bump. */
  burst: number;
  kind: CelebrationKind;
  celebrate: (kind?: CelebrationKind) => void;
}

/** UI-only: confetti for a new card or a balance update, a "fully used" burst when a card is spent. */
export const useCelebrate = create<CelebrateState>((set) => ({
  burst: 0,
  kind: 'confetti',
  celebrate: (kind = 'confetti') => set((s) => ({ burst: s.burst + 1, kind })),
}));
