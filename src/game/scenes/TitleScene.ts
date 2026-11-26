import { sfx } from '../../audio/sfx';
import { HOW_TO_LINES } from '../copy';
import { VIEW_W } from '../layout';
import { drawGem } from '../match3/drawGem';
import { FONT, INK, MUTED } from '../theme';
import { GEM_COLORS } from '../types';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    addBackdrop(this);
    this.input.on('pointerdown', () => {
      void sfx.unlock();
    });

    GEM_COLORS.forEach((color, index) => {
      const root = this.add.container(56 + index * 92, 128);
      const gfx = this.add.graphics();
      root.add(gfx);
      const special = index === 3 ? 'lineRow' : index === 4 ? 'bomb' : 'none';
      drawGem(gfx, color, special, 68);
      this.tweens.add({
        targets: root,
        y: 140,
        duration: 900 + index * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    this.add
      .text(VIEW_W / 2, 230, 'GEM FRONT', {
        fontFamily: FONT,
        fontSize: '48px',
        color: INK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 278, 'Match gems. March an army.', {
        fontFamily: FONT,
        fontSize: '16px',
        color: MUTED,
      })
      .setOrigin(0.5);

    const panel = this.add.graphics();
    panel.fillStyle(0x171b26, 0.95);
    panel.fillRoundedRect(20, 314, VIEW_W - 40, 400, 16);
    panel.lineStyle(2, 0xffffff, 0.06);
    panel.strokeRoundedRect(20, 314, VIEW_W - 40, 400, 16);
    this.add
      .text(40, 332, HOW_TO_LINES.map((line, index) => `${index + 1}.  ${line}`).join('\n\n'), {
        fontFamily: FONT,
        fontSize: '15px',
        color: INK,
        wordWrap: { width: VIEW_W - 80 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);

    new UiButton(this, VIEW_W / 2, 770, 280, 68, 'PLAY', 0x149684, () => {
      void sfx.unlock().then(() => this.scene.start('game'));
    }, { fontSize: 28 });

    const mute = new UiButton(this, VIEW_W / 2, 860, 160, 44, sfx.muted ? 'SOUND OFF' : 'SOUND ON', 0x2a3344, () => {
      const muted = sfx.toggle();
      mute.setLabel(muted ? 'SOUND OFF' : 'SOUND ON');
    }, { fontSize: 16 });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') this.scene.start('game');
    });

    void this.cameras.main.fadeIn(180, 16, 19, 26);
  }
}
