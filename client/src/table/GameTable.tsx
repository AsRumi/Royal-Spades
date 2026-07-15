import { useApp } from '../store';
import { seatName } from '../names';
import { GameOverOverlay } from './GameOverOverlay';
import { HandSummary } from './HandSummary';
import { Scoreboard } from './Scoreboard';
import { SeatPod } from './SeatPod';
import { TrickArea } from './TrickArea';

// The in-game TV board: an oval of seats (partners across), the live trick in
// the center, and the scoreboard cartouche. Public state only — opponents are
// always card backs here.
export function GameTable() {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  if (!pub) return null;

  const seatCount = pub.handCounts.length;
  const turnInfo = room?.seats?.[pub.turnSeat];
  const waitingOnDisconnected =
    (pub.phase === 'BIDDING' || pub.phase === 'PLAYING') && turnInfo && !turnInfo.connected;

  const tricksPlayed = pub.tricksWon.reduce((a, b) => a + b, 0);
  const statusText = (() => {
    switch (pub.phase) {
      case 'BIDDING':
        return `Bidding — ${seatName(room?.seats, pub.turnSeat)} to bid`;
      case 'PLAYING':
        return `Trick ${Math.min(tricksPlayed + 1, pub.handSize)} of ${pub.handSize} — ${seatName(room?.seats, pub.turnSeat)} to play`;
      case 'HAND_SCORING':
        return `Hand ${pub.handNumber} complete`;
      case 'GAME_OVER':
        return 'Game over';
      default:
        return '';
    }
  })();

  return (
    <div className="relative h-full w-full">
      {/* Gold table rail — a custom table photo brings its own table edge */}
      {!room?.tableImage && (
        <div
          className="absolute left-1/2 top-[46%] h-[56%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-gold/50"
          style={{
            boxShadow:
              'inset 0 0 60px rgba(0,0,0,0.45), inset 0 0 0 6px rgba(0,0,0,0.25), 0 0 40px rgba(0,0,0,0.35)',
          }}
        />
      )}

      {/* Status band — top right, clear of the top seat and the scoreboard */}
      <div className="absolute right-[2.4vmin] top-[2.4vmin] z-20 text-right">
        <div className="cartouche px-[3.4vmin] py-[1.1vmin]">
          <span className="font-display text-[2.4vmin] tracking-[0.08em] text-ivory">
            {waitingOnDisconnected
              ? `Waiting for ${seatName(room?.seats, pub.turnSeat)} to reconnect…`
              : statusText}
          </span>
          {pub.phase === 'PLAYING' && pub.spadesBroken && (
            <span className="ml-[1.4vmin] font-ui text-[1.6vmin] uppercase tracking-[0.2em] text-gold-soft">
              ♠ broken
            </span>
          )}
        </div>
      </div>

      <Scoreboard />

      {Array.from({ length: seatCount }, (_, seat) => (
        <SeatPod key={seat} seat={seat} />
      ))}

      <TrickArea />

      {pub.phase === 'HAND_SCORING' && <HandSummary />}
      {pub.phase === 'GAME_OVER' && <GameOverOverlay />}
    </div>
  );
}
