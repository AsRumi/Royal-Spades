import type { CardId, PublicGameState, RoomStatePayload } from '@shared';
import { create } from 'zustand';
import { loadAceAnimationId, saveAceAnimationId } from './aceAnimations';

export interface Toast {
  id: number;
  message: string;
}

interface AppState {
  connected: boolean;
  room: RoomStatePayload | null;
  pub: PublicGameState | null;
  hand: CardId[];
  mySeat: number | null;
  myName: string | null;
  toasts: Toast[];
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
  // Laptop-local pick of the Ace-of-Spades celebration video (null = off).
  aceAnimationId: string | null;
  setAceAnimation: (id: string | null) => void;
  // Bumped by the host panel's Preview button; the overlay replays on change.
  aceTestNonce: number;
  triggerAceTest: () => void;
}

let toastId = 0;

export const useApp = create<AppState>((set) => ({
  connected: false,
  room: null,
  pub: null,
  hand: [],
  mySeat: null,
  myName: null,
  toasts: [],
  pushToast: (message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message }] }));
    setTimeout(() => {
      useApp.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  aceAnimationId: loadAceAnimationId(),
  setAceAnimation: (id) => {
    saveAceAnimationId(id);
    set({ aceAnimationId: id });
  },
  aceTestNonce: 0,
  triggerAceTest: () => set((s) => ({ aceTestNonce: s.aceTestNonce + 1 })),
}));
