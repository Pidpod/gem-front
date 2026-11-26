import type { RegionId } from './world';

export const GLOBE_W = 560;
export const GLOBE_H = 1100;
export const PLATE_W = 560;
export const PLATE_H = 760;

export interface Territory {
  region: RegionId;
  /** Fictional name painted on the globe. */
  name: string;
  x: number;
  y: number;
}

/** Where each campaign region sits on the stylized globe. */
export const TERRITORIES: Territory[] = [
  { region: 'town', name: 'Aurel Hold', x: 130, y: 380 },
  { region: 'forest', name: 'Veilwood', x: 250, y: 210 },
  { region: 'desert', name: 'Cinder Reach', x: 270, y: 640 },
  { region: 'coast', name: 'Glass Harbor', x: 430, y: 340 },
];

/** Node positions on that region's isometric plate. */
export const PLATE: Record<number, { x: number; y: number }> = {
  1: { x: 280, y: 200 },
  2: { x: 280, y: 430 },
  3: { x: 140, y: 320 },
  4: { x: 280, y: 160 },
  5: { x: 130, y: 360 },
  6: { x: 430, y: 360 },
  7: { x: 280, y: 560 },
  8: { x: 280, y: 150 },
  9: { x: 140, y: 340 },
  10: { x: 420, y: 340 },
  11: { x: 90, y: 500 },
  12: { x: 280, y: 540 },
  13: { x: 250, y: 180 },
  14: { x: 430, y: 340 },
  15: { x: 250, y: 520 },
};

export function territoryByRegion(region: RegionId): Territory {
  return TERRITORIES.find((entry) => entry.region === region) ?? TERRITORIES[0]!;
}

export function platePos(id: number): { x: number; y: number } {
  return PLATE[id] ?? { x: 280, y: 360 };
}
