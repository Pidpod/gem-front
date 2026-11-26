import { GEM_HEX, shade } from '../theme';
import type { GemColor, Special } from '../types';

export function drawGem(
  g: Phaser.GameObjects.Graphics,
  color: GemColor,
  special: Special,
  cell: number,
): void {
  g.clear();
  const hex = GEM_HEX[color];
  const radius = cell * 0.36;
  g.fillStyle(shade(hex, -0.28), 1);
  g.fillCircle(2, 3, radius);
  g.fillStyle(hex, 1);
  g.fillCircle(0, 0, radius);
  g.fillStyle(shade(hex, 0.22), 0.95);
  g.fillCircle(-radius * 0.28, -radius * 0.32, radius * 0.42);
  g.fillStyle(0xffffff, 0.38);
  g.fillCircle(-radius * 0.34, -radius * 0.4, radius * 0.14);
  drawIcon(g, color, radius);
  if (special === 'lineRow') {
    g.fillStyle(0xffffff, 0.92);
    g.fillRoundedRect(-radius * 0.75, -3, radius * 1.5, 6, 2);
  } else if (special === 'lineCol') {
    g.fillStyle(0xffffff, 0.92);
    g.fillRoundedRect(-3, -radius * 0.75, 6, radius * 1.5, 2);
  } else if (special === 'bomb') {
    g.lineStyle(3, 0xffffff, 0.95);
    g.strokeCircle(0, 0, radius * 0.78);
    fillStar(g, 0, 0, radius * 0.34, 0xffffff);
  }
}

function drawIcon(g: Phaser.GameObjects.Graphics, color: GemColor, radius: number): void {
  const ink = shade(GEM_HEX[color], -0.45);
  g.fillStyle(ink, 0.9);
  if (color === 'credit') {
    g.lineStyle(2, ink, 0.9);
    g.strokeCircle(0, 1, radius * 0.28);
    g.fillCircle(0, 1, radius * 0.12);
    return;
  }
  if (color === 'infantry') {
    g.fillCircle(0, -radius * 0.28, radius * 0.14);
    g.fillRoundedRect(-radius * 0.16, -radius * 0.1, radius * 0.32, radius * 0.36, 2);
    g.fillRect(radius * 0.08, -radius * 0.02, radius * 0.34, radius * 0.08);
    return;
  }
  if (color === 'tank') {
    g.fillRoundedRect(-radius * 0.38, -radius * 0.08, radius * 0.7, radius * 0.32, 2);
    g.fillRoundedRect(-radius * 0.12, -radius * 0.28, radius * 0.3, radius * 0.22, 2);
    g.fillRect(radius * 0.12, -radius * 0.2, radius * 0.36, radius * 0.1);
    return;
  }
  if (color === 'heli') {
    g.fillRect(-radius * 0.42, -radius * 0.34, radius * 0.84, radius * 0.08);
    g.fillEllipse(0, radius * 0.02, radius * 0.46, radius * 0.28);
    g.fillRect(radius * 0.16, -radius * 0.02, radius * 0.28, radius * 0.08);
    return;
  }
  fillStar(g, 0, 1, radius * 0.32, ink);
}

function fillStar(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number): void {
  g.fillStyle(color, 1);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const dist = i % 2 === 0 ? radius : radius * 0.42;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
}
