import { sfx } from '../../audio/sfx';
import { FACTIONS, type FactionId } from '../../config/factions';
import { VIEW_W } from '../layout';
import { loadProgress, writeProgress } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

export class FactionScene extends Phaser.Scene {
  private picked: FactionId = 'azure';

  constructor() {
    super('faction');
  }

  init(data?: { picked?: FactionId }): void {
    if (data?.picked === 'azure' || data?.picked === 'crimson') this.picked = data.picked;
  }

  create(): void {
    addBackdrop(this);
    this.add
      .text(VIEW_W / 2, 48, 'CHOOSE A SIDE', {
        fontFamily: FONT,
        fontSize: '28px',
        color: INK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 88, 'Two armies. One seam. The map does not care who you are.', {
        fontFamily: FONT,
        fontSize: '14px',
        color: MUTED,
        align: 'center',
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5);
    this.drawCard('azure', 150);
    this.drawCard('crimson', 400);
    new UiButton(this, VIEW_W / 2, 760, 280, 60, 'MARCH', FACTIONS[this.picked].color, () => this.confirm(), {
      fontSize: 22,
    });
    new UiButton(this, VIEW_W / 2, 840, 180, 44, 'TITLE', 0x2a3344, () => this.scene.start('title'), { fontSize: 16 });
  }

  private drawCard(id: FactionId, y: number): void {
    const faction = FACTIONS[id];
    const selected = this.picked === id;
    const g = this.add.graphics();
    g.fillStyle(selected ? 0x1c2430 : 0x171b26, 1);
    g.fillRoundedRect(28, y, VIEW_W - 56, 210, 14);
    g.lineStyle(3, selected ? faction.color : 0x2a3140, 1);
    g.strokeRoundedRect(28, y, VIEW_W - 56, 210, 14);
    g.fillStyle(faction.color, 1);
    if (id === 'azure') {
      g.fillTriangle(78, y + 36, 108, y + 78, 48, y + 78);
      g.fillStyle(0x9fd0f2, 1);
      g.fillCircle(78, y + 34, 16);
    } else {
      g.fillCircle(78, y + 48, 18);
      g.fillStyle(0x9fd7ff, 1);
      g.fillCircle(108, y + 70, 8);
    }
    this.add.text(130, y + 36, faction.name, {
      fontFamily: FONT,
      fontSize: '20px',
      color: INK,
      fontStyle: 'bold',
    });
    this.add.text(130, y + 78, faction.blurb, {
      fontFamily: FONT,
      fontSize: '15px',
      color: MUTED,
      wordWrap: { width: 280 },
    });
    this.add.text(130, y + 150, id === 'azure' ? 'Beachhead: the western shore' : 'Beachhead: the eastern harbor', {
      fontFamily: FONT,
      fontSize: '13px',
      color: '#f0c43a',
    });
    const zone = this.add.zone(VIEW_W / 2, y + 105, VIEW_W - 56, 210).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      this.picked = id;
      sfx.ui();
      this.scene.restart({ picked: id });
    });
  }

  private confirm(): void {
    const save = loadProgress();
    writeProgress({ ...save, faction: this.picked, factionPicked: true });
    sfx.ui();
    this.scene.start('map');
  }
}
