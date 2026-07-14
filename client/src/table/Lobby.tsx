import { AnimatePresence, motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { seatPoint } from '../seatLayout';
import { getSocket } from '../socket';
import { useApp } from '../store';

// The TV lobby: big regal room code, QR join, and a ring of seats that fill
// as phones connect. Start unlocks when every seat is taken.
export function Lobby() {
  const room = useApp((s) => s.room);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!room?.joinUrl) return;
    QRCode.toDataURL(room.joinUrl, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#151005', light: '#f7eecb' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [room?.joinUrl]);

  const seats = room?.seats ?? [];
  const filled = seats.filter((s) => s.occupied).length;
  const allSeated = room !== null && filled === room.seatCount;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <motion.h1
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="gold-text pointer-events-none absolute top-[4vh] font-decorative text-[6.5vmin] tracking-[0.22em]"
      >
        ♠ ROYAL SPADES ♠
      </motion.h1>

      {/* Seat ring around the center panel */}
      {seats.map((seat) => {
        const p = seatPoint(seat.seat, seats.length || 4, 0, 38, 36, 50, 50);
        return (
          <div
            key={seat.seat}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <AnimatePresence mode="popLayout">
              {seat.occupied ? (
                <motion.div
                  key="filled"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`cartouche flex min-w-[16vmin] flex-col items-center px-[2.2vmin] py-[1.6vmin] ${
                    seat.connected ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex h-[5vmin] w-[5vmin] items-center justify-center rounded-full border border-gold bg-felt-glow font-display text-[2.6vmin] text-gold-soft shadow-glow">
                    {(seat.name ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="mt-[0.9vmin] font-display text-[2.2vmin] tracking-wide text-ivory">
                    {seat.name}
                  </div>
                  <div className="font-ui text-[1.4vmin] uppercase tracking-[0.2em] text-gold-soft/80">
                    {seat.connected ? `Seat ${seat.seat + 1}` : 'reconnecting…'}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex min-w-[16vmin] flex-col items-center rounded-xl border border-dashed border-gold/40 px-[2.2vmin] py-[2vmin] text-center"
                >
                  <div className="h-[5vmin] w-[5vmin] rounded-full border border-dashed border-gold/40" />
                  <div className="mt-[0.9vmin] font-ui text-[1.5vmin] uppercase tracking-[0.22em] text-ivory/50">
                    Seat {seat.seat + 1}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Center panel: code + QR + start */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="cartouche z-10 flex flex-col items-center px-[4.5vmin] py-[3.2vmin] text-center"
      >
        <div className="font-ui text-[1.6vmin] uppercase tracking-[0.35em] text-gold-soft/90">
          Room Code
        </div>
        <div className="gold-text font-display text-[9vmin] font-bold leading-tight tracking-[0.3em] [text-indent:0.3em]">
          {room?.roomCode ?? '····'}
        </div>
        <hr className="gold-rule my-[1.6vmin] w-[26vmin]" />
        {qr ? (
          <img
            src={qr}
            alt="Scan to join"
            className="w-[24vmin] rounded-lg border-2 border-gold shadow-card"
          />
        ) : (
          <div className="flex h-[24vmin] w-[24vmin] items-center justify-center rounded-lg border-2 border-gold/40 font-ui text-[1.6vmin] text-ivory/60">
            preparing code…
          </div>
        )}
        <div className="mt-[1.4vmin] max-w-[30vmin] font-ui text-[1.5vmin] leading-relaxed text-ivory/80">
          Scan with your phone, or visit{' '}
          <span className="whitespace-nowrap text-gold-soft">{room?.joinUrl ?? '…'}</span>
        </div>
        <button
          onClick={() => getSocket().emit('game:start', {})}
          disabled={!allSeated}
          className="btn-gold mt-[2.2vmin] px-[4vmin] py-[1.3vmin] text-[2.2vmin] font-semibold"
        >
          {allSeated ? 'Begin the Game' : `Awaiting players ${filled}/${room?.seatCount ?? 4}`}
        </button>
      </motion.div>
    </div>
  );
}
