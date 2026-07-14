import { teamOfSeat } from '@shared';
import { motion } from 'framer-motion';
import { teamLabel } from '../names';
import { useApp } from '../store';

// Between hands and at game over the phone shows a compact result; the TV has
// the ceremonial version.
export function PhoneResults() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  const mySeat = useApp((s) => s.mySeat);
  if (!pub || mySeat === null) return null;

  const myTeam = teamOfSeat(pub.teams, mySeat);

  if (pub.phase === 'GAME_OVER' && pub.winnerTeam !== null) {
    const won = pub.winnerTeam === myTeam;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="gold-text font-decorative text-5xl"
        >
          {won ? '♛' : '♠'}
        </motion.div>
        <h1 className="gold-text font-display text-3xl font-bold">
          {won ? 'Victory!' : 'Well played'}
        </h1>
        <p className="font-ui text-sm text-ivory/80">
          {teamLabel(pub.teams, room?.seats, pub.winnerTeam)} take the game.
        </p>
        <div className="cartouche mt-2 w-full max-w-xs px-5 py-4">
          {pub.teams.map((_, team) => (
            <div key={team} className="flex justify-between py-1 font-ui text-sm">
              <span className={team === myTeam ? 'text-gold-soft' : 'text-ivory/80'}>
                {teamLabel(pub.teams, room?.seats, team)}
              </span>
              <b className="text-gold-soft">{pub.scores[team]}</b>
            </div>
          ))}
        </div>
        <p className="font-ui text-xs uppercase tracking-[0.25em] text-ivory/50">
          the host can start a rematch
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-display text-2xl text-ivory">Hand {pub.handNumber} complete</h1>
      {pub.lastHandResults?.map((r) => (
        <div key={r.team} className="font-ui text-sm text-ivory/80">
          <span className={r.team === myTeam ? 'text-gold-soft' : ''}>
            {teamLabel(pub.teams, room?.seats, r.team)}
          </span>
          : bid {r.bid}, took {r.won} —{' '}
          <b className={r.delta >= 0 ? 'text-gold-soft' : 'text-accent'}>
            {r.delta >= 0 ? `+${r.delta}` : r.delta}
          </b>
        </div>
      ))}
      <p className="mt-2 font-ui text-xs uppercase tracking-[0.25em] text-ivory/50">
        next hand is being dealt…
      </p>
    </div>
  );
}
