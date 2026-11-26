import type { RegionId } from './world';

/** Two fictional armies. The map under them is only a coastline. */
export type FactionId = 'azure' | 'crimson';

export interface FactionDef {
  id: FactionId;
  name: string;
  blurb: string;
  /** Pad and territory color. */
  color: number;
  startRegion: RegionId;
  startNode: number;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  azure: {
    id: 'azure',
    name: 'Azure Coalition',
    blurb: 'Blue domes, hangars, and prism towers. The seam likes a steady hand.',
    color: 0x3a78c8,
    startRegion: 'town',
    startNode: 1,
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Directorate',
    blurb: 'Red industry, coil towers, and gold domes. The seam is a furnace.',
    color: 0xc4473a,
    startRegion: 'coast',
    startNode: 15,
  },
};

export function isFactionId(value: string): value is FactionId {
  return value === 'azure' || value === 'crimson';
}

export function otherFaction(id: FactionId): FactionId {
  return id === 'azure' ? 'crimson' : 'azure';
}

/** Battle-sprite sheet side. Azure uses the blue set for its own troops. */
export function skinFor(faction: FactionId, ownerIsPlayer: boolean): 'player' | 'enemy' {
  const blue = faction === 'azure';
  return ownerIsPlayer === blue ? 'player' : 'enemy';
}
