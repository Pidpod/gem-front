import { sfx } from '../../audio/sfx';
import { HOW_TO_LINES } from '../copy';
import { installIso } from '../art/iso';
import { VIEW_H, VIEW_W } from '../layout';
import { loadProgress } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';
import { paintMetal } from '../ui/metal';

export class TitleScene extends Phaser.Scene {
  private settings: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('title');
  }

  create(): void {
    this.settings = null;
    installIso(this);
    addBackdrop(this);
    this.add.image(0, 0, 'iso-front').setOrigin(0, 0).setDepth(1);
    this.addSearchlights();
    this.addSmoke();
    this.input.on('pointerdown', () => {
      void sfx.unlock();
    });

    const gem = this.add.graphics().setDepth(4);
    gem.fillStyle(0xf0c43a, 0.95);
    gem.fillTriangle(VIEW_W / 2, 78, VIEW_W / 2 + 28, 118, VIEW_W / 2 - 28, 118);
    gem.fillStyle(0x7ee0ff, 0.9);
    gem.fillTriangle(VIEW_W / 2, 158, VIEW_W / 2 + 28, 118, VIEW_W / 2 - 28, 118);
    gem.setAlpha(0);
    this.tweens.add({
      targets: gem,
      alpha: 1,
      y: 8,
      duration: 700,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: gem,
      alpha: 0.72,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      delay: 700,
    });

    const logo = this.add
      .text(VIEW_W / 2, 200, 'GEM FRONT', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#f6e7c0',
        fontStyle: 'bold',
        stroke: '#4a3824',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);
    logo.setShadow(0, 5, '#000000', 8, true, true);
    this.tweens.add({
      targets: logo,
      alpha: 1,
      y: 214,
      duration: 650,
      ease: 'Back.easeOut',
    });
    this.add
      .text(VIEW_W / 2, 258, 'LIBERATION COMMAND', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#e6d7a4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    const save = loadProgress();
    const continued = save.cleared.length > 0 || save.funds > 0 || save.unlocked > 1;
    const buttons: { label: string; fill: number; go: () => void }[] = [
      {
        label: continued ? 'CONTINUE' : 'CAMPAIGN',
        fill: 0x8a7040,
        go: () => this.scene.start(!save.factionPicked ? 'faction' : continued ? 'map' : 'commander'),
      },
      { label: 'COMMANDERS', fill: 0x5c5648, go: () => this.scene.start('commander', { back: 'title' }) },
      { label: 'HQ', fill: 0x5c5648, go: () => this.scene.start('hq') },
      { label: 'SETTINGS', fill: 0x4a453c, go: () => this.openSettings() },
    ];
    buttons.forEach((entry, index) => {
      const button = new UiButton(this, VIEW_W / 2, 520 + index * 74, 300, 60, entry.label, entry.fill, () => {
        void sfx.unlock().then(entry.go);
      }, { fontSize: 22, depth: 8 });
      button.root.setAlpha(0);
      this.tweens.add({
        targets: button.root,
        alpha: 1,
        duration: 280,
        delay: 280 + index * 90,
      });
    });

    this.cameras.main.fadeIn(420, 8, 10, 14);
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        this.scene.start(!save.factionPicked ? 'faction' : continued ? 'map' : 'commander');
      }
    });
  }

  private addSearchlights(): void {
    const left = this.light(90);
    const right = this.light(390);
    this.tweens.add({ targets: left, angle: 18, duration: 3600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: right, angle: -16, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const flash = this.add.circle(40 + Math.random() * 400, 40 + Math.random() * 160, 3 + Math.random() * 4, 0xffe6a0, 0.8).setDepth(3);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 2.4,
          duration: 220,
          onComplete: () => flash.destroy(),
        });
      },
    });
  }

  private light(x: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(2).setPosition(x, 0);
    g.fillStyle(0xfff0c0, 0.09);
    g.fillTriangle(0, 0, -70, 420, 80, 420);
    return g;
  }

  private addSmoke(): void {
    for (let i = 0; i < 4; i++) {
      const puff = this.add.circle(60 + i * 110, 240, 16 + i * 3, 0x2a2622, 0.35).setDepth(3);
      this.tweens.add({
        targets: puff,
        y: 160 - i * 10,
        alpha: 0.05,
        duration: 2800 + i * 400,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private openSettings(): void {
    this.settings?.destroy(true);
    const layer = this.add.container(0, 0).setDepth(40);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.72).setInteractive();
    const panel = this.add.graphics();
    paintMetal(panel, 24, 120, VIEW_W - 48, 640, 0x3a362e);
    const title = this.add
      .text(VIEW_W / 2, 156, 'SETTINGS', { fontFamily: FONT, fontSize: '28px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5);
    const how = this.add
      .text(48, 196, HOW_TO_LINES.map((line, index) => `${index + 1}.  ${line}`).join('\n\n'), {
        fontFamily: FONT,
        fontSize: '15px',
        color: MUTED,
        wordWrap: { width: VIEW_W - 96 },
      });
    layer.add([dim, panel, title, how]);
    const sound = new UiButton(this, VIEW_W / 2, 640, 240, 52, sfx.muted ? 'SOUND OFF' : 'SOUND ON', 0x5c5648, () => {
      const muted = sfx.toggle();
      sound.setLabel(muted ? 'SOUND OFF' : 'SOUND ON');
    }, { fontSize: 16, depth: 50 });
    const close = new UiButton(this, VIEW_W / 2, 708, 180, 48, 'CLOSE', 0x4a453c, () => {
      this.settings?.destroy(true);
      this.settings = null;
    }, { fontSize: 16, depth: 50 });
    layer.add([sound.root, close.root]);
    this.settings = layer;
  }
}
