import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEVELS } from '../src/config/levels';
import { UPGRADES } from '../src/config/upgrades';
import { tuningForLevel } from '../src/game/loadout';
import { emptyStats } from '../src/game/types';
import {
  buyBuilding,
  buyFleet,
  buyItem,
  buyUpgrade,
  countOf,
  equipItem,
  freshSave,
  fundsFor,
  grantVictory,
  itemStocked,
  loadProgress,
  resetProgress,
  scoreStars,
  setCommander,
  unitUnlocked,
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

  it('unlocks the next road and banks war funds', () => {
    const save = freshSave();
    const granted = grantVictory(save, 1, { ...emptyStats(), elapsed: 50, bestCombo: 3 }, 0.7);
    assert.equal(granted.save.unlocked, 2);
    assert.equal(granted.stars, 3);
    assert.equal(granted.save.funds, granted.funds);
    assert.ok(granted.save.cleared.includes(1));
    assert.equal(granted.hasNext, true);
    assert.ok((granted.save.xp.mira ?? 0) > 0);
    let cleared = freshSave();
    for (let id = 1; id < LEVELS.length; id++) {
      cleared = grantVictory(cleared, id, emptyStats(), 1).save;
    }
    const last = grantVictory(cleared, LEVELS.length, emptyStats(), 1);
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

  it('migrates a linear save into cleared cities', () => {
    const store = memory();
    store.setItem('gem-front-campaign', JSON.stringify({ v: 1, funds: 10, unlocked: 3, stars: {}, ranks: {} }));
    const loaded = loadProgress(store);
    assert.deepEqual(loaded.cleared, [1, 2]);
    assert.equal(loaded.commander, 'mira');
    assert.equal(loaded.fleet, false);
  });

  it('builds cities, fields commanders, and stocks the HQ', () => {
    assert.equal(buyBuilding(freshSave(), 'halden-barracks').ok, false);
    const city = buyBuilding({ ...freshSave(), funds: 100, cleared: [1] }, 'halden-barracks');
    assert.equal(city.ok, true);
    assert.ok(city.save.buildings.includes('halden-barracks'));
    const refined = grantVictory({ ...freshSave(), buildings: ['spire-refinery'] }, 1, emptyStats(), 1);
    assert.equal(refined.funds, fundsFor(LEVELS[0]!, refined.stars) + 24);
    assert.equal(setCommander(freshSave(), 'sera').ok, false);
    assert.equal(setCommander({ ...freshSave(), cleared: [7] }, 'sera').ok, true);
    assert.equal(unitUnlocked(freshSave(), 'rocket'), false);
    assert.equal(unitUnlocked({ ...freshSave(), cleared: [12] }, 'rocket'), true);
    assert.equal(itemStocked(freshSave(), 'seam-lance'), false);
    const bought = buyItem({ ...freshSave(), funds: 500, cleared: [1] }, 'seam-lance');
    assert.equal(bought.ok, true);
    const worn = equipItem(bought.save, 'seam-lance');
    assert.equal(worn.ok, true);
    const tuning = tuningForLevel(1, worn.save);
    assert.ok((tuning.dmgMul.infantry ?? 0) > 1);
    assert.ok((tuning.hpMul.tank ?? 0) > 1);
    const holt = tuningForLevel(1, { ...freshSave(), commander: 'holt' });
    assert.ok(holt.medicHeal > tuning.medicHeal);
    const yard = tuningForLevel(1, { ...freshSave(), buildings: ['harbor-yard'] });
    assert.deepEqual(yard.startUnits, ['ship']);
    const boss = grantVictory(freshSave(), 7, emptyStats(), 1);
    assert.equal(countOf(boss.save, 'warden-sigil'), 1);
    assert.equal(countOf(grantVictory(boss.save, 7, emptyStats(), 1).save, 'warden-sigil'), 1);
    assert.equal(buyFleet(freshSave()).ok, false);
    assert.equal(buyFleet({ ...freshSave(), funds: 80 }).save.fleet, true);
    const cut = buyUpgrade({ ...freshSave(), funds: 50, discount: 0.5 }, UPGRADES[0]!.id);
    assert.equal(cut.ok, true);
    assert.equal(cut.save.funds, 25);
  });
});
