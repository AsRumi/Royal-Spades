import { useApp } from '../store';
import { resolveBackSrc } from '../backs';

interface Props {
  className?: string;
}

// The reverse of every card — whichever back the host selected, broadcast to
// all screens so the TV and the phones always match.
export function CardBackView({ className = '' }: Props) {
  const back = useApp((s) => s.room?.back);
  return (
    <img
      src={resolveBackSrc(back)}
      alt="Card back"
      draggable={false}
      className={`card-shell aspect-card w-full select-none object-cover ${className}`}
    />
  );
}
