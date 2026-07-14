import { motion } from 'framer-motion';
import { teamLabel } from '../names';
import { useApp } from '../store';

// The between-hands moment: each team's contract, take, and score movement.
// Appears after the final trick sweeps; the server deals again shortly after.
export function HandSummary() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  if (!pub?.lastHandResults) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.9, duration: 0.45 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/35"
    >
      <div className="cartouche min-w-[46vmin] px-[4vmin] py-[3vmin] text-center">
        <div className="gold-text font-display text-[3.4vmin] font-bold tracking-[0.12em]">
          Hand {pub.handNumber}
        </div>
        <hr className="gold-rule my-[1.6vmin]" />
        <div className="flex flex-col gap-[1.8vmin]">
          {pub.lastHandResults.map((r) => (
            <div key={r.team} className="flex items-center justify-between gap-[4vmin]">
              <div className="text-left">
                <div className="font-display text-[2.3vmin] text-ivory">
                  {teamLabel(pub.teams, room?.seats, r.team)}
                </div>
                <div className="font-ui text-[1.6vmin] text-ivory/75">
                  bid {r.bid} · took {r.won}
                  {r.bagsAdded > 0 && ` · +${r.bagsAdded} bag${r.bagsAdded > 1 ? 's' : ''}`}
                  {r.bagPenaltyApplied && ' · bag penalty!'}
                </div>
              </div>
              <div
                className={`font-display text-[3vmin] font-bold ${
                  r.delta >= 0 ? 'text-gold-soft' : 'text-accent'
                }`}
              >
                {r.delta >= 0 ? `+${r.delta}` : r.delta}
              </div>
            </div>
          ))}
        </div>
        <hr className="gold-rule my-[1.6vmin]" />
        <div className="font-ui text-[1.5vmin] uppercase tracking-[0.28em] text-ivory/60">
          next hand shortly
        </div>
      </div>
    </motion.div>
  );
}
