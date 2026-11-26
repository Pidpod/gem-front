import type { FactionId } from './factions';
import type { RegionId } from './world';

/** Gameplay perk. Names below are fictional; the perk is the only "real region" echo. */
export type PerkId =
  | 'walls'
  | 'cheapArmor'
  | 'gems'
  | 'snow'
  | 'cover'
  | 'drones'
  | 'spire'
  | 'oil'
  | 'oilLab'
  | 'arms'
  | 'lab'
  | 'mines'
  | 'navy'
  | 'trade'
  | 'harbor'
  | 'kitchen'
  | 'idol'
  | 'chips'
  | 'speed'
  | 'union'
  | 'jets'
  | 'repair'
  | 'spies'
  | 'vault'
  | 'ice'
  | 'infantry'
  | 'shield'
  | 'jungle'
  | 'minerals'
  | 'polite'
  | 'canal'
  | 'interest'
  | 'super'
  | 'grain'
  | 'tunnels'
  | 'spice'
  | 'pampas'
  | 'wells'
  | 'diamond'
  | 'fjord'
  | 'snipers'
  | 'frontier'
  | 'gas'
  | 'towers'
  | 'steppe'
  | 'ancient';

export interface TerritorySite {
  id: number;
  name: string;
  blurb: string;
  x: number;
  y: number;
  region: RegionId;
  perk: PerkId;
  seed: FactionId | 'open';
}

export const SITES: TerritorySite[] = [
  { id: 1, name: 'Aurel Hold', blurb: 'Frontier walls', x: 130, y: 380, region: 'town', perk: 'walls', seed: 'azure' },
  { id: 2, name: 'Wagon Mile', blurb: 'Cheap armor', x: 150, y: 450, region: 'town', perk: 'cheapArmor', seed: 'open' },
  { id: 3, name: 'Seam Cache', blurb: 'Buried gems', x: 90, y: 340, region: 'town', perk: 'gems', seed: 'open' },
  { id: 4, name: 'Root Line', blurb: 'Northern ice', x: 250, y: 210, region: 'forest', perk: 'snow', seed: 'frost' },
  { id: 5, name: 'West Vein', blurb: 'Quiet cover', x: 200, y: 250, region: 'forest', perk: 'cover', seed: 'open' },
  { id: 6, name: 'East Vein', blurb: 'Little rotors', x: 300, y: 240, region: 'forest', perk: 'drones', seed: 'open' },
  { id: 7, name: 'Heartwood Spire', blurb: 'Wood fortress', x: 250, y: 160, region: 'forest', perk: 'spire', seed: 'frost' },
  { id: 8, name: 'Cinder Gate', blurb: 'Oil fires', x: 240, y: 600, region: 'desert', perk: 'oil', seed: 'open' },
  { id: 9, name: 'Glass Flats', blurb: 'Oil and a hidden lab', x: 300, y: 660, region: 'desert', perk: 'oilLab', seed: 'open' },
  { id: 10, name: 'Quarry Cut', blurb: 'Arms market', x: 330, y: 620, region: 'desert', perk: 'arms', seed: 'open' },
  { id: 11, name: 'Buried Seam', blurb: 'Underground lab', x: 200, y: 700, region: 'desert', perk: 'lab', seed: 'open' },
  { id: 12, name: 'Oasis Battery', blurb: 'Diamond pits', x: 270, y: 740, region: 'desert', perk: 'mines', seed: 'open' },
  { id: 13, name: 'Tide Battery', blurb: 'Harbor guns', x: 400, y: 300, region: 'coast', perk: 'navy', seed: 'crimson' },
  { id: 14, name: 'Black Dock', blurb: 'Open ledgers', x: 460, y: 380, region: 'coast', perk: 'trade', seed: 'open' },
  { id: 15, name: 'Harbor Spire', blurb: 'Eastern well', x: 430, y: 340, region: 'coast', perk: 'harbor', seed: 'crimson' },
  { id: 16, name: 'Kitchen Bend', blurb: 'A neutral kitchen', x: 320, y: 480, region: 'coast', perk: 'kitchen', seed: 'open' },
  { id: 17, name: 'Idol Strand', blurb: 'Songs on the radio', x: 470, y: 260, region: 'coast', perk: 'idol', seed: 'open' },
  { id: 18, name: 'Chip Atoll', blurb: 'Tiny foundries', x: 500, y: 420, region: 'coast', perk: 'chips', seed: 'open' },
  { id: 19, name: 'Swift Coast', blurb: 'Fast roads', x: 180, y: 520, region: 'town', perk: 'speed', seed: 'open' },
  { id: 20, name: 'Trade Circle', blurb: 'Shared prices', x: 220, y: 300, region: 'town', perk: 'union', seed: 'open' },
  { id: 21, name: 'Prism Yard', blurb: 'Fast wings', x: 160, y: 280, region: 'town', perk: 'jets', seed: 'open' },
  { id: 22, name: 'Plate Works', blurb: 'Thick tanks', x: 200, y: 560, region: 'town', perk: 'repair', seed: 'open' },
  { id: 23, name: 'Spy Harbor', blurb: 'Quiet boats', x: 110, y: 500, region: 'town', perk: 'spies', seed: 'open' },
  { id: 24, name: 'Vault Peak', blurb: 'A neutral bank', x: 280, y: 120, region: 'forest', perk: 'vault', seed: 'open' },
  { id: 25, name: 'Ice Shelf', blurb: 'Rare ice metals', x: 310, y: 100, region: 'forest', perk: 'ice', seed: 'frost' },
  { id: 26, name: 'Loom Plain', blurb: 'Many rifles', x: 340, y: 520, region: 'desert', perk: 'infantry', seed: 'open' },
  { id: 27, name: 'Shield Mesa', blurb: 'A missile roof', x: 360, y: 560, region: 'desert', perk: 'shield', seed: 'open' },
  { id: 28, name: 'Canopy Reach', blurb: 'Jungle cover', x: 140, y: 800, region: 'desert', perk: 'jungle', seed: 'open' },
  { id: 29, name: 'Red Dust', blurb: 'Mineral pans', x: 180, y: 860, region: 'desert', perk: 'minerals', seed: 'open' },
  { id: 30, name: 'Polite Fir', blurb: 'A cold courtesy', x: 80, y: 200, region: 'forest', perk: 'polite', seed: 'open' },
  { id: 31, name: 'Canal Gate', blurb: 'Toll water', x: 380, y: 700, region: 'desert', perk: 'canal', seed: 'open' },
  { id: 32, name: 'Ledger Isle', blurb: 'Interest on the chest', x: 500, y: 500, region: 'coast', perk: 'interest', seed: 'open' },
  { id: 33, name: 'Foundry Key', blurb: 'Everyone wants the chips', x: 520, y: 300, region: 'coast', perk: 'super', seed: 'open' },
  { id: 34, name: 'Grain Steppe', blurb: 'Bread and rotors', x: 300, y: 400, region: 'town', perk: 'grain', seed: 'open' },
  { id: 35, name: 'Tunnel Marsh', blurb: 'Infantry from below', x: 360, y: 440, region: 'coast', perk: 'tunnels', seed: 'open' },
  { id: 36, name: 'Spice Port', blurb: 'Fast repairs', x: 420, y: 640, region: 'coast', perk: 'spice', seed: 'open' },
  { id: 37, name: 'Pampas Run', blurb: 'Long strides', x: 220, y: 900, region: 'desert', perk: 'pampas', seed: 'open' },
  { id: 38, name: 'White Deep', blurb: 'A lab under the ice', x: 300, y: 40, region: 'forest', perk: 'ancient', seed: 'frost' },
];

export function siteById(id: number): TerritorySite | undefined {
  return SITES.find((site) => site.id === id);
}

export interface PerkMods {
  funds: number;
  fundsMul: number;
  shop: number;
  tankHp: number;
  infantry: number;
  heli: number;
  super: number;
  speed: number;
  repair: number;
  heal: number;
  base: number;
  interest: number;
  enemySlow: number;
}

export function perkMods(cleared: number[]): PerkMods {
  const mods: PerkMods = {
    funds: 0,
    fundsMul: 1,
    shop: 1,
    tankHp: 1,
    infantry: 1,
    heli: 1,
    super: 1,
    speed: 1,
    repair: 1,
    heal: 1,
    base: 0,
    interest: 0,
    enemySlow: 1,
  };
  for (const id of cleared) {
    const perk = siteById(id)?.perk;
    if (perk === 'walls' || perk === 'frontier' || perk === 'shield') mods.base += 40;
    if (perk === 'cheapArmor' || perk === 'arms' || perk === 'union' || perk === 'trade') mods.shop *= 0.92;
    if (perk === 'oil' || perk === 'wells' || perk === 'gas' || perk === 'canal' || perk === 'grain') mods.funds += 12;
    if (perk === 'oilLab' || perk === 'lab' || perk === 'ancient' || perk === 'super' || perk === 'chips') mods.super *= 1.06;
    if (perk === 'kitchen') mods.heal *= 1.15;
    if (perk === 'idol' || perk === 'spice') mods.infantry *= 1.08;
    if (perk === 'speed' || perk === 'pampas' || perk === 'steppe') mods.speed *= 1.06;
    if (perk === 'jets' || perk === 'drones') mods.heli *= 1.1;
    if (perk === 'repair') mods.repair *= 1.12;
    if (perk === 'cheapArmor' || perk === 'arms' || perk === 'frontier') mods.tankHp *= 1.08;
    if (perk === 'snow' || perk === 'snipers' || perk === 'polite' || perk === 'ice') mods.enemySlow *= 0.95;
    if (perk === 'interest' || perk === 'fjord' || perk === 'vault') mods.interest += 0.02;
    if (perk === 'gems' || perk === 'mines' || perk === 'diamond' || perk === 'minerals') mods.funds += 8;
    if (perk === 'tunnels' || perk === 'jungle' || perk === 'cover') mods.infantry *= 1.06;
    if (perk === 'towers' || perk === 'spies' || perk === 'navy') mods.funds += 6;
  }
  return mods;
}

export const EXTRA_LINKS: [number, number][] = [];
for (let id = 16; id <= 38; id++) EXTRA_LINKS.push([id - 1, id]);
