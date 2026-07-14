# 00 — Overview & Non-Goals

## What this project is

**Royal Spades** is a local, in-person party version of the card game Spades.

The physical setup:
- A laptop runs a small server and displays the **table view** on a TV (the shared
  screen everyone looks at).
- Each player joins from their **phone browser** by scanning a QR code shown on the
  TV. Their phone becomes a private controller: it shows only *their* hand and lets
  them tap the card they want to play.
- When a player taps a card, the server validates it and it animates onto the table
  on the TV.

Everyone is on the same home Wi-Fi (LAN). There is no internet play, no accounts,
no cloud.

This is a ship-it product, not a learning exercise. Build it end-to-end, make it
look great, keep it simple. Do not stop mid-build to hand the owner a tutorial.

## Core experience priorities (in order)

1. **It works reliably at a party.** Joining is instant, turns are unambiguous,
   a dropped phone rejoins its seat without breaking the game.
2. **It looks luxurious.** Royal Casino aesthetic — deep velvet felt, gold filigree,
   regal type, smooth card animations. Never cheap or flat.
3. **It is easy to re-theme.** Swappable full table themes and swappable card backs,
   including a maker that turns any imported image into a card back.
4. **It is easy to extend to other player counts later.** The rules engine must be
   written so that supporting 3-player or 6-player later is a config change, not a
   rewrite (see `02-game-engine.md`).

## v1 scope (build all of this)

- 4-player partnership Spades (partners sit across from each other).
- Plain bidding only (each player bids a number of tricks; no Nil, no Blind Nil).
- Full hand loop: lobby → deal → bid → play 13 tricks → score → next hand → game over.
- Standard Spades scoring with bags, game to 500 (all configurable).
- TV table view + phone controller view.
- Lobby with room code + QR join + reconnection.
- 3 built-in themes, runtime theme switching, runtime card-back switching.
- Custom card-back maker (import image, position/scale, save, export/import).
- Vector card faces (crisp on both TV and phone).

## Non-goals (do NOT build these in v1)

- **No Nil / Blind Nil.** Bidding is plain tricks only. Scoring hooks for Nil are a
  documented swap point (see `02`), but the feature is off/absent.
- **No AI / bot players.** v1 requires the exact number of human players the config
  asks for (4).
- **No internet / matchmaking / spectator-from-anywhere.** LAN only.
- **No accounts, login, or database.** Room and game state live in server memory and
  disappear when the server stops. This is intentional and correct.
- **No native mobile app.** Phones use the browser.
- **No hostile-network hardening.** Assume a trusted home Wi-Fi. Basic room codes are
  enough; do not build anti-cheat beyond "server is authoritative."

## Working name

Package name: `royal-spades`. The owner may rename later; do not block on this.
