/** Beveled metal panels. Original, not taken from any game's UI kit. */

export function paintMetal(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  face = 0x6a6248,
  inset = false,
): void {
  const light = inset ? 0x2a261c : 0xd9c89a;
  const dark = inset ? 0xd9c89a : 0x1c1812;
  g.fillStyle(0x14120e, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(light, 1);
  g.fillRect(x, y, w, 3);
  g.fillRect(x, y, 3, h);
  g.fillStyle(dark, 1);
  g.fillRect(x, y + h - 4, w, 4);
  g.fillRect(x + w - 4, y, 4, h);
  g.fillStyle(face, 1);
  g.fillRect(x + 4, y + 4, Math.max(0, w - 8), Math.max(0, h - 8));
  g.fillStyle(inset ? 0x3a3428 : 0x8d815c, 1);
  g.fillRect(x + 4, y + 4, Math.max(0, w - 8), 2);
}

/** Four-sided rim so the picture in the middle stays visible. */
export function paintFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  thick = 10,
): void {
  paintMetal(g, x, y, w, thick, 0x5a5344);
  paintMetal(g, x, y + h - thick, w, thick, 0x5a5344);
  paintMetal(g, x, y, thick, h, 0x524c3e);
  paintMetal(g, x + w - thick, y, thick, h, 0x524c3e);
}
