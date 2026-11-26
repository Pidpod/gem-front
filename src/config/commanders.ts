export type CommanderId = 'mira' | 'holt' | 'ivo' | 'sera';

export interface CommanderDef {
  id: CommanderId;
  name: string;
  rank: string;
  /** Short doctrine line for the select screen. */
  passive: string;
  /** Node that must be liberated before this commander can be fielded. */
  unlockNode?: number;
  tankHp: number;
  tankDmg: number;
  medicHeal: number;
  repair: number;
  superCharge: number;
  rocketDmg: number;
  artilleryDmg: number;
  strike: number;
}

export const COMMANDERS: CommanderDef[] = [
  {
    id: 'mira',
    name: 'Mira Kade',
    rank: 'Captain',
    passive: 'Tanks have more armor and hit harder.',
    tankHp: 1.2,
    tankDmg: 1.18,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'holt',
    name: 'Holt Sern',
    rank: 'Sergeant',
    passive: 'Medics heal more. Base repair patches more.',
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1.35,
    repair: 1.3,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'ivo',
    name: 'Ivo Renn',
    rank: 'Warden',
    passive: 'The superweapon drinks the gem seam faster.',
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1.35,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'sera',
    name: 'Sera Quill',
    rank: 'Colonel',
    passive: 'Rockets, artillery, and match-5 strikes hit harder.',
    unlockNode: 7,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1.25,
    artilleryDmg: 1.25,
    strike: 1.2,
  },
];

export function commanderById(id: CommanderId): CommanderDef {
  return COMMANDERS.find((entry) => entry.id === id) ?? COMMANDERS[0]!;
}

export function isCommanderId(value: string): value is CommanderId {
  return COMMANDERS.some((entry) => entry.id === value);
}
