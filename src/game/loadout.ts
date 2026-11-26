import { BALANCE } from '../config/balance';
import { buildingById } from '../config/cities';
import { commanderById } from '../config/commanders';
import { itemById, levelForXp } from '../config/items';
import { levelById, type LevelMix } from '../config/levels';
import { multiplierFor, type UpgradeId } from '../config/upgrades';
import type { FactionId } from '../config/factions';
import { perkMods } from '../config/territories';
import { nodeById, regionById } from '../config/world';
import type { SaveData } from './progress';
import { loadProgress } from './progress';
import type { UnitKind } from './types';

export interface Tuning {
  playerMax: number;
  enemyMax: number;
  firstDelay: number;
  intervalScale: number;
  enemyHpScale: number;
  enemyDmgScale: number;
  mix: LevelMix | null;
  hpMul: Partial<Record<UnitKind, number>>;
  dmgMul: Partial<Record<UnitKind, number>>;
  medicHeal: number;
  superUnit: number;
  superBase: number;
  strikePower: number;
  superCharge: number;
  /** Multiplier on shop repair and match-5 ally repair. */
  repairMul: number;
  repairAmount: number;
  shopCostMul: number;
  creditMul: number;
  superGemMul: number;
  spawnBonus: Partial<Record<UnitKind, number>>;
  startUnits: UnitKind[];
  regionTint: number;
  faction: FactionId;
  speedMul: number;
  tankArmor: number;
  enemySlow: number;
  enemySlowFor: number;
  focusMoves: number;
  paradeEvery: number;
  moraleMul: number;
  moraleTime: number;
  boss: boolean;
  title: string;
  levelId: number;
}

export function defaultTuning(): Tuning {
  return {
    playerMax: BALANCE.bases.playerHp,
    enemyMax: BALANCE.bases.enemyHp,
    firstDelay: BALANCE.enemy.firstDelay,
    intervalScale: 1,
    enemyHpScale: 1,
    enemyDmgScale: 1,
    mix: null,
    hpMul: {},
    dmgMul: {},
    medicHeal: BALANCE.medic.healAmount,
    superUnit: BALANCE.superWeapon.unitDamage,
    superBase: BALANCE.superWeapon.baseDamage,
    strikePower: 1,
    superCharge: 1,
    repairMul: 1,
    repairAmount: BALANCE.repair.amount,
    shopCostMul: 1,
    creditMul: 1,
    superGemMul: 1,
    spawnBonus: {},
    startUnits: [],
    regionTint: 0,
    faction: 'azure',
    speedMul: 1,
    tankArmor: 1,
    enemySlow: 1,
    enemySlowFor: 0,
    focusMoves: 0,
    paradeEvery: 0,
    moraleMul: 1,
    moraleTime: 0,
    boss: false,
    title: 'Destroy the enemy base',
    levelId: 1,
  };
}

export function tuningForLevel(levelId: number, save: SaveData = loadProgress()): Tuning {
  const level = levelById(levelId);
  const ranks = save.ranks;
  const mul = (id: UpgradeId) => multiplierFor(id, ranks[id] ?? 0);
  const commander = commanderById(save.commander);
  const levelBonus = levelForXp(save.xp[save.commander] ?? 0);
  let unitDmg = 0;
  let baseHp = 0;
  let creditMul = 0;
  let superMul = 0;
  let superChargeAdd = 0;
  let shopMul = 1;
  const spawnBonus: Partial<Record<UnitKind, number>> = {};
  const gear = save.equipped[save.commander] ?? {};
  for (const id of [gear.weapon, gear.armor, gear.accessory]) {
    if (!id) continue;
    const item = itemById(id);
    if (!item) continue;
    unitDmg += item.unitDmg ?? 0;
    baseHp += item.baseHp ?? 0;
    creditMul += item.creditMul ?? 0;
    superMul += item.superMul ?? 0;
    superChargeAdd += item.superCharge ?? 0;
    if (item.shopMul) shopMul *= item.shopMul;
    for (const [kind, bonus] of Object.entries(item.spawnBonus ?? {})) {
      const key = kind as UnitKind;
      spawnBonus[key] = (spawnBonus[key] ?? 0) + (bonus ?? 0);
    }
  }
  let medicHeal = BALANCE.medic.healAmount * mul('medicHeal') * commander.medicHeal;
  let repairMul = mul('repairPower') * commander.repair;
  let superCharge = mul('superCharge') * commander.superCharge * (1 + superChargeAdd);
  let superUnit = Math.round(BALANCE.superWeapon.unitDamage * mul('superDmg'));
  let superBase = Math.round(BALANCE.superWeapon.baseDamage * mul('superDmg'));
  const startUnits: UnitKind[] = [];
  for (const id of save.buildings) {
    const built = buildingById(id);
    if (!built) continue;
    if (built.start) startUnits.push(...built.start);
    if (built.shopCostMul) shopMul *= built.shopCostMul;
    if (built.medicHeal) medicHeal *= built.medicHeal;
    if (built.repair) repairMul *= built.repair;
    if (built.superCharge) superCharge *= built.superCharge;
    if (built.superDmg) {
      superUnit = Math.round(superUnit * built.superDmg);
      superBase = Math.round(superBase * built.superDmg);
    }
  }
  const perks = perkMods(save.cleared);
  shopMul *= perks.shop;
  medicHeal *= perks.heal;
  repairMul *= perks.repair;
  superCharge *= perks.super;
  const grown = (1 + unitDmg) * (1 + (levelBonus - 1) * 0.03) * perks.speed;
  const hpMul: Partial<Record<UnitKind, number>> = {
    infantry: mul('infantryHp'),
    tank: mul('tankHp') * commander.tankHp * perks.tankHp,
    heli: mul('heliHp'),
    ship: mul('shipHp'),
  };
  const dmgMul: Partial<Record<UnitKind, number>> = {
    infantry: mul('infantryDmg') * grown * perks.infantry,
    tank: mul('tankDmg') * commander.tankDmg * grown,
    heli: mul('heliDmg') * grown * perks.heli,
    rocket: commander.rocketDmg * grown,
    artillery: commander.artilleryDmg * grown,
    heavy: grown,
    ship: mul('shipDmg') * grown,
  };
  const region = regionById(nodeById(level.id).region);
  return {
    playerMax: Math.round(BALANCE.bases.playerHp * mul('baseHp') * (1 + baseHp) + (levelBonus - 1) * 18 + (commander.wallHp ?? 0) + perks.base),
    enemyMax: level.enemyHp,
    firstDelay: level.firstDelay,
    intervalScale: level.intervalScale,
    enemyHpScale: level.enemyHpScale,
    enemyDmgScale: level.enemyDmgScale,
    mix: level.mix,
    hpMul,
    dmgMul,
    medicHeal,
    superUnit,
    superBase,
    strikePower: mul('strikePower') * commander.strike,
    superCharge,
    repairMul,
    repairAmount: Math.round(BALANCE.repair.amount * repairMul),
    shopCostMul: shopMul * (commander.shopCut ?? 1),
    creditMul: 1 + creditMul,
    superGemMul: 1 + superMul,
    spawnBonus,
    startUnits,
    regionTint: region.battleTint,
    faction: save.faction,
    speedMul: commander.speedMul ?? 1,
    tankArmor: commander.tankArmor ?? 1,
    enemySlow: (commander.enemySlow ?? 1) * perks.enemySlow,
    enemySlowFor: commander.enemySlowFor ?? 0,
    focusMoves: commander.focusMoves ?? 0,
    paradeEvery: commander.paradeEvery ?? 0,
    moraleMul: commander.moraleMul ?? 1,
    moraleTime: commander.moraleTime ?? 0,
    boss: level.boss,
    title: level.boss ? `${level.name} · BOSS` : level.name,
    levelId: level.id,
  };
}
