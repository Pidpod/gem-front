import { sfx } from '../../audio/sfx';
import { FONT } from '../theme';

export class UiButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text | null;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly w: number;
  private readonly h: number;
  private fill: number;
  private enabled = true;
  private hovered = false;
  private pressed = false;
  private pulse = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fill: number,
    onClick: () => void,
    options?: { sub?: string; depth?: number; fontSize?: number },
  ) {
    this.w = w;
    this.h = h;
    this.fill = fill;
    this.root = scene.add.container(x, y).setDepth(options?.depth ?? 40);
    this.gfx = scene.add.graphics();
    const fontSize = options?.fontSize ?? (options?.sub ? 16 : 18);
    this.title = scene.add
      .text(0, options?.sub ? -10 : 0, label, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        color: '#f4f1ea',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.sub = options?.sub
      ? scene.add
          .text(0, 12, options.sub, {
            fontFamily: FONT,
            fontSize: '12px',
            color: '#d5dbe3',
          })
          .setOrigin(0.5)
      : null;
    this.zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.root.add(this.sub ? [this.gfx, this.title, this.sub, this.zone] : [this.gfx, this.title, this.zone]);
    this.zone.on('pointerover', () => {
      this.hovered = true;
      this.draw();
    });
    this.zone.on('pointerout', () => {
      this.hovered = false;
      this.release();
    });
    this.zone.on('pointerup', () => this.release());
    this.zone.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.root.setScale(0.97);
      this.draw();
      void sfx.unlock();
      sfx.ui();
      onClick();
    });
    this.draw();
  }

  setLabel(label: string, sub?: string): void {
    this.title.setText(label);
    if (this.sub && sub !== undefined) this.sub.setText(sub);
  }

  setFill(fill: number): void {
    this.fill = fill;
    this.draw();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.root.setAlpha(enabled ? 1 : 0.72);
    if (enabled) this.zone.setInteractive({ useHandCursor: true });
    else this.zone.disableInteractive();
    this.draw();
  }

  setPulse(pulse: boolean): void {
    this.pulse = pulse;
    if (!pulse) this.root.setScale(1);
  }

  update(time: number): void {
    if (!this.pulse || !this.enabled) return;
    this.root.setScale(1 + Math.sin(time / 170) * 0.035);
  }

  private release(): void {
    this.pressed = false;
    if (!this.pulse) this.root.setScale(1);
    this.draw();
  }

  private draw(): void {
    const { w, h } = this;
    const face = this.hovered && this.enabled ? this.fill + 0x181410 : this.fill;
    const x = -w / 2;
    const y = -h / 2;
    const light = this.pressed ? 0x2a261c : 0xe6d7a8;
    const dark = this.pressed ? 0xe6d7a8 : 0x1a1610;
    this.gfx.clear();
    this.gfx.fillStyle(0x100e0c, 1);
    this.gfx.fillRect(x, y, w, h);
    this.gfx.fillStyle(light, 1);
    this.gfx.fillRect(x, y, w, 3);
    this.gfx.fillRect(x, y, 3, h);
    this.gfx.fillStyle(dark, 1);
    this.gfx.fillRect(x, y + h - 4, w, 4);
    this.gfx.fillRect(x + w - 4, y, 4, h);
    this.gfx.fillStyle(this.enabled ? face : 0x3a3834, 1);
    this.gfx.fillRect(x + 4, y + 4, w - 8, h - 8);
    this.gfx.fillStyle(this.pressed ? 0x3a3428 : 0x9a8c64, 0.9);
    this.gfx.fillRect(x + 4, y + 4, w - 8, 2);
  }
}
