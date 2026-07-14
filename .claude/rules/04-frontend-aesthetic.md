# 04 — Frontend & Royal Casino Aesthetic

Two views, one React app (`01`). This file is about how they look and feel. The bar is
**luxurious**, never flat or cheap. When in doubt, spend effort here.

## Aesthetic direction: Royal Casino

Think a private high-roller room in a palace, not a neon Vegas floor:

- **Surfaces**: rich velvet felt with subtle texture/vignette, not flat green. Deep,
  saturated jewel tones per theme (`05`).
- **Metal**: warm gold (not brassy yellow) for filigree borders, the dealer button, trick
  frames, and rank/label accents. Thin ornate rules and corner flourishes.
- **Type**: a regal serif display face for titles, the room code, and player names
  (e.g. Cinzel, Playfair Display, or similar), paired with a clean, highly legible sans
  for numbers/UI (e.g. Inter). Bundle the fonts locally; do not depend on the internet at
  party time.
- **Light**: soft warm glows and drop shadows to give felt and cards depth. Tasteful
  bloom on the active player's seat. No harsh neon.
- **Motion**: Framer Motion everywhere it adds class — cards deal out in an arc, slide to
  the center when played, and the winner's frame sweeps the trick. Keep it smooth and
  quick (party pace), never sluggish.

## Table view (the TV)

Full-bleed felt. Layout:

- **Lobby state**: a large centered panel with the room code in big regal type, a QR code
  to `join/<code>`, and a ring of seat placeholders that fill with player names + a small
  avatar/chip as phones join. A clear "Start" affordance once seats are full.
- **In-game**: seats arranged around an oval table oriented so **partners sit across**
  from each other. For each seat show name, current bid, tricks won this hand, and a
  fanned stack of card *backs* (count = cards remaining) — never opponents' faces. The
  **active seat** is highlighted (glow + gold frame). Center shows the current trick with
  each played card angled toward its player. A tasteful scoreboard (per team: score, bags)
  sits in a corner cartouche.
- **Bidding**: show each seat's bid as it comes in; a subtle reveal animation.
- **Trick win / hand end / game over**: clear, celebratory-but-classy moments. Game over
  shows final scores and the winning team crowned.

Design for a **10-foot experience**: big type, high contrast, readable across a room. This
screen is glanceable, not interactive (all input comes from phones), though the host may
have a small control affordance for theme/back and restart.

## Controller view (the phone)

Portrait, thumb-reachable, dead simple:

- **Header**: whose turn it is, your name/seat, your current bid and tricks won, the room
  code small. A compact strip mirroring the current trick (small) so you don't have to
  look up at the TV to know what's been played.
- **Bidding phase**: a clean number stepper/selector for `[min..max]` and a confirm
  button. Only enabled on your turn.
- **Playing phase**: your hand as a fanned, tappable row/grid of **face** cards, grouped
  and sorted by suit with spades distinct. When it's your turn, tap a card to play it.
  **Dim/disable** cards not in `legalMoves` (hint only — the server still validates), with
  a tiny note like "must follow ♦". When it's not your turn, the hand is visible but not
  tappable.
- Give crisp tactile feedback on tap (scale/lift + a soft sound optional). Handle
  reconnection invisibly: on reload, the phone rejoins via its stored token and its hand
  reappears.

## Cards

- **Faces** come from the vendored vector deck (`05`). They must be crisp on a 55" TV and
  on a 5" phone simultaneously — that's the whole reason for vector. Do not rasterize them
  at a fixed size.
- **Backs** are theme/skin images (`05`), shown for opponents on the table and on the deck.
- Card aspect ratio is poker standard **2.5 : 3.5 (5:7)** everywhere, including the back
  maker canvas.

## Responsiveness & robustness

- Table view targets large landscape screens; controller targets phone portrait. Build
  them as distinct layouts, not one layout stretched.
- Assume flaky phone connections; every view must recover gracefully from a reload by
  re-subscribing to server state (`03`).
- No layout that depends on internet assets at runtime. Everything (fonts, faces, default
  backs) is bundled/served locally.

## Anti-patterns

- ❌ Flat CSS-drawn cards or a flat green rectangle "table." Make it feel like velvet and
  gold.
- ❌ Rendering opponents' faces anywhere (privacy + it's cheating).
- ❌ Rasterizing vector faces so they blur on the TV.
- ❌ Making the TV view interactive for gameplay — all plays come from phones.
- ❌ Animations so slow they drag party pace. Smooth but quick.
