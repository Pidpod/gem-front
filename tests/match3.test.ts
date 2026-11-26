import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BALANCE } from '../src/config/balance';
import {
  activationForSwap,
  checkerGrid,
  collapseAndRefill,
  createInitialGrid,
  ensurePlayable,
  findHint,
  findRuns,
  hasAnyMove,
  resolveStep,
  swapActivates,
  swapCells,
  type Grid,
} from '../src/game/match3/logic';
import { rewardForStep } from '../src/game/match3/rewards';
import type { Cell, GemColor, Pos, Rng } from '../src/game/types';

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

function cell(grid: Grid, r: number, c: number): Cell {
  const found = grid[r]?.[c];
  assert.ok(found, `missing cell ${r},${c}`);
  return found;
}

function countColor(entries: { cell: Cell }[], color: GemColor): number {
  return entries.filter((entry) => entry.cell.color === color).length;
}

describe('match-3', () => {
  it('deals a full board with no starting match and at least one move', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const grid = createInitialGrid(mulberry32(seed));
      assert.equal(grid.length, BALANCE.board.rows);
      assert.equal(grid[0]?.length, BALANCE.board.cols);
      assert.equal(findRuns(grid).length, 0);
      assert.equal(hasAnyMove(grid), true);
      for (const row of grid) for (const gem of row) assert.ok(gem);
    }
  });

  it('ignores pairs and finds a line of three', () => {
    const grid = checkerGrid();
    assert.equal(findRuns(grid).length, 0);
    cell(grid, 2, 2).color = 'tank';
    cell(grid, 2, 3).color = 'tank';
    assert.equal(findRuns(grid).length, 0);
    cell(grid, 2, 4).color = 'tank';
    const runs = findRuns(grid);
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.cells.length, 3);
  });

  it('turns a match of 4 into a row-clear gem and a match of 5 into a color bomb', () => {
    const four = checkerGrid();
    for (let c = 2; c <= 5; c++) cell(four, 4, c).color = 'heli';
    const line = resolveStep(four, { prefer: [{ r: 4, c: 3 }], rng: () => 0.2 });
    assert.ok(line);
    assert.equal(line.transforms.length, 1);
    assert.equal(line.transforms[0]?.special, 'lineRow');
    assert.equal(line.cleared.length, 3);
    const lineId = line.transforms[0]?.id ?? -1;
    const kept = four.flat().find((gem) => gem?.id === lineId);
    assert.equal(kept?.special, 'lineRow');
    assert.equal(kept?.color, 'heli');

    const five = checkerGrid();
    for (let c = 1; c <= 5; c++) cell(five, 6, c).color = 'super';
    const bomb = resolveStep(five, { prefer: [{ r: 6, c: 3 }], rng: () => 0.2 });
    assert.ok(bomb);
    assert.equal(bomb.transforms[0]?.special, 'bomb');
    assert.equal(bomb.cleared.length, 4);
  });

  it('detonates a line gem across its row and a color bomb across its target', () => {
    const grid = checkerGrid();
    const origin = cell(grid, 3, 1);
    origin.special = 'lineRow';
    const step = resolveStep(grid, { activate: [{ r: 3, c: 1 }], rng: () => 0.4 });
    assert.ok(step);
    assert.equal(step.cleared.length, 8);
    assert.ok(step.cleared.every((entry) => entry.pos.r === 3));

    const bombs = checkerGrid();
    const ids = [cell(bombs, 0, 0), cell(bombs, 1, 2), cell(bombs, 4, 5), cell(bombs, 7, 3)].map((gem) => {
      gem.color = 'tank';
      return gem.id;
    });
    cell(bombs, 0, 0).special = 'bomb';
    const blown = resolveStep(bombs, {
      activate: [{ r: 0, c: 0 }],
      bombTargets: new Map([['0:0', 'tank']]),
      rng: () => 0.3,
    });
    assert.ok(blown);
    const clearedIds = new Set(blown.cleared.map((entry) => entry.cell.id));
    for (const id of ids) assert.equal(clearedIds.has(id), true);
  });

  it('chains a line gem into another special on the same clear', () => {
    const grid = checkerGrid();
    cell(grid, 2, 0).special = 'lineRow';
    cell(grid, 2, 4).special = 'lineCol';
    const step = resolveStep(grid, { activate: [{ r: 2, c: 0 }], rng: () => 0.2 });
    assert.ok(step);
    assert.ok(step.cleared.length > 8);
    assert.ok(step.cleared.some((entry) => entry.pos.c === 4 && entry.pos.r !== 2));
  });

  it('drops gems into holes and refills from above', () => {
    const grid = checkerGrid();
    const falling = cell(grid, 5, 0);
    grid[6]![0] = null;
    grid[7]![0] = null;
    const falls = collapseAndRefill(grid, () => 0.25);
    const move = falls.find((entry) => entry.id === falling.id);
    assert.equal(move?.toR, 7);
    assert.equal(cell(grid, 7, 0).id, falling.id);
    assert.ok(cell(grid, 0, 0));
    assert.ok(cell(grid, 1, 0));
    assert.equal(falls.filter((entry) => entry.spawned && entry.c === 0).length, 2);
  });

  it('cascades when a falling gem completes a new line', () => {
    const grid = checkerGrid();
    cell(grid, 4, 3).color = 'tank';
    cell(grid, 5, 3).color = 'heli';
    cell(grid, 5, 4).color = 'heli';
    cell(grid, 5, 5).color = 'heli';
    cell(grid, 6, 3).color = 'tank';
    cell(grid, 7, 3).color = 'tank';
    assert.equal(findRuns(grid).length, 1);
    const first = resolveStep(grid, { rng: () => 0.15 });
    assert.ok(first);
    assert.equal(countColor(first.cleared, 'heli'), 3);
    const second = resolveStep(grid, { rng: () => 0.15 });
    assert.ok(second);
    assert.ok(countColor(second.cleared, 'tank') >= 3);
  });

  it('rejects a swap that does not match and accepts one that does', () => {
    const grid = checkerGrid();
    const before = grid.map((row) => row.map((gem) => gem?.color));
    const sideways: Pos = { r: 0, c: 0 };
    const neighbor: Pos = { r: 0, c: 1 };
    assert.equal(swapActivates(grid, sideways, neighbor), false);
    assert.deepEqual(
      grid.map((row) => row.map((gem) => gem?.color)),
      before,
    );
    const down: Pos = { r: 1, c: 1 };
    assert.equal(swapActivates(grid, neighbor, down), true);
    swapCells(grid, neighbor, down);
    assert.ok(findRuns(grid).length > 0);
    swapCells(grid, neighbor, down);
    assert.deepEqual(
      grid.map((row) => row.map((gem) => gem?.color)),
      before,
    );

    const quiet = checkerGrid();
    for (let r = 0; r < quiet.length; r++) {
      for (let c = 0; c < (quiet[0]?.length ?? 0); c++) {
        const colors: GemColor[] = ['credit', 'infantry', 'tank', 'heli', 'super'];
        cell(quiet, r, c).color = colors[(c + r * 2) % colors.length] ?? 'credit';
        cell(quiet, r, c).special = 'none';
      }
    }
    const hint = findHint(quiet);
    if (hint) {
      assert.equal(swapActivates(quiet, hint.a, hint.b), true);
    }
    const act = activationForSwap(quiet, { r: 0, c: 0 }, { r: 0, c: 1 });
    assert.deepEqual(act.prefer[0], { r: 0, c: 1 });
  });

  it('pays infantry for a red match-3 and extra on a cascade multiplier', () => {
    const step = {
      cleared: [
        { pos: { r: 0, c: 0 }, cell: { id: 1, color: 'infantry' as const, special: 'none' as const } },
        { pos: { r: 0, c: 1 }, cell: { id: 2, color: 'infantry' as const, special: 'none' as const } },
        { pos: { r: 0, c: 2 }, cell: { id: 3, color: 'infantry' as const, special: 'none' as const } },
      ],
      transforms: [],
      falls: [],
    };
    const first = rewardForStep(step, 1);
    assert.deepEqual(first.spawns, [{ kind: 'infantry', count: 1 }]);
    const chained = rewardForStep(step, 3);
    assert.ok((chained.spawns[0]?.count ?? 0) >= 2);
    assert.deepEqual(first.strikes, []);
    assert.equal(first.spawns.some((spawn) => spawn.kind === 'medic'), false);
  });

  it('sends a medic with a match-4 of infantry and on a green cascade', () => {
    const four = [0, 1, 2, 3].map((c) => ({
      pos: { r: 0, c },
      cell: { id: c + 1, color: 'infantry' as const, special: 'none' as const },
    }));
    const match4 = rewardForStep({ cleared: four, transforms: [], falls: [] }, 1);
    assert.equal(match4.spawns.some((spawn) => spawn.kind === 'medic'), true);
    const cascade = rewardForStep(
      {
        cleared: four.slice(0, 3),
        transforms: [],
        falls: [],
      },
      2,
    );
    assert.equal(cascade.spawns.some((spawn) => spawn.kind === 'medic'), true);
  });

  it('calls a tank artillery strike on a match of 5', () => {
    const cleared = [0, 1, 2, 3].map((c) => ({
      pos: { r: 1, c },
      cell: { id: c + 1, color: 'tank' as const, special: 'none' as const },
    }));
    const reward = rewardForStep(
      {
        cleared,
        transforms: [{ pos: { r: 1, c: 4 }, special: 'bomb', id: 9, color: 'tank' }],
        falls: [],
      },
      1,
    );
    assert.deepEqual(reward.strikes, ['shell']);
    assert.ok(reward.spawns.some((spawn) => spawn.kind === 'tank'));
  });

  it('settles random swaps into a full, movable board', () => {
    const rng = mulberry32(9);
    const grid = createInitialGrid(rng);
    for (let turn = 0; turn < 12; turn++) {
      const hint = findHint(grid);
      assert.ok(hint);
      assert.equal(swapActivates(grid, hint.a, hint.b), true);
      swapCells(grid, hint.a, hint.b);
      const act = activationForSwap(grid, hint.a, hint.b);
      let first = true;
      for (let i = 0; i < BALANCE.match.maxCascades; i++) {
        const step = resolveStep(grid, first ? { ...act, rng } : { rng });
        if (!step) break;
        first = false;
        rewardForStep(step, i + 1);
      }
      ensurePlayable(grid, rng);
      assert.equal(findRuns(grid).length, 0);
      assert.equal(hasAnyMove(grid), true);
      for (const row of grid) for (const gem of row) assert.ok(gem);
    }
  });
});
