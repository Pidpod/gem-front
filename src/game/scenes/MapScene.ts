import { sfx } from '../../audio/sfx';
import { LEVELS } from '../../config/levels';
import { VIEW_H, VIEW_W } from '../layout';
import { loadProgress, resetProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

export class MapScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private settings: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('map');
  }

  create(): void {
    this.save = loadProgress();
    this.settings = null;
    addBackdrop(this);
    this.add
      .text(VIEW_W / 2, 42, 'CAMPAIGN', {
        fontFamily: FONT,
        fontSize: '32px',
        color: INK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 78, `${this.save.funds} WAR FUNDS`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f0c43a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    LEVELS.forEach((level, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 128 : 352;
      const y = 140 + row * 86;
      this.drawLevel(x, y, level.id);
    });

    new UiButton(this, 150, 820, 200, 52, 'UPGRADES', 0x149684, () => this.scene.start('upgrades'), { fontSize: 16 });
    new UiButton(this, 360, 820, 160, 52, 'SETTINGS', 0x2a3344, () => this.openSettings(), { fontSize: 16 });
    new UiButton(this, VIEW_W / 2, 890, 180, 44, 'TITLE', 0x2a3344, () => this.scene.start('title'), { fontSize: 16 });
  }

  private drawLevel(x: number, y: number, id: number): void {
    const level = LEVELS[id - 1];
    if (!level) return;
    const unlocked = id <= this.save.unlocked;
    const stars = this.save.stars[String(id)] ?? 0;
    const g = this.add.graphics();
    g.fillStyle(unlocked ? (level.boss ? 0x3a2428 : 0x1c2433) : 0x141820, 1);
    g.fillRoundedRect(x - 100, y - 34, 200, 72, 10);
    g.lineStyle(2, unlocked ? (level.boss ? 0xc4473a : 0x3ee0c5) : 0x2a3140, 1);
    g.strokeRoundedRect(x - 100, y - 34, 200, 72, 10);
    this.add
      .text(x, y - 16, unlocked ? `${id}. ${level.name}` : `${id}. LOCKED`, {
        fontFamily: FONT,
        fontSize: '14px',
        color: unlocked ? INK : MUTED,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 10, unlocked ? [1, 2, 3].map((n) => (n <= stars ? '★' : '☆')).join(' ') : level.blurb, {
        fontFamily: FONT,
        fontSize: '13px',
        color: unlocked ? '#f0c43a' : '#66707a',
      })
      .setOrigin(0.5);
    if (!unlocked) return;
    const zone = this.add.zone(x, y, 200, 72).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      void sfx.unlock();
      sfx.ui();
      this.scene.start('game', { level: id });
    });
  }

  private openSettings(): void {
    this.settings?.destroy(true);
    const layer = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.8).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x171b26, 1);
    panel.fillRoundedRect(40, 300, VIEW_W - 80, 280, 16);
    const text = this.add
      .text(VIEW_W / 2, 360, 'SETTINGS\n\nErase stars, war funds,\nand upgrades?', {
        fontFamily: FONT,
        fontSize: '18px',
        color: INK,
        align: 'center',
      })
      .setOrigin(0.5);
    layer.add([dim, panel, text]);
    const erase = new UiButton(this, VIEW_W / 2, 470, 220, 52, 'RESET PROGRESS', 0xc4473a, () => {
      resetProgress();
      this.scene.restart();
    }, { fontSize: 16, depth: 120 });
    const cancel = new UiButton(this, VIEW_W / 2, 536, 180, 48, 'CANCEL', 0x2a3344, () => {
      this.settings?.destroy(true);
      this.settings = null;
    }, { fontSize: 16, depth: 120 });
    layer.add([erase.root, cancel.root]);
    this.settings = layer;
  }
}
