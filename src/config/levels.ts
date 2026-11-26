import type { UnitKind } from '../game/types';

export type LevelMix = 'skirmish' | 'armor' | 'air' | 'assault' | 'boss';

export interface LevelDef {
  id: number;
  name: string;
  blurb: string;
  enemyHp: number;
  /** Multiplier on the enemy spawn interval. Lower means faster waves. */
  intervalScale: number;
  firstDelay: number;
  /** Extra hit points on enemy units. */
  enemyHpScale: number;
  enemyDmgScale: number;
  mix: LevelMix;
  boss: boolean;
  /** War funds paid for a win, before the star bonus. */
  funds: number;
  /** Extra funds for each star earned on that win. */
  starBonus: number;
  /** Star if your base is still at least this fraction of max HP. */
  starHp: number;
  /** Star if the clear is at least this fast, in seconds. */
  starTime: number;
  /** Star if the best cascade reaches this length. */
  starCombo: number;
}

export const LEVELS: LevelDef[] = [
  { id: 1, name: 'First Contact', blurb: 'Infantry on the ridge', enemyHp: 720, intervalScale: 1.28, firstDelay: 8, enemyHpScale: 0.9, enemyDmgScale: 0.9, mix: 'skirmish', boss: false, funds: 40, starBonus: 15, starHp: 0.55, starTime: 90, starCombo: 2 },
  { id: 2, name: 'Ridge Road', blurb: 'A longer march', enemyHp: 900, intervalScale: 1.12, firstDelay: 7.2, enemyHpScale: 1, enemyDmgScale: 1, mix: 'skirmish', boss: false, funds: 48, starBonus: 16, starHp: 0.5, starTime: 85, starCombo: 2 },
  { id: 3, name: 'Tank Yard', blurb: 'Armor joins the line', enemyHp: 1100, intervalScale: 1.05, firstDelay: 6.6, enemyHpScale: 1.05, enemyDmgScale: 1, mix: 'armor', boss: false, funds: 56, starBonus: 18, starHp: 0.45, starTime: 80, starCombo: 3 },
  { id: 4, name: 'Iron Mile', blurb: 'Hold the road', enemyHp: 1300, intervalScale: 1, firstDelay: 6.2, enemyHpScale: 1.1, enemyDmgScale: 1.05, mix: 'armor', boss: false, funds: 64, starBonus: 20, starHp: 0.45, starTime: 75, starCombo: 3 },
  { id: 5, name: 'Fortress', blurb: 'Boss base', enemyHp: 1900, intervalScale: 0.95, firstDelay: 5.6, enemyHpScale: 1.28, enemyDmgScale: 1.1, mix: 'boss', boss: true, funds: 100, starBonus: 28, starHp: 0.35, starTime: 110, starCombo: 3 },
  { id: 6, name: 'Crosswind', blurb: 'Helicopters overhead', enemyHp: 1500, intervalScale: 0.9, firstDelay: 6, enemyHpScale: 1.12, enemyDmgScale: 1.05, mix: 'air', boss: false, funds: 76, starBonus: 22, starHp: 0.4, starTime: 75, starCombo: 3 },
  { id: 7, name: 'Red Sky', blurb: 'The air turns hostile', enemyHp: 1700, intervalScale: 0.84, firstDelay: 5.4, enemyHpScale: 1.18, enemyDmgScale: 1.08, mix: 'air', boss: false, funds: 84, starBonus: 24, starHp: 0.4, starTime: 70, starCombo: 4 },
  { id: 8, name: 'Hammer', blurb: 'Heavies in the column', enemyHp: 1950, intervalScale: 0.78, firstDelay: 5, enemyHpScale: 1.24, enemyDmgScale: 1.1, mix: 'assault', boss: false, funds: 96, starBonus: 26, starHp: 0.35, starTime: 70, starCombo: 4 },
  { id: 9, name: 'Night Drop', blurb: 'Waves come fast', enemyHp: 2200, intervalScale: 0.72, firstDelay: 4.6, enemyHpScale: 1.3, enemyDmgScale: 1.12, mix: 'assault', boss: false, funds: 110, starBonus: 28, starHp: 0.35, starTime: 65, starCombo: 4 },
  { id: 10, name: 'Last Gate', blurb: 'Boss base', enemyHp: 2900, intervalScale: 0.68, firstDelay: 4.2, enemyHpScale: 1.45, enemyDmgScale: 1.18, mix: 'boss', boss: true, funds: 160, starBonus: 40, starHp: 0.3, starTime: 100, starCombo: 4 },
];

export function levelById(id: number): LevelDef {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0]!;
}

export function rollMix(mix: LevelMix, elapsed: number, rng: () => number): UnitKind {
  const roll = rng();
  if (mix === 'skirmish') {
    if (elapsed < 24) return roll < 0.82 ? 'infantry' : 'tank';
    return roll < 0.5 ? 'infantry' : 'tank';
  }
  if (mix === 'armor') {
    if (roll < 0.32) return 'infantry';
    if (roll < 0.82) return 'tank';
    return elapsed > 28 ? 'heli' : 'tank';
  }
  if (mix === 'air') {
    if (roll < 0.22) return 'infantry';
    if (roll < 0.48) return 'tank';
    return 'heli';
  }
  if (mix === 'assault') {
    if (roll < 0.18) return 'infantry';
    if (roll < 0.42) return 'tank';
    if (roll < 0.66) return 'heli';
    if (roll < 0.88) return 'heavy';
    return 'artillery';
  }
  if (roll < 0.12) return 'infantry';
  if (roll < 0.38) return 'tank';
  if (roll < 0.58) return 'heli';
  if (roll < 0.84) return 'heavy';
  return 'artillery';
}
