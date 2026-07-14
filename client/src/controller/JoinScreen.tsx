import { motion } from 'framer-motion';
import { useState } from 'react';

interface Props {
  code: string;
  joining: boolean;
  onJoin: (name: string) => void;
}

export function JoinScreen({ code, joining, onJoin }: Props) {
  const [name, setName] = useState('');
  const canJoin = name.trim().length > 0 && !joining;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="cartouche w-full max-w-sm px-7 py-8 text-center"
      >
        <div className="gold-text font-decorative text-2xl tracking-[0.2em]">ROYAL SPADES</div>
        <hr className="gold-rule my-4" />
        <div className="font-ui text-xs uppercase tracking-[0.3em] text-ivory/60">Room</div>
        <div className="gold-text mb-5 font-display text-4xl font-bold tracking-[0.25em] [text-indent:0.25em]">
          {code}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canJoin) onJoin(name.trim());
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={18}
            autoFocus
            enterKeyHint="go"
            className="w-full rounded-lg border border-gold/50 bg-night/80 px-4 py-3 text-center font-display text-xl text-ivory outline-none placeholder:text-ivory/30 focus:border-gold"
          />
          <button
            type="submit"
            disabled={!canJoin}
            className="btn-gold mt-4 w-full py-3 text-lg font-semibold"
          >
            {joining ? 'Taking your seat…' : 'Take a Seat'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
