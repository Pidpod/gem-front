import { GLOBE_H, GLOBE_W, PLATE_H, PLATE_W } from '../../config/globe';
import type { RegionId } from '../../config/world';

export function installOverworld(scene: Phaser.Scene): void {
  if (scene.textures.exists('ow-globe')) return;
  bake(scene, 'ow-globe', GLOBE_W, GLOBE_H, paintGlobe);
  for (const region of ['town', 'forest', 'desert', 'coast'] as const) {
    bake(scene, `ow-plate-${region}`, PLATE_W, PLATE_H, (ctx) => paintPlate(ctx, region));
  }
  bake(scene, 'ow-azure', 120, 96, (ctx) => paintBase(ctx, 'azure', 'outpost'));
  bake(scene, 'ow-azure-fort', 140, 110, (ctx) => paintBase(ctx, 'azure', 'fort'));
  bake(scene, 'ow-crimson', 120, 96, (ctx) => paintBase(ctx, 'crimson', 'outpost'));
  bake(scene, 'ow-crimson-fort', 140, 110, (ctx) => paintBase(ctx, 'crimson', 'fort'));
  bake(scene, 'ow-frost', 120, 96, (ctx) => paintBase(ctx, 'frost', 'outpost'));
  bake(scene, 'ow-frost-fort', 140, 110, (ctx) => paintBase(ctx, 'frost', 'fort'));
  bake(scene, 'ow-rubble', 120, 96, paintRubble);
  bake(scene, 'ow-tree', 36, 48, paintTree);
  bake(scene, 'ow-palm', 36, 48, paintPalm);
}

function bake(
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
  scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, count: number, salt: number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = Math.abs(Math.sin(i * 12.9898 + salt) * 43758.5453) % w;
    const y = Math.abs(Math.sin(i * 78.233 + salt) * 24634.6345) % h;
    ctx.fillRect(x, y, 2, 2);
  }
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintGlobe(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, GLOBE_H);
  sky.addColorStop(0, '#16324e');
  sky.addColorStop(0.45, '#1d5c86');
  sky.addColorStop(1, '#0e3048');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GLOBE_W, GLOBE_H);
  speckle(ctx, GLOBE_W, 80, 'rgba(255,255,255,0.35)', 40, 2);
  blob(ctx, 120, 420, 130, 170, '#6f9348');
  blob(ctx, 150, 300, 70, 50, '#87ae58');
  blob(ctx, 250, 200, 110, 80, '#3f6a32');
  blob(ctx, 280, 660, 140, 110, '#c4a15a');
  blob(ctx, 240, 760, 80, 40, '#d8bc78');
  blob(ctx, 450, 360, 100, 150, '#5f8a40');
  blob(ctx, 400, 280, 40, 30, '#7eaa58');
  for (let i = 0; i < 6; i++) blob(ctx, 250 + i * 28, 500 + (i % 2) * 16, 14, 8, '#6f9348');
  blob(ctx, 300, 940, 120, 70, '#4e7a38');
  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(0, 0, GLOBE_W, 36);
  ctx.fillStyle = 'rgba(90,70,40,0.35)';
  ctx.fillRect(70, 560, 360, 18);
  speckle(ctx, GLOBE_W, GLOBE_H, 'rgba(255,255,255,0.08)', 500, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(430, 180, 130, 400);
}

function paintPlate(ctx: CanvasRenderingContext2D, region: RegionId): void {
  const ground = region === 'desert' ? '#d2b06a' : region === 'forest' ? '#3f6a32' : region === 'coast' ? '#7ea056' : '#6f9348';
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, PLATE_W, PLATE_H);
  speckle(ctx, PLATE_W, PLATE_H, 'rgba(255,255,255,0.12)', 700, region.length);
  speckle(ctx, PLATE_W, PLATE_H, 'rgba(40,50,20,0.18)', 400, region.length + 3);
  if (region === 'desert') {
    speckle(ctx, PLATE_W, PLATE_H, 'rgba(90,60,30,0.35)', 80, 4);
    ctx.fillStyle = '#8a8078';
    for (let i = 0; i < 8; i++) ctx.fillRect(40 + i * 60, 80 + (i % 3) * 90, 18, 10);
  }
  if (region === 'coast') {
    const sea = ctx.createLinearGradient(300, 0, PLATE_W, 0);
    sea.addColorStop(0, '#e6d2a4');
    sea.addColorStop(0.25, '#1a5278');
    sea.addColorStop(1, '#071828');
    ctx.fillStyle = sea;
    ctx.fillRect(320, 0, PLATE_W - 320, PLATE_H);
  }
  if (region === 'town') {
    ctx.strokeStyle = '#9a9488';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, PLATE_W - 56, PLATE_H - 56);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, PLATE_H - 40, PLATE_W, 40);
}

function paintBase(ctx: CanvasRenderingContext2D, faction: 'azure' | 'crimson' | 'frost', kind: 'outpost' | 'fort'): void {
  const blue = faction === 'azure';
  const ice = faction === 'frost';
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(60, 84, 40, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b7b2a8';
  ctx.beginPath();
  ctx.moveTo(60, 58);
  ctx.lineTo(100, 74);
  ctx.lineTo(60, 90);
  ctx.lineTo(20, 74);
  ctx.closePath();
  ctx.fill();
  if (kind === 'fort') {
    ctx.strokeStyle = blue ? '#d8d2c4' : '#2a1816';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 28, 84, 52);
  }
  ctx.fillStyle = blue ? '#3a78c8' : ice ? '#e8f2fb' : '#8a3030';
  ctx.fillRect(34, 40, 28, 22);
  if (blue) {
    ctx.fillStyle = '#9fd0f2';
    ctx.beginPath();
    ctx.arc(48, 40, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#6a5430';
    ctx.fillRect(70, 48, 22, 14);
  } else {
    ctx.fillStyle = '#e2c15a';
    ctx.beginPath();
    ctx.arc(48, 40, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#2a1816';
    ctx.fillRect(66, 36, 8, 28);
    ctx.fillStyle = '#9fd7ff';
    ctx.beginPath();
    ctx.arc(86, 48, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5ad0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(86, 48);
    ctx.lineTo(86, 28);
    ctx.stroke();
  }
  ctx.fillStyle = blue ? '#e2c15a' : ice ? '#7eb6e8' : '#c4473a';
  ctx.fillRect(28, 24, 2, 22);
  ctx.fillRect(28, 24, 10, 6);
  if (!blue) {
    ctx.fillStyle = 'rgba(90,90,90,0.45)';
    ctx.beginPath();
    ctx.arc(70, 28, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintRubble(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(60, 80, 36, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a5a48';
  ctx.fillRect(30, 48, 14, 24);
  ctx.fillRect(52, 58, 22, 16);
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(28, 70, 50, 6);
  ctx.fillStyle = 'rgba(180,180,180,0.35)';
  ctx.beginPath();
  ctx.arc(40, 40, 5, 0, Math.PI * 2);
  ctx.fill();
}

function paintTree(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(16, 28, 4, 16);
  ctx.fillStyle = '#2f6a32';
  ctx.beginPath();
  ctx.arc(18, 20, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4e8a40';
  ctx.beginPath();
  ctx.arc(14, 16, 6, 0, Math.PI * 2);
  ctx.fill();
}

function paintPalm(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#8a6840';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18, 44);
  ctx.quadraticCurveTo(22, 24, 16, 12);
  ctx.stroke();
  ctx.strokeStyle = '#2f8a4e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(16, 12);
    ctx.lineTo(4 + i * 8, 8 + (i % 2) * 8);
    ctx.stroke();
  }
}
