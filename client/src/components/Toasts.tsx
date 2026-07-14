import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            onClick={() => dismiss(toast.id)}
            className="cartouche pointer-events-auto max-w-md px-5 py-3 font-ui text-sm text-ivory"
          >
            <span className="mr-2 text-gold-soft">✦</span>
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
