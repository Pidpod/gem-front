import { SITES } from './territories';
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
  /** Extra war funds the first time this node is cleared. */
  bonusFunds?: number;
  /** Permanent shop discount granted the first time this node is cleared, e.g. 0.85. */
  grantsDiscount?: number;
}

export const LEVELS: LevelDef[] = [
  { id: 1, name: 'Bastion Gate', blurb: 'The last free gate', enemyHp: 640, intervalScale: 1.3, firstDelay: 8.2, enemyHpScale: 0.88, enemyDmgScale: 0.9, mix: 'skirmish', boss: false, funds: 36, starBonus: 12, starHp: 0.55, starTime: 90, starCombo: 2 },
  { id: 2, name: 'Convoy Road', blurb: 'Keep the city fed', enemyHp: 780, intervalScale: 1.18, firstDelay: 7.6, enemyHpScale: 0.95, enemyDmgScale: 0.95, mix: 'skirmish', boss: false, funds: 42, starBonus: 14, starHp: 0.5, starTime: 85, starCombo: 2 },
  { id: 3, name: 'Seam Cache', blurb: 'A buried gem stockpile', enemyHp: 600, intervalScale: 1.35, firstDelay: 8, enemyHpScale: 0.85, enemyDmgScale: 0.85, mix: 'skirmish', boss: false, funds: 30, starBonus: 10, starHp: 0.5, starTime: 80, starCombo: 2, bonusFunds: 45 },
  { id: 4, name: 'Root Line', blurb: 'Into occupied woods', enemyHp: 920, intervalScale: 1.08, firstDelay: 7, enemyHpScale: 1, enemyDmgScale: 1, mix: 'skirmish', boss: false, funds: 48, starBonus: 16, starHp: 0.5, starTime: 80, starCombo: 2 },
  { id: 5, name: 'West Vein', blurb: 'The quieter seam', enemyHp: 1040, intervalScale: 1.02, firstDelay: 6.6, enemyHpScale: 1.05, enemyDmgScale: 1, mix: 'armor', boss: false, funds: 52, starBonus: 16, starHp: 0.45, starTime: 80, starCombo: 3 },
  { id: 6, name: 'East Vein', blurb: 'Patrol country', enemyHp: 1100, intervalScale: 1, firstDelay: 6.4, enemyHpScale: 1.08, enemyDmgScale: 1.02, mix: 'armor', boss: false, funds: 54, starBonus: 16, starHp: 0.45, starTime: 80, starCombo: 3 },
  { id: 7, name: 'Heartwood Spire', blurb: 'Their forest refinery', enemyHp: 1680, intervalScale: 0.96, firstDelay: 6, enemyHpScale: 1.22, enemyDmgScale: 1.08, mix: 'boss', boss: true, funds: 90, starBonus: 26, starHp: 0.4, starTime: 110, starCombo: 3 },
  { id: 8, name: 'Cinder Gate', blurb: 'The mine country starts', enemyHp: 1280, intervalScale: 0.94, firstDelay: 6, enemyHpScale: 1.1, enemyDmgScale: 1.05, mix: 'armor', boss: false, funds: 60, starBonus: 18, starHp: 0.45, starTime: 75, starCombo: 3 },
  { id: 9, name: 'Glass Flats', blurb: 'Open ground, watched', enemyHp: 1360, intervalScale: 0.9, firstDelay: 5.6, enemyHpScale: 1.12, enemyDmgScale: 1.05, mix: 'air', boss: false, funds: 64, starBonus: 18, starHp: 0.4, starTime: 75, starCombo: 3 },
  { id: 10, name: 'Quarry Cut', blurb: 'The harder mine road', enemyHp: 1560, intervalScale: 0.86, firstDelay: 5.2, enemyHpScale: 1.22, enemyDmgScale: 1.1, mix: 'assault', boss: false, funds: 72, starBonus: 20, starHp: 0.4, starTime: 75, starCombo: 3 },
  { id: 11, name: 'Buried Seam', blurb: 'A hidden gem cache', enemyHp: 980, intervalScale: 1.05, firstDelay: 6.5, enemyHpScale: 1, enemyDmgScale: 1, mix: 'armor', boss: false, funds: 40, starBonus: 12, starHp: 0.45, starTime: 70, starCombo: 2, bonusFunds: 55 },
  { id: 12, name: 'Oasis Battery', blurb: 'Water and guns', enemyHp: 1720, intervalScale: 0.84, firstDelay: 5.2, enemyHpScale: 1.2, enemyDmgScale: 1.08, mix: 'assault', boss: false, funds: 78, starBonus: 22, starHp: 0.38, starTime: 70, starCombo: 4 },
  { id: 13, name: 'Tide Battery', blurb: 'The coastal guns', enemyHp: 1860, intervalScale: 0.8, firstDelay: 5, enemyHpScale: 1.24, enemyDmgScale: 1.1, mix: 'air', boss: false, funds: 84, starBonus: 22, starHp: 0.38, starTime: 70, starCombo: 4 },
  { id: 14, name: 'Black Dock', blurb: 'Supplies under the guns', enemyHp: 1200, intervalScale: 0.95, firstDelay: 6, enemyHpScale: 1.05, enemyDmgScale: 1, mix: 'skirmish', boss: false, funds: 48, starBonus: 14, starHp: 0.45, starTime: 70, starCombo: 2, grantsDiscount: 0.85 },
  { id: 15, name: 'Harbor Spire', blurb: 'The last occupied well', enemyHp: 2600, intervalScale: 0.72, firstDelay: 4.4, enemyHpScale: 1.4, enemyDmgScale: 1.15, mix: 'boss', boss: true, funds: 150, starBonus: 36, starHp: 0.3, starTime: 110, starCombo: 4 },
  ...SITES.filter((site) => site.id > 15).map((site) => ({
    id: site.id,
    name: site.name,
    blurb: site.blurb,
    enemyHp: 900 + site.id * 40,
    intervalScale: Math.max(0.72, 1.05 - site.id * 0.008),
    firstDelay: Math.max(4.2, 7.2 - site.id * 0.06),
    enemyHpScale: 1 + site.id * 0.01,
    enemyDmgScale: 1 + site.id * 0.004,
    mix: site.perk === 'ancient' ? 'boss' as const : site.id % 3 === 0 ? 'air' as const : 'armor' as const,
    boss: site.perk === 'ancient',
    funds: 36 + site.id * 2,
    starBonus: 12,
    starHp: 0.4,
    starTime: 80,
    starCombo: 3,
  })),
];

const ENDLESS_NAMES = [
  'Outer Relay',
  'Ash March',
  'Night Battery',
  'Glass Spur',
  'Redoubt Nine',
  'Salt Line',
  'Cinder Watch',
  'Deep Yard',
  'Storm Pier',
  'Pale Fort',
];

/** A front past the drawn map. Each step is a little harder than the last. */
export function endlessLevel(id: number): LevelDef {
  const step = Math.max(1, id - LEVELS.length);
  const title = ENDLESS_NAMES[(step - 1) % ENDLESS_NAMES.length] ?? 'Outer Relay';
  const wave = Math.floor((step - 1) / ENDLESS_NAMES.length);
  return {
    id,
    name: wave > 0 ? `${title} ${wave + 1}` : title,
    blurb: 'The front keeps moving',
    enemyHp: 1100 + id * 55,
    intervalScale: Math.max(0.55, 0.9 - step * 0.015),
    firstDelay: Math.max(3.2, 5.5 - step * 0.05),
    enemyHpScale: 1.15 + step * 0.02,
    enemyDmgScale: 1.08 + step * 0.01,
    mix: step % 4 === 0 ? 'boss' : step % 2 === 0 ? 'air' : 'assault',
    boss: step % 4 === 0,
    funds: 40 + id * 2,
    starBonus: 14,
    starHp: 0.35,
    starTime: 75,
    starCombo: 3,
  };
}

export function levelById(id: number): LevelDef {
  return LEVELS.find((level) => level.id === id) ?? (id > LEVELS.length ? endlessLevel(id) : LEVELS[0]!);
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
    if (roll < 0.88) return 'heli';
    return elapsed > 18 ? 'ship' : 'heli';
  }
  if (mix === 'assault') {
    if (roll < 0.18) return 'infantry';
    if (roll < 0.42) return 'tank';
    if (roll < 0.66) return 'heli';
    if (roll < 0.88) return 'heavy';
    return 'artillery';
  }
  if (roll < 0.12) return 'infantry';
  if (roll < 0.34) return 'tank';
  if (roll < 0.52) return 'heli';
  if (roll < 0.74) return 'heavy';
  if (roll < 0.9) return 'artillery';
  return elapsed > 24 ? 'ship' : 'artillery';
}
