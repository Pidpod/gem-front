import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEVELS, levelById } from '../src/config/levels';
import { blastPoints, bonusExtras } from '../src/game/match3/bonus';
import { freshSave, grantVictory } from '../src/game/progress';
import { emptyStats } from '../src/game/types';

describe('bonus blast', () => {
  it('converts leftover time, combo, and charge past 3 into specials', () => {
    assert.equal(bonusExtras({ elapsed: 90, starTime: 90, bestCombo: 3, superCharge: 60 }), 0);
    assert.equal(bonusExtras({ elapsed: 86, starTime: 90, bestCombo: 3, superCharge: 0 }), 0);
    const packed = bonusExtras({ elapsed: 10, starTime: 90, bestCombo: 5, superCharge: 100 });
    assert.equal(packed, 8);
    assert.ok(blastPoints(20, 2, 3) > blastPoints(20, 0, 1));
  });

  it('keeps going past the last territory with a harder front', () => {
    const last = LEVELS[LEVELS.length - 1]!;
    const next = levelById(last.id + 1);
    const later = levelById(last.id + 4);
    assert.equal(next.id, last.id + 1);
    assert.ok(next.enemyHp > last.enemyHp);
    assert.ok(later.enemyHp > next.enemyHp);
    assert.equal(levelById(1).name, LEVELS[0]!.name);
  });

  it('banks bonus points as war funds without changing a zero-bonus clear', () => {
    const plain = grantVictory(freshSave(), 1, emptyStats(), 1);
    const boosted = grantVictory(freshSave(), 1, emptyStats(), 1, 100);
    assert.ok(boosted.funds >= plain.funds + 10);
    assert.equal(boosted.save.funds, boosted.funds);
    assert.ok(boosted.save.cleared.includes(1));
  });
});
