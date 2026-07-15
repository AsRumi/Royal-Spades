import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { aceAnimationById } from '../aceAnimations';
import { LumaVideo } from '../components/LumaVideo';
import { useApp } from '../store';

const ACE_OF_SPADES = 'S14';

// Full-screen celebration on the TV: when the Ace of Spades lands in the
// trick, the host-selected black-background video plays luma-keyed over the
// felt. Fires once per hand (a single deck holds one ace of spades) and also
// on demand from the host panel's Preview button.
export function AceAnimationOverlay() {
  const pub = useApp((s) => s.pub);
  const animId = useApp((s) => s.aceAnimationId);
  const testNonce = useApp((s) => s.aceTestNonce);
  const [playing, setPlaying] = useState<{ src: string; key: number } | null>(null);
  const seenThisHand = useRef(false);
  const playCount = useRef(0);
  const lastNonce = useRef(testNonce);

  const anim = animId ? aceAnimationById(animId) : null;

  // A new hand always opens with BIDDING (as does a restarted game), so that's
  // the safe point to re-arm the once-per-hand trigger.
  useEffect(() => {
    if (pub?.phase === 'BIDDING') seenThisHand.current = false;
  }, [pub?.phase]);

  const aceOnTable =
    pub !== null &&
    (pub.currentTrick.some((p) => p.cardId === ACE_OF_SPADES) ||
      (pub.lastTrick?.plays.some((p) => p.cardId === ACE_OF_SPADES) ?? false));

  useEffect(() => {
    if (!aceOnTable || seenThisHand.current) return;
    seenThisHand.current = true;
    if (anim) setPlaying({ src: anim.src, key: ++playCount.current });
  }, [aceOnTable, anim]);

  useEffect(() => {
    if (testNonce === lastNonce.current) return;
    lastNonce.current = testNonce;
    if (anim) setPlaying({ src: anim.src, key: ++playCount.current });
  }, [testNonce, anim]);

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          key={playing.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
        >
          <LumaVideo src={playing.src} onEnded={() => setPlaying(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
