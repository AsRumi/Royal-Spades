import type { CardBack } from '@shared';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { saveCustomBack } from '../backs';
import { useApp } from '../store';

// Import an image, position it inside a 5:7 frame (the exact card ratio), and
// whatever shows through the frame becomes the card back. Saved rasterized to
// localStorage on this laptop and broadcast to phones when selected.

const FRAME_W = 320; // on-screen frame; 5:7 exactly
const FRAME_H = 448;
const OUT_W = 500; // saved raster; 5:7 exactly, small enough to send over LAN
const OUT_H = 700;

interface Props {
  onClose: () => void;
  onSaved: (back: CardBack) => void;
}

export function BackMaker({ onClose, onSaved }: Props) {
  const pushToast = useApp((s) => s.pushToast);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1); // multiplier over cover-fit
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [name, setName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    return () => {
      if (img) URL.revokeObjectURL(img.src);
    };
  }, [img]);

  const loadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      pushToast('That file could not be read as an image.');
    };
    image.src = url;
  };

  // Cover-fit: at zoom 1 the image fills the frame with no gaps.
  const baseScale = img ? Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const dispW = img ? img.naturalWidth * scale : 0;
  const dispH = img ? img.naturalHeight * scale : 0;

  const clampOffset = (x: number, y: number) => {
    // Keep the frame covered: never drag the image edge inside the frame.
    const maxX = Math.max(0, (dispW - FRAME_W) / 2);
    const maxY = Math.max(0, (dispH - FRAME_H) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const save = () => {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const k = OUT_W / FRAME_W;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.drawImage(
      img,
      (FRAME_W / 2 + offset.x - dispW / 2) * k,
      (FRAME_H / 2 + offset.y - dispH / 2) * k,
      dispW * k,
      dispH * k,
    );
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const back = saveCustomBack(name || 'Custom back', dataUrl);
    onSaved(back);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cartouche royal-scroll max-h-full overflow-y-auto p-8"
      >
        <h2 className="mb-1 text-center font-display text-2xl tracking-[0.14em] text-gold-soft">
          Custom Card Back
        </h2>
        <p className="mb-5 text-center font-ui text-sm text-ivory/70">
          Drag to position · scroll or slide to zoom · what's in the frame is the back
        </p>

        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          <div
            className="relative shrink-0 overflow-hidden rounded-xl border-2 border-gold bg-night shadow-card"
            style={{ width: FRAME_W, height: FRAME_H, touchAction: 'none' }}
            onPointerDown={(e) => {
              if (!img) return;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setOffset(
                clampOffset(
                  drag.current.baseX + (e.clientX - drag.current.startX),
                  drag.current.baseY + (e.clientY - drag.current.startY),
                ),
              );
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onWheel={(e) => {
              if (!img) return;
              const next = Math.min(4, Math.max(1, zoom * (e.deltaY < 0 ? 1.08 : 0.925)));
              setZoom(next);
              setOffset((o) => clampOffset(o.x, o.y));
            }}
          >
            {img ? (
              <img
                src={img.src}
                alt="Imported artwork"
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: dispW,
                  height: dispH,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  cursor: 'grab',
                }}
              />
            ) : (
              <button
                onClick={() => fileInput.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 font-ui text-ivory/60"
              >
                <span className="text-4xl text-gold-soft">✦</span>
                <span>Choose an image…</span>
              </button>
            )}
          </div>

          <div className="flex w-64 flex-col gap-4">
            <button onClick={() => fileInput.current?.click()} className="btn-quiet py-2 font-ui text-sm">
              {img ? 'Choose a different image' : 'Import image'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = '';
              }}
            />

            <label className="font-ui text-xs uppercase tracking-[0.25em] text-ivory/60">
              Zoom
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                disabled={!img}
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                  setOffset((o) => clampOffset(o.x, o.y));
                }}
                className="mt-2 w-full accent-[var(--gold)]"
              />
            </label>

            <button
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              disabled={!img}
              className="btn-quiet py-2 font-ui text-sm disabled:opacity-40"
            >
              Reset position
            </button>

            <label className="font-ui text-xs uppercase tracking-[0.25em] text-ivory/60">
              Name
              <input
                type="text"
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Family Crest"
                className="mt-2 w-full rounded-md border border-gold/50 bg-night px-3 py-2 font-ui text-sm text-ivory outline-none focus:border-gold"
              />
            </label>

            <div className="mt-2 flex gap-3">
              <button onClick={onClose} className="btn-quiet flex-1 py-2 font-ui text-sm">
                Cancel
              </button>
              <button onClick={save} disabled={!img} className="btn-gold flex-1 py-2 text-sm font-semibold">
                Save Back
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
