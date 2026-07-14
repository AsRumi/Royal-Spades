import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../socket';
import { useApp } from '../store';
import { BidPad } from './BidPad';
import { ControllerHeader } from './ControllerHeader';
import { HandView } from './HandView';
import { JoinScreen } from './JoinScreen';
import { PhoneResults } from './PhoneResults';

interface SavedPlayer {
  token: string;
  name: string;
}

function storageKey(code: string): string {
  return `royal-spades:player:${code}`;
}

function loadSaved(code: string): SavedPlayer | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey(code)) ?? 'null');
  } catch {
    return null;
  }
}

// The phone. Joins (or invisibly rejoins) its seat, then renders that one
// player's private hand plus a compact mirror of public state.
export function ControllerView() {
  const params = useParams();
  const code = (params.roomCode ?? '').toUpperCase();
  const pub = useApp((s) => s.pub);
  const mySeat = useApp((s) => s.mySeat);
  const connected = useApp((s) => s.connected);
  const [joining, setJoining] = useState(false);

  const join = useCallback(
    (name: string) => {
      const socket = getSocket();
      const saved = loadSaved(code);
      setJoining(true);
      socket.emit(
        'room:join',
        { roomCode: code, name, rejoinToken: saved?.token },
        (res) => {
          setJoining(false);
          if (res.ok && res.seat !== undefined && res.rejoinToken) {
            localStorage.setItem(
              storageKey(code),
              JSON.stringify({ token: res.rejoinToken, name: res.name ?? name }),
            );
            useApp.setState({ mySeat: res.seat, myName: res.name ?? name });
          } else if (!res.ok) {
            if (res.error?.code === 'ROOM_NOT_FOUND') {
              // Stale token from an older party — forget it.
              localStorage.removeItem(storageKey(code));
            }
            useApp.getState().pushToast(res.error?.message ?? 'Could not join.');
          }
        },
      );
    },
    [code],
  );

  // Invisible reconnection: with a stored token we rejoin automatically on
  // load and after every socket reconnect; the hand reappears by itself.
  useEffect(() => {
    const socket = getSocket();
    const autoRejoin = () => {
      const saved = loadSaved(code);
      if (saved?.token) join(saved.name);
    };
    if (socket.connected) autoRejoin();
    socket.on('connect', autoRejoin);
    return () => {
      socket.off('connect', autoRejoin);
    };
  }, [code, join]);

  const joined = mySeat !== null;

  return (
    <div className="felt-bg relative flex h-[100dvh] w-full flex-col overflow-hidden">
      {!connected && joined && (
        <div className="bg-black/70 py-1 text-center font-ui text-xs uppercase tracking-[0.25em] text-gold-soft">
          reconnecting…
        </div>
      )}

      {!joined ? (
        <JoinScreen code={code} joining={joining} onJoin={join} />
      ) : !pub || pub.phase === 'LOBBY' ? (
        <WaitingRoom />
      ) : (
        <>
          <ControllerHeader />
          <div className="flex min-h-0 flex-1 flex-col">
            {pub.phase === 'BIDDING' && <BidPad />}
            {pub.phase === 'PLAYING' && <HandView />}
            {(pub.phase === 'HAND_SCORING' || pub.phase === 'GAME_OVER') && <PhoneResults />}
          </div>
        </>
      )}
    </div>
  );
}

function WaitingRoom() {
  const room = useApp((s) => s.room);
  const mySeat = useApp((s) => s.mySeat);
  const myName = useApp((s) => s.myName);
  const filled = room?.seats.filter((s) => s.occupied).length ?? 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="gold-text font-decorative text-3xl">♠</div>
      <h1 className="font-display text-2xl tracking-wide text-ivory">
        Welcome, <span className="text-gold-soft">{myName}</span>
      </h1>
      <p className="font-ui text-sm text-ivory/75">
        You hold seat {(mySeat ?? 0) + 1}. {filled}/{room?.seatCount ?? 4} seats filled.
      </p>
      <p className="font-ui text-sm uppercase tracking-[0.25em] text-ivory/50">
        waiting for the host to begin
      </p>
    </div>
  );
}
