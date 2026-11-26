import type { GemColor } from './types';

export const FONT = 'Kanit, Verdana, "Trebuchet MS", sans-serif';

export const INK = '#f4f1ea';
export const MUTED = '#b7c0c8';
export const GOLD = '#f0c43a';
export const TEAL = '#3ee0c5';
export const CORAL = '#ff6b5b';

export const GEM_HEX: Record<GemColor, number> = {
  credit: 0xf0c43a,
  infantry: 0x3ecf7a,
  tank: 0xe24b4b,
  heli: 0x4c8dff,
  super: 0xc45bff,
};

export const GEM_CSS: Record<GemColor, string> = {
  credit: '#f0c43a',
  infantry: '#5ee08f',
  tank: '#ff6b6b',
  heli: '#7ab0ff',
  super: '#d58bff',
};

export function shade(hex: number, amt: number): number {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}
