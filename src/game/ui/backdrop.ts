import { VIEW_H, VIEW_W } from '../layout';

export function addBackdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x10131a, 1);
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.fillStyle(0x1a2740, 0.85);
  g.fillEllipse(VIEW_W / 2, -20, VIEW_W * 1.3, 300);
  g.fillStyle(0xffffff, 0.06);
  const dots: [number, number][] = [
    [28, 64],
    [86, 120],
    [150, 48],
    [214, 96],
    [290, 58],
    [360, 130],
    [430, 72],
    [54, 180],
    [188, 160],
    [410, 188],
  ];
  for (const [x, y] of dots) g.fillCircle(x, y, 1.3);
}
