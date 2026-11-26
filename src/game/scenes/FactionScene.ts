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
    if (data?.picked === 'azure' || data?.picked === 'crimson' || data?.picked === 'frost') this.picked = data.picked;
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
    (['azure', 'crimson', 'frost'] as const).forEach((id, index) => this.drawCard(id, 112 + index * 200));
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
    g.fillRoundedRect(28, y, VIEW_W - 56, 180, 14);
    g.lineStyle(3, selected ? faction.color : 0x2a3140, 1);
    g.strokeRoundedRect(28, y, VIEW_W - 56, 180, 14);
    g.fillStyle(faction.color, 1);
    if (id === 'azure') {
      g.fillCircle(70, y + 48, 16);
    } else if (id === 'frost') {
      g.fillRect(54, y + 34, 32, 28);
    } else {
      g.fillCircle(70, y + 48, 16);
      g.fillStyle(0x9fd7ff, 1);
      g.fillCircle(96, y + 62, 7);
    }
    this.add.text(120, y + 24, faction.name, {
      fontFamily: FONT,
      fontSize: '18px',
      color: INK,
      fontStyle: 'bold',
    });
    this.add.text(120, y + 54, faction.blurb, {
      fontFamily: FONT,
      fontSize: '14px',
      color: MUTED,
      wordWrap: { width: 300 },
    });
    const beach = id === 'azure' ? 'Beachhead: the western shore' : id === 'frost' ? 'Beachhead: the northern ice' : 'Beachhead: the eastern harbor';
    this.add.text(120, y + 130, beach, { fontFamily: FONT, fontSize: '13px', color: '#f0c43a' });
    const zone = this.add.zone(VIEW_W / 2, y + 90, VIEW_W - 56, 180).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      this.picked = id;
      sfx.ui();
      this.scene.restart({ picked: id });
    });
  }

  private confirm(): void {
    const save = loadProgress();
    writeProgress({ ...save, faction: this.picked, factionPicked: true, commander: FACTIONS[this.picked].leader, pact: null });
    sfx.ui();
    this.scene.start('map');
  }
}
