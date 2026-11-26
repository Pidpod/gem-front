import { BALANCE, comboMultiplier } from '../../config/balance';
import type { UnitKind } from '../types';
import type { ClearStep } from './logic';

export interface MatchReward {
  credits: number;
  repair: number;
  super: number;
  spawns: { kind: UnitKind; count: number }[];
  combo: number;
  cleared: number;
  big: boolean;
}

export function rewardForStep(step: ClearStep, combo: number): MatchReward {
  const mult = comboMultiplier(combo);
  let credits = 0;
  let repair = 0;
  let superCharge = 0;
  let infantryGems = 0;
  let armorGems = 0;

  for (const { cell } of step.cleared) {
    switch (cell.color) {
      case 'credit':
        credits += BALANCE.gems.credit.credits;
        break;
      case 'infantry':
        infantryGems += 1;
        break;
      case 'armor':
        armorGems += 1;
        break;
      case 'repair':
        repair += BALANCE.gems.repair.repair;
        break;
      case 'super':
        superCharge += BALANCE.gems.super.charge;
        break;
      default:
        break;
    }
  }

  for (const created of step.transforms) {
    credits += created.special === 'bomb' ? BALANCE.specialBonus.bomb : BALANCE.specialBonus.line;
  }

  credits = Math.round(credits * mult);
  repair = Math.round(repair * mult);
  superCharge = Math.round(superCharge * mult);

  const spawns: { kind: UnitKind; count: number }[] = [];
  let budget = BALANCE.spawnCapPerClear;
  const groups: { kind: UnitKind; gems: number; per: number }[] = [
    { kind: 'infantry', gems: infantryGems, per: BALANCE.gems.infantry.gemsPerUnit },
    { kind: 'tank', gems: armorGems, per: BALANCE.gems.armor.gemsPerUnit },
  ];

  for (const group of groups) {
    if (group.gems <= 0) continue;
    let count =
      group.gems >= 3
        ? Math.max(1, Math.round((group.gems * mult) / group.per))
        : Math.floor((group.gems * mult) / group.per);
    if (count > budget) {
      credits += (count - budget) * BALANCE.overflowSpawnCredits;
      count = budget;
    }
    budget -= count;
    if (count > 0) spawns.push({ kind: group.kind, count });
  }

  const big =
    step.cleared.length >= 6 ||
    step.cleared.some((entry) => entry.cell.special !== 'none') ||
    step.transforms.length > 0;

  return {
    credits,
    repair,
    super: superCharge,
    spawns,
    combo,
    cleared: step.cleared.length,
    big,
  };
}
