import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEVELS } from '../src/config/levels';
import { UPGRADES } from '../src/config/upgrades';
import { emptyStats } from '../src/game/types';
import {
  buyUpgrade,
  freshSave,
  fundsFor,
  grantVictory,
  loadProgress,
  resetProgress,
  scoreStars,
  upgradeLine,
  writeProgress,
  type MemoryStorage,
} from '../src/game/progress';

function memory(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe('campaign progress', () => {
  it('scores a win, an intact base, and a fast clear as three stars', () => {
    const level = LEVELS[0]!;
    const stats = { ...emptyStats(), elapsed: 40, bestCombo: 1 };
    assert.equal(scoreStars(level, stats, 0.8), 3);
    assert.equal(scoreStars(level, { ...stats, elapsed: 200, bestCombo: 1 }, 0.2), 1);
    assert.equal(fundsFor(level, 3), level.funds + level.starBonus * 3);
  });

  it('unlocks the next level and banks war funds', () => {
    const save = freshSave();
    const granted = grantVictory(save, 1, { ...emptyStats(), elapsed: 50, bestCombo: 3 }, 0.7);
    assert.equal(granted.save.unlocked, 2);
    assert.equal(granted.stars, 3);
    assert.equal(granted.save.funds, granted.funds);
    assert.equal(granted.hasNext, true);
    const last = grantVictory(freshSave(), LEVELS.length, emptyStats(), 1);
    assert.equal(last.hasNext, false);
    assert.equal(last.save.unlocked, LEVELS.length);
  });

  it('buys a tier only when the funds cover it', () => {
    const id = UPGRADES[0]!.id;
    const poor = buyUpgrade(freshSave(), id);
    assert.equal(poor.ok, false);
    const rich = buyUpgrade({ ...freshSave(), funds: 500 }, id);
    assert.equal(rich.ok, true);
    assert.equal(rich.save.ranks[id], 1);
    assert.ok(rich.save.funds < 500);
    const line = upgradeLine(id, 1);
    assert.ok(line.next && line.next > line.current);
    const maxed = upgradeLine(id, UPGRADES[0]!.tiers.length);
    assert.equal(maxed.maxed, true);
  });

  it('round-trips progress through storage and can reset it', () => {
    const store = memory();
    const save = { ...freshSave(), funds: 80, unlocked: 4, stars: { '2': 3 }, ranks: { baseHp: 2 as const } };
    writeProgress(save, store);
    const loaded = loadProgress(store);
    assert.equal(loaded.funds, 80);
    assert.equal(loaded.unlocked, 4);
    assert.equal(loaded.stars['2'], 3);
    assert.equal(loaded.ranks.baseHp, 2);
    const cleared = resetProgress(store);
    assert.equal(cleared.funds, 0);
    assert.equal(cleared.unlocked, 1);
    assert.equal(loadProgress(store).unlocked, 1);
  });
});
