import { linesFor } from '../../config/dialogue';
import { installPortraits } from '../art/portraits';
import { VIEW_H, VIEW_W } from '../layout';
import { markSeen, writeProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { UiButton } from './button';

/** Skippable commander box. Marks the talk seen as soon as it opens. */
export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private index = 0;
  private readonly lines: ReturnType<typeof linesFor>;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly name: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private closed = false;

  constructor(
    scene: Phaser.Scene,
    talkId: string,
    save: SaveData,
    onClose: (save: SaveData) => void,
  ) {
    installPortraits(scene);
    this.lines = linesFor(talkId, save.commander, save.faction);
    const next = markSeen(save, talkId);
    writeProgress(next);
    this.root = scene.add.container(0, 0).setDepth(180);
    const dim = scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.55).setInteractive();
    const panel = scene.add.graphics();
    panel.fillStyle(0x141820, 1);
    panel.fillRoundedRect(16, 620, VIEW_W - 32, 250, 14);
    panel.lineStyle(2, 0x3ee0c5, 0.8);
    panel.strokeRoundedRect(16, 620, VIEW_W - 32, 250, 14);
    this.portrait = scene.add.image(78, 700, 'px-port-mira');
    this.name = scene.add.text(140, 648, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#f0c43a',
      fontStyle: 'bold',
    });
    this.body = scene.add.text(140, 678, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: INK,
      wordWrap: { width: 300 },
      lineSpacing: 4,
    });
    const hint = scene.add.text(VIEW_W / 2, 840, 'TAP TO CONTINUE', {
      fontFamily: FONT,
      fontSize: '12px',
      color: MUTED,
    }).setOrigin(0.5);
    this.root.add([dim, panel, this.portrait, this.name, this.body, hint]);
    const skip = new UiButton(scene, 400, 648, 88, 32, 'SKIP', 0x2a3344, () => this.finish(next, onClose), {
      fontSize: 12,
      depth: 190,
    });
    this.root.add(skip.root);
    dim.on('pointerup', () => this.advance(next, onClose));
    this.show();
    if (this.lines.length === 0) this.finish(next, onClose);
  }

  private show(): void {
    const line = this.lines[this.index];
    if (!line) return;
    this.portrait.setTexture(`px-port-${line.portrait}`);
    this.name.setText(line.speaker);
    this.body.setText(line.text);
  }

  private advance(save: SaveData, onClose: (save: SaveData) => void): void {
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.finish(save, onClose);
      return;
    }
    this.show();
  }

  private finish(save: SaveData, onClose: (save: SaveData) => void): void {
    if (this.closed) return;
    this.closed = true;
    this.root.destroy(true);
    onClose(save);
  }
}
