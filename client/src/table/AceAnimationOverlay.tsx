import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ACE_ANIMATIONS, aceAnimationById, loadCustomAnimations } from '../aceAnimations';
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
  const customAnims = useApp((s) => s.customAnimations);
  const testNonce = useApp((s) => s.aceTestNonce);
  const [playing, setPlaying] = useState<{ src: string; key: number } | null>(null);
  const seenThisHand = useRef(false);
  const playCount = useRef(0);
  const lastNonce = useRef(testNonce);

  // Pull host-uploaded animations out of IndexedDB once; if the persisted
  // selection points at an animation that no longer exists, fall back to the
  // default built-in so the effect keeps working.
  useEffect(() => {
    void loadCustomAnimations().then((anims) => {
      const { setCustomAnimations, aceAnimationId, setAceAnimation } = useApp.getState();
      setCustomAnimations(anims);
      if (
        aceAnimationId &&
        !aceAnimationById(aceAnimationId) &&
        !anims.some((a) => a.id === aceAnimationId)
      ) {
        setAceAnimation(ACE_ANIMATIONS[0].id);
      }
    });
  }, []);

  const anim = animId
    ? (aceAnimationById(animId) ?? customAnims.find((a) => a.id === animId) ?? null)
    : null;

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
