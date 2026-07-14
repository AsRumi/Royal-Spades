import { motion } from 'framer-motion';
import { useState } from 'react';
import { CardFace } from '../components/CardFace';
import { seatName } from '../names';
import { getSocket } from '../socket';
import { useApp } from '../store';

// Bidding: a clean stepper for [min..max] and a confirm, enabled only on your
// turn. Your dealt hand is visible below so you can actually count tricks.
export function BidPad() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  const mySeat = useApp((s) => s.mySeat);
  const hand = useApp((s) => s.hand);
  const [bid, setBid] = useState<number | null>(null);
  if (!pub || mySeat === null) return null;

  const { min, max } = pub.bidding;
  const value = bid ?? Math.min(Math.max(3, min), max);
  const isMyTurn = pub.turnSeat === mySeat;
  const alreadyBid = pub.bids[mySeat] !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        {alreadyBid ? (
          <div className="cartouche px-8 py-6 text-center">
            <div className="font-ui text-xs uppercase tracking-[0.3em] text-ivory/60">your bid</div>
            <div className="gold-text font-display text-6xl font-bold">{pub.bids[mySeat]}</div>
            <div className="mt-2 font-ui text-sm text-ivory/70">
              waiting for {seatName(room?.seats, pub.turnSeat)}…
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`cartouche w-full max-w-xs px-6 py-5 text-center ${isMyTurn ? '' : 'opacity-70'}`}
          >
            <div className="font-ui text-xs uppercase tracking-[0.3em] text-ivory/60">
              {isMyTurn ? 'How many tricks?' : `${seatName(room?.seats, pub.turnSeat)} is bidding…`}
            </div>
            <div className="mt-3 flex items-center justify-center gap-5">
              <button
                onClick={() => setBid(Math.max(min, value - 1))}
                disabled={!isMyTurn || value <= min}
                className="btn-quiet h-14 w-14 rounded-full font-display text-3xl disabled:opacity-30"
              >
                −
              </button>
              <motion.div
                key={value}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="gold-text w-20 font-display text-7xl font-bold"
              >
                {value}
              </motion.div>
              <button
                onClick={() => setBid(Math.min(max, value + 1))}
                disabled={!isMyTurn || value >= max}
                className="btn-quiet h-14 w-14 rounded-full font-display text-3xl disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              onClick={() => getSocket().emit('bid:submit', { bid: value })}
              disabled={!isMyTurn}
              className="btn-gold mt-4 w-full py-3 text-lg font-semibold"
            >
              Bid {value}
            </button>
          </motion.div>
        )}

        {/* Everyone's bids as they land */}
        <div className="flex flex-wrap justify-center gap-2">
          {pub.bids.map((b, seat) =>
            b === null ? null : (
              <motion.span
                key={seat}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                className="rounded-full border border-gold/50 bg-black/40 px-3 py-1 font-ui text-xs text-ivory/85"
              >
                {seat === mySeat ? 'you' : seatName(room?.seats, seat)}: <b className="text-gold-soft">{b}</b>
              </motion.span>
            ),
          )}
        </div>
      </div>

      {/* Hand preview (not tappable during bidding) */}
      <div className="px-2 pb-3">
        <div className="flex justify-center">
          {hand.map((cardId, i) => (
            <div
              key={cardId}
              className="w-[9.5%] max-w-14"
              style={{ marginLeft: i === 0 ? 0 : '-4.5%' }}
            >
              <CardFace cardId={cardId} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
