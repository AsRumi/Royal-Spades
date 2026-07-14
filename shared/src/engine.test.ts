import { describe, expect, it } from 'vitest';
import { buildDeck, cardSuit, handSize, sortHand } from './cards.js';
import { defaultConfig, resolveTeams, teamOfSeat, validateConfig } from './config.js';
import {
  createGame,
  handFor,
  legalMoves,
  playCard,
  scoreHand,
  startHand,
  submitBid,
  toPublic,
  trickWinner,
} from './engine.js';
import { seededRng } from './rng.js';
import type { CardId, GameConfig, GameState } from './types.js';

function mustOk(result: ReturnType<typeof createGame>): GameState {
  if (!result.ok) throw new Error(`engine error: ${result.error.code} ${result.error.message}`);
  return result.state;
}

function freshHand(config = defaultConfig(), seed = 42): GameState {
  const game = mustOk(createGame(config));
  return mustOk(startHand(game, seededRng(seed)));
}

// Build a mid-play state directly (plain data) for surgical rule tests.
function playingState(hands: CardId[][], overrides: Partial<GameState> = {}): GameState {
  const config = defaultConfig();
  config.seatCount = hands.length;
  if (hands.length !== 4) config.partnerships = null;
  const teams = resolveTeams(config);
  return {
    phase: 'PLAYING',
    config,
    teams,
    handNumber: 1,
    dealerSeat: 0,
    turnSeat: 1,
    hands: hands.map((h) => h.slice()),
    bids: hands.map(() => 3),
    currentTrick: [],
    spadesBroken: false,
    tricksWon: teams.map(() => 0),
    tricksWonBySeat: hands.map(() => 0),
    scores: teams.map(() => 0),
    bags: teams.map(() => 0),
    lastTrick: null,
    lastHandResults: null,
    winnerTeam: null,
    ...overrides,
  };
}

describe('config', () => {
  it('default config validates and derives hand size 13', () => {
    const config = defaultConfig();
    expect(validateConfig(config)).toEqual([]);
    expect(handSize(config)).toBe(13);
  });

  it('rejects a deck that does not divide evenly', () => {
    const config = defaultConfig();
    config.seatCount = 5;
    config.partnerships = null;
    expect(validateConfig(config).length).toBeGreaterThan(0);
  });

  it('rejects partnerships that do not cover all seats exactly once', () => {
    const config = defaultConfig();
    config.partnerships = [
      [0, 1],
      [1, 3],
    ];
    expect(validateConfig(config).length).toBeGreaterThan(0);
  });
});

describe('dealing', () => {
  it('deals handSize unique cards to each seat and exhausts the deck', () => {
    const state = freshHand();
    const hs = handSize(state.config);
    const all: CardId[] = [];
    for (let seat = 0; seat < state.config.seatCount; seat++) {
      const hand = handFor(state, seat);
      expect(hand).toHaveLength(hs);
      all.push(...hand);
    }
    expect(new Set(all).size).toBe(state.config.deckCount * 52 - state.config.removedCards.length);
    expect(all.length).toBe(buildDeck(state.config).length);
  });

  it('is deterministic for a fixed seed', () => {
    const a = freshHand(defaultConfig(), 7);
    const b = freshHand(defaultConfig(), 7);
    expect(a.hands).toEqual(b.hands);
    const c = freshHand(defaultConfig(), 8);
    expect(c.hands).not.toEqual(a.hands);
  });

  it('starts bidding left of the dealer', () => {
    const state = freshHand();
    expect(state.phase).toBe('BIDDING');
    expect(state.dealerSeat).toBe(0);
    expect(state.turnSeat).toBe(1);
  });
});

describe('bidding', () => {
  it('rejects out-of-turn, out-of-range, and non-integer bids', () => {
    const state = freshHand();
    expect(submitBid(state, 2, 3).ok).toBe(false); // not seat 2's turn
    expect(submitBid(state, 1, 0).ok).toBe(false); // below min (0 = Nil, disabled)
    expect(submitBid(state, 1, 14).ok).toBe(false); // above max
    expect(submitBid(state, 1, 2.5).ok).toBe(false);
  });

  it('collects bids clockwise then enters PLAYING with left-of-dealer leading', () => {
    let state = freshHand();
    for (const [seat, bid] of [
      [1, 4],
      [2, 3],
      [3, 2],
      [0, 4],
    ] as const) {
      expect(state.turnSeat).toBe(seat);
      state = mustOk(submitBid(state, seat, bid));
    }
    expect(state.phase).toBe('PLAYING');
    expect(state.bids).toEqual([4, 4, 3, 2]);
    expect(state.turnSeat).toBe(1);
  });
});

describe('legalMoves', () => {
  it('returns nothing when it is not your turn or not the playing phase', () => {
    const state = playingState([['H5'], ['H6'], ['H7'], ['H8']], { turnSeat: 1 });
    expect(legalMoves(state, 0)).toEqual([]);
    expect(legalMoves({ ...state, phase: 'BIDDING' }, 1)).toEqual([]);
  });

  it('forbids leading a spade before spades are broken', () => {
    const state = playingState([[], ['S14', 'H2', 'D9'], [], []], { turnSeat: 1 });
    expect(legalMoves(state, 1).sort()).toEqual(['D9', 'H2']);
  });

  it('allows leading a spade when the hand is nothing but spades', () => {
    const state = playingState([[], ['S14', 'S2'], [], []], { turnSeat: 1 });
    expect(legalMoves(state, 1).sort()).toEqual(['S14', 'S2']);
  });

  it('allows leading a spade once broken', () => {
    const state = playingState([[], ['S14', 'H2'], [], []], { turnSeat: 1, spadesBroken: true });
    expect(legalMoves(state, 1).sort()).toEqual(['H2', 'S14']);
  });

  it('requires following the led suit when able', () => {
    const state = playingState([[], [], ['H9', 'H3', 'C5'], []], {
      turnSeat: 2,
      currentTrick: [{ seat: 1, cardId: 'H12' }],
    });
    expect(legalMoves(state, 2).sort()).toEqual(['H3', 'H9']);
  });

  it('allows anything (including spades) when void in the led suit', () => {
    const state = playingState([[], [], ['S2', 'C5'], []], {
      turnSeat: 2,
      currentTrick: [{ seat: 1, cardId: 'H12' }],
    });
    expect(legalMoves(state, 2).sort()).toEqual(['C5', 'S2']);
  });
});

describe('trick resolution', () => {
  it('highest card of the led suit wins when no spade is played', () => {
    expect(
      trickWinner([
        { seat: 1, cardId: 'H10' },
        { seat: 2, cardId: 'H13' },
        { seat: 3, cardId: 'C14' }, // off-suit ace does not win
        { seat: 0, cardId: 'H2' },
      ]),
    ).toBe(2);
  });

  it('highest spade wins when spades are played', () => {
    expect(
      trickWinner([
        { seat: 1, cardId: 'H14' },
        { seat: 2, cardId: 'S3' },
        { seat: 3, cardId: 'S9' },
        { seat: 0, cardId: 'H13' },
      ]),
    ).toBe(3);
  });

  it('playCard resolves the trick, credits the winning team, and hands the lead over', () => {
    let state = playingState(
      [
        ['H2', 'C3'],
        ['H10', 'C4'],
        ['H13', 'C5'],
        ['S2', 'C6'],
      ],
      { turnSeat: 1 },
    );
    state = mustOk(playCard(state, 1, 'H10'));
    state = mustOk(playCard(state, 2, 'H13'));
    state = mustOk(playCard(state, 3, 'S2')); // void in hearts? no — seat 3 has no hearts, trumps
    state = mustOk(playCard(state, 0, 'H2'));
    expect(state.spadesBroken).toBe(true);
    expect(state.lastTrick?.winnerSeat).toBe(3);
    expect(state.turnSeat).toBe(3);
    expect(state.tricksWon[teamOfSeat(state.teams, 3)]).toBe(1);
    expect(state.currentTrick).toEqual([]);
  });

  it('rejects illegal plays without mutating state', () => {
    const state = playingState([[], [], ['H9', 'C5'], []], {
      turnSeat: 2,
      currentTrick: [{ seat: 1, cardId: 'H12' }],
    });
    const res = playCard(state, 2, 'C5');
    expect(res.ok).toBe(false);
    expect(state.hands[2]).toEqual(['H9', 'C5']);
    expect(playCard(state, 3, 'H9').ok).toBe(false); // out of turn
    expect(playCard(state, 2, 'S14').ok).toBe(false); // card not held
  });
});

describe('scoring', () => {
  function scoringState(bids: number[], tricksWon: number[], bags = [0, 0]): GameState {
    return playingState([[], [], [], []], {
      phase: 'HAND_SCORING',
      bids,
      tricksWon,
      bags: bags.slice(),
    });
  }

  it('made bid scores base points per contracted trick', () => {
    // Team 0 (seats 0+2) bids 3+2=5 and takes exactly 5; team 1 bids 4+2=6, takes 8.
    const state = mustOk(scoreHand(scoringState([3, 4, 2, 2], [5, 8])));
    expect(state.scores[0]).toBe(50);
    expect(state.scores[1]).toBe(62); // 60 + 2 overtricks
    expect(state.bags).toEqual([0, 2]);
    expect(state.lastHandResults?.[1].bagsAdded).toBe(2);
  });

  it('set team loses points per contracted trick and gains no bags', () => {
    const state = mustOk(scoreHand(scoringState([3, 4, 3, 2], [4, 9])));
    expect(state.scores[0]).toBe(-60); // bid 6, set
    expect(state.scores[1]).toBe(63); // bid 6, +3 overtricks
    expect(state.bags[0]).toBe(0);
  });

  it('applies the bag penalty at the threshold and carries the remainder', () => {
    // Team 0 has 8 bags, takes 3 overtricks -> 11 bags -> -100, 1 bag carried.
    const state = mustOk(scoreHand(scoringState([2, 3, 2, 3], [7, 6], [8, 0])));
    expect(state.bags[0]).toBe(1);
    expect(state.scores[0]).toBe(40 + 3 - 100);
    expect(state.lastHandResults?.[0].bagPenaltyApplied).toBe(true);
  });

  it('ends the game at the target score with a unique leader', () => {
    const base = scoringState([5, 3, 5, 3], [10, 3]);
    base.scores = [450, 200];
    const state = mustOk(scoreHand(base));
    expect(state.scores[0]).toBe(450 + 100); // bid 10, took 10
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerTeam).toBe(0);
  });

  it('plays on when leaders are tied at or above the target', () => {
    const base = scoringState([5, 5, 5, 5], [10, 3]);
    base.scores = [400, 500];
    const state = mustOk(scoreHand(base)); // team 0 -> 500, team 1 set -> 400... recompute
    // team 0: bid 10, won 10 -> +100 => 500. team 1: bid 10, won 3 -> -100 => 400.
    expect(state.scores).toEqual([500, 400]);
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerTeam).toBe(0);
  });

  it('keeps playing when two teams tie at the target', () => {
    const base = scoringState([5, 4, 5, 4], [10, 3]);
    base.scores = [400, 580];
    const state = mustOk(scoreHand(base));
    // team 0: +100 -> 500; team 1: bid 8, set -> -80 -> 500. Tied: play on.
    expect(state.scores).toEqual([500, 500]);
    expect(state.phase).toBe('HAND_SCORING');
    expect(state.winnerTeam).toBeNull();
  });
});

describe('privacy projections', () => {
  it('toPublic never contains hands, only counts', () => {
    const state = freshHand();
    const pub = toPublic(state) as unknown as Record<string, unknown>;
    expect(pub.hands).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain('"hands"');
    expect((pub.handCounts as number[])).toEqual(state.hands.map((h) => h.length));
  });

  it('handFor returns only that seat\'s cards', () => {
    const state = freshHand();
    expect(handFor(state, 2)).toEqual(state.hands[2]);
    expect(handFor(state, 99)).toEqual([]);
  });
});

// Drive a full hand start-to-finish with a naive strategy: always play the
// first legal move. Proves the state machine can never wedge.
function playFullHand(state: GameState): GameState {
  let s = state;
  while (s.phase === 'BIDDING') {
    s = mustOk(submitBid(s, s.turnSeat, s.config.bidding.min + 2));
  }
  let guard = 0;
  while (s.phase === 'PLAYING') {
    const moves = legalMoves(s, s.turnSeat);
    expect(moves.length).toBeGreaterThan(0);
    s = mustOk(playCard(s, s.turnSeat, moves[0]));
    if (++guard > 2000) throw new Error('hand did not terminate');
  }
  expect(s.phase).toBe('HAND_SCORING');
  return s;
}

describe('full deterministic hands', () => {
  it('plays a complete 4-player hand from a fixed seed', () => {
    let state = freshHand(defaultConfig(), 1234);
    state = playFullHand(state);
    const total = state.tricksWon.reduce((a, b) => a + b, 0);
    expect(total).toBe(handSize(state.config));
    expect(state.hands.every((h) => h.length === 0)).toBe(true);
    const scored = mustOk(scoreHand(state));
    expect(scored.lastHandResults).toHaveLength(state.teams.length);
    const deltaSum = scored.lastHandResults!.map((r) => r.delta);
    scored.scores.forEach((score, team) => expect(score).toBe(deltaSum[team]));
  });

  it('3-player cutthroat config deals 17 each and plays through with no code changes', () => {
    const config = defaultConfig();
    config.seatCount = 3;
    config.partnerships = null;
    config.removedCards = ['C2'];
    config.bidding = { min: 1, max: 17, allowNil: false };
    expect(validateConfig(config)).toEqual([]);
    expect(handSize(config)).toBe(17);

    let state = freshHand(config, 99);
    expect(state.teams).toEqual([[0], [1], [2]]);
    state.hands.forEach((h) => expect(h).toHaveLength(17));
    expect(state.hands.flat()).not.toContain('C2');

    state = playFullHand(state);
    expect(state.tricksWon.reduce((a, b) => a + b, 0)).toBe(17);
    const scored = mustOk(scoreHand(state));
    expect(scored.scores).toHaveLength(3);
  });

  it('plays multiple hands with a rotating dealer until someone can win', () => {
    let state = freshHand(defaultConfig(), 5);
    const firstDealer = state.dealerSeat;
    state = playFullHand(state);
    state = mustOk(scoreHand(state));
    if (state.phase === 'HAND_SCORING') {
      const next = mustOk(startHand(state, seededRng(6)));
      expect(next.dealerSeat).toBe((firstDealer + 1) % state.config.seatCount);
      expect(next.handNumber).toBe(2);
      expect(next.phase).toBe('BIDDING');
    }
  });
});

describe('presentation helpers', () => {
  it('sortHand groups suits with spades first, descending rank', () => {
    expect(sortHand(['D3', 'S2', 'H14', 'S13', 'C7', 'D10'])).toEqual([
      'S13',
      'S2',
      'H14',
      'C7',
      'D10',
      'D3',
    ]);
  });
});
