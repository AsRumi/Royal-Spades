import type { CardBack } from '@shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { ACE_ANIMATIONS, addCustomAnimation, deleteCustomAnimation, loadCustomAnimations } from '../aceAnimations';
import { deleteCustomBack, exportCustomBacks, importCustomBacks, loadCustomBacks, BUILTIN_BACKS } from '../backs';
import { getSocket } from '../socket';
import { useApp } from '../store';
import { deleteCustomTable, loadCustomTables, type CustomTable } from '../tables';
import { THEMES, themeById } from '../themes';
import { BackMaker } from './BackMaker';
import { TableMaker } from './TableMaker';

// Small host affordance on the TV (the laptop is the host): theme, card back,
// the back maker, export/import, restart. Gameplay input never happens here.
export function HostControls() {
  const room = useApp((s) => s.room);
  const pub = useApp((s) => s.pub);
  const pushToast = useApp((s) => s.pushToast);
  const aceAnimationId = useApp((s) => s.aceAnimationId);
  const setAceAnimation = useApp((s) => s.setAceAnimation);
  const triggerAceTest = useApp((s) => s.triggerAceTest);
  const customAnims = useApp((s) => s.customAnimations);
  const setCustomAnimations = useApp((s) => s.setCustomAnimations);
  const [open, setOpen] = useState(false);
  const [makerOpen, setMakerOpen] = useState(false);
  const [tableMakerOpen, setTableMakerOpen] = useState(false);
  const [customBacks, setCustomBacks] = useState<CardBack[]>(() => loadCustomBacks());
  const [customTables, setCustomTables] = useState<CustomTable[]>(() => loadCustomTables());
  const importInput = useRef<HTMLInputElement>(null);

  const animInput = useRef<HTMLInputElement>(null);

  const socket = getSocket();

  // New animations need no keying step here: the overlay's luma-key shader
  // turns black transparent at render time for whatever video it's handed.
  const handleAddAnimation = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      pushToast('That file is not a video.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      pushToast('Keep animation videos under 50 MB.');
      return;
    }
    try {
      const anim = await addCustomAnimation(file);
      setCustomAnimations(await loadCustomAnimations());
      setAceAnimation(anim.id);
      pushToast(`Added "${anim.name}" — its black background will play as transparent.`);
    } catch {
      pushToast('Could not save that animation.');
    }
  };

  const handleDeleteAnimation = async (id: string) => {
    await deleteCustomAnimation(id);
    setCustomAnimations(await loadCustomAnimations());
    if (aceAnimationId === id) setAceAnimation(ACE_ANIMATIONS[0].id);
  };

  const selectTheme = (themeId: string) => {
    // Builtin theme: clears any custom table along with it.
    socket.emit('theme:set', { themeId, tableImage: null });
    // A theme carries its own default back; apply it too, per 05.
    const theme = themeById(themeId);
    const back = BUILTIN_BACKS.find((b) => b.id === theme.defaultBackId) ?? BUILTIN_BACKS[0];
    socket.emit('back:set', { back: { id: back.id, name: back.name, kind: 'builtin' } });
  };

  const selectTable = (table: CustomTable) => {
    // The photo replaces the felt; its base theme keeps supplying the tokens.
    socket.emit('theme:set', {
      themeId: table.baseThemeId,
      tableImage: { id: table.id, name: table.name, src: table.src },
    });
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-[4vmin]"
          >
            <motion.aside
              initial={{ scale: 0.94, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="cartouche royal-scroll max-h-[86vh] w-[min(92vw,460px)] overflow-y-auto p-[2.4vmin]"
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
              <div className="mb-[1.2vmin] flex flex-col gap-[1vmin]">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => selectTheme(theme.id)}
                    className={`flex items-center gap-[1.2vmin] rounded-lg border px-[1.2vmin] py-[1vmin] text-left transition ${
                      room?.themeId === theme.id && !room?.tableImage
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
              {customTables.length > 0 && (
                <div className="mb-[1.2vmin] grid grid-cols-2 gap-[1vmin]">
                  {customTables.map((table) => (
                    <div key={table.id} className="group relative">
                      <button
                        onClick={() => selectTable(table)}
                        title={table.name}
                        className={`w-full overflow-hidden rounded-md border transition ${
                          room?.tableImage?.id === table.id
                            ? 'border-gold shadow-glow'
                            : 'border-gold/30 hover:border-gold/70'
                        }`}
                      >
                        <img src={table.src} alt={table.name} className="aspect-video w-full object-cover" />
                        <span className="block truncate bg-black/50 px-[0.8vmin] py-[0.4vmin] font-display text-[1.4vmin] text-ivory">
                          {table.name}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setCustomTables(deleteCustomTable(table.id));
                        }}
                        title="Delete this table"
                        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-gold bg-night text-xs text-gold-soft group-hover:flex"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setTableMakerOpen(true)}
                className="btn-quiet mb-[2.2vmin] w-full py-[0.8vmin] font-ui text-[1.4vmin]"
              >
                ＋ Custom table from an image…
              </button>

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

              <h3 className="mb-[1vmin] font-ui text-[1.4vmin] uppercase tracking-[0.28em] text-ivory/70">
                Ace of Spades Effect
              </h3>
              <div className="mb-[1.2vmin] flex flex-col gap-[1vmin]">
                {[null, ...ACE_ANIMATIONS, ...customAnims].map((anim) => {
                  const id = anim?.id ?? null;
                  const isCustom = anim !== null && !ACE_ANIMATIONS.some((b) => b.id === anim.id);
                  return (
                    <div key={id ?? 'none'} className="group relative">
                      <button
                        onClick={() => setAceAnimation(id)}
                        className={`flex w-full items-center gap-[1.2vmin] rounded-lg border px-[1.2vmin] py-[1vmin] text-left transition ${
                          aceAnimationId === id
                            ? 'border-gold bg-black/50 shadow-glow'
                            : 'border-gold/30 bg-black/25 hover:border-gold/70'
                        }`}
                      >
                        <span className="w-[3vmin] shrink-0 text-center font-display text-[2.2vmin] text-gold-soft">
                          {anim ? '♠' : '◦'}
                        </span>
                        <span className="truncate font-display text-[1.8vmin] text-ivory">
                          {anim ? anim.name : 'None'}
                        </span>
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => void handleDeleteAnimation(anim.id)}
                          title="Delete this animation"
                          className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-gold bg-night text-xs text-gold-soft group-hover:flex"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => animInput.current?.click()}
                className="btn-quiet mb-[1.2vmin] w-full py-[0.8vmin] font-ui text-[1.4vmin]"
                title="Use a video with a black background — black plays as transparent"
              >
                ＋ Add animation video…
              </button>
              <input
                ref={animInput}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAddAnimation(file);
                  e.target.value = '';
                }}
              />
              {aceAnimationId !== null && (
                <button
                  onClick={() => {
                    triggerAceTest();
                    setOpen(false);
                  }}
                  className="btn-quiet mb-[2.4vmin] w-full py-[0.8vmin] font-ui text-[1.4vmin]"
                >
                  Preview on the table
                </button>
              )}

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
          </motion.div>
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

      {tableMakerOpen && (
        <TableMaker
          onClose={() => setTableMakerOpen(false)}
          onSaved={(table) => {
            setCustomTables(loadCustomTables());
            selectTable(table);
            setTableMakerOpen(false);
          }}
        />
      )}
    </>
  );
}
