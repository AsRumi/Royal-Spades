import type { ClientToServerEvents, ServerToClientEvents } from '@shared';
import { sortHand } from '@shared';
import { io, type Socket } from 'socket.io-client';
import { useApp } from './store';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

// One shared connection per page. Server-pushed state flows straight into the
// store; views only read the store and emit intents.
export function getSocket(): AppSocket {
  if (socket) return socket;
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => useApp.setState({ connected: true }));
  socket.on('disconnect', () => useApp.setState({ connected: false }));
  socket.on('room:state', (room) => useApp.setState({ room }));
  socket.on('game:public', (pub) => useApp.setState({ pub }));
  socket.on('hand:private', ({ cards }) => useApp.setState({ hand: sortHand(cards) }));
  socket.on('error', (err) => useApp.getState().pushToast(err.message));

  return socket;
}
