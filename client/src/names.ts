import type { SeatInfo } from '@shared';

export function seatName(seats: SeatInfo[] | undefined, seat: number): string {
  return seats?.[seat]?.name ?? `Seat ${seat + 1}`;
}

// "Alice & Carol" for partnerships, just the player's name for solo teams.
export function teamLabel(teams: number[][], seats: SeatInfo[] | undefined, team: number): string {
  return (teams[team] ?? []).map((seat) => seatName(seats, seat)).join(' & ');
}
