/** Idle uses sheet views, not bitmap warp (warp clouds the matte). */

export function idleGlance(t: number): number | null {
  const cycle = ((t / 9) % 1 + 1) % 1;
  if (cycle > 0.22 && cycle < 0.34) return 45;
  if (cycle > 0.62 && cycle < 0.74) return 315;
  return 0;
}
