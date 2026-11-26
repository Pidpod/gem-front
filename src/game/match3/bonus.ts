/** How many extra power gems a win should plant before the bonus blast. */
export function bonusExtras(input: {
  elapsed: number;
  starTime: number;
  bestCombo: number;
  superCharge: number;
}): number {
  const spare = Math.max(0, input.starTime - input.elapsed);
  const fromTime = spare > 3 ? Math.floor((spare - 3) / 7) : 0;
  const fromCombo = Math.max(0, input.bestCombo - 3);
  const fromCharge = Math.max(0, Math.floor(input.superCharge / 20) - 3);
  return Math.min(8, fromTime + fromCombo + fromCharge);
}

/** Points for one blast step. Cascades and detonated specials both pay. */
export function blastPoints(credits: number, specialsCleared: number, combo: number): number {
  return Math.max(0, Math.round(credits)) + specialsCleared * 24 + Math.max(0, combo - 1) * 10;
}
