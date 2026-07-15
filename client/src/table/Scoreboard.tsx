import { teamLabel } from '../names';
import { useApp } from '../store';

// Corner cartouche: per team — names, score, bags, and this hand's contract.
export function Scoreboard() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  if (!pub) return null;

  return (
    <div className="absolute left-[2vmin] top-[2vmin] z-20">
      <div className="cartouche min-w-[22vmin] px-[2.2vmin] py-[1.4vmin]">
        <div className="mb-[0.8vmin] text-center font-ui text-[1.3vmin] uppercase tracking-[0.3em] text-gold-soft/80">
          Score · to {pub.targetScore}
        </div>
        <div className="flex flex-col gap-[1.1vmin]">
          {pub.teams.map((members, team) => {
            const contract = members.reduce((sum, seat) => sum + (pub.bids[seat] ?? 0), 0);
            const allBid = members.every((seat) => pub.bids[seat] !== null);
            return (
              <div key={team}>
                <div className="flex items-baseline justify-between gap-[2.4vmin]">
                  <span className="font-display text-[1.9vmin] text-ivory">
                    {teamLabel(pub.teams, room?.seats, team)}
                  </span>
                  <span className="gold-text font-display text-[2.6vmin] font-bold">
                    {pub.scores[team]}
                  </span>
                </div>
                <div className="flex items-center justify-between font-ui text-[1.4vmin] text-ivory/75">
                  <span>
                    {pub.phase !== 'BIDDING' || allBid
                      ? `${pub.tricksWon[team]} of ${allBid ? contract : '—'} tricks`
                      : 'bidding…'}
                  </span>
                  <span title={`${pub.bags[team]} bags`}>
                    {pub.bags[team] > 0 ? `${'◈'.repeat(Math.min(pub.bags[team], 6))} ${pub.bags[team]}` : ''}
                  </span>
                </div>
                {team < pub.teams.length - 1 && <hr className="gold-rule mt-[1vmin] opacity-60" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
