import type { CardBack } from '@shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { deleteCustomBack, exportCustomBacks, importCustomBacks, loadCustomBacks, BUILTIN_BACKS } from '../backs';
import { getSocket } from '../socket';
import { useApp } from '../store';
import { THEMES, themeById } from '../themes';
import { BackMaker } from './BackMaker';

// Small host affordance on the TV (the laptop is the host): theme, card back,
// the back maker, export/import, restart. Gameplay input never happens here.
export function HostControls() {
  const room = useApp((s) => s.room);
  const pub = useApp((s) => s.pub);
  const pushToast = useApp((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [makerOpen, setMakerOpen] = useState(false);
  const [customBacks, setCustomBacks] = useState<CardBack[]>(() => loadCustomBacks());
  const importInput = useRef<HTMLInputElement>(null);

  const socket = getSocket();

  const selectTheme = (themeId: string) => {
    socket.emit('theme:set', { themeId });
    // A theme carries its own default back; apply it too, per 05.
    const theme = themeById(themeId);
    const back = BUILTIN_BACKS.find((b) => b.id === theme.defaultBackId) ?? BUILTIN_BACKS[0];
    socket.emit('back:set', { back: { id: back.id, name: back.name, kind: 'builtin' } });
  };

  const selectBack = (back: CardBack) => {
    socket.emit('back:set', {
      back:
        back.kind === 'builtin'
          ? { id: back.id, name: back.name, kind: 'builtin' }
          : { id: back.id, name: back.name, kind: 'custom', src: back.src },
    });
  };

  const handleExport = () => {
    const blob = new Blob([exportCustomBacks()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'royal-spades-card-backs.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const merged = importCustomBacks(await file.text());
      setCustomBacks(merged);
      pushToast(`Imported card backs (${merged.length} total).`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'That file could not be imported.');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-quiet fixed bottom-[2vmin] right-[2vmin] z-40 px-[1.6vmin] py-[1vmin] font-display text-[1.8vmin] tracking-widest"
      >
        ✦ Host
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="cartouche royal-scroll fixed bottom-[2vmin] right-[2vmin] top-[2vmin] z-40 w-[34vmin] min-w-[300px] overflow-y-auto p-[2.2vmin]"
          >
            <div className="mb-[1.6vmin] flex items-center justify-between">
              <h2 className="font-display text-[2.2vmin] tracking-[0.14em] text-gold-soft">
                Host Controls
              </h2>
              <button onClick={() => setOpen(false)} className="btn-quiet px-[1.2vmin] py-[0.4vmin] text-[1.6vmin]">
                ✕
              </button>
            </div>

            <h3 className="mb-[1vmin] font-ui text-[1.4vmin] uppercase tracking-[0.28em] text-ivory/70">
              Table Theme
            </h3>
            <div className="mb-[2.2vmin] flex flex-col gap-[1vmin]">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className={`flex items-center gap-[1.2vmin] rounded-lg border px-[1.2vmin] py-[1vmin] text-left transition ${
                    room?.themeId === theme.id
                      ? 'border-gold bg-black/50 shadow-glow'
                      : 'border-gold/30 bg-black/25 hover:border-gold/70'
                  }`}
                >
                  <span
                    className="h-[3vmin] w-[3vmin] shrink-0 rounded-full border border-gold"
                    style={{ background: `radial-gradient(circle at 35% 30%, ${theme.feltGlow}, ${theme.felt})` }}
                  />
                  <span className="font-display text-[1.8vmin] text-ivory">{theme.name}</span>
                </button>
              ))}
            </div>

            <h3 className="mb-[1vmin] font-ui text-[1.4vmin] uppercase tracking-[0.28em] text-ivory/70">
              Card Back
            </h3>
            <div className="mb-[1.4vmin] grid grid-cols-3 gap-[1vmin]">
              {[...BUILTIN_BACKS, ...customBacks].map((back) => (
                <div key={back.id} className="group relative">
                  <button
                    onClick={() => selectBack(back)}
                    title={back.name}
                    className={`w-full overflow-hidden rounded-md border transition ${
                      room?.back?.id === back.id
                        ? 'border-gold shadow-glow'
                        : 'border-gold/30 hover:border-gold/70'
                    }`}
                  >
                    <img src={back.src} alt={back.name} className="aspect-card w-full object-cover" />
                  </button>
                  {back.kind === 'custom' && (
                    <button
                      onClick={() => {
                        setCustomBacks(deleteCustomBack(back.id));
                      }}
                      title="Delete this back"
                      className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-gold bg-night text-xs text-gold-soft group-hover:flex"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setMakerOpen(true)}
              className="btn-gold mb-[1.2vmin] w-full py-[1vmin] text-[1.7vmin] font-semibold"
            >
              Create Custom Back…
            </button>
            <div className="mb-[2.4vmin] flex gap-[1vmin]">
              <button onClick={handleExport} className="btn-quiet flex-1 py-[0.8vmin] font-ui text-[1.4vmin]">
                Export backs
              </button>
              <button
                onClick={() => importInput.current?.click()}
                className="btn-quiet flex-1 py-[0.8vmin] font-ui text-[1.4vmin]"
              >
                Import backs
              </button>
              <input
                ref={importInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImport(file);
                  e.target.value = '';
                }}
              />
            </div>

            {pub && pub.phase !== 'LOBBY' && (
              <>
                <h3 className="mb-[1vmin] font-ui text-[1.4vmin] uppercase tracking-[0.28em] text-ivory/70">
                  Game
                </h3>
                <button
                  onClick={() => {
                    socket.emit('game:restart', {});
                    setOpen(false);
                  }}
                  className="btn-quiet w-full py-[1vmin] font-ui text-[1.5vmin]"
                >
                  Restart game (same seats)
                </button>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {makerOpen && (
        <BackMaker
          onClose={() => setMakerOpen(false)}
          onSaved={(back) => {
            setCustomBacks(loadCustomBacks());
            selectBack(back);
            setMakerOpen(false);
          }}
        />
      )}
    </>
  );
}
