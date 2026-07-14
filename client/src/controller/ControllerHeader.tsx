import { teamOfSeat } from '@shared';
import { seatName } from '../names';
import { useApp } from '../store';
import { TrickStrip } from './TrickStrip';

// Compact phone header: whose turn, your stats, and a mirror of the trick so
// nobody has to crane at the TV to know what's been played.
export function ControllerHeader() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  const mySeat = useApp((s) => s.mySeat);
  const myName = useApp((s) => s.myName);
  if (!pub || mySeat === null) return null;

  const myTeam = teamOfSeat(pub.teams, mySeat);
  const myBid = pub.bids[mySeat];
  const isMyTurn = (pub.phase === 'BIDDING' || pub.phase === 'PLAYING') && pub.turnSeat === mySeat;

  return (
    <header className="border-b border-gold/30 bg-black/30 px-4 pb-2 pt-3">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-lg text-ivory">
          {myName}
          <span className="ml-2 font-ui text-xs uppercase tracking-widest text-ivory/50">
            seat {mySeat + 1}
          </span>
        </div>
        <div className="font-ui text-xs uppercase tracking-[0.25em] text-gold-soft/80">
          {room?.roomCode}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <div
          className={`rounded-full border px-3 py-1 font-display text-sm ${
            isMyTurn
              ? 'seat-active border-gold bg-black/60 text-gold-soft'
              : 'border-gold/30 bg-black/30 text-ivory/80'
          }`}
        >
          {isMyTurn
            ? pub.phase === 'BIDDING'
              ? 'Your bid'
              : 'Your turn'
            : `${seatName(room?.seats, pub.turnSeat)}'s turn`}
        </div>
        <div className="font-ui text-xs text-ivory/75">
          {myBid !== null && <>bid <span className="text-gold-soft">{myBid}</span> · </>}
          you won <span className="text-gold-soft">{pub.tricksWonBySeat[mySeat] ?? 0}</span> · team{' '}
          <span className="text-gold-soft">{pub.tricksWon[myTeam]}</span>
        </div>
      </div>

      <TrickStrip />
    </header>
  );
}
