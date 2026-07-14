import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/index.js';
import { bestLanIp, lanIpCandidates } from './lanIp.js';
import { wireSockets } from './sockets.js';

const PORT = Number(process.env.PORT ?? 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  // Same-origin in production; the origin check only matters for `npm run dev`
  // where Vite serves the client from another port on the same LAN.
  cors: { origin: true },
  maxHttpBufferSize: 2e6, // room for a custom card-back data URL
});

const lanIp = bestLanIp();
const buildJoinUrl = (roomCode: string) => `http://${lanIp}:${PORT}/join/${roomCode}`;

wireSockets(io, buildJoinUrl);

app.use(express.static(clientDist));
// SPA fallback so /join/:code deep links resolve on phones.
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res
        .status(503)
        .send('Client build not found. Run "npm run build" first (or use "npm run party").');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const candidates = lanIpCandidates();
  console.log('');
  console.log('  ♠ Royal Spades server is running');
  console.log(`    Table view (open on the laptop / TV):  http://${lanIp}:${PORT}/`);
  console.log(`    Phones join at:                        http://${lanIp}:${PORT}/join/<ROOM CODE>`);
  if (candidates.length > 1) {
    console.log('    If phones cannot reach that address, try one of these LAN IPs instead:');
    for (const ip of candidates) console.log(`      http://${ip}:${PORT}/`);
  }
  if (candidates.length === 0) {
    console.log('    WARNING: no LAN IPv4 address found — is Wi-Fi connected?');
  }
  console.log('');
});
