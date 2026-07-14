import { motion } from 'framer-motion';
import { teamLabel } from '../names';
import { getSocket } from '../socket';
import { useApp } from '../store';

export function GameOverOverlay() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  if (!pub || pub.winnerTeam === null) return null;

  const ranked = pub.teams
    .map((_, team) => team)
    .sort((a, b) => pub.scores[b] - pub.scores[a]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.6, duration: 0.6 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55"
    >
      <div className="cartouche flex min-w-[52vmin] flex-col items-center px-[5vmin] py-[4vmin] text-center">
        <motion.div
          initial={{ y: -18, scale: 0.7, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ delay: 2.0, type: 'spring', stiffness: 160, damping: 12 }}
          className="gold-text font-decorative text-[7vmin] leading-none"
        >
          ♛
        </motion.div>
        <div className="mt-[1vmin] font-ui text-[1.7vmin] uppercase tracking-[0.4em] text-gold-soft/90">
          Champions
        </div>
        <div className="gold-text mt-[0.6vmin] font-display text-[4.6vmin] font-bold tracking-[0.06em]">
          {teamLabel(pub.teams, room?.seats, pub.winnerTeam)}
        </div>
        <hr className="gold-rule my-[2.2vmin] w-[34vmin]" />
        <div className="flex w-full flex-col gap-[1.2vmin]">
          {ranked.map((team, i) => (
            <div key={team} className="flex items-baseline justify-between gap-[5vmin]">
              <span className="font-display text-[2.2vmin] text-ivory/90">
                {i + 1}. {teamLabel(pub.teams, room?.seats, team)}
              </span>
              <span className="font-display text-[2.6vmin] font-bold text-gold-soft">
                {pub.scores[team]}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => getSocket().emit('game:restart', {})}
          className="btn-gold mt-[3vmin] px-[4.5vmin] py-[1.3vmin] text-[2.1vmin] font-semibold"
        >
          Play Again
        </button>
      </div>
    </motion.div>
  );
}
