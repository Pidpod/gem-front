import type { CommanderId } from './commanders';
import type { UnitKind } from '../game/types';

export interface BuildingDef {
  id: string;
  cityId: number;
  name: string;
  cost: number;
  blurb: string;
  fundsPerWin?: number;
  start?: UnitKind[];
  shopCostMul?: number;
  medicHeal?: number;
  repair?: number;
  superCharge?: number;
  superDmg?: number;
}

export interface Liberation {
  nodeId: number;
  commander?: CommanderId;
  unit?: 'rocket' | 'artillery';
  note: string;
}

/** Raised in a liberated city. Bonuses apply in every battle after they are built. */
export const BUILDINGS: BuildingDef[] = [
  {
    id: 'halden-barracks',
    cityId: 1,
    name: 'Barracks',
    cost: 70,
    blurb: 'Two infantry start every battle.',
    start: ['infantry', 'infantry'],
  },
  {
    id: 'halden-hospital',
    cityId: 1,
    name: 'Hospital',
    cost: 85,
    blurb: 'Medics and base repair are stronger.',
    medicHeal: 1.25,
    repair: 1.25,
  },
  {
    id: 'spire-refinery',
    cityId: 7,
    name: 'Refinery',
    cost: 95,
    blurb: '+24 war funds on every win.',
    fundsPerWin: 24,
  },
  {
    id: 'spire-lab',
    cityId: 7,
    name: 'Gem Lab',
    cost: 120,
    blurb: 'The superweapon charges faster and hits harder.',
    superCharge: 1.22,
    superDmg: 1.12,
  },
  {
    id: 'cinder-factory',
    cityId: 8,
    name: 'Factory',
    cost: 110,
    blurb: 'A tank starts every battle. Battle shop costs less.',
    start: ['tank'],
    shopCostMul: 0.88,
  },
  {
    id: 'oasis-hospital',
    cityId: 12,
    name: 'Field Hospital',
    cost: 100,
    blurb: 'Another lift for medics and repair.',
    medicHeal: 1.2,
    repair: 1.2,
  },
  {
    id: 'harbor-lab',
    cityId: 15,
    name: 'Harbor Lab',
    cost: 140,
    blurb: 'The coastal seam feeds the superweapon.',
    superCharge: 1.18,
    superDmg: 1.15,
  },
  {
    id: 'harbor-yard',
    cityId: 15,
    name: 'Drydock',
    cost: 125,
    blurb: 'One ship starts every battle.',
    start: ['ship'],
  },
];

export const LIBERATION: Liberation[] = [
  { nodeId: 7, commander: 'sera', note: 'Colonel Sera Quill joins the staff.' },
  { nodeId: 12, unit: 'rocket', note: 'Rocket troopers can be bought in battle.' },
  { nodeId: 15, unit: 'artillery', note: 'Artillery can be bought in battle.' },
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((entry) => entry.id === id);
}

export function buildingsFor(cityId: number): BuildingDef[] {
  return BUILDINGS.filter((entry) => entry.cityId === cityId);
}

export function liberationFor(nodeId: number): Liberation | undefined {
  return LIBERATION.find((entry) => entry.nodeId === nodeId);
}
