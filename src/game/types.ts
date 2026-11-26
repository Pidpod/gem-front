export type Rng = () => number;

export type Side = 'player' | 'enemy';

export type GemColor = 'credit' | 'infantry' | 'armor' | 'repair' | 'super';

export type Special = 'none' | 'lineRow' | 'lineCol' | 'bomb';

export type UnitKind = 'infantry' | 'tank' | 'rocket' | 'heavy' | 'artillery';

export type ShopKind = 'rocket' | 'heavy' | 'artillery';

export type Outcome = 'play' | 'win' | 'lose';

export const GEM_COLORS: GemColor[] = ['credit', 'infantry', 'armor', 'repair', 'super'];

export interface Cell {
  id: number;
  color: GemColor;
  special: Special;
}

export interface Pos {
  r: number;
  c: number;
}

export interface RunStats {
  elapsed: number;
  creditsEarned: number;
  unitsSpawned: number;
  bestCombo: number;
  supersFired: number;
  gemsCleared: number;
}

export function emptyStats(): RunStats {
  return {
    elapsed: 0,
    creditsEarned: 0,
    unitsSpawned: 0,
    bestCombo: 0,
    supersFired: 0,
    gemsCleared: 0,
  };
}
