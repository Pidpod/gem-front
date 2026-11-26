import { BALANCE } from './balance';

export type UpgradeId =
  | 'infantryHp'
  | 'infantryDmg'
  | 'tankHp'
  | 'tankDmg'
  | 'heliHp'
  | 'heliDmg'
  | 'medicHeal'
  | 'baseHp'
  | 'superCharge'
  | 'superDmg'
  | 'strikePower';

export interface UpgradeTier {
  cost: number;
  /** Multiplier applied to the base stat. Rank 0 is always 1. */
  mult: number;
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string;
  unit: string;
  base: number;
  tiers: UpgradeTier[];
}

const HP = [
  { cost: 50, mult: 1.12 },
  { cost: 110, mult: 1.28 },
  { cost: 190, mult: 1.46 },
  { cost: 300, mult: 1.68 },
];

const GUN = [
  { cost: 60, mult: 1.1 },
  { cost: 130, mult: 1.24 },
  { cost: 210, mult: 1.4 },
  { cost: 320, mult: 1.58 },
];

export const UPGRADES: UpgradeDef[] = [
  { id: 'infantryHp', name: 'INFANTRY HP', blurb: 'Tougher rifles', unit: 'HP', base: BALANCE.units.infantry.maxHp, tiers: HP },
  { id: 'infantryDmg', name: 'INFANTRY FIRE', blurb: 'Harder shots', unit: 'DMG', base: BALANCE.units.infantry.damage, tiers: GUN },
  { id: 'tankHp', name: 'TANK ARMOR', blurb: 'Thicker plates', unit: 'HP', base: BALANCE.units.tank.maxHp, tiers: HP },
  { id: 'tankDmg', name: 'TANK GUN', blurb: 'Heavier shells', unit: 'DMG', base: BALANCE.units.tank.damage, tiers: GUN },
  { id: 'heliHp', name: 'HELI FRAME', blurb: 'Sturdier birds', unit: 'HP', base: BALANCE.units.heli.maxHp, tiers: HP },
  { id: 'heliDmg', name: 'HELI GUNS', blurb: 'Meaner strafes', unit: 'DMG', base: BALANCE.units.heli.damage, tiers: GUN },
  {
    id: 'medicHeal',
    name: 'MEDIC KITS',
    blurb: 'Bigger heals',
    unit: 'HEAL',
    base: BALANCE.medic.healAmount,
    tiers: [
      { cost: 55, mult: 1.25 },
      { cost: 120, mult: 1.5 },
      { cost: 200, mult: 1.8 },
      { cost: 310, mult: 2.15 },
    ],
  },
  {
    id: 'baseHp',
    name: 'BASE WALLS',
    blurb: 'A stouter fort',
    unit: 'HP',
    base: BALANCE.bases.playerHp,
    tiers: [
      { cost: 70, mult: 1.15 },
      { cost: 140, mult: 1.32 },
      { cost: 230, mult: 1.52 },
      { cost: 340, mult: 1.75 },
    ],
  },
  {
    id: 'superCharge',
    name: 'SUPER CHARGE',
    blurb: 'Purple fills faster',
    unit: 'CHG',
    base: BALANCE.gems.super.charge,
    tiers: [
      { cost: 65, mult: 1.2 },
      { cost: 140, mult: 1.4 },
      { cost: 220, mult: 1.65 },
      { cost: 330, mult: 1.9 },
    ],
  },
  {
    id: 'superDmg',
    name: 'SUPER BLAST',
    blurb: 'The meter hits harder',
    unit: 'DMG',
    base: BALANCE.superWeapon.baseDamage,
    tiers: [
      { cost: 80, mult: 1.15 },
      { cost: 160, mult: 1.32 },
      { cost: 250, mult: 1.5 },
      { cost: 360, mult: 1.72 },
    ],
  },
  {
    id: 'strikePower',
    name: 'STRIKE LOAD',
    blurb: 'Match-5 hits harder',
    unit: 'POW',
    base: 100,
    tiers: [
      { cost: 75, mult: 1.15 },
      { cost: 150, mult: 1.32 },
      { cost: 240, mult: 1.52 },
      { cost: 350, mult: 1.75 },
    ],
  },
];

export function upgradeById(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((entry) => entry.id === id) ?? UPGRADES[0]!;
}

export function multiplierFor(id: UpgradeId, rank: number): number {
  if (rank <= 0) return 1;
  const def = upgradeById(id);
  const tier = def.tiers[Math.min(rank, def.tiers.length) - 1];
  return tier ? tier.mult : 1;
}

export function statAt(def: UpgradeDef, rank: number): number {
  return Math.round(def.base * multiplierFor(def.id, rank));
}
