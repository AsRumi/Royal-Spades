import { AnimatePresence, motion } from "framer-motion";
import { CardBackView } from "../components/CardBackView";
import { seatName } from "../names";
import { seatPoint } from "../seatLayout";
import { useApp } from "../store";

interface Props {
  seat: number;
}

// One player around the oval: a fan of card backs resting at the table edge,
// rotated to face the way that player sits (never faces), plus their name
// plate, dealer button, bid chip and tricks won just outside the rail.
export function SeatPod({ seat }: Props) {
  const pub = useApp((s) => s.pub);
  const room = useApp((s) => s.room);
  if (!pub) return null;

  const seatCount = pub.handCounts.length;
  const p = seatPoint(seat, seatCount);
  // Fan anchor sits inside the rail so the cards straddle the table edge.
  const fan = seatPoint(seat, seatCount, 0, 27, 24);
  const info = room?.seats?.[seat];
  const isActive =
    (pub.phase === "BIDDING" || pub.phase === "PLAYING") &&
    pub.turnSeat === seat;
  const isDealer = pub.dealerSeat === seat;
  const bid = pub.bids[seat];
  const cardsLeft = pub.handCounts[seat] ?? 0;
  const fanCards = Math.min(cardsLeft, 13);

  return (
    <>
      {/* Fan of card backs, count = cards remaining, oriented toward the seat */}
      <div
        className="absolute z-10"
        style={{
          left: `${fan.x}%`,
          top: `${fan.y}%`,
          transform: `translate(-50%, -50%) rotate(${fan.angle}deg)`,
        }}
      >
        <div className="relative h-[16vmin] w-[34vmin]">
          <AnimatePresence>
            {Array.from({ length: fanCards }, (_, i) => {
              const spread = fanCards > 1 ? i / (fanCards - 1) - 0.5 : 0;
              return (
                <motion.div
                  key={`${pub.handNumber}-${i}`}
                  initial={{ opacity: 0, y: "2vmin", rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: spread * 44 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ delay: i * 0.035, duration: 0.3 }}
                  className="absolute bottom-0 left-1/2 w-[9vmin] origin-bottom"
                  style={{ marginLeft: `${spread * 20 - 4.5}vmin` }}
                >
                  <CardBackView />
                </motion.div>
              );
            })}
          </AnimatePresence>
          {cardsLeft > 13 && (
            <div className="absolute -right-[1vmin] bottom-0 rounded-full border border-gold bg-night px-[0.8vmin] font-ui text-[1.4vmin] text-gold-soft">
              ×{cardsLeft}
            </div>
          )}
        </div>
      </div>

      {/* Name plate + bid/tricks, outside the rail */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${p.x}%`, top: `${p.y}%` }}
      >
        <div className="flex flex-col items-center gap-[0.9vmin]">
          <div
            className={`cartouche relative flex min-w-[15vmin] items-center justify-center gap-[1vmin] px-[2vmin] py-[0.9vmin] ${
              isActive ? "seat-active" : ""
            } ${info && !info.connected ? "opacity-60 saturate-50" : ""}`}
          >
            <span className="font-display text-[2.1vmin] tracking-wide text-ivory">
              {seatName(room?.seats, seat)}
            </span>
            {isDealer && (
              <span
                className="flex h-[2.6vmin] w-[2.6vmin] items-center justify-center rounded-full font-display text-[1.5vmin] font-bold text-night"
                style={{
                  background: "linear-gradient(180deg, #f4e3a7, var(--gold))",
                }}
                title="Dealer"
              >
                D
              </span>
            )}
            {info && !info.connected && (
              <span className="font-ui text-[1.3vmin] uppercase tracking-widest text-accent">
                offline
              </span>
            )}
          </div>

          {/* Bid + tricks row */}
          <div className="flex items-center gap-[1vmin] font-ui text-[1.6vmin]">
            <AnimatePresence mode="popLayout">
              {bid !== null && (
                <motion.span
                  key={`bid-${pub.handNumber}-${bid}`}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="rounded-full border border-gold bg-night/80 px-[1.4vmin] py-[0.3vmin] text-gold-soft"
                >
                  bid {bid}
                </motion.span>
              )}
            </AnimatePresence>
            {pub.phase !== "BIDDING" && (
              <span className="rounded-full border border-gold/40 bg-night/60 px-[1.4vmin] py-[0.3vmin] text-ivory/90">
                won {pub.tricksWonBySeat[seat] ?? 0}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
