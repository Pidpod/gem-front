import { BALANCE } from '../../config/balance';
import { GEM_COLORS, type Cell, type GemColor, type Pos, type Rng, type Special } from '../types';

export type Grid = (Cell | null)[][];

export interface Run {
  dir: 'h' | 'v';
  color: GemColor;
  cells: Pos[];
}

export interface FallMove {
  id: number;
  c: number;
  fromR: number;
  toR: number;
  spawned: boolean;
  cell: Cell;
}

export interface ClearStep {
  cleared: { pos: Pos; cell: Cell }[];
  transforms: { pos: Pos; special: Special; id: number }[];
  falls: FallMove[];
}

export interface SwapActivation {
  activate: Pos[];
  bombTargets: Map<string, GemColor | 'all'>;
  prefer: Pos[];
}

let nextId = 1;

export function makeCell(color: GemColor, special: Special = 'none'): Cell {
  return { id: nextId++, color, special };
}

export function posKey(p: Pos): string {
  return `${p.r}:${p.c}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function adjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function inBounds(grid: Grid, p: Pos): boolean {
  return p.r >= 0 && p.c >= 0 && p.r < grid.length && p.c < (grid[0]?.length ?? 0);
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function randomColor(rng: Rng): GemColor {
  const index = Math.floor(rng() * GEM_COLORS.length);
  return GEM_COLORS[index] ?? 'credit';
}

export function findRuns(grid: Grid): Run[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const runs: Run[] = [];
  const min = BALANCE.match.min;

  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const cell = grid[r]?.[c];
      if (!cell) {
        c += 1;
        continue;
      }
      let end = c + 1;
      while (end < cols && grid[r]?.[end] && grid[r]?.[end]?.color === cell.color) end += 1;
      if (end - c >= min) {
        const cells: Pos[] = [];
        for (let i = c; i < end; i++) cells.push({ r, c: i });
        runs.push({ dir: 'h', color: cell.color, cells });
      }
      c = end;
    }
  }

  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const cell = grid[r]?.[c];
      if (!cell) {
        r += 1;
        continue;
      }
      let end = r + 1;
      while (end < rows && grid[end]?.[c] && grid[end]?.[c]?.color === cell.color) end += 1;
      if (end - r >= min) {
        const cells: Pos[] = [];
        for (let i = r; i < end; i++) cells.push({ r: i, c });
        runs.push({ dir: 'v', color: cell.color, cells });
      }
      r = end;
    }
  }

  return runs;
}

interface Cluster {
  runs: Run[];
  cells: Pos[];
}

function clusterRuns(runs: Run[]): Cluster[] {
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root] ?? root;
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const owners = new Map<string, number>();
  runs.forEach((run, i) => {
    for (const p of run.cells) {
      const key = posKey(p);
      const prev = owners.get(key);
      if (prev === undefined) owners.set(key, i);
      else union(prev, i);
    }
  });
  const groups = new Map<number, Run[]>();
  runs.forEach((run, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(run);
    groups.set(root, list);
  });
  const clusters: Cluster[] = [];
  for (const list of groups.values()) {
    const map = new Map<string, Pos>();
    for (const run of list) for (const p of run.cells) map.set(posKey(p), p);
    clusters.push({ runs: list, cells: [...map.values()] });
  }
  return clusters;
}

function specialForCluster(cluster: Cluster): Special | null {
  const longest = cluster.runs.reduce((m, run) => Math.max(m, run.cells.length), 0);
  if (longest >= BALANCE.match.bombAt || cluster.cells.length >= BALANCE.match.bombAt) return 'bomb';
  const line = cluster.runs.find((run) => run.cells.length >= BALANCE.match.lineAt);
  if (!line) return null;
  return line.dir === 'h' ? 'lineRow' : 'lineCol';
}

function pickAnchor(cluster: Cluster, prefer: Pos[]): Pos {
  for (const p of prefer) {
    if (cluster.cells.some((cell) => cell.r === p.r && cell.c === p.c)) return p;
  }
  const longest = cluster.runs.reduce((best, run) => (run.cells.length > best.cells.length ? run : best));
  return longest.cells[Math.floor(longest.cells.length / 2)] ?? cluster.cells[0] ?? { r: 0, c: 0 };
}

interface Plan {
  cleared: Pos[];
  transforms: { pos: Pos; special: Special }[];
}

function planResolution(
  grid: Grid,
  runs: Run[],
  activate: Pos[],
  bombTargets: Map<string, GemColor | 'all'>,
  prefer: Pos[],
): Plan {
  const clusters = clusterRuns(runs);
  const activateKeys = new Set(activate.map(posKey));
  const transforms: { pos: Pos; special: Special }[] = [];
  const exempt = new Set<string>();

  for (const cluster of clusters) {
    const special = specialForCluster(cluster);
    if (!special) continue;
    const anchor = pickAnchor(cluster, prefer);
    const cell = grid[anchor.r]?.[anchor.c];
    if (!cell) continue;
    if (cell.special !== 'none' && activateKeys.has(posKey(anchor))) continue;
    exempt.add(posKey(anchor));
    transforms.push({ pos: anchor, special });
  }

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const seen = new Set<string>();
  const cleared: Pos[] = [];

  const enqueue = (p: Pos): void => {
    if (p.r < 0 || p.c < 0 || p.r >= rows || p.c >= cols) return;
    const key = posKey(p);
    if (seen.has(key)) return;
    seen.add(key);
    const cell = grid[p.r]?.[p.c];
    if (!cell) return;
    if (!exempt.has(key)) cleared.push(p);
    expand(p, cell);
  };

  const expand = (p: Pos, cell: Cell): void => {
    if (cell.special === 'lineRow') {
      for (let c = 0; c < cols; c++) enqueue({ r: p.r, c });
    } else if (cell.special === 'lineCol') {
      for (let r = 0; r < rows; r++) enqueue({ r, c: p.c });
    } else if (cell.special === 'bomb') {
      const target = bombTargets.get(posKey(p)) ?? cell.color;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (target === 'all') {
            enqueue({ r, c });
          } else if (grid[r]?.[c]?.color === target) {
            enqueue({ r, c });
          }
        }
      }
    }
  };

  for (const run of runs) for (const p of run.cells) enqueue(p);
  for (const p of activate) enqueue(p);
  return { cleared, transforms };
}

export function collapseAndRefill(grid: Grid, rng: Rng): FallMove[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moves: FallMove[] = [];

  for (let c = 0; c < cols; c++) {
    const stack: { cell: Cell; fromR: number }[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const cell = grid[r]?.[c];
      if (cell) stack.push({ cell, fromR: r });
    }
    for (let r = 0; r < rows; r++) {
      const row = grid[r];
      if (row) row[c] = null;
    }
    for (let i = 0; i < stack.length; i++) {
      const entry = stack[i];
      if (!entry) continue;
      const toR = rows - 1 - i;
      const row = grid[toR];
      if (row) row[c] = entry.cell;
      if (entry.fromR !== toR) {
        moves.push({
          id: entry.cell.id,
          c,
          fromR: entry.fromR,
          toR,
          spawned: false,
          cell: entry.cell,
        });
      }
    }
    const missing = rows - stack.length;
    for (let k = 0; k < missing; k++) {
      const cell = makeCell(randomColor(rng));
      const row = grid[k];
      if (row) row[c] = cell;
      moves.push({
        id: cell.id,
        c,
        fromR: k - missing,
        toR: k,
        spawned: true,
        cell,
      });
    }
  }

  return moves;
}

export interface ResolveInput {
  activate?: Pos[];
  bombTargets?: Map<string, GemColor | 'all'>;
  prefer?: Pos[];
  rng?: Rng;
}

export function resolveStep(grid: Grid, input: ResolveInput = {}): ClearStep | null {
  const runs = findRuns(grid);
  const activate = input.activate ?? [];
  if (runs.length === 0 && activate.length === 0) return null;

  const plan = planResolution(grid, runs, activate, input.bombTargets ?? new Map(), input.prefer ?? []);
  const cleared: { pos: Pos; cell: Cell }[] = [];
  for (const pos of plan.cleared) {
    const cell = grid[pos.r]?.[pos.c];
    if (cell) cleared.push({ pos, cell });
  }
  const transforms = plan.transforms.map((entry) => {
    const cell = grid[entry.pos.r]?.[entry.pos.c];
    return { pos: entry.pos, special: entry.special, id: cell?.id ?? -1 };
  });

  for (const entry of plan.transforms) {
    const cell = grid[entry.pos.r]?.[entry.pos.c];
    if (cell) cell.special = entry.special;
  }
  for (const pos of plan.cleared) {
    const row = grid[pos.r];
    if (row) row[pos.c] = null;
  }

  const falls = collapseAndRefill(grid, input.rng ?? Math.random);
  return { cleared, transforms, falls };
}

export function swapCells(grid: Grid, a: Pos, b: Pos): void {
  const rowA = grid[a.r];
  const rowB = grid[b.r];
  if (!rowA || !rowB) return;
  const tmp = rowA[a.c];
  rowA[a.c] = rowB[b.c] ?? null;
  rowB[b.c] = tmp ?? null;
}

export function swapActivates(grid: Grid, a: Pos, b: Pos): boolean {
  const left = grid[a.r]?.[a.c];
  const right = grid[b.r]?.[b.c];
  if (!left || !right) return false;
  if (left.special !== 'none' || right.special !== 'none') return true;
  swapCells(grid, a, b);
  const ok = findRuns(grid).length > 0;
  swapCells(grid, a, b);
  return ok;
}

/** `origin` and `dest` are positions after the swap. `dest` holds the dragged gem. */
export function activationForSwap(grid: Grid, origin: Pos, dest: Pos): SwapActivation {
  const stayed = grid[origin.r]?.[origin.c];
  const dragged = grid[dest.r]?.[dest.c];
  const activate: Pos[] = [];
  const bombTargets = new Map<string, GemColor | 'all'>();
  const prefer = [dest, origin];
  if (!stayed || !dragged) return { activate, bombTargets, prefer };
  if (stayed.special !== 'none') activate.push(origin);
  if (dragged.special !== 'none') activate.push(dest);
  if (stayed.special === 'bomb' && dragged.special === 'bomb') {
    bombTargets.set(posKey(origin), 'all');
    bombTargets.set(posKey(dest), 'all');
  } else if (stayed.special === 'bomb') {
    bombTargets.set(posKey(origin), dragged.color);
  } else if (dragged.special === 'bomb') {
    bombTargets.set(posKey(dest), stayed.color);
  }
  return { activate, bombTargets, prefer };
}

export function findHint(grid: Grid): { a: Pos; b: Pos } | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  let specialOnly: { a: Pos; b: Pos } | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors: Pos[] = [
        { r, c: c + 1 },
        { r: r + 1, c },
      ];
      for (const n of neighbors) {
        if (n.c >= cols || n.r >= rows) continue;
        const a = grid[r]?.[c];
        const b = grid[n.r]?.[n.c];
        if (!a || !b) continue;
        swapCells(grid, { r, c }, n);
        const matched = findRuns(grid).length > 0;
        swapCells(grid, { r, c }, n);
        if (matched) return { a: { r, c }, b: n };
        if (!specialOnly && (a.special !== 'none' || b.special !== 'none')) {
          specialOnly = { a: { r, c }, b: n };
        }
      }
    }
  }
  return specialOnly;
}

export function hasAnyMove(grid: Grid): boolean {
  return findHint(grid) !== null;
}

function pickAvoiding(grid: Grid, r: number, c: number, rng: Rng): GemColor {
  const avoid = new Set<GemColor>();
  if (c >= 2) {
    const a = grid[r]?.[c - 1];
    const b = grid[r]?.[c - 2];
    if (a && b && a.color === b.color) avoid.add(a.color);
  }
  if (r >= 2) {
    const a = grid[r - 1]?.[c];
    const b = grid[r - 2]?.[c];
    if (a && b && a.color === b.color) avoid.add(a.color);
  }
  const options = GEM_COLORS.filter((color) => !avoid.has(color));
  const pool = options.length > 0 ? options : GEM_COLORS;
  return pool[Math.floor(rng() * pool.length)] ?? 'credit';
}

export function createInitialGrid(rng: Rng = Math.random): Grid {
  const rows = BALANCE.board.rows;
  const cols = BALANCE.board.cols;
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid: Grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const row = grid[r];
        if (row) row[c] = makeCell(pickAvoiding(grid, r, c, rng));
      }
    }
    if (findRuns(grid).length === 0 && hasAnyMove(grid)) return grid;
  }
  return checkerGrid();
}

function breakMatches(grid: Grid, rng: Rng): void {
  const runs = findRuns(grid);
  for (const run of runs) {
    const mid = run.cells[Math.floor(run.cells.length / 2)];
    if (!mid) continue;
    const cell = grid[mid.r]?.[mid.c];
    if (!cell) continue;
    const choices = GEM_COLORS.filter((color) => color !== cell.color);
    cell.color = choices[Math.floor(rng() * choices.length)] ?? 'credit';
    cell.special = 'none';
  }
}

export function pasteGrid(target: Grid, source: Grid): void {
  for (let r = 0; r < target.length; r++) {
    for (let c = 0; c < (target[0]?.length ?? 0); c++) {
      const row = target[r];
      if (row) row[c] = source[r]?.[c] ?? null;
    }
  }
}

/** Clears leftover matches and guarantees a move, reshuffling if needed. */
export function ensurePlayable(grid: Grid, rng: Rng): 'ok' | 'recolored' | 'reshuffled' {
  let recolored = false;
  for (let i = 0; i < 8 && findRuns(grid).length > 0; i++) {
    breakMatches(grid, rng);
    recolored = true;
  }
  if (findRuns(grid).length > 0 || !hasAnyMove(grid)) {
    pasteGrid(grid, createInitialGrid(rng));
    return 'reshuffled';
  }
  return recolored ? 'recolored' : 'ok';
}

export function emptyGrid(): Grid {
  const rows = BALANCE.board.rows;
  const cols = BALANCE.board.cols;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

/** Checker of two colors. Useful for tests that punch in a specific match. */
export function checkerGrid(): Grid {
  const grid = emptyGrid();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[0]?.length ?? 0); c++) {
      const row = grid[r];
      if (row) row[c] = makeCell((r + c) % 2 === 0 ? 'credit' : 'infantry');
    }
  }
  return grid;
}
