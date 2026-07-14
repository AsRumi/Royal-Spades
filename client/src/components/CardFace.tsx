import type { CardId } from '@shared';
import { cardRank, cardSuit, rankLabel, SUIT_NAMES, SUIT_SYMBOLS } from '@shared';
import { faceSrc } from '../cardAssets';

interface Props {
  cardId: CardId;
  className?: string;
}

// A vector card face. Rendered as an <img> over the SVG asset so it stays
// razor-sharp at any size, from phone thumbnails to the TV trick area.
export function CardFace({ cardId, className = '' }: Props) {
  const suit = cardSuit(cardId);
  return (
    <img
      src={faceSrc(cardId)}
      alt={`${rankLabel(cardRank(cardId))}${SUIT_SYMBOLS[suit]} — ${SUIT_NAMES[suit]}`}
      draggable={false}
      className={`card-shell aspect-card w-full select-none ${className}`}
    />
  );
}
