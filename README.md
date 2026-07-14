# ♠ Royal Spades

A local, in-person party version of Spades. A laptop runs the server and shows the
**table view** on a TV; each player's phone becomes a private controller showing only
their own hand. Same Wi-Fi, no internet, no accounts, nothing stored anywhere.

## Party night: how to run it

1. **Install** (first time only), from the repo root:

   ```
   npm install
   ```

2. **Start the party** (builds the client, then starts the server):

   ```
   npm run party
   ```

   For subsequent nights with no code changes, `npm start` alone is enough.

3. The console prints the address, e.g.:

   ```
   Table view (open on the laptop / TV):  http://192.168.1.23:3000/
   ```

   Open that on the laptop, put the browser fullscreen (F11), and show it on the TV.
   The lobby displays a **room code and a QR code**.

4. Everyone connects their phone to the **same Wi-Fi**, scans the QR (or types the
   printed URL), enters a name, and takes a seat.

5. When all 4 seats are filled, press **Begin the Game** on the table view.

### If a phone can't reach the laptop

- The server console lists **all candidate LAN IPs** — try another one.
- Make sure the laptop's firewall allows inbound connections on port 3000
  (Windows will usually prompt the first time; choose Allow on private networks).
- Change the port with `PORT=4000 npm start` if needed.

### Dropped phones

Phones rejoin automatically: reloading the page (or losing Wi-Fi briefly) puts the
player straight back into their seat with their hand intact. Seats are never given
away on disconnect, and the game waits for the missing player's turn.

### Host controls (on the TV / laptop)

The **✦ Host** button (bottom-right) opens: theme switching (Royal Sapphire,
Emerald Baccarat, Crimson Regency), card-back switching, the **custom back maker**
(import any image, position it in a card frame, save), export/import of custom
backs, and game restart. Theme and back changes appear instantly on every screen.

## Rules implemented (v1)

- 4-player partnership Spades, partners across (seats 0+2 vs 1+3).
- Plain bidding 1–13 (no Nil), team contract = sum of partner bids.
- Follow suit if able; spades can't be led until broken; highest spade wins,
  otherwise highest card of the led suit.
- Scoring: 10 × bid when made, +1 per overtrick (each overtrick is a bag),
  −10 × bid when set, −100 at 10 bags (remainder carries). Game to 500.

## Project layout

```
shared/   Pure, config-driven game engine + types (no I/O; fully unit-tested)
server/   Node + Express + Socket.IO; authoritative state, rooms, reconnection
client/   Vite + React + Tailwind + Framer Motion; table view (/) and
          phone controller (/join/:code) in one app
```

Useful commands: `npm test` (engine tests), `npm run typecheck`, `npm run dev`
(dev servers with hot reload; the Vite dev server proxies sockets to :3000).

## Credits

Card faces: public-domain SVG playing cards from
[Tek Eye](https://www.tekeye.uk/playing_cards/svg-playing-cards) (courtesy link —
no attribution required).
