import type { GemColor, ShopKind, StrikeKind, UnitKind } from '../game/types';

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
    tank: { gemsPerUnit: 4 },
    heli: { gemsPerUnit: 4 },
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
    infantry: { maxHp: 36, damage: 7, interval: 0.5, speed: 60, range: 28, radius: 12 },
    tank: { maxHp: 140, damage: 12, interval: 0.78, speed: 34, range: 34, radius: 16 },
    heli: { maxHp: 48, damage: 9, interval: 0.42, speed: 84, range: 78, radius: 12 },
    medic: { maxHp: 30, damage: 0, interval: 0.65, speed: 50, range: 44, radius: 11 },
    rocket: { maxHp: 46, damage: 13, interval: 0.6, speed: 54, range: 62, radius: 13 },
    heavy: { maxHp: 210, damage: 14, interval: 0.82, speed: 28, range: 30, radius: 18 },
    artillery: { maxHp: 42, damage: 15, interval: 1.1, speed: 24, range: 108, radius: 14 },
  },
  strikes: {
    barrage: { hits: 5, damage: 16, radius: 26, baseDamage: 10, spread: 36, allyRepair: 40 },
    shell: { hits: 1, damage: 78, radius: 58, baseDamage: 46, spread: 0, allyRepair: 0 },
    missiles: { hits: 4, damage: 24, radius: 28, baseDamage: 18, spread: 32, allyRepair: 0 },
  } satisfies Record<
    StrikeKind,
    { hits: number; damage: number; radius: number; baseDamage: number; spread: number; allyRepair: number }
  >,
  medic: {
    healAmount: 8,
    /** Stay this far behind the front-most ground ally. */
    followGap: 30,
    /** Match-4 or any clear of this many green gems also sends a medic. */
    gemThreshold: 4,
    /** A cascade with at least this many green gems sends a medic. */
    cascadeGems: 3,
    cascadeCombo: 2,
  },
  repair: {
    cost: 34,
    amount: 64,
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
  juice: {
    hitStop: 0.09,
    slowMo: 0.34,
    slowScale: 0.28,
    trailCap: 7,
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
  { kind: 'medic', cost: 40, name: 'MEDIC', blurb: 'heals troops' },
  { kind: 'repair', cost: BALANCE.repair.cost, name: 'REPAIR', blurb: 'fix base' },
  { kind: 'heavy', cost: 90, name: 'HEAVY', blurb: 'front line' },
];

export const UNIT_NAME: Record<UnitKind, string> = {
  infantry: 'INFANTRY',
  tank: 'TANK',
  heli: 'HELI',
  medic: 'MEDIC',
  rocket: 'ROCKET',
  heavy: 'HEAVY',
  artillery: 'ARTY',
};

export const GEM_NAME: Record<GemColor, string> = {
  credit: 'CREDITS',
  infantry: 'INFANTRY',
  tank: 'TANK',
  heli: 'HELI',
  super: 'SUPER',
};

export const STRIKE_LABEL: Record<StrikeKind, string> = {
  barrage: 'BARRAGE',
  shell: 'ARTILLERY',
  missiles: 'MISSILE RUN',
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
  if (attacker === 'rocket' && (defender === 'tank' || defender === 'heavy' || defender === 'heli')) {
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

/** Weighted enemy composition. Helicopters arrive once the lane is busy. */
export function rollEnemyKind(elapsed: number, rng: () => number): UnitKind {
  const { earlyUntil, midUntil, lateUntil } = BALANCE.enemy;
  const roll = rng();
  if (elapsed < earlyUntil) return roll < 0.62 ? 'infantry' : 'tank';
  if (elapsed < midUntil) {
    if (roll < 0.34) return 'infantry';
    if (roll < 0.7) return 'tank';
    return 'heli';
  }
  if (elapsed < lateUntil) {
    if (roll < 0.22) return 'infantry';
    if (roll < 0.5) return 'tank';
    if (roll < 0.74) return 'heli';
    return 'heavy';
  }
  if (roll < 0.18) return 'infantry';
  if (roll < 0.4) return 'tank';
  if (roll < 0.62) return 'heli';
  if (roll < 0.84) return 'heavy';
  return 'artillery';
}
