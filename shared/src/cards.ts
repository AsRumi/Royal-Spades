import type { CardId, GameConfig, Rank, Suit } from './types.js';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function cardId(suit: Suit, rank: Rank): CardId {
  return `${suit}${rank}`;
}

export function cardSuit(id: CardId): Suit {
  return id[0] as Suit;
}

export function cardRank(id: CardId): Rank {
  return Number(id.slice(1)) as Rank;
}

export function isValidCardId(id: string): boolean {
  if (typeof id !== 'string' || id.length < 2) return false;
  const suit = id[0] as Suit;
  const rank = Number(id.slice(1));
  return SUITS.includes(suit) && RANKS.includes(rank as Rank);
}

// Build the full deck for a config: deckCount copies of 52, minus one copy
// per entry in removedCards.
export function buildDeck(config: GameConfig): CardId[] {
  const deck: CardId[] = [];
  for (let d = 0; d < config.deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(cardId(suit, rank));
      }
    }
  }
  for (const removed of config.removedCards) {
    const idx = deck.indexOf(removed);
    if (idx !== -1) deck.splice(idx, 1);
  }
  return deck;
}

export function handSize(config: GameConfig): number {
  return (config.deckCount * 52 - config.removedCards.length) / config.seatCount;
}

const SUIT_DISPLAY_ORDER: Suit[] = ['S', 'H', 'C', 'D']; // alternating colors, spades first

// Presentation helper (safe for clients to import — no rule logic).
// Groups by suit (spades first), descending rank within each suit.
export function sortHand(cards: readonly CardId[]): CardId[] {
  return cards.slice().sort((a, b) => {
    const sa = SUIT_DISPLAY_ORDER.indexOf(cardSuit(a));
    const sb = SUIT_DISPLAY_ORDER.indexOf(cardSuit(b));
    if (sa !== sb) return sa - sb;
    return cardRank(b) - cardRank(a);
  });
}

export const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export function rankLabel(rank: Rank): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}
