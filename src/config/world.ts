export type RegionId = 'town' | 'forest' | 'desert' | 'coast';

export interface RegionDef {
  id: RegionId;
  name: string;
  /** Vertical band on the overworld, in pixels. */
  y: number;
  height: number;
  ground: number;
  path: number;
  /** Tint laid over the battlefield while fighting in this region. */
  battleTint: number;
  enemy: number;
  owned: number;
}

export interface WorldNode {
  id: number;
  x: number;
  y: number;
  region: RegionId;
  /** side nodes are optional detours. boss nodes are strongholds. */
  kind: 'main' | 'side' | 'boss';
  /** A settlement. Liberating it flips the skyline from ruins to a rebuilt city. */
  city?: boolean;
  /** Dialogue ids from src/config/dialogue.ts */
  before?: string;
  after?: string;
}

export const WORLD_H = 1680;

export const REGIONS: RegionDef[] = [
  { id: 'town', name: 'Halden Bastion', y: 0, height: 380, ground: 0x7a9a48, path: 0xc4b48a, battleTint: 0x8fb56a, enemy: 0xa14a42, owned: 0x2f8f78 },
  { id: 'forest', name: 'Veilwood', y: 380, height: 460, ground: 0x3e6a32, path: 0x8a7048, battleTint: 0x2f6a38, enemy: 0x8a3030, owned: 0x1f6a55 },
  { id: 'desert', name: 'Cinder Reach', y: 840, height: 420, ground: 0xd2b072, path: 0xefe0b0, battleTint: 0xe0b060, enemy: 0xa14a32, owned: 0x3a8a68 },
  { id: 'coast', name: 'Glass Harbor', y: 1260, height: 420, ground: 0xc4b888, path: 0xe8dcc0, battleTint: 0x6aa0c0, enemy: 0x8a3848, owned: 0x2a7890 },
];

export const NODES: WorldNode[] = [
  { id: 1, x: 240, y: 170, region: 'town', kind: 'main', city: true, before: 'depart', after: 'gate-clear' },
  { id: 2, x: 240, y: 320, region: 'town', kind: 'main' },
  { id: 3, x: 96, y: 250, region: 'town', kind: 'side' },
  { id: 4, x: 240, y: 480, region: 'forest', kind: 'main', before: 'forest-enter' },
  { id: 5, x: 112, y: 600, region: 'forest', kind: 'main' },
  { id: 6, x: 368, y: 600, region: 'forest', kind: 'main' },
  { id: 7, x: 240, y: 740, region: 'forest', kind: 'boss', city: true, before: 'heartwood', after: 'heartwood-clear' },
  { id: 8, x: 240, y: 920, region: 'desert', kind: 'main', city: true, before: 'dunes' },
  { id: 9, x: 112, y: 1040, region: 'desert', kind: 'main' },
  { id: 10, x: 368, y: 1040, region: 'desert', kind: 'main' },
  { id: 11, x: 80, y: 1160, region: 'desert', kind: 'side' },
  { id: 12, x: 240, y: 1180, region: 'desert', kind: 'main', city: true },
  { id: 13, x: 240, y: 1360, region: 'coast', kind: 'main', before: 'coast' },
  { id: 14, x: 380, y: 1440, region: 'coast', kind: 'side' },
  { id: 15, x: 240, y: 1560, region: 'coast', kind: 'boss', city: true, before: 'harbor', after: 'harbor-clear' },
];

/** Undirected roads. A node opens once any neighbor is cleared. */
export const PATHS: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 4],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
  [7, 8],
  [8, 9],
  [8, 10],
  [9, 11],
  [9, 12],
  [10, 12],
  [12, 13],
  [13, 14],
  [13, 15],
];

export function nodeById(id: number): WorldNode {
  return NODES.find((node) => node.id === id) ?? NODES[0]!;
}

export function regionById(id: RegionId): RegionDef {
  return REGIONS.find((region) => region.id === id) ?? REGIONS[0]!;
}

export function neighbors(id: number): number[] {
  const list: number[] = [];
  for (const [a, b] of PATHS) {
    if (a === id) list.push(b);
    else if (b === id) list.push(a);
  }
  return list;
}

/** Walk along roads. `canEnter` must allow every node on the route, including the destination. */
export function route(from: number, to: number, canEnter: (id: number) => boolean): number[] | null {
  if (from === to) return [from];
  const queue: number[] = [from];
  const prev = new Map<number, number | null>([[from, null]]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of neighbors(current)) {
      if (prev.has(next) || !canEnter(next)) continue;
      prev.set(next, current);
      if (next === to) {
        const path: number[] = [to];
        let cursor: number | null = current;
        while (cursor !== null) {
          path.push(cursor);
          cursor = prev.get(cursor) ?? null;
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}
