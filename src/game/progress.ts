import { LEVELS, levelById, type LevelDef } from '../config/levels';
import { UPGRADES, statAt, upgradeById, type UpgradeId } from '../config/upgrades';
import type { RunStats } from './types';

const KEY = 'gem-front-campaign';

export interface SaveData {
  v: 1;
  funds: number;
  unlocked: number;
  stars: Record<string, number>;
  ranks: Partial<Record<UpgradeId, number>>;
}

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function freshSave(): SaveData {
  return { v: 1, funds: 0, unlocked: 1, stars: {}, ranks: {} };
}

export function scoreStars(level: LevelDef, stats: RunStats, hpRatio: number): number {
  let stars = 1;
  if (hpRatio >= level.starHp) stars += 1;
  if (stats.elapsed <= level.starTime || stats.bestCombo >= level.starCombo) stars += 1;
  return stars;
}

export function fundsFor(level: LevelDef, stars: number): number {
  return level.funds + level.starBonus * stars;
}

export function grantVictory(
  save: SaveData,
  levelId: number,
  stats: RunStats,
  hpRatio: number,
): { save: SaveData; stars: number; funds: number; hasNext: boolean } {
  const level = levelById(levelId);
  const stars = scoreStars(level, stats, hpRatio);
  const funds = fundsFor(level, stars);
  const best = Math.max(save.stars[String(level.id)] ?? 0, stars);
  const unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, level.id + 1));
  return {
    save: {
      ...save,
      funds: save.funds + funds,
      unlocked,
      stars: { ...save.stars, [String(level.id)]: best },
    },
    stars,
    funds,
    hasNext: level.id < LEVELS.length,
  };
}

export function buyUpgrade(save: SaveData, id: UpgradeId): { save: SaveData; ok: boolean } {
  const def = upgradeById(id);
  const rank = save.ranks[id] ?? 0;
  const tier = def.tiers[rank];
  if (!tier || save.funds < tier.cost) return { save, ok: false };
  return {
    ok: true,
    save: {
      ...save,
      funds: save.funds - tier.cost,
      ranks: { ...save.ranks, [id]: rank + 1 },
    },
  };
}

export function upgradeLine(id: UpgradeId, rank: number): { current: number; next: number | null; cost: number | null; maxed: boolean } {
  const def = upgradeById(id);
  const current = statAt(def, rank);
  const tier = def.tiers[rank];
  if (!tier) return { current, next: null, cost: null, maxed: true };
  return { current, next: statAt(def, rank + 1), cost: tier.cost, maxed: false };
}

export function maxRank(id: UpgradeId): number {
  return upgradeById(id).tiers.length;
}

export function loadProgress(storage: MemoryStorage | null = browserStorage()): SaveData {
  if (!storage) return freshSave();
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return freshSave();
    return sanitize(JSON.parse(raw) as Partial<SaveData>);
  } catch {
    return freshSave();
  }
}

export function writeProgress(save: SaveData, storage: MemoryStorage | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode or a full disk */
  }
}

export function resetProgress(storage: MemoryStorage | null = browserStorage()): SaveData {
  const save = freshSave();
  if (storage) {
    try {
      storage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  writeProgress(save, storage);
  return save;
}

function sanitize(raw: Partial<SaveData>): SaveData {
  const fresh = freshSave();
  const unlocked = clampInt(raw.unlocked, 1, LEVELS.length);
  const funds = Math.max(0, Math.floor(Number(raw.funds) || 0));
  const stars: Record<string, number> = {};
  if (raw.stars && typeof raw.stars === 'object') {
    for (const level of LEVELS) {
      const value = raw.stars[String(level.id)];
      if (typeof value === 'number') stars[String(level.id)] = clampInt(value, 0, 3);
    }
  }
  const ranks: Partial<Record<UpgradeId, number>> = {};
  if (raw.ranks && typeof raw.ranks === 'object') {
    for (const upgrade of UPGRADES) {
      const value = raw.ranks[upgrade.id];
      if (typeof value === 'number') ranks[upgrade.id] = clampInt(value, 0, upgrade.tiers.length);
    }
  }
  return { ...fresh, funds, unlocked, stars, ranks };
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function browserStorage(): MemoryStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}
