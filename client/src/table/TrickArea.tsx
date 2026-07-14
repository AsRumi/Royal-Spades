import type { LastTrick } from '@shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CardFace } from '../components/CardFace';
import { seatName } from '../names';
import { seatPoint, trickPoint } from '../seatLayout';
import { useApp } from '../store';

const SWEEP_HOLD_MS = 700; // completed trick rests face-up
const SWEEP_TOTAL_MS = 1700; // then sweeps to the winner and fades

// The live trick in the middle of the felt. Cards slide in from their seat,
// angled toward the player who threw them; a completed trick pauses, then the
// winner sweeps it home.
export function TrickArea() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  const [sweep, setSweep] = useState<LastTrick | null>(null);
  const seenTrick = useRef<string>('');

  const lastTrick = pub?.lastTrick ?? null;
  useEffect(() => {
    if (!lastTrick) return;
    const key = `${lastTrick.winnerSeat}:${lastTrick.plays.map((p) => p.cardId).join(',')}`;
    if (key === seenTrick.current) return;
    seenTrick.current = key;
    setSweep(lastTrick);
    const timer = setTimeout(() => setSweep(null), SWEEP_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [lastTrick]);

  if (!pub) return null;
  const seatCount = pub.handCounts.length;
  const showSweep = sweep !== null && pub.currentTrick.length === 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <AnimatePresence>
        {showSweep &&
          sweep.plays.map((play) => {
            const from = trickPoint(play.seat, seatCount);
            const to = seatPoint(sweep.winnerSeat, seatCount);
            return (
              <motion.div
                key={`sweep-${play.seat}-${play.cardId}`}
                className="absolute w-[11.5vmin]"
                initial={{
                  left: `${from.x}%`,
                  top: `${from.y}%`,
                  x: '-50%',
                  y: '-50%',
                  rotate: from.angle,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  left: `${to.x}%`,
                  top: `${to.y}%`,
                  scale: 0.35,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  delay: SWEEP_HOLD_MS / 1000,
                  duration: (SWEEP_TOTAL_MS - SWEEP_HOLD_MS - 200) / 1000,
                  ease: 'easeIn',
                }}
              >
                <CardFace cardId={play.cardId} />
              </motion.div>
            );
          })}
      </AnimatePresence>

      {showSweep && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="absolute left-1/2 top-[58%] -translate-x-1/2"
        >
          <div className="cartouche px-[2.6vmin] py-[0.9vmin] font-display text-[2vmin] text-gold-soft">
            {seatName(room?.seats, sweep.winnerSeat)} takes the trick
          </div>
        </motion.div>
      )}

      {pub.currentTrick.map((play) => {
        const from = seatPoint(play.seat, seatCount);
        const to = trickPoint(play.seat, seatCount);
        return (
          <motion.div
            key={`play-${pub.handNumber}-${play.seat}-${play.cardId}`}
            className="absolute w-[11.5vmin] drop-shadow-xl"
            initial={{ left: `${from.x}%`, top: `${from.y}%`, x: '-50%', y: '-50%', scale: 0.5, opacity: 0.4, rotate: from.angle }}
            animate={{ left: `${to.x}%`, top: `${to.y}%`, scale: 1, opacity: 1, rotate: to.angle }}
            transition={{ type: 'spring', stiffness: 210, damping: 22 }}
          >
            <CardFace cardId={play.cardId} />
          </motion.div>
        );
      })}
    </div>
  );
}
