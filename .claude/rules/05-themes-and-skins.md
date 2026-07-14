# 05 — Themes, Card Faces & the Custom Back Maker

Two independent things the user can change at runtime: the **theme** (the whole table look)
and the **card back** (the image on the back of every card). They are decoupled — any back
can be used with any theme.

## Card faces (fixed, vector, vendored)

Faces do not change with theme or skin. They must be a **vendored vector (SVG) deck** so
they stay razor-sharp on the TV and on phones at once.

- **Primary source (use this):** the Tek Eye public-domain SVG playing cards
  (https://www.tekeye.uk/playing_cards/svg-playing-cards). Public domain — no attribution
  obligation (a courtesy link is requested). Simplest licensing.
- **Fallback source:** Chris Aguilar's "Vector Playing Cards" v3.x
  (https://totalnonsense.com/open-source-vector-playing-cards/), **LGPL 3.0**. If you use
  this one, you MUST include the required attribution text in an About/credits screen and
  keep the deck files under their own license folder — and note LGPL's redistribution
  terms apply to the deck files, not to the app code.

Build instructions:
- **Verify the license and availability at build time** before committing to a source.
  Do not hardcode a URL you haven't confirmed; if the primary is unreachable, use the
  fallback and add its attribution. If neither is reachable in the build environment,
  vendor a small placeholder set and leave a clearly marked TODO for the owner to drop in
  the real deck — do not block the whole build on it.
- **Vendor the deck locally** under `client/src/assets/cards/faces/` (or an equivalent).
  The app must not fetch faces from the internet at runtime.
- Map each `CardId` (e.g. `S14`, `H7`) to its SVG. Render as inline SVG or `<img>` at
  whatever size the layout needs; because it's vector it stays sharp.

## Themes (built-in, 3 of them)

A **Theme** is a set of design tokens describing the table look plus a default card back.
Define them as data so adding a theme later is a new object, not new components.

```ts
interface Theme {
  id: string;
  name: string;            // shown in the picker, regal
  felt: string;            // base velvet color / gradient tokens
  feltTextureRef?: string; // optional texture asset
  gold: string;            // metal accent
  accent: string;          // secondary accent
  textOn: string;          // readable text color on felt
  displayFont: string;     // regal serif
  uiFont: string;          // clean sans
  defaultBackId: string;   // which built-in back this theme ships with
}
```

Ship these three (tune exact values for luxury, these are the intent):

1. **Royal Sapphire** — flagship. Deep royal-blue velvet, warm gold filigree, ivory text.
   The default theme on first launch.
2. **Emerald Baccarat** — classic deep-green felt, gold, cream text. Monte-Carlo classic.
3. **Crimson Regency** — burgundy velvet, gold, soft-gold text. Opulent and warm.

Each theme also ships a matching **built-in card back** (a designed image, see below).
Selecting a theme applies its tokens across both views and defaults the card back to that
theme's back (the user can then override the back independently).

Theme selection is host-controlled and **broadcast** (`theme:set` in `03`) so the TV and
every phone match instantly.

## Card backs

A **card back** is just an image shown on the reverse of every card (opponents' cards and
the deck). Two kinds:

- **Built-in backs**: a few bundled images, one per theme (gold-on-jewel-tone ornate
  patterns fitting the Royal Casino look). Vendored under
  `client/src/assets/cards/backs/`.
- **Custom backs**: made by the user with the back maker below, stored locally.

```ts
interface CardBack {
  id: string;
  name: string;
  kind: 'builtin' | 'custom';
  src: string;             // builtin: bundled asset path; custom: data URL / stored blob
}
```

Back selection is host-controlled and broadcast (`back:set` in `03`) so all screens match.

## The custom back maker (build exactly this)

Simple and satisfying. A modal/screen on the **laptop** (table-view host controls):

1. **Import an image** (file picker; accept common image types).
2. Show a **card-shaped frame at 5:7 aspect ratio** (matching the real cards). The imported
   image sits behind the frame and can be **dragged and scaled** (pinch/scroll/slider) so
   the user positions the part they want.
3. **Whatever is inside the frame is the card back.** On **Save**, rasterize the framed
   region to a card-back image (canvas → data URL / blob), give it a name, and add it to
   the available backs. Immediately selectable.
4. **Persistence**: store custom backs in the laptop's **localStorage** (or IndexedDB if
   images are large). No server storage, no database.
5. **Export / Import**: let the user export a custom back (or all of them) to a JSON/file
   and import on another laptop, so backs are portable and shareable.

Notes:
- Broadcasting a *custom* back to phones: since custom backs live on the laptop, send the
  rasterized image data (or a data URL) with `back:set` so phones can render it too. Keep
  the image reasonably sized (downscale on save) so it's cheap to send over LAN.
- Keep the maker forgiving: sensible default zoom-to-fill, reset button, cancel without
  saving.

## Anti-patterns

- ❌ Fetching faces or backs from the internet at runtime (party Wi-Fi may not have
  internet; also latency). Vendor everything.
- ❌ Using the LGPL deck without its required attribution screen.
- ❌ Storing custom backs on a server or in a database (out of scope; localStorage only).
- ❌ Baking the theme into components with hardcoded colors instead of reading tokens.
- ❌ A back-maker canvas at the wrong aspect ratio — it must be 5:7 so the saved back fits
  the real card with no distortion.
