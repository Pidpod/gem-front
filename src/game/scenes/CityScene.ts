import { sfx } from '../../audio/sfx';
import { buildingsFor, liberationFor } from '../../config/cities';
import { levelById } from '../../config/levels';
import { regionById, nodeById } from '../../config/world';
import { VIEW_W } from '../layout';
import { buyBuilding, isCleared, loadProgress, priceOf, writeProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

export class CityScene extends Phaser.Scene {
  private nodeId = 1;
  private save: SaveData = loadProgress();

  constructor() {
    super('city');
  }

  init(data?: { nodeId?: number }): void {
    this.nodeId = data?.nodeId && data.nodeId > 0 ? data.nodeId : 1;
  }

  create(): void {
    this.save = loadProgress();
    const node = nodeById(this.nodeId);
    if (!node.city || !isCleared(this.save, this.nodeId)) {
      this.scene.start('map');
      return;
    }
    addBackdrop(this);
    const level = levelById(this.nodeId);
    this.add
      .text(24, 36, level.name.toUpperCase(), { fontFamily: FONT, fontSize: '26px', color: INK, fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    this.add
      .text(VIEW_W - 24, 36, `${this.save.funds} FUNDS`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f0c43a',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);
    this.add
      .text(24, 72, `${regionById(node.region).name} is back in our hands. Raise what the occupation tore down.`, {
        fontFamily: FONT,
        fontSize: '14px',
        color: MUTED,
        wordWrap: { width: VIEW_W - 48 },
      });
    const note = liberationFor(this.nodeId);
    let y = 130;
    if (note) {
      this.add.text(24, y, note.note, { fontFamily: FONT, fontSize: '14px', color: '#8ff6e4', wordWrap: { width: VIEW_W - 48 } });
      y += 48;
    }
    for (const building of buildingsFor(this.nodeId)) {
      const owned = this.save.buildings.includes(building.id);
      const price = priceOf(this.save, building.cost);
      const g = this.add.graphics();
      g.fillStyle(0x171b26, 1);
      g.fillRoundedRect(16, y, VIEW_W - 32, 96, 12);
      this.add.text(32, y + 12, building.name, { fontFamily: FONT, fontSize: '16px', color: INK, fontStyle: 'bold' });
      this.add.text(32, y + 36, building.blurb, {
        fontFamily: FONT,
        fontSize: '13px',
        color: MUTED,
        wordWrap: { width: 280 },
      });
      if (owned) {
        this.add.text(VIEW_W - 36, y + 48, 'BUILT', { fontFamily: FONT, fontSize: '14px', color: '#3ee0c5', fontStyle: 'bold' }).setOrigin(1, 0.5);
      } else {
        new UiButton(this, VIEW_W - 78, y + 48, 100, 40, `${price}`, 0x149684, () => this.purchase(building.id), {
          fontSize: 14,
        });
      }
      y += 108;
    }
    new UiButton(this, 150, 900, 180, 48, 'MAIN HQ', 0x149684, () => this.scene.start('hq'), { fontSize: 16 });
    new UiButton(this, 340, 900, 160, 48, 'MAP', 0x2a3344, () => this.scene.start('map', { focus: this.nodeId }), { fontSize: 16 });
  }

  private purchase(id: string): void {
    const next = buyBuilding(this.save, id);
    if (!next.ok) {
      sfx.reject();
      return;
    }
    writeProgress(next.save);
    sfx.ui();
    this.scene.restart({ nodeId: this.nodeId });
  }
}
