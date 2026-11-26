import type { Pos, Rng } from '../types';
import { rewardForStep } from './rewards';
import {
  activationForSwap,
  cloneGrid,
  resolveStep,
  swapActivates,
  swapCells,
  type Grid,
} from './logic';

const stableRng: Rng = () => 0.37;

/** Highest-value legal swap, used for the idle hint and debug playtests. */
export function suggestMove(grid: Grid): { a: Pos; b: Pos } | null {
  let best: { a: Pos; b: Pos; score: number } | null = null;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors: Pos[] = [
        { r, c: c + 1 },
        { r: r + 1, c },
      ];
      for (const b of neighbors) {
        if (b.r >= rows || b.c >= cols) continue;
        const a = { r, c };
        const score = scoreSwap(grid, a, b);
        if (score < 0) continue;
        if (!best || score > best.score) best = { a, b, score };
      }
    }
  }
  return best ? { a: best.a, b: best.b } : null;
}

function scoreSwap(grid: Grid, a: Pos, b: Pos): number {
  const clone = cloneGrid(grid);
  if (!swapActivates(clone, a, b)) return -1;
  swapCells(clone, a, b);
  const act = activationForSwap(clone, a, b);
  let total = 0;
  let first = true;
  for (let combo = 1; combo <= 4; combo++) {
    const step = resolveStep(clone, first ? { ...act, rng: stableRng } : { rng: stableRng });
    if (!step) break;
    first = false;
    const reward = rewardForStep(step, combo);
    total += reward.credits * 0.55 + reward.super * 0.75 + reward.cleared + reward.strikes.length * 36;
    for (const spawn of reward.spawns) total += spawn.count * (spawn.kind === 'tank' ? 48 : 34);
    if (reward.big) total += 10;
  }
  return total;
}
