import type { UpgradeId } from './upgrades';

export type HqSectionId =
  | 'infantry'
  | 'tanks'
  | 'helicopters'
  | 'ships'
  | 'medical'
  | 'base'
  | 'gear'
  | 'supplies';

export interface HqSection {
  id: HqSectionId;
  name: string;
  blurb: string;
  upgrades: UpgradeId[];
}

/** Main HQ. War funds buy and upgrade a unit line, then gear and supplies. */
export const HQ_SECTIONS: HqSection[] = [
  {
    id: 'infantry',
    name: 'INFANTRY',
    blurb: 'Soldiers fielded by green gems.',
    upgrades: ['infantryHp', 'infantryDmg'],
  },
  {
    id: 'tanks',
    name: 'TANKS',
    blurb: 'Armor fielded by red gems.',
    upgrades: ['tankHp', 'tankDmg'],
  },
  {
    id: 'helicopters',
    name: 'HELICOPTERS',
    blurb: 'Aircraft fielded by blue gems.',
    upgrades: ['heliHp', 'heliDmg'],
  },
  {
    id: 'ships',
    name: 'SHIPS',
    blurb: 'Commission the fleet, then thicken the hulls. Ships sail the canal and fire over the bank.',
    upgrades: ['shipHp', 'shipDmg'],
  },
  {
    id: 'medical',
    name: 'MEDICAL',
    blurb: 'Medics walk behind the line and keep it standing.',
    upgrades: ['medicHeal'],
  },
  {
    id: 'base',
    name: 'BASE',
    blurb: 'Walls, restoration, and the gem battery that feeds the superweapon.',
    upgrades: ['baseHp', 'repairPower', 'superCharge', 'superDmg', 'strikePower'],
  },
  {
    id: 'gear',
    name: 'GEAR',
    blurb: 'Weapon, armor, and accessory for the commander you field. Relics are found, not sold.',
    upgrades: [],
  },
  {
    id: 'supplies',
    name: 'SUPPLIES',
    blurb: 'Consumables. Put up to four on the battle belt.',
    upgrades: [],
  },
];

export const FLEET_COST = 80;

export function sectionById(id: HqSectionId): HqSection {
  return HQ_SECTIONS.find((entry) => entry.id === id) ?? HQ_SECTIONS[0]!;
}
