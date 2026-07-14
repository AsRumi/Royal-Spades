// Positions seats around the table oval for any seat count. Seat 0 sits at
// the bottom; seating proceeds clockwise on screen, matching play order, so
// partners (e.g. 0 & 2 of 4) land across from each other automatically.

export interface SeatPoint {
  x: number; // percent of container width
  y: number; // percent of container height
  angle: number; // degrees; 0 = bottom seat, used to tilt played cards
}

export function seatPoint(
  seat: number,
  seatCount: number,
  viewerSeat = 0,
  rx = 41,
  ry = 38,
  cx = 50,
  cy = 46,
): SeatPoint {
  const step = 360 / seatCount;
  const rel = ((seat - viewerSeat) % seatCount + seatCount) % seatCount;
  const theta = ((90 + rel * step) * Math.PI) / 180;
  return {
    x: cx + rx * Math.cos(theta),
    y: cy + ry * Math.sin(theta),
    angle: rel * step,
  };
}

// Where a played card rests in the center trick, nudged toward its seat.
export function trickPoint(seat: number, seatCount: number, viewerSeat = 0): SeatPoint {
  return seatPoint(seat, seatCount, viewerSeat, 9.5, 11, 50, 46);
}
