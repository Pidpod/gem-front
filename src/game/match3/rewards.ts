import { BALANCE, comboMultiplier } from '../../config/balance';
import type { GemColor, StrikeKind, UnitKind } from '../types';
import type { ClearStep } from './logic';

export interface MatchReward {
  credits: number;
  super: number;
  spawns: { kind: UnitKind; count: number }[];
  strikes: StrikeKind[];
  combo: number;
  cleared: number;
  big: boolean;
}

const STRIKE_FOR: Partial<Record<GemColor, StrikeKind>> = {
  infantry: 'barrage',
  tank: 'shell',
  heli: 'missiles',
};

export function rewardForStep(step: ClearStep, combo: number): MatchReward {
  const mult = comboMultiplier(combo);
  let credits = 0;
  let superCharge = 0;
  const gems: Partial<Record<GemColor, number>> = {};

  const bump = (color: GemColor, amount = 1) => {
    gems[color] = (gems[color] ?? 0) + amount;
  };

  for (const { cell } of step.cleared) {
    bump(cell.color);
    if (cell.color === 'credit') credits += BALANCE.gems.credit.credits;
    if (cell.color === 'super') superCharge += BALANCE.gems.super.charge;
  }
  for (const created of step.transforms) {
    credits += created.special === 'bomb' ? BALANCE.specialBonus.bomb : BALANCE.specialBonus.line;
    if (created.special === 'bomb') bump(created.color);
  }

  credits = Math.round(credits * mult);
  superCharge = Math.round(superCharge * mult);

  const spawns: { kind: UnitKind; count: number }[] = [];
  let budget = BALANCE.spawnCapPerClear;
  const groups: { kind: UnitKind; color: GemColor; per: number }[] = [
    { kind: 'infantry', color: 'infantry', per: BALANCE.gems.infantry.gemsPerUnit },
    { kind: 'tank', color: 'tank', per: BALANCE.gems.tank.gemsPerUnit },
    { kind: 'heli', color: 'heli', per: BALANCE.gems.heli.gemsPerUnit },
  ];

  for (const group of groups) {
    const countGems = gems[group.color] ?? 0;
    if (countGems <= 0) continue;
    let count =
      countGems >= 3
        ? Math.max(1, Math.round((countGems * mult) / group.per))
        : Math.floor((countGems * mult) / group.per);
    if (count > budget) {
      credits += (count - budget) * BALANCE.overflowSpawnCredits;
      count = budget;
    }
    budget -= count;
    if (count > 0) spawns.push({ kind: group.kind, count });
  }

  const infantryGems = gems.infantry ?? 0;
  const sendMedic =
    infantryGems >= BALANCE.medic.gemThreshold ||
    (combo >= BALANCE.medic.cascadeCombo && infantryGems >= BALANCE.medic.cascadeGems);
  if (sendMedic) spawns.push({ kind: 'medic', count: 1 });

  const strikes: StrikeKind[] = [];
  for (const [color, kind] of Object.entries(STRIKE_FOR) as [GemColor, StrikeKind][]) {
    if ((gems[color] ?? 0) >= BALANCE.match.bombAt && kind) strikes.push(kind);
  }

  const big =
    step.cleared.length >= 6 ||
    step.cleared.some((entry) => entry.cell.special !== 'none') ||
    step.transforms.length > 0 ||
    strikes.length > 0;

  return {
    credits,
    super: superCharge,
    spawns,
    strikes,
    combo,
    cleared: step.cleared.length,
    big,
  };
}
