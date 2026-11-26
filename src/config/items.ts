import type { UnitKind } from '../game/types';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'relic';
export type GearSlot = 'weapon' | 'armor' | 'accessory';
export type ConsumableEffect = 'shuffle' | 'repair' | 'airstrike' | 'bomb' | 'charge' | 'focus';

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  kind: 'equip' | 'consumable';
  slot?: GearSlot;
  blurb: string;
  /** War-fund price. 0 means it is found, not sold. */
  price: number;
  /** Cleared node required before HQ will stock this. */
  requiresCleared?: number;
    effect?: ConsumableEffect;
    power?: number;
    /** Stays in the belt. One use per battle. */
    reusable?: boolean;
  unitDmg?: number;
  baseHp?: number;
  creditMul?: number;
  superMul?: number;
  superCharge?: number;
  shopMul?: number;
  spawnBonus?: Partial<Record<UnitKind, number>>;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b7c0c8',
  uncommon: '#3ecf7a',
  rare: '#6aa7ff',
  relic: '#f0c43a',
};

export const ITEMS: ItemDef[] = [
  {
    id: 'issue-rifle',
    name: 'Issue Rifle',
    rarity: 'common',
    kind: 'equip',
    slot: 'weapon',
    blurb: '+6% unit damage.',
    price: 45,
    unitDmg: 0.06,
  },
  {
    id: 'seam-lance',
    name: 'Seam Lance',
    rarity: 'uncommon',
    kind: 'equip',
    slot: 'weapon',
    blurb: '+10% unit damage. Purple gems fill more.',
    price: 100,
    requiresCleared: 1,
    unitDmg: 0.1,
    superMul: 0.08,
  },
  {
    id: 'field-coat',
    name: 'Field Coat',
    rarity: 'common',
    kind: 'equip',
    slot: 'armor',
    blurb: '+6% base HP.',
    price: 45,
    baseHp: 0.06,
  },
  {
    id: 'city-plate',
    name: 'City Plate',
    rarity: 'rare',
    kind: 'equip',
    slot: 'armor',
    blurb: '+12% base HP and +4% unit damage.',
    price: 150,
    requiresCleared: 7,
    baseHp: 0.12,
    unitDmg: 0.04,
  },
  {
    id: 'gem-charm',
    name: 'Gem Charm',
    rarity: 'uncommon',
    kind: 'equip',
    slot: 'accessory',
    blurb: '+12% credits. Superweapon charges faster.',
    price: 85,
    requiresCleared: 1,
    creditMul: 0.12,
    superCharge: 0.08,
  },
  {
    id: 'halden-banner',
    name: 'Halden Banner',
    rarity: 'rare',
    kind: 'equip',
    slot: 'accessory',
    blurb: 'Infantry matches field one extra soldier.',
    price: 160,
    requiresCleared: 7,
    spawnBonus: { infantry: 1 },
  },
  {
    id: 'warden-sigil',
    name: 'Warden Sigil',
    rarity: 'relic',
    kind: 'equip',
    slot: 'accessory',
    blurb: 'Taken from the spire. +10% damage, stronger purple gems.',
    price: 0,
    unitDmg: 0.1,
    superMul: 0.12,
  },
  {
    id: 'cache-scope',
    name: 'Cache Scope',
    rarity: 'uncommon',
    kind: 'equip',
    slot: 'accessory',
    blurb: 'Pulled from a buried seam. +18% credits.',
    price: 0,
    creditMul: 0.18,
  },
  {
    id: 'dock-pass',
    name: 'Dock Pass',
    rarity: 'rare',
    kind: 'equip',
    slot: 'accessory',
    blurb: 'Black Dock papers. Battle shop costs 15% less.',
    price: 0,
    shopMul: 0.85,
  },
  {
    id: 'harbor-crest',
    name: 'Harbor Crest',
    rarity: 'relic',
    kind: 'equip',
    slot: 'weapon',
    blurb: 'The last well. +14% damage and +8% base HP.',
    price: 0,
    unitDmg: 0.14,
    baseHp: 0.08,
  },
  {
    id: 'field-shuffle',
    name: 'Field Shuffle',
    rarity: 'common',
    kind: 'consumable',
    blurb: 'Reshuffle the board.',
    price: 20,
    effect: 'shuffle',
  },
  {
    id: 'repair-kit',
    name: 'Repair Kit',
    rarity: 'common',
    kind: 'consumable',
    blurb: 'Patch the base for 100.',
    price: 24,
    effect: 'repair',
    power: 100,
  },
  {
    id: 'charge-cell',
    name: 'Charge Cell',
    rarity: 'uncommon',
    kind: 'consumable',
    blurb: 'Pour 45 into the superweapon.',
    price: 36,
    requiresCleared: 1,
    effect: 'charge',
    power: 45,
  },
  {
    id: 'airstrike-flare',
    name: 'Airstrike Flare',
    rarity: 'uncommon',
    kind: 'consumable',
    blurb: 'Call a missile run.',
    price: 40,
    requiresCleared: 4,
    effect: 'airstrike',
  },
  {
    id: 'color-bomb',
    name: 'Color Bomb',
    rarity: 'rare',
    kind: 'consumable',
    blurb: 'Plant a color bomb on the board.',
    price: 55,
    requiresCleared: 7,
    effect: 'bomb',
  },
  {
    id: 'siege-kit',
    name: 'Siege Kit',
    rarity: 'rare',
    kind: 'consumable',
    blurb: 'A heavy patch for the base, 140.',
    price: 0,
    effect: 'repair',
    power: 140,
  },
  {
    id: 'sat-scan',
    name: 'Sat Scan',
    rarity: 'rare',
    kind: 'consumable',
    blurb: 'Mustard satellite. Plays the best move.',
    price: 0,
    effect: 'focus',
  },
  {
    id: 'mustard-rocket',
    name: 'Reusable Rocket',
    rarity: 'relic',
    kind: 'consumable',
    blurb: 'One missile salvo each battle. The rocket comes back.',
    price: 0,
    effect: 'airstrike',
    reusable: true,
  },
  {
    id: 'ev-cell',
    name: 'EV Cell',
    rarity: 'rare',
    kind: 'equip',
    slot: 'accessory',
    blurb: 'Electric tank cell. Tank matches field one extra tank.',
    price: 0,
    spawnBonus: { tank: 1 },
  },
];

/** First-clear finds. Bosses and side caches, not the shop. */
export const FIELD_DROPS: { nodeId: number; itemId: string }[] = [
  { nodeId: 3, itemId: 'cache-scope' },
  { nodeId: 7, itemId: 'warden-sigil' },
  { nodeId: 11, itemId: 'siege-kit' },
  { nodeId: 14, itemId: 'dock-pass' },
  { nodeId: 15, itemId: 'harbor-crest' },
];

export function itemById(id: string): ItemDef | undefined {
  return ITEMS.find((entry) => entry.id === id);
}

export function dropFor(nodeId: number): string | null {
  return FIELD_DROPS.find((entry) => entry.nodeId === nodeId)?.itemId ?? null;
}

/** XP required to *be* each level. Index 0 is level 1. */
export const LEVEL_XP = [0, 50, 120, 210, 320, 450, 600, 780, 980, 1200];

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) {
    if (xp >= (LEVEL_XP[i] ?? 0)) level = i + 1;
  }
  return level;
}

export function xpSpan(xp: number): { level: number; into: number; span: number | null } {
  const level = levelForXp(xp);
  const floor = LEVEL_XP[level - 1] ?? 0;
  const cap = LEVEL_XP[level];
  return {
    level,
    into: Math.max(0, xp - floor),
    span: cap === undefined ? null : cap - floor,
  };
}

export function xpGain(boss: boolean, stars: number): number {
  return 16 + stars * 8 + (boss ? 18 : 0);
}
