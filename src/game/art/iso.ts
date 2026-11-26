import { LANE, VIEW_H, VIEW_W } from '../layout';
import type { Side, UnitKind } from '../types';

/** Isometric diamond the one-lane battle is drawn on. */
export const FIELD = {
  ox: 240,
  oy: 112,
  cols: 9,
  rows: 9,
  tw: 52,
  th: 28,
  wall: 14,
};

export function project(x: number, y: number): { sx: number; sy: number } {
  const span = LANE.enemyX - LANE.playerX;
  const t = Math.max(-0.06, Math.min(1.06, (x - LANE.playerX) / span));
  const lat = (y - LANE.groundY) / 72;
  const c = t * (FIELD.cols - 1) + lat * 0.9;
  const r = (1 - t) * (FIELD.rows - 1) - lat * 0.9;
  return {
    sx: FIELD.ox + (c - r) * (FIELD.tw / 2),
    sy: FIELD.oy + (c + r) * (FIELD.th / 2),
  };
}

const FW = 80;
const FH = 72;

export function installIso(scene: Phaser.Scene): void {
  if (scene.textures.exists('iso-terrain')) return;
  bakeImage(scene, 'iso-terrain', VIEW_W, 360, (ctx) => paintField(ctx, 'day'));
  bakeImage(scene, 'iso-front', VIEW_W, VIEW_H, (ctx) => paintFront(ctx));
  for (const side of ['player', 'enemy'] as const) {
    bakeFrames(scene, `iso-base-${side}`, FW, FH, 2, (ctx, frame) => drawBase(ctx, side, frame));
    for (const kind of ['infantry', 'rocket', 'tank', 'heavy', 'artillery', 'heli', 'medic', 'ship'] as const) {
      bakeFrames(scene, `iso-${kind}-${side}`, FW, FH, 2, (ctx, frame) => drawUnit(ctx, kind, side, frame));
    }
  }
  bakeFrames(scene, 'iso-boom', 72, 72, 5, (ctx, frame) => drawBoom(ctx, frame));
  bakeFrames(scene, 'iso-flash', 32, 32, 1, (ctx) => drawFlash(ctx));
}

function bakeImage(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  paint(ctx);
  const texture = scene.textures.addCanvas(key, canvas);
  texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function bakeFrames(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  frames: number,
  paint: (ctx: CanvasRenderingContext2D, frame: number) => void,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = w * frames;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  for (let i = 0; i < frames; i++) {
    ctx.save();
    ctx.translate(i * w, 0);
    paint(ctx, i);
    ctx.restore();
  }
  const texture = scene.textures.addCanvas(key, canvas);
  if (!texture) return;
  for (let i = 0; i < frames; i++) texture.add(i, 0, i * w, 0, w, h);
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function paintField(ctx: CanvasRenderingContext2D, mode: 'day' | 'night'): void {
  const sky = ctx.createLinearGradient(0, 0, 0, 200);
  if (mode === 'day') {
    sky.addColorStop(0, '#7eb6e6');
    sky.addColorStop(1, '#d5e4c4');
  } else {
    sky.addColorStop(0, '#141a28');
    sky.addColorStop(1, '#3a2a22');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, 360);
  for (let sum = 0; sum < FIELD.cols + FIELD.rows - 1; sum++) {
    for (let c = 0; c < FIELD.cols; c++) {
      const r = sum - c;
      if (r < 0 || r >= FIELD.rows) continue;
      const at = tileAt(c, r);
      drawTile(ctx, c, r, at.top, at.left, at.right, at.wall);
      if (at.mark === 'crater') crater(ctx, c, r);
      if (at.mark === 'ruin') ruin(ctx, c, r);
    }
  }
  frontline(ctx);
}

function tileAt(c: number, r: number): { top: string; left: string; right: string; wall: number; mark?: 'crater' | 'ruin' } {
  const onRoad = c + r === FIELD.cols - 1;
  const shoulder = Math.abs(c + r - (FIELD.cols - 1)) === 1;
  const water = r >= FIELD.rows - 2;
  const cliff = r === 0 || c === FIELD.cols - 1;
  if (water) return { top: '#3a7eaa', left: '#1d4e72', right: '#8ec8e6', wall: 8 };
  if (cliff) return { top: '#8d877c', left: '#4a453e', right: '#c2b8a6', wall: 22 };
  if (onRoad) return { top: '#9a9284', left: '#5c564c', right: '#d2c8b4', wall: 10 };
  if (shoulder) return { top: '#b08a48', left: '#7a5a2c', right: '#e0c078', wall: 12 };
  const mark = (c * 5 + r * 3) % 17 === 0 ? 'crater' : (c === 2 && r === 5) || (c === 6 && r === 2) ? 'ruin' : undefined;
  return { top: (c + r) % 2 === 0 ? '#6f9348' : '#7ea456', left: '#3f5e28', right: '#a4c878', wall: 12, mark };
}

function tileCenter(c: number, r: number): { x: number; y: number } {
  return {
    x: FIELD.ox + (c - r) * (FIELD.tw / 2),
    y: FIELD.oy + (c + r) * (FIELD.th / 2),
  };
}

function drawTile(ctx: CanvasRenderingContext2D, c: number, r: number, top: string, left: string, right: string, wall: number): void {
  const { x, y } = tileCenter(c, r);
  const hw = FIELD.tw / 2;
  const hh = FIELD.th / 2;
  poly(ctx, [x, y - hh, x + hw, y, x, y + hh, x - hw, y], top);
  poly(ctx, [x - hw, y, x, y + hh, x, y + hh + wall, x - hw, y + wall], left);
  poly(ctx, [x + hw, y, x, y + hh, x, y + hh + wall, x + hw, y + wall], right);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
  ctx.stroke();
}

function crater(ctx: CanvasRenderingContext2D, c: number, r: number): void {
  const { x, y } = tileCenter(c, r);
  ctx.fillStyle = 'rgba(40,32,20,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,180,120,0.45)';
  ctx.stroke();
}

function ruin(ctx: CanvasRenderingContext2D, c: number, r: number): void {
  const { x, y } = tileCenter(c, r);
  ctx.fillStyle = '#6a5a48';
  ctx.fillRect(x - 8, y - 16, 6, 16);
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(x + 2, y - 10, 8, 12);
}

function frontline(ctx: CanvasRenderingContext2D): void {
  const mid = tileCenter(4, 4);
  ctx.strokeStyle = '#5a4030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mid.x - 70, mid.y + 8);
  ctx.lineTo(mid.x + 54, mid.y - 28);
  ctx.stroke();
  ctx.strokeStyle = '#c8b090';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = mid.x - 64 + i * 16;
    const y = mid.y + 6 - i * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8, y - 4);
    ctx.lineTo(x + 3, y + 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#c2a878';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(mid.x - 36 + i * 14, mid.y + 10 - i * 4, 12, 5);
    ctx.fillStyle = i % 2 ? '#a88858' : '#d4bc90';
  }
  ctx.fillStyle = 'rgba(30,24,16,0.45)';
  ctx.beginPath();
  ctx.ellipse(mid.x + 8, mid.y + 16, 28, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function paintFront(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#0e1422');
  sky.addColorStop(0.45, '#2a221c');
  sky.addColorStop(1, '#14110e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(255,244,220,0.7)';
    ctx.fillRect((i * 97) % VIEW_W, (i * 53) % 220, 2, 2);
  }
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 52;
    const h = 70 + ((i * 37) % 90);
    ctx.fillStyle = '#1a1816';
    ctx.fillRect(x, 250 - h, 36, h);
    ctx.fillStyle = i % 2 ? '#3a241c' : '#241c18';
    ctx.fillRect(x + 4, 250 - h + 8, 28, h - 8);
    for (let wy = 250 - h + 14; wy < 240; wy += 14) {
      ctx.fillStyle = (i + wy) % 3 === 0 ? '#e8c878' : '#6a5038';
      ctx.fillRect(x + 8, wy, 5, 4);
      ctx.fillRect(x + 18, wy, 5, 4);
    }
  }
  ctx.save();
  ctx.translate(0, 210);
  paintField(ctx, 'night');
  ctx.restore();
}

function drawUnit(ctx: CanvasRenderingContext2D, kind: UnitKind, side: Side, frame: number): void {
  const dir = side === 'player' ? 1 : -1;
  const team = side === 'player' ? '#e2c15a' : '#d24a3c';
  const hull = side === 'player' ? ['#6a92c8', '#274a86', '#d5e4f8'] : ['#a06858', '#4a3028', '#e0a090'];
  if (kind === 'heli') drawHeli(ctx, dir, team, hull, frame);
  else if (kind === 'ship') drawShip(ctx, dir, team, hull, frame);
  else if (kind === 'infantry' || kind === 'rocket' || kind === 'medic') drawTroop(ctx, kind, dir, team, frame);
  else drawVehicle(ctx, kind, dir, team, hull, frame);
}

function drawTroop(ctx: CanvasRenderingContext2D, kind: UnitKind, dir: number, team: string, frame: number): void {
  shadow(ctx, 40, 58, 10, 4);
  const step = frame ? 3 : -2;
  ctx.fillStyle = '#2a241c';
  ctx.fillRect(34 + dir * step, 48, 4, 10);
  ctx.fillRect(42 - dir * step, 48, 4, 10);
  poly(ctx, [32, 36, 48, 36, 50, 50, 30, 50], '#6a6248');
  ctx.fillStyle = team;
  ctx.fillRect(dir > 0 ? 44 : 30, 38, 6, 8);
  ctx.fillStyle = '#e2b48a';
  ctx.beginPath();
  ctx.arc(40, 32, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a342c';
  ctx.fillRect(35, 26, 10, 5);
  ctx.strokeStyle = '#1a1612';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(40 + dir * 16, 34);
  ctx.stroke();
  if (kind === 'rocket') {
    ctx.strokeStyle = '#5a5448';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, 34);
    ctx.lineTo(36 + dir * 18, 26);
    ctx.stroke();
    ctx.fillStyle = team;
    ctx.fillRect(36 + dir * 14, 24, 6, 4);
  }
  if (kind === 'medic') {
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(37, 40, 6, 2);
    ctx.fillRect(39, 38, 2, 6);
    ctx.fillStyle = '#3dbe6e';
    ctx.fillRect(30, 42, 8, 6);
  }
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  kind: UnitKind,
  dir: number,
  team: string,
  hull: string[],
  frame: number,
): void {
  const wide = kind === 'heavy' ? 8 : 0;
  shadow(ctx, 40, 60, 22 + wide, 7);
  const recoil = frame ? dir * 2 : 0;
  poly(ctx, [18 - wide, 40, 62 + wide, 40, 68 + wide, 54, 12 - wide, 54], hull[2] ?? '#ddd');
  poly(ctx, [18 - wide, 40, 12 - wide, 54, 16 - wide, 58, 22 - wide, 44], hull[1] ?? '#444');
  ctx.fillStyle = '#2a261c';
  ctx.fillRect(16 - wide, 50, 48 + wide * 2, 6);
  ctx.fillStyle = '#111';
  for (let i = 0; i < 4; i++) ctx.fillRect(20 + i * 12, 51, 4, 4);
  ctx.fillStyle = hull[0] ?? '#888';
  ctx.beginPath();
  ctx.ellipse(40, 40, 12 + wide / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = team;
  ctx.fillRect(34, 36, 12, 3);
  const barrel = kind === 'artillery' ? 26 : kind === 'heavy' ? 20 : 16;
  ctx.strokeStyle = '#2c2820';
  ctx.lineWidth = kind === 'artillery' ? 3 : 4;
  ctx.beginPath();
  ctx.moveTo(40, 38);
  ctx.lineTo(40 + dir * barrel + recoil, 34);
  ctx.stroke();
  if (kind === 'artillery') {
    ctx.strokeStyle = '#4a4030';
    ctx.beginPath();
    ctx.moveTo(28, 54);
    ctx.lineTo(22, 62);
    ctx.moveTo(52, 54);
    ctx.lineTo(58, 62);
    ctx.stroke();
  }
}

function drawHeli(ctx: CanvasRenderingContext2D, dir: number, team: string, hull: string[], frame: number): void {
  shadow(ctx, 40, 62, 16, 4);
  ctx.strokeStyle = '#3a342c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 34);
  ctx.lineTo(40 - dir * 22, 38);
  ctx.stroke();
  ctx.fillStyle = hull[0] ?? '#888';
  ctx.beginPath();
  ctx.ellipse(40, 36, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8efe8';
  ctx.fillRect(36 + (dir > 0 ? 4 : -8), 32, 8, 4);
  ctx.fillStyle = team;
  ctx.fillRect(34, 38, 12, 3);
  ctx.strokeStyle = 'rgba(230,230,230,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const spin = frame ? 0.4 : 1.4;
  ctx.ellipse(40, 28, 22, 4 * spin, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawShip(ctx: CanvasRenderingContext2D, dir: number, team: string, hull: string[], frame: number): void {
  shadow(ctx, 40, 58, 24, 6);
  poly(ctx, [14, 40, 66, 40, 58, 54, 22, 54], hull[1] ?? '#224');
  poly(ctx, [18, 36, 62, 36, 66, 42, 14, 42], hull[0] ?? '#468');
  ctx.fillStyle = '#e8e4d8';
  ctx.fillRect(34, 26, 14, 12);
  ctx.fillStyle = team;
  ctx.fillRect(36, 24, 10, 3);
  ctx.strokeStyle = '#2c2820';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, 30);
  ctx.lineTo(48 + dir * 12, 26 + (frame ? 1 : 0));
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,220,240,0.45)';
  ctx.fillRect(frame ? 20 : 26, 54, 18, 3);
}

function drawBase(ctx: CanvasRenderingContext2D, side: Side, frame: number): void {
  const team = side === 'player' ? '#e2c15a' : '#d24a3c';
  shadow(ctx, 40, 62, 26, 8);
  poly(ctx, [16, 36, 64, 36, 70, 56, 10, 56], side === 'player' ? '#6a92c8' : '#8a6058');
  poly(ctx, [16, 36, 10, 56, 14, 62, 22, 42], '#3a3830');
  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(30, 22, 22, 18);
  ctx.fillStyle = '#6ec8e8';
  ctx.fillRect(34, 26, 6, 5);
  ctx.fillRect(44, 26, 6, 5);
  ctx.fillStyle = team;
  ctx.fillRect(30, 18, 22, 4);
  ctx.strokeStyle = '#2a261c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(52, 18);
  ctx.lineTo(52, 8);
  ctx.stroke();
  ctx.fillStyle = team;
  ctx.beginPath();
  ctx.arc(52, 8, frame ? 4 : 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c2a878';
  ctx.fillRect(12, 52, 10, 4);
  ctx.fillRect(24, 54, 10, 4);
}

function drawBoom(ctx: CanvasRenderingContext2D, frame: number): void {
  const r = 10 + frame * 7;
  const g = ctx.createRadialGradient(36, 36, 2, 36, 36, r);
  g.addColorStop(0, '#fff8d8');
  g.addColorStop(0.3, '#ffc14a');
  g.addColorStop(0.62, '#e24b28');
  g.addColorStop(1, 'rgba(40,16,8,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(36, 36, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,80,80,0.35)';
  ctx.beginPath();
  ctx.arc(36, 30 - frame, 6 + frame * 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlash(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.lineTo(19, 13);
  ctx.lineTo(30, 16);
  ctx.lineTo(19, 19);
  ctx.lineTo(16, 30);
  ctx.lineTo(13, 19);
  ctx.lineTo(2, 16);
  ctx.lineTo(13, 13);
  ctx.closePath();
  ctx.fill();
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: CanvasRenderingContext2D, pts: number[], color: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0] ?? 0, pts[1] ?? 0);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
