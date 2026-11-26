export type CommanderId =
  | 'mira'
  | 'holt'
  | 'ivo'
  | 'sera'
  | 'rump'
  | 'xin'
  | 'pootin'
  | 'modhi'
  | 'khaboom'
  | 'kimfun'
  | 'mustard';

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
  /** Extra base HP. */
  wallHp?: number;
  /** Multiplier on war-fund and battle-shop prices. */
  shopCut?: number;
  /** Extra multiplier on HQ upgrade prices only. */
  upgradeCut?: number;
  /** The next road beyond the front opens too. */
  extraHop?: boolean;
  /** Map march duration scale. Lower is faster. */
  marchScale?: number;
  /** Player unit speed multiplier. */
  speedMul?: number;
  /** Extra war funds per commander level, added every win. */
  planPerLevel?: number;
  /** Incoming damage to your tanks is divided by this. */
  tankArmor?: number;
  /** Enemy speed multiplier during the opening of a battle. */
  enemySlow?: number;
  enemySlowFor?: number;
  /** Free best-moves at the start of a battle. */
  focusMoves?: number;
  /** Multiplier on war funds from a win. */
  fundsMul?: number;
  /** Seconds between automatic missile salvos. */
  paradeEvery?: number;
  /** Damage multiplier after a match of 4 or better. */
  moraleMul?: number;
  moraleTime?: number;
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
  {
    id: 'rump',
    name: 'Rump',
    rank: 'General',
    passive: 'Build the Wall: extra base shield. Deal Maker: prices −15%. Tremendous!',
    wallHp: 110,
    shopCut: 0.85,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'xin',
    name: 'Xin Ping',
    rank: 'Chairman',
    passive: 'Belt & Road: the next road opens and troops march faster. Five-Year Plan: funds grow with level.',
    extraHop: true,
    marchScale: 0.55,
    speedMul: 1.12,
    planPerLevel: 8,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'pootin',
    name: 'Pootin',
    rank: 'Marshal',
    passive: 'Bear Cavalry: tanks are tougher. Winter Is Ours: foes crawl for the first 30 seconds.',
    tankHp: 1.32,
    tankDmg: 1.12,
    tankArmor: 1.35,
    enemySlow: 0.62,
    enemySlowFor: 30,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'modhi',
    name: 'Guru Modhi',
    rank: 'Guru',
    passive: 'Yoga Focus: two free best-moves each battle. Tech Hub: upgrades −10%.',
    unlockNode: 5,
    focusMoves: 2,
    upgradeCut: 0.9,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'khaboom',
    name: 'Kha-boom',
    rank: 'Ayatollah',
    passive: 'Underground Labs: superweapon charges 25% faster. Oil Wealth: +15% war funds.',
    unlockNode: 11,
    superCharge: 1.25,
    fundsMul: 1.15,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'kimfun',
    name: 'Kim Jong-Fun',
    rank: 'Supreme',
    passive: 'Rocket Parade: a missile salvo every 20 seconds. Applause: damage buff after a match of 4.',
    unlockNode: 14,
    paradeEvery: 20,
    moraleMul: 1.18,
    moraleTime: 8,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1.15,
    artilleryDmg: 1,
    strike: 1,
  },
  {
    id: 'mustard',
    name: 'Elon Mustard',
    rank: 'Founder',
    passive: 'Brings a board scan, a reusable rocket, and an electric tank cell.',
    unlockNode: 12,
    tankHp: 1,
    tankDmg: 1,
    medicHeal: 1,
    repair: 1,
    superCharge: 1,
    rocketDmg: 1,
    artilleryDmg: 1,
    strike: 1,
  },
];

export function commanderById(id: CommanderId): CommanderDef {
  return COMMANDERS.find((entry) => entry.id === id) ?? COMMANDERS[0]!;
}

export function isCommanderId(value: string): value is CommanderId {
  return COMMANDERS.some((entry) => entry.id === value);
}
