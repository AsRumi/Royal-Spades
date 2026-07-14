import { AnimatePresence, motion } from 'framer-motion';
import { CardFace } from '../components/CardFace';
import { seatName } from '../names';
import { useApp } from '../store';

// A small mirror of the center of the table: one slot per seat, filled as
// cards hit the felt. Shows the just-finished trick briefly with its winner.
export function TrickStrip() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  const mySeat = useApp((s) => s.mySeat);
  if (!pub || pub.phase === 'BIDDING') return null;

  const seatCount = pub.handCounts.length;
  const showLast = pub.currentTrick.length === 0 && pub.lastTrick !== null;
  const plays = new Map(
    (showLast ? pub.lastTrick!.plays : pub.currentTrick).map((p) => [p.seat, p.cardId]),
  );

  return (
    <div className="mt-2 flex items-end justify-center gap-2">
      {Array.from({ length: seatCount }, (_, seat) => {
        const cardId = plays.get(seat);
        const isWinner = showLast && pub.lastTrick!.winnerSeat === seat;
        return (
          <div key={seat} className="flex w-12 flex-col items-center">
            <div
              className={`flex h-[67px] w-12 items-center justify-center rounded-md border ${
                isWinner ? 'border-gold shadow-glow' : 'border-gold/25'
              } bg-black/25`}
            >
              <AnimatePresence mode="popLayout">
                {cardId ? (
                  <motion.div
                    key={cardId}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-11"
                  >
                    <CardFace cardId={cardId} />
                  </motion.div>
                ) : (
                  <motion.span
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.35 }}
                    className="font-display text-xs text-ivory"
                  >
                    ·
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span
              className={`mt-1 max-w-full truncate font-ui text-[10px] ${
                seat === mySeat ? 'text-gold-soft' : 'text-ivory/60'
              }`}
            >
              {seat === mySeat ? 'you' : seatName(room?.seats, seat)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
