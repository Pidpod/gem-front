import { BALANCE } from '../config/balance';

/** Portrait design resolution. Phaser FIT scales this to the browser viewport. */
export const VIEW_W = 480;
export const VIEW_H = 960;

export const LANE = {
  top: 78,
  bottom: 392,
  groundY: 334,
  playerX: 58,
  enemyX: 422,
  baseRadius: 30,
  spawnInset: 46,
};

export const LANES_Y = [-12, -4, 6, 14];

export const HUD = {
  barY: 12,
  barH: 26,
  barW: 168,
  leftX: 10,
  rightX: VIEW_W - 10 - 168,
  resourceY: 48,
  fireW: 92,
  fireH: 32,
};

export const COMMAND = {
  buttonY: 438,
  buttonW: 144,
  buttonH: 58,
  gap: 8,
};

export function boardGeom() {
  const cols = BALANCE.board.cols;
  const rows = BALANCE.board.rows;
  const cell = 48;
  const gap = 4;
  const stride = cell + gap;
  const size = cols * cell + (cols - 1) * gap;
  const originX = Math.round((VIEW_W - size) / 2);
  const originY = 528;
  return { cols, rows, cell, gap, stride, size, originX, originY };
}

export function cellCenter(c: number, r: number): { x: number; y: number } {
  const g = boardGeom();
  return {
    x: g.originX + c * g.stride + g.cell / 2,
    y: g.originY + r * g.stride + g.cell / 2,
  };
}

export function commandButtonX(index: number): number {
  const total = COMMAND.buttonW * 3 + COMMAND.gap * 2;
  const start = (VIEW_W - total) / 2 + COMMAND.buttonW / 2;
  return start + index * (COMMAND.buttonW + COMMAND.gap);
}
