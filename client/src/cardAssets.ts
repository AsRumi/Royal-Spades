import type { CardId } from '@shared';

// Vendored public-domain vector deck (Tek Eye, tekeye.uk/playing_cards).
// Files are named by CardId (S14.svg = Ace of Spades) so the map is direct.
const modules = import.meta.glob('./assets/cards/faces/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const faceByCardId: Record<CardId, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split('/').pop()!;
  faceByCardId[file.replace('.svg', '')] = url;
}

export function faceSrc(cardId: CardId): string {
  return faceByCardId[cardId] ?? '';
}
