# 02 — Game Engine (the core; read carefully)

This is the densest file. The engine lives in `shared/` as **pure functions over plain
data**. No I/O, no sockets, no randomness except through an injected seed/RNG so it is
testable. Everything below is driven by a `GameConfig` — **never hardcode the number 4.**

## The player-count-agnostic mandate

The single most important design constraint: seat count, partnerships, deck size, and
hand size all come from config. The v1 product is 4-player partnership, but the code must
be written so that a 3-player or 6-player variant is a new config object plus, at most,
small documented hooks — not a rewrite.

Concretely, banned in the engine:
- Literal `4` for player count. Use `config.seatCount`.
- Literal `13` for hand size. Derive it.
- Assuming exactly two partnerships of two. Read `config.partnerships`.
- `if (seat === 0 || seat === 2)` style partner logic. Look partners up from config.

## GameConfig

```ts
type Suit = 'S' | 'H' | 'D' | 'C';        // Spades is always trump
type Rank = 2|3|4|5|6|7|8|9|10|11|12|13|14; // 14 = Ace (high), 11=J,12=Q,13=K
type CardId = string;                       // e.g. "S14" = Ace of Spades

interface GameConfig {
  seatCount: number;                 // v1: 4
  deckCount: number;                 // v1: 1  (6-player later: 2)
  removedCards: CardId[];            // v1: []  (3-player cutthroat later: ["C2"])
  // Partnerships: array of teams, each team an array of seat indices.
  // null means cutthroat / every player for themselves.
  partnerships: number[][] | null;   // v1: [[0,2],[1,3]]
  // handSize is DERIVED, do not store a literal:
  //   handSize = (deckCount*52 - removedCards.length) / seatCount   (must divide evenly)
  bidding: {
    min: number;                     // v1: 1  (0 would mean Nil; Nil is disabled in v1)
    max: number;                     // v1: 13 (== handSize)
    allowNil: false;                 // v1: false. See "Swap points" below.
  };
  scoring: ScoringConfig;
  targetScore: number;               // v1: 500
  spadesBrokenToLead: boolean;       // v1: true (can't lead spades until broken)
}
```

Provide a factory `defaultConfig(): GameConfig` returning the v1 four-player config, and
validate any config on game start (deck divides evenly into hands, partnerships cover all
seats exactly once or are null, min/max sane).

## Deck, ranking, dealing

- Build `deckCount` standard 52-card decks, minus `removedCards`.
- Rank order high→low: A(14) K(13) Q(12) J(11) 10 … 2. Spades beat all non-spades.
- Shuffle with an **injected RNG** (seedable) so tests are deterministic.
- Deal `handSize` cards to each seat, clockwise. Dealer seat rotates clockwise each hand;
  first hand's dealer is seat 0 (or random — pick one and be consistent).

## Phases (state machine)

`LOBBY → BIDDING → PLAYING → HAND_SCORING → (BIDDING | GAME_OVER)`

- **BIDDING**: starting with the seat to the dealer's left, going clockwise, each seat
  submits an integer bid in `[bidding.min, bidding.max]`. Store per-seat bids. When all
  seats have bid, compute each team's contract as the **sum of its members' bids** and
  move to PLAYING.
- **PLAYING**: play `handSize` tricks (see below). The seat to the dealer's left leads
  the first trick.
- **HAND_SCORING**: apply scoring, accumulate bags, check for game over.

## Trick resolution rules (Spades)

For each trick:
1. The leader plays any card, **except** they may not *lead* a spade until spades are
   "broken" (`spadesBrokenToLead === true`), unless spades are the only suit in their
   hand. Spades become broken the first time any spade is played to a trick.
2. Going clockwise, each other seat must **follow the led suit if they hold it**. If they
   have no card of the led suit, they may play anything (including a spade — this is how
   spades get broken and how trumping happens).
3. Trick winner: if any spades were played, the **highest spade** wins. Otherwise the
   **highest card of the led suit** wins. The winner leads the next trick.

The engine must expose a pure `legalMoves(state, seat): CardId[]` used both to validate
plays server-side and to feed the client's dimming hints. Server validation and client
hint use the **same function** so they never disagree.

## Scoring

```ts
interface ScoringConfig {
  madeBidBase: number;      // v1: 10  (points per contracted trick when made)
  overtrickBag: number;     // v1: 1   (points per overtrick, and +1 bag)
  setPenaltyPerTrick: number; // v1: 10 (subtracted per contracted trick when set)
  bagPenaltyThreshold: number; // v1: 10 bags
  bagPenaltyPoints: number;    // v1: 100 (subtracted when threshold reached)
}
```

Per team, per hand:
- Let `bid` = team contract (sum of members' bids), `won` = total tricks the team took.
- **Made** (`won >= bid`): `score += madeBidBase * bid`. Overtricks = `won - bid`; add
  `overtrickBag * overtricks` points **and** `overtricks` bags to the team's bag counter.
- **Set** (`won < bid`): `score -= setPenaltyPerTrick * bid`. No bags.
- **Bag penalty**: whenever a team's accumulated bags reach `bagPenaltyThreshold`,
  subtract `bagPenaltyPoints` and reduce the bag counter by the threshold (carry the
  remainder, e.g. 11 bags → −100 and 1 bag remaining).

Game over: after HAND_SCORING, if any team is at or above `targetScore`, go to GAME_OVER.
The team with the highest score wins. If tied at/over target, play another hand (simplest
tie-break; keep it configurable but default to "play on").

For cutthroat/no-partnership configs (`partnerships === null`), treat each seat as its own
team of one. All scoring math above already works if "team" = the group of seats; make the
grouping the only place partnership-vs-solo matters.

## GameState shape (authoritative, on server)

Keep it a plain serializable object. Suggested fields: `phase`, `config`, `dealerSeat`,
`turnSeat`, `hands` (seat → CardId[], **private**), `bids` (seat → number|null),
`currentTrick` (array of {seat, cardId}), `spadesBroken`, `tricksWonThisHand` (team → n),
`scores` (team → n), `bags` (team → n), `handNumber`, `lastTrick` (for the brief “who won”
display), `winnerTeam` (when over).

The engine exposes pure transitions: `startHand`, `submitBid`, `playCard`, `resolveTrick`,
`scoreHand`, each returning a new state (or an error for illegal input). The server calls
these; the server does not re-implement any rule.

## Swap points (for later variants — build the seams now, don't build the features)

- **Nil**: `bidding.allowNil` + a `nilResult` scoring hook. Leave the hook interface
  present and clearly marked `// TODO(nil): disabled in v1`, but do not implement scoring
  or UI for it.
- **3-player cutthroat**: `seatCount:3, partnerships:null, removedCards:["C2"]` → handSize
  17. Should already work if the mandate above is honored.
- **6-player**: `seatCount:6, deckCount:2, partnerships:[[0,3],[1,4],[2,5]]`. Two-deck tie
  resolution (identical high spades) is the only genuinely new rule; leave a clearly
  marked TODO for it and don't solve it in v1.

## Anti-patterns (do not do these)

- ❌ Hardcoding `4`, `13`, or two-team assumptions anywhere in the engine.
- ❌ Putting any rule logic in the server or client that the engine should own. If the
  server needs to know whether a move is legal, it calls `legalMoves`.
- ❌ Non-deterministic shuffling (using `Math.random` directly). Inject the RNG.
- ❌ Mutating state in place in a way that makes transitions untestable. Prefer
  returning new state.
- ❌ Implementing Nil "just a little." It is out of scope; only the seam exists.

## Tests (write these; do not skip)

Pure unit tests in `shared/` covering: deal produces `handSize` unique cards per seat and
exhausts the deck; `legalMoves` enforces follow-suit and the spades-lead restriction;
trick winner picks highest spade then highest led-suit; a made bid, an overtrick+bag, a
set, and a 10-bag penalty each score correctly; a full deterministic 4-player hand plays
to completion from a fixed seed. **Do not proceed to server/client work until these pass.**
