import { BUILDINGS, buildingById, LIBERATION } from '../config/cities';
import { COMMANDERS, commanderById, isCommanderId, type CommanderId } from '../config/commanders';
import { FLEET_COST } from '../config/hq';
import { dropFor, itemById, levelForXp, xpGain, type GearSlot } from '../config/items';
import { LEVELS, levelById, type LevelDef } from '../config/levels';
import { UPGRADES, statAt, upgradeById, type UpgradeId } from '../config/upgrades';
import { FACTIONS, isFactionId, pactPartner, type FactionId } from '../config/factions';
import { perkMods, SITES } from '../config/territories';
import { neighbors } from '../config/world';
import type { RunStats } from './types';

const KEY = 'gem-front-campaign';

export interface ItemStack {
  id: string;
  count: number;
}

export interface SaveData {
  v: 1;
  funds: number;
  /** Highest linear frontier kept so older saves still load. */
  unlocked: number;
  /** Nodes the player has liberated. */
  cleared: number[];
  /** Shop price multiplier for war-fund purchases. 1 means full price. */
  discount: number;
  seen: string[];
  stars: Record<string, number>;
  ranks: Partial<Record<UpgradeId, number>>;
  commander: CommanderId;
  /** Built city structure ids. */
  buildings: string[];
  /** The navy can be bought with credits in battle. */
  fleet: boolean;
  inventory: ItemStack[];
  equipped: Partial<Record<CommanderId, Partial<Record<GearSlot, string>>>>;
  /** Consumable ids shown on the battle belt, at most four. */
  belt: string[];
  xp: Partial<Record<CommanderId, number>>;
  /** Which fictional army the player leads. */
  faction: FactionId;
  /** False until the opening choice is confirmed. Old saves count as already chosen. */
  factionPicked: boolean;
  /** Late pact with the other furnace or the ice. Azure never sets this. */
  pact: FactionId | null;
  /** Sites a rival army has marched into. */
  rivalHeld: { id: number; faction: FactionId }[];
}

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function freshSave(): SaveData {
  return {
    v: 1,
    funds: 0,
    unlocked: 1,
    cleared: [],
    discount: 1,
    seen: [],
    stars: {},
    ranks: {},
    commander: 'mira',
    buildings: [],
    fleet: false,
    inventory: [],
    equipped: {},
    belt: [],
    xp: {},
    faction: 'azure',
    factionPicked: false,
    pact: null,
    rivalHeld: [],
  };
}

export function startNode(save: SaveData): number {
  return FACTIONS[save.faction].startNode;
}

export function homeRegion(save: SaveData) {
  return FACTIONS[save.faction].startRegion;
}

export function priceOf(save: SaveData, cost: number, upgrade = false): number {
  let cut = save.discount > 0 && save.discount < 1 ? save.discount : 1;
  const leader = commanderById(save.commander);
  if (leader.shopCut) cut *= leader.shopCut;
  if (upgrade && leader.upgradeCut) cut *= leader.upgradeCut;
  if (save.pact) cut *= 0.9;
  return Math.max(0, Math.round(cost * cut));
}

export function isCleared(save: SaveData, id: number): boolean {
  return save.cleared.includes(id);
}

/** A node can be marched on once any neighboring road has been liberated, or it is that faction's first beachhead. */
export function isReachable(save: SaveData, id: number): boolean {
  if (id === startNode(save)) return true;
  if (neighbors(id).some((next) => save.cleared.includes(next))) return true;
  if (commanderById(save.commander).extraHop) {
    return neighbors(id).some((next) => neighbors(next).some((far) => save.cleared.includes(far)));
  }
  return false;
}

export function reachableIds(save: SaveData): number[] {
  return LEVELS.map((level) => level.id).filter((id) => isReachable(save, id));
}

export function commanderUnlocked(save: SaveData, id: CommanderId): boolean {
  const node = commanderById(id).unlockNode;
  return node === undefined || save.cleared.includes(node);
}

export function unitUnlocked(save: SaveData, unit: 'rocket' | 'artillery'): boolean {
  return LIBERATION.some((entry) => entry.unit === unit && save.cleared.includes(entry.nodeId));
}

export function countOf(save: SaveData, id: string): number {
  return save.inventory.find((stack) => stack.id === id)?.count ?? 0;
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
  bonusScore = 0,
): { save: SaveData; stars: number; funds: number; hasNext: boolean } {
  const level = levelById(levelId);
  const stars = scoreStars(level, stats, hpRatio);
  const firstClear = !save.cleared.includes(level.id);
  let funds = fundsFor(level, stars);
  if (firstClear && level.bonusFunds) funds += level.bonusFunds;
  for (const id of save.buildings) {
    const built = buildingById(id);
    if (built?.fundsPerWin) funds += built.fundsPerWin;
  }
  const leader = commanderById(save.commander);
  if (leader.planPerLevel) {
    const nextLevel = levelForXp((save.xp[save.commander] ?? 0) + xpGain(level.boss, stars));
    funds += leader.planPerLevel * nextLevel;
  }
  if (leader.fundsMul) funds = Math.round(funds * leader.fundsMul);
  const perks = perkMods(firstClear ? [...save.cleared, level.id] : save.cleared);
  funds += perks.funds;
  funds = Math.round(funds * perks.fundsMul + save.funds * perks.interest);
  if (bonusScore > 0) funds += Math.max(1, Math.round(bonusScore / 10));
  const before = new Set(reachableIds(save));
  const cleared = firstClear ? [...save.cleared, level.id] : save.cleared;
  const gained = xpGain(level.boss, stars);
  const xp = { ...save.xp, [save.commander]: (save.xp[save.commander] ?? 0) + gained };
  let inventory = save.inventory;
  if (firstClear) {
    const found = dropFor(level.id);
    if (found) inventory = addStack(inventory, found, 1);
    if (level.id === commanderById('mustard').unlockNode) {
      inventory = addStack(inventory, 'sat-scan', 1);
      inventory = addStack(inventory, 'mustard-rocket', 1);
      inventory = addStack(inventory, 'ev-cell', 1);
    }
  }
  const nextSave: SaveData = {
    ...save,
    funds: save.funds + funds,
    unlocked: Math.max(save.unlocked, Math.min(LEVELS.length, level.id + 1)),
    cleared,
    discount: firstClear && level.grantsDiscount ? Math.min(save.discount, level.grantsDiscount) : save.discount,
    stars: { ...save.stars, [String(level.id)]: Math.max(save.stars[String(level.id)] ?? 0, stars) },
    xp,
    inventory,
    rivalHeld: advanceRivals({ ...save, cleared, faction: save.faction, pact: save.pact, rivalHeld: save.rivalHeld }),
  };
  const opened = reachableIds(nextSave).filter((id) => !before.has(id) && !nextSave.cleared.includes(id));
  return { save: nextSave, stars, funds, hasNext: opened.length > 0 };
}

export function buyUpgrade(save: SaveData, id: UpgradeId): { save: SaveData; ok: boolean } {
  const def = upgradeById(id);
  const rank = save.ranks[id] ?? 0;
  const tier = def.tiers[rank];
  const price = tier ? priceOf(save, tier.cost, true) : 0;
  if (!tier || save.funds < price) return { save, ok: false };
  return {
    ok: true,
    save: {
      ...save,
      funds: save.funds - price,
      ranks: { ...save.ranks, [id]: rank + 1 },
    },
  };
}

export function buyBuilding(save: SaveData, id: string): { save: SaveData; ok: boolean } {
  const built = buildingById(id);
  if (!built || save.buildings.includes(id) || !save.cleared.includes(built.cityId)) return { save, ok: false };
  const price = priceOf(save, built.cost);
  if (save.funds < price) return { save, ok: false };
  return { ok: true, save: { ...save, funds: save.funds - price, buildings: [...save.buildings, id] } };
}

export function buyFleet(save: SaveData): { save: SaveData; ok: boolean } {
  if (save.fleet) return { save, ok: false };
  const price = priceOf(save, FLEET_COST);
  if (save.funds < price) return { save, ok: false };
  return { ok: true, save: { ...save, fleet: true, funds: save.funds - price } };
}

export function itemStocked(save: SaveData, id: string): boolean {
  const item = itemById(id);
  if (!item || item.price <= 0) return false;
  if (item.requiresCleared !== undefined && !save.cleared.includes(item.requiresCleared)) return false;
  return true;
}

export function buyItem(save: SaveData, id: string): { save: SaveData; ok: boolean } {
  const item = itemById(id);
  if (!item || !itemStocked(save, id)) return { save, ok: false };
  if (item.kind === 'equip' && countOf(save, id) > 0) return { save, ok: false };
  const price = priceOf(save, item.price);
  if (save.funds < price) return { save, ok: false };
  return {
    ok: true,
    save: { ...save, funds: save.funds - price, inventory: addStack(save.inventory, id, 1) },
  };
}

export function equipItem(save: SaveData, id: string): { save: SaveData; ok: boolean } {
  const item = itemById(id);
  if (!item || item.kind !== 'equip' || !item.slot || countOf(save, id) < 1) return { save, ok: false };
  const gear = { ...(save.equipped[save.commander] ?? {}), [item.slot]: id };
  return { ok: true, save: { ...save, equipped: { ...save.equipped, [save.commander]: gear } } };
}

export function clearSlot(save: SaveData, slot: GearSlot): SaveData {
  const gear = { ...(save.equipped[save.commander] ?? {}) };
  delete gear[slot];
  return { ...save, equipped: { ...save.equipped, [save.commander]: gear } };
}

export function toggleBelt(save: SaveData, id: string): SaveData {
  const item = itemById(id);
  if (!item || item.kind !== 'consumable' || countOf(save, id) < 1) return save;
  if (save.belt.includes(id)) return { ...save, belt: save.belt.filter((entry) => entry !== id) };
  if (save.belt.length >= 4) return save;
  return { ...save, belt: [...save.belt, id] };
}

export function consumeItem(save: SaveData, id: string): { save: SaveData; ok: boolean } {
  const item = itemById(id);
  if (!item || item.kind !== 'consumable' || countOf(save, id) < 1) return { save, ok: false };
  return { ok: true, save: { ...save, inventory: addStack(save.inventory, id, -1) } };
}

export function setCommander(save: SaveData, id: CommanderId): { save: SaveData; ok: boolean } {
  if (!commanderUnlocked(save, id)) return { save, ok: false };
  return { ok: true, save: { ...save, commander: id } };
}

export function markSeen(save: SaveData, id: string): SaveData {
  if (save.seen.includes(id)) return save;
  return { ...save, seen: [...save.seen, id] };
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

function addStack(inventory: ItemStack[], id: string, delta: number): ItemStack[] {
  const item = itemById(id);
  if (!item) return inventory;
  const current = inventory.find((stack) => stack.id === id)?.count ?? 0;
  let next = current + delta;
  if (item.kind === 'equip') next = Math.min(1, next);
  next = Math.max(0, next);
  const rest = inventory.filter((stack) => stack.id !== id);
  if (next <= 0) return rest;
  return [...rest, { id, count: next }];
}

function sanitize(raw: Partial<SaveData>): SaveData {
  const fresh = freshSave();
  const unlocked = clampInt(raw.unlocked, 1, LEVELS.length);
  const funds = Math.max(0, Math.floor(Number(raw.funds) || 0));
  let cleared: number[] = [];
  if (Array.isArray(raw.cleared)) {
    cleared = [...new Set(raw.cleared.filter((id) => Number.isInteger(id) && id >= 1 && id <= 400))];
  } else if (typeof raw.unlocked === 'number') {
    for (let id = 1; id < unlocked; id++) cleared.push(id);
  }
  const seen = Array.isArray(raw.seen) ? raw.seen.filter((id) => typeof id === 'string') : [];
  const discount = typeof raw.discount === 'number' && raw.discount > 0 && raw.discount <= 1 ? raw.discount : 1;
  const stars: Record<string, number> = {};
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [key, value] of Object.entries(raw.stars)) {
      const id = Number(key);
      if (Number.isInteger(id) && id >= 1 && id <= 400 && typeof value === 'number') stars[String(id)] = clampInt(value, 0, 3);
    }
  }
  const ranks: Partial<Record<UpgradeId, number>> = {};
  if (raw.ranks && typeof raw.ranks === 'object') {
    for (const upgrade of UPGRADES) {
      const value = raw.ranks[upgrade.id];
      if (typeof value === 'number') ranks[upgrade.id] = clampInt(value, 0, upgrade.tiers.length);
    }
  }
  const commander = typeof raw.commander === 'string' && isCommanderId(raw.commander) ? raw.commander : 'mira';
  const knownBuildings = new Set(BUILDINGS.map((entry) => entry.id));
  const buildings = Array.isArray(raw.buildings)
    ? raw.buildings.filter((id) => typeof id === 'string' && knownBuildings.has(id))
    : [];
  const inventory: ItemStack[] = [];
  if (Array.isArray(raw.inventory)) {
    for (const stack of raw.inventory) {
      if (!stack || typeof stack.id !== 'string' || !itemById(stack.id)) continue;
      const count = clampInt(stack.count, 0, 99);
      if (count > 0) inventory.push({ id: stack.id, count: itemById(stack.id)?.kind === 'equip' ? 1 : count });
    }
  }
  const equipped: SaveData['equipped'] = {};
  if (raw.equipped && typeof raw.equipped === 'object') {
    for (const id of COMMANDERS.map((entry) => entry.id)) {
      const gear = raw.equipped[id];
      if (!gear) continue;
      const slots: Partial<Record<GearSlot, string>> = {};
      for (const slot of ['weapon', 'armor', 'accessory'] as const) {
        const itemId = gear[slot];
        const item = typeof itemId === 'string' ? itemById(itemId) : undefined;
        if (item && item.kind === 'equip' && item.slot === slot) slots[slot] = item.id;
      }
      if (Object.keys(slots).length > 0) equipped[id] = slots;
    }
  }
  const belt = Array.isArray(raw.belt)
    ? raw.belt.filter((id) => typeof id === 'string' && itemById(id)?.kind === 'consumable').slice(0, 4)
    : [];
  const xp: SaveData['xp'] = {};
  if (raw.xp && typeof raw.xp === 'object') {
    for (const id of COMMANDERS.map((entry) => entry.id)) {
      const value = raw.xp[id];
      if (typeof value === 'number' && value > 0) xp[id] = Math.floor(value);
    }
  }
  return {
    ...fresh,
    funds,
    unlocked,
    cleared,
    discount,
    seen,
    stars,
    ranks,
    commander,
    buildings,
    fleet: raw.fleet === true,
    inventory,
    equipped,
    belt,
    xp,
    faction: typeof raw.faction === 'string' && isFactionId(raw.faction) ? raw.faction : 'azure',
    factionPicked: typeof raw.factionPicked === 'boolean' ? raw.factionPicked : true,
    pact:
      typeof raw.pact === 'string' &&
      isFactionId(raw.pact) &&
      pactPartner(typeof raw.faction === 'string' && isFactionId(raw.faction) ? raw.faction : 'azure') === raw.pact
        ? raw.pact
        : null,
    rivalHeld: Array.isArray(raw.rivalHeld)
      ? raw.rivalHeld.filter((entry) => entry && SITES.some((site) => site.id === entry.id) && isFactionId(entry.faction))
      : [],
  };
}

function advanceRivals(save: SaveData): SaveData['rivalHeld'] {
  const held = [...save.rivalHeld];
  for (const rival of ['azure', 'crimson', 'frost'] as const) {
    if (rival === save.faction || rival === save.pact) continue;
    const owned = new Set<number>();
    for (const site of SITES) if (site.seed === rival) owned.add(site.id);
    for (const claim of held) if (claim.faction === rival) owned.add(claim.id);
    for (const id of save.cleared) owned.delete(id);
    let pick: number | null = null;
    for (const id of owned) {
      for (const next of neighbors(id)) {
        if (save.cleared.includes(next) || next === startNode(save)) continue;
        if (held.some((claim) => claim.id === next)) continue;
        pick = next;
        break;
      }
      if (pick) break;
    }
    if (pick) held.push({ id: pick, faction: rival });
  }
  return held;
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
