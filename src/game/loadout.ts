import { BALANCE } from '../config/balance';
import { levelById, type LevelMix } from '../config/levels';
import { multiplierFor, type UpgradeId } from '../config/upgrades';
import type { UnitKind } from './types';
import { loadProgress } from './progress';

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
    boss: false,
    title: 'Destroy the enemy base',
    levelId: 1,
  };
}

export function tuningForLevel(levelId: number): Tuning {
  const level = levelById(levelId);
  const ranks = loadProgress().ranks;
  const mul = (id: UpgradeId) => multiplierFor(id, ranks[id] ?? 0);
  return {
    playerMax: Math.round(BALANCE.bases.playerHp * mul('baseHp')),
    enemyMax: level.enemyHp,
    firstDelay: level.firstDelay,
    intervalScale: level.intervalScale,
    enemyHpScale: level.enemyHpScale,
    enemyDmgScale: level.enemyDmgScale,
    mix: level.mix,
    hpMul: {
      infantry: mul('infantryHp'),
      tank: mul('tankHp'),
      heli: mul('heliHp'),
    },
    dmgMul: {
      infantry: mul('infantryDmg'),
      tank: mul('tankDmg'),
      heli: mul('heliDmg'),
    },
    medicHeal: BALANCE.medic.healAmount * mul('medicHeal'),
    superUnit: Math.round(BALANCE.superWeapon.unitDamage * mul('superDmg')),
    superBase: Math.round(BALANCE.superWeapon.baseDamage * mul('superDmg')),
    strikePower: mul('strikePower'),
    superCharge: mul('superCharge'),
    boss: level.boss,
    title: level.boss ? `${level.name} · BOSS` : level.name,
    levelId: level.id,
  };
}
