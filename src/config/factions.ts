import type { CommanderId } from './commanders';
import type { RegionId } from './world';

const REGION_PATRON: Record<RegionId, FactionId> = {
  town: 'azure',
  forest: 'frost',
  coast: 'crimson',
  desert: 'crimson',
};

/** Who occupies a site the player has not liberated. */
export function garrison(region: RegionId, player: FactionId): FactionId {
  const patron = REGION_PATRON[region];
  if (patron !== player) return patron;
  if (player === 'azure') return 'crimson';
  if (player === 'crimson') return 'frost';
  return 'azure';
}

/** Three fictional armies. Coastlines on the map are only a backdrop. */
export type FactionId = 'azure' | 'crimson' | 'frost';

export interface FactionDef {
  id: FactionId;
  name: string;
  blurb: string;
  color: number;
  startRegion: RegionId;
  startNode: number;
  leader: CommanderId;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  azure: {
    id: 'azure',
    name: 'Azure Coalition',
    blurb: 'Blue domes, hangars, and prism towers. No pacts. Outbuild everyone.',
    color: 0x3a78c8,
    startRegion: 'town',
    startNode: 1,
    leader: 'rump',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Directorate',
    blurb: 'Red industry, coil towers, and gold domes. A late pact with the ice is possible.',
    color: 0xc4473a,
    startRegion: 'coast',
    startNode: 15,
    leader: 'xin',
  },
  frost: {
    id: 'frost',
    name: 'Frost Mandate',
    blurb: 'White ramparts and a long table. A late pact with the red furnaces is possible.',
    color: 0x6a90b0,
    startRegion: 'forest',
    startNode: 4,
    leader: 'pootin',
  },
};

export function isFactionId(value: string): value is FactionId {
  return value === 'azure' || value === 'crimson' || value === 'frost';
}

export function otherFaction(id: FactionId): FactionId {
  if (id === 'azure') return 'crimson';
  if (id === 'crimson') return 'frost';
  return 'azure';
}

/** The rival that may offer a pact. Azure never gets one. */
export function pactPartner(id: FactionId): FactionId | null {
  if (id === 'crimson') return 'frost';
  if (id === 'frost') return 'crimson';
  return null;
}

/** Battle-sprite sheet. Azure uses the blue set. Crimson uses the red set. Frost tints the blue set. */
export function skinFor(faction: FactionId, ownerIsPlayer: boolean): 'player' | 'enemy' {
  if (faction === 'crimson') return ownerIsPlayer ? 'enemy' : 'player';
  return ownerIsPlayer ? 'player' : 'enemy';
}
