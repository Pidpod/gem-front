import type { GemColor, ShopKind, UnitKind } from '../game/types';

/**
 * Every tunable number for Gem Front lives here.
 * Speeds and ranges are in design pixels (see layout.ts).
 */
export const BALANCE = {
  board: {
    cols: 8,
    rows: 8,
  },
  match: {
    min: 3,
    lineAt: 4,
    bombAt: 5,
    maxCascades: 30,
  },
  combo: {
    /** Added to the 1x multiplier for each cascade after the first. */
    step: 0.5,
    cap: 3,
  },
  gems: {
    credit: { credits: 9 },
    infantry: { gemsPerUnit: 3 },
    armor: { gemsPerUnit: 4 },
    repair: { repair: 8 },
    super: { charge: 16 },
  },
  specialBonus: {
    line: 8,
    bomb: 14,
  },
  spawnCapPerClear: 2,
  /** Max living units on one side. Extra player spawns wait; extra enemy waves are skipped. */
  fieldCap: 12,
  overflowSpawnCredits: 6,
  superMax: 100,
  superWeapon: {
    unitDamage: 46,
    baseDamage: 70,
  },
  bases: {
    playerHp: 520,
    enemyHp: 1080,
  },
  units: {
    infantry: { maxHp: 38, damage: 7, interval: 0.55, speed: 58, range: 26, radius: 13 },
    tank: { maxHp: 130, damage: 11, interval: 0.75, speed: 36, range: 32, radius: 16 },
    rocket: { maxHp: 46, damage: 13, interval: 0.6, speed: 54, range: 62, radius: 13 },
    heavy: { maxHp: 210, damage: 14, interval: 0.82, speed: 28, range: 30, radius: 18 },
    artillery: { maxHp: 42, damage: 15, interval: 1.1, speed: 24, range: 108, radius: 14 },
  },
  bonus: {
    /** Rockets hit tanks and heavies harder. */
    rocketVsArmor: 1.75,
  },
  enemy: {
    firstDelay: 7,
    initialInterval: 3.3,
    minInterval: 1.35,
    rampPerSecond: 0.02,
    enrageAt: 140,
    enrageIntervalFactor: 0.6,
    earlyUntil: 16,
    midUntil: 40,
    lateUntil: 75,
  },
  hint: {
    first: 1.3,
    repeat: 5,
  },
  input: {
    dragPx: 16,
  },
  anim: {
    swap: 120,
    reject: 100,
    clear: 140,
    fallBase: 70,
    fallPerRow: 40,
    cascadeGap: 40,
    reshuffle: 280,
  },
};

export const SHOP: { kind: ShopKind; cost: number; name: string; blurb: string }[] = [
  { kind: 'rocket', cost: 55, name: 'ROCKET', blurb: 'anti-armor' },
  { kind: 'heavy', cost: 90, name: 'HEAVY', blurb: 'front line' },
  { kind: 'artillery', cost: 120, name: 'ARTY', blurb: 'long range' },
];

export const UNIT_NAME: Record<UnitKind, string> = {
  infantry: 'INFANTRY',
  tank: 'TANK',
  rocket: 'ROCKET',
  heavy: 'HEAVY',
  artillery: 'ARTY',
};

export const GEM_NAME: Record<GemColor, string> = {
  credit: 'CREDITS',
  infantry: 'INFANTRY',
  armor: 'TANK',
  repair: 'REPAIR',
  super: 'SUPER',
};

export function comboMultiplier(combo: number): number {
  const mult = 1 + Math.max(0, combo - 1) * BALANCE.combo.step;
  return Math.min(BALANCE.combo.cap, mult);
}

export function shopCost(kind: ShopKind): number {
  const item = SHOP.find((entry) => entry.kind === kind);
  return item ? item.cost : 0;
}

export function attackMultiplier(attacker: UnitKind, defender: UnitKind): number {
  if (attacker === 'rocket' && (defender === 'tank' || defender === 'heavy')) {
    return BALANCE.bonus.rocketVsArmor;
  }
  return 1;
}

export function enemyInterval(elapsed: number): number {
  const { initialInterval, minInterval, rampPerSecond, enrageAt, enrageIntervalFactor } = BALANCE.enemy;
  let interval = Math.max(minInterval, initialInterval - elapsed * rampPerSecond);
  if (elapsed >= enrageAt) interval *= enrageIntervalFactor;
  return interval;
}

/** Weighted enemy composition. Early waves are infantry; later waves add armor. */
export function rollEnemyKind(elapsed: number, rng: () => number): UnitKind {
  const { earlyUntil, midUntil, lateUntil } = BALANCE.enemy;
  const roll = rng();
  if (elapsed < earlyUntil) return roll < 0.58 ? 'infantry' : 'tank';
  if (elapsed < midUntil) {
    if (roll < 0.42) return 'infantry';
    if (roll < 0.78) return 'tank';
    return 'rocket';
  }
  if (elapsed < lateUntil) {
    if (roll < 0.28) return 'infantry';
    if (roll < 0.62) return 'tank';
    if (roll < 0.84) return 'rocket';
    return 'heavy';
  }
  if (roll < 0.26) return 'infantry';
  if (roll < 0.52) return 'tank';
  if (roll < 0.72) return 'rocket';
  if (roll < 0.9) return 'heavy';
  return 'artillery';
}
