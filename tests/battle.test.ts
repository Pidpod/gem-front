import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BALANCE, shopCost } from '../src/config/balance';
import {
  activationForSwap,
  createInitialGrid,
  ensurePlayable,
  resolveStep,
  swapActivates,
  swapCells,
} from '../src/game/match3/logic';
import { rewardForStep } from '../src/game/match3/rewards';
import { LANE } from '../src/game/layout';
import { BattleSim } from '../src/game/rts/sim';
import type { Outcome, Rng, ShopKind } from '../src/game/types';

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Summary {
  outcome: Outcome;
  elapsed: number;
  playerHp: number;
  enemyHp: number;
}

function simulate(seed: number, pace: number): Summary {
  const rng = mulberry32(seed);
  const grid = createInitialGrid(rng);
  const sim = new BattleSim(rng);
  let credits = 0;
  let superCharge = 0;
  let untilMove = 0.3;
  const stable: Rng = () => 0.37;

  const scoreMove = (a: { r: number; c: number }, b: { r: number; c: number }): number => {
    const clone = grid.map((row) => row.map((gem) => (gem ? { ...gem } : null)));
    if (!swapActivates(clone, a, b)) return -1;
    swapCells(clone, a, b);
    const act = activationForSwap(clone, a, b);
    let total = 0;
    let first = true;
    for (let combo = 1; combo <= 4; combo++) {
      const step = resolveStep(clone, first ? { ...act, rng: stable } : { rng: stable });
      if (!step) break;
      first = false;
      const reward = rewardForStep(step, combo);
      total += reward.credits * 0.6 + reward.repair * 0.8 + reward.super * 0.7;
      for (const spawn of reward.spawns) total += spawn.count * (spawn.kind === 'tank' ? 46 : 32);
      if (reward.big) total += 8;
    }
    return total;
  };

  while (sim.outcome === 'play' && sim.elapsed < 220) {
    const dt = 0.1;
    untilMove -= dt;
    if (pace < 100 && untilMove <= 0) {
      let best: { a: { r: number; c: number }; b: { r: number; c: number }; score: number } | null = null;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < (grid[0]?.length ?? 0); c++) {
          const neighbors = [
            { r, c: c + 1 },
            { r: r + 1, c },
          ];
          for (const n of neighbors) {
            if (n.c >= (grid[0]?.length ?? 0) || n.r >= grid.length) continue;
            const score = scoreMove({ r, c }, n);
            if (!best || score > best.score) best = { a: { r, c }, b: n, score };
          }
        }
      }
      if (best && best.score >= 0 && swapActivates(grid, best.a, best.b)) {
        swapCells(grid, best.a, best.b);
        const act = activationForSwap(grid, best.a, best.b);
        let first = true;
        for (let combo = 1; combo <= BALANCE.match.maxCascades; combo++) {
          const step = resolveStep(grid, first ? { ...act, rng } : { rng });
          if (!step) break;
          first = false;
          const reward = rewardForStep(step, combo);
          credits += reward.credits;
          superCharge = Math.min(BALANCE.superMax, superCharge + reward.super);
          sim.heal(reward.repair);
          for (const spawn of reward.spawns) {
            for (let i = 0; i < spawn.count; i++) sim.spawn('player', spawn.kind);
          }
        }
        ensurePlayable(grid, rng);
      }
      if (sim.outcome === 'play' && superCharge >= BALANCE.superMax) {
        sim.fireSuper();
        superCharge = 0;
      }
      if (sim.outcome === 'play') {
        const enemies = sim.units.filter((unit) => unit.side === 'enemy').length;
        const friends = sim.units.filter((unit) => unit.side === 'player').length;
        const order: ShopKind[] = enemies > friends ? ['heavy', 'rocket', 'artillery'] : ['rocket', 'artillery', 'heavy'];
        for (const kind of order) {
          const cost = shopCost(kind);
          if (credits >= cost && friends < 10) {
            sim.spawn('player', kind);
            credits -= cost;
            break;
          }
        }
      }
      untilMove = pace;
    }
    if (sim.outcome === 'play') sim.update(dt);
  }

  return {
    outcome: sim.outcome === 'play' ? 'lose' : sim.outcome,
    elapsed: sim.elapsed,
    playerHp: sim.playerHp,
    enemyHp: sim.enemyHp,
  };
}

describe('battle', () => {
  it('lets a unit damage the enemy base and end the match', () => {
    const sim = new BattleSim(() => 0.2);
    sim.spawn('player', 'artillery');
    const unit = sim.units[0];
    assert.ok(unit);
    unit.x = LANE.enemyX - 20;
    sim.enemyHp = 30;
    for (let i = 0; i < 40 && sim.outcome === 'play'; i++) sim.update(0.1);
    assert.equal(sim.outcome, 'win');
    assert.equal(sim.enemyHp, 0);
  });

  it('loses when the player base is destroyed', () => {
    const sim = new BattleSim(() => 0.2);
    sim.spawn('enemy', 'heavy');
    const unit = sim.units[0];
    assert.ok(unit);
    unit.x = LANE.playerX + 20;
    sim.playerHp = 20;
    for (let i = 0; i < 40 && sim.outcome === 'play'; i++) sim.update(0.1);
    assert.equal(sim.outcome, 'lose');
  });

  it('superweapon damages every enemy and the enemy base', () => {
    const sim = new BattleSim(() => 0.2);
    sim.spawn('enemy', 'tank');
    sim.spawn('enemy', 'infantry');
    const before = sim.enemyHp;
    const events = sim.fireSuper();
    assert.ok(events.some((event) => event.type === 'super'));
    assert.ok(sim.enemyHp < before);
    assert.ok(sim.units.every((unit) => unit.side === 'player' || unit.hp < unit.maxHp));
  });

  it('repairs without passing max hp', () => {
    const sim = new BattleSim(() => 0.2);
    sim.playerHp = sim.playerMax - 10;
    assert.equal(sim.heal(100), 10);
    assert.equal(sim.playerHp, sim.playerMax);
  });

  it('an idle player loses and an active player can win', () => {
    const idle = simulate(3, 999);
    assert.equal(idle.outcome, 'lose', `idle lasted ${idle.elapsed.toFixed(1)}s hp ${idle.playerHp}`);

    const seeds = [1, 2, 4, 5, 8, 11];
    const results = seeds.map((seed) => ({ seed, ...simulate(seed, 1.7) }));
    const wins = results.filter((result) => result.outcome === 'win');
    assert.ok(
      wins.length >= 4,
      results.map((result) => `${result.seed}:${result.outcome}@${result.elapsed.toFixed(0)}s ${result.playerHp}/${result.enemyHp}`).join(' '),
    );
  });
});
