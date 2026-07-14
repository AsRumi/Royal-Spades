import { useEffect } from 'react';
import { getSocket } from '../socket';
import { useApp } from '../store';
import { GameTable } from './GameTable';
import { HostControls } from './HostControls';
import { Lobby } from './Lobby';

const HOST_KEY = 'royal-spades:host';

interface HostSession {
  roomCode: string;
  hostToken: string;
}

function savedHostSession(): HostSession | null {
  try {
    return JSON.parse(localStorage.getItem(HOST_KEY) ?? 'null');
  } catch {
    return null;
  }
}

// The TV. Creates (or re-attaches to) the room and renders only public state —
// this component never sees a hand.
export function TableView() {
  const pub = useApp((s) => s.pub);

  useEffect(() => {
    const socket = getSocket();
    const attach = () => {
      const saved = savedHostSession();
      socket.emit(
        'room:create',
        { resumeCode: saved?.roomCode, hostToken: saved?.hostToken },
        (res) => {
          if (res.ok && res.roomCode && res.hostToken) {
            localStorage.setItem(
              HOST_KEY,
              JSON.stringify({ roomCode: res.roomCode, hostToken: res.hostToken }),
            );
          } else if (!res.ok) {
            useApp.getState().pushToast(res.error?.message ?? 'Could not create the room.');
          }
        },
      );
    };
    if (socket.connected) attach();
    socket.on('connect', attach);
    return () => {
      socket.off('connect', attach);
    };
  }, []);

  const inGame = pub !== null && pub.phase !== 'LOBBY';

  return (
    <div className="felt-bg vignette relative h-screen w-screen overflow-hidden">
      {inGame ? <GameTable /> : <Lobby />}
      <HostControls />
    </div>
  );
}
