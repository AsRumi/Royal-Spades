import type { CardId, Suit } from '@shared';
import { cardSuit, legalCards, SUIT_SYMBOLS } from '@shared';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CardFace } from '../components/CardFace';
import { getSocket } from '../socket';
import { useApp } from '../store';

const SUIT_ROWS: Suit[] = ['S', 'H', 'C', 'D'];

// The tap-to-play hand: grouped by suit (spades on top), sorted, with cards
// outside legalCards dimmed as a hint — the server still validates every play.
// First tap raises a card, second tap plays it.
export function HandView() {
  const pub = useApp((s) => s.pub);
  const hand = useApp((s) => s.hand);
  const mySeat = useApp((s) => s.mySeat);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [pending, setPending] = useState(false);

  const handKey = hand.join(',');
  useEffect(() => {
    // Server accepted the play (hand changed) — or a new hand arrived.
    setSelected(null);
    setPending(false);
  }, [handKey]);

  const isMyTurn = pub !== null && pub.phase === 'PLAYING' && pub.turnSeat === mySeat;

  const legal = useMemo(() => {
    if (!pub || !isMyTurn) return new Set<CardId>();
    return new Set(legalCards(hand, pub.currentTrick, pub.spadesBroken, pub.spadesBrokenToLead));
  }, [pub, hand, isMyTurn]);

  useEffect(() => {
    if (!isMyTurn) setSelected(null);
  }, [isMyTurn]);

  if (!pub || mySeat === null) return null;

  const ledSuit = pub.currentTrick.length > 0 ? cardSuit(pub.currentTrick[0].cardId) : null;
  const mustFollow =
    isMyTurn && ledSuit !== null && hand.some((c) => cardSuit(c) === ledSuit);
  const leadLocked =
    isMyTurn &&
    ledSuit === null &&
    pub.spadesBrokenToLead &&
    !pub.spadesBroken &&
    hand.some((c) => cardSuit(c) !== 'S');

  const rows = SUIT_ROWS.map((suit) => hand.filter((c) => cardSuit(c) === suit)).filter(
    (row) => row.length > 0,
  );

  const tap = (cardId: CardId) => {
    if (!isMyTurn || pending || !legal.has(cardId)) return;
    if (selected === cardId) {
      setPending(true);
      getSocket().emit('card:play', { cardId });
    } else {
      setSelected(cardId);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end pb-3">
      <div className="mb-2 text-center font-ui text-xs uppercase tracking-[0.25em] text-ivory/60">
        {!isMyTurn
          ? 'hold tight — not your turn'
          : mustFollow
            ? `must follow ${SUIT_SYMBOLS[ledSuit!]}`
            : leadLocked
              ? '♠ can’t be led until broken'
              : selected
                ? 'tap again to play'
                : 'tap a card'}
      </div>

      <div className="flex flex-col gap-1.5 px-2">
        {rows.map((row) => (
          <div key={cardSuit(row[0])} className="flex justify-center">
            {row.map((cardId, i) => {
              const playable = isMyTurn && legal.has(cardId);
              const isSelected = selected === cardId;
              return (
                <motion.button
                  key={cardId}
                  onClick={() => tap(cardId)}
                  animate={{ y: isSelected ? -16 : 0, scale: isSelected ? 1.06 : 1 }}
                  whileTap={playable ? { scale: 1.1 } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  className="relative w-[13.5%] max-w-20 shrink-0"
                  style={{ marginLeft: i === 0 ? 0 : '-4.2%', zIndex: isSelected ? 10 : undefined }}
                >
                  <CardFace
                    cardId={cardId}
                    className={
                      isMyTurn && !playable
                        ? 'opacity-40 brightness-[0.65]'
                        : isSelected
                          ? 'shadow-card-lifted ring-2 ring-[var(--gold)]'
                          : ''
                    }
                  />
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
