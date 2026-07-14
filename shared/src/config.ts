import { handSize, isValidCardId } from './cards.js';
import type { GameConfig } from './types.js';

// The v1 product config: 4-player partnership Spades, partners across.
// Nothing in the engine hardcodes these numbers — variants are new configs:
//   3-player cutthroat: { seatCount: 3, partnerships: null, removedCards: ['C2'] }
//   6-player:           { seatCount: 6, deckCount: 2, partnerships: [[0,3],[1,4],[2,5]] }
//     TODO(6p): two-deck identical-spade tie resolution (see trickWinner).
export function defaultConfig(): GameConfig {
  return {
    seatCount: 4,
    deckCount: 1,
    removedCards: [],
    partnerships: [
      [0, 2],
      [1, 3],
    ],
    bidding: {
      min: 1,
      max: 13,
      allowNil: false, // TODO(nil): disabled in v1
    },
    scoring: {
      madeBidBase: 10,
      overtrickBag: 1,
      setPenaltyPerTrick: 10,
      bagPenaltyThreshold: 10,
      bagPenaltyPoints: 100,
    },
    targetScore: 500,
    spadesBrokenToLead: true,
  };
}

// Resolve teams: explicit partnerships, or one solo team per seat (cutthroat).
// This is the ONLY place partnership-vs-solo matters; everything downstream
// just works over "teams".
export function resolveTeams(config: GameConfig): number[][] {
  if (config.partnerships === null) {
    return Array.from({ length: config.seatCount }, (_, seat) => [seat]);
  }
  return config.partnerships.map((team) => team.slice());
}

export function teamOfSeat(teams: number[][], seat: number): number {
  return teams.findIndex((members) => members.includes(seat));
}

export function validateConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(config.seatCount) || config.seatCount < 2) {
    errors.push('seatCount must be an integer >= 2');
  }
  if (!Number.isInteger(config.deckCount) || config.deckCount < 1) {
    errors.push('deckCount must be an integer >= 1');
  }
  for (const id of config.removedCards) {
    if (!isValidCardId(id)) errors.push(`removedCards contains invalid card id "${id}"`);
  }
  const totalCards = config.deckCount * 52 - config.removedCards.length;
  if (totalCards <= 0) {
    errors.push('removedCards leaves no cards to deal');
  } else if (config.seatCount >= 2 && totalCards % config.seatCount !== 0) {
    errors.push(`deck of ${totalCards} cards does not divide evenly among ${config.seatCount} seats`);
  }
  if (config.partnerships !== null) {
    const seen = new Set<number>();
    for (const team of config.partnerships) {
      if (team.length === 0) errors.push('partnerships contains an empty team');
      for (const seat of team) {
        if (!Number.isInteger(seat) || seat < 0 || seat >= config.seatCount) {
          errors.push(`partnership seat ${seat} is out of range`);
        } else if (seen.has(seat)) {
          errors.push(`seat ${seat} appears in more than one partnership`);
        }
        seen.add(seat);
      }
    }
    if (seen.size !== config.seatCount) {
      errors.push('partnerships must cover every seat exactly once (or be null for cutthroat)');
    }
  }
  const hs = totalCards > 0 && totalCards % config.seatCount === 0 ? handSize(config) : 0;
  if (!Number.isInteger(config.bidding.min) || config.bidding.min < 0) {
    errors.push('bidding.min must be an integer >= 0');
  }
  if (config.bidding.min === 0 && !config.bidding.allowNil) {
    errors.push('bidding.min of 0 means Nil, which is disabled (allowNil: false)');
  }
  if (!Number.isInteger(config.bidding.max) || config.bidding.max < config.bidding.min) {
    errors.push('bidding.max must be an integer >= bidding.min');
  }
  if (hs > 0 && config.bidding.max > hs) {
    errors.push(`bidding.max (${config.bidding.max}) exceeds hand size (${hs})`);
  }
  if (config.bidding.allowNil) {
    errors.push('allowNil is not supported in v1'); // TODO(nil)
  }
  if (!Number.isInteger(config.targetScore) || config.targetScore <= 0) {
    errors.push('targetScore must be a positive integer');
  }
  const s = config.scoring;
  if ([s.madeBidBase, s.overtrickBag, s.setPenaltyPerTrick, s.bagPenaltyThreshold, s.bagPenaltyPoints].some((n) => !Number.isFinite(n) || n < 0)) {
    errors.push('scoring values must be non-negative numbers');
  }
  if (s.bagPenaltyThreshold < 1) {
    errors.push('bagPenaltyThreshold must be >= 1');
  }
  return errors;
}
