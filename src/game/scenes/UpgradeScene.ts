import { sfx } from '../../audio/sfx';
import { UPGRADES, type UpgradeId } from '../../config/upgrades';
import { VIEW_W } from '../layout';
import { installArt } from '../art/sheets';
import { buyUpgrade, loadProgress, upgradeLine, writeProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

const ROW = 78;
const TOP = 108;

export class UpgradeScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private content!: Phaser.GameObjects.Container;
  private fundsText!: Phaser.GameObjects.Text;
  private dragging = false;
  private moved = false;
  private dragStart = 0;
  private contentStart = 0;

  constructor() {
    super('upgrades');
  }

  create(): void {
    this.save = loadProgress();
    installArt(this);
    addBackdrop(this);
    this.add
      .text(24, 28, 'UPGRADES', {
        fontFamily: FONT,
        fontSize: '28px',
        color: INK,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setDepth(30);
    this.fundsText = this.add
      .text(VIEW_W - 24, 28, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f0c43a',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(30);
    this.paintFunds();

    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, TOP - 8, VIEW_W, 760);
    this.content = this.add.container(0, TOP);
    this.content.setMask(maskG.createGeometryMask());
    this.rebuildRows();

    new UiButton(this, VIEW_W / 2, 910, 200, 52, 'MAP', 0x2a3344, () => this.scene.start('map'), {
      fontSize: 18,
      depth: 40,
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < TOP || pointer.y > 880) return;
      this.dragging = true;
      this.moved = false;
      this.dragStart = pointer.y;
      this.contentStart = this.content.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dy = pointer.y - this.dragStart;
      if (Math.abs(dy) > 10) this.moved = true;
      const min = TOP - Math.max(0, UPGRADES.length * ROW - 740);
      this.content.y = Math.max(min, Math.min(TOP, this.contentStart + dy));
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
    });
  }

  private paintFunds(): void {
    this.fundsText.setText(`${this.save.funds} FUNDS`);
  }

  private rebuildRows(): void {
    this.content.removeAll(true);
    UPGRADES.forEach((def, index) => {
      const rank = this.save.ranks[def.id] ?? 0;
      const line = upgradeLine(def.id, rank);
      const y = index * ROW;
      const g = this.add.graphics();
      g.fillStyle(0x171b26, 1);
      g.fillRoundedRect(16, y, VIEW_W - 32, ROW - 8, 10);
      const title = this.add.text(28, y + 8, def.name, {
        fontFamily: FONT,
        fontSize: '15px',
        color: INK,
        fontStyle: 'bold',
      });
      const detail = line.maxed
        ? `${def.unit} ${line.current}   MAX`
        : `${def.unit} ${line.current} → ${line.next}    ${line.cost} funds`;
      const sub = this.add.text(28, y + 32, detail, {
        fontFamily: FONT,
        fontSize: '13px',
        color: line.maxed ? '#7d8794' : MUTED,
      });
      this.content.add([g, title, sub]);
      if (line.maxed) return;
      const buy = this.add.container(VIEW_W - 78, y + 34);
      const bg = this.add.graphics();
      const affordable = this.save.funds >= (line.cost ?? 0);
      bg.fillStyle(affordable ? 0x149684 : 0x2a3344, 1);
      bg.fillRoundedRect(-46, -18, 92, 36, 8);
      const label = this.add
        .text(0, 0, 'BUY', { fontFamily: FONT, fontSize: '14px', color: '#f4f1ea', fontStyle: 'bold' })
        .setOrigin(0.5);
      const zone = this.add.zone(0, 0, 92, 36).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (this.moved) return;
        this.purchase(def.id);
      });
      buy.add([bg, label, zone]);
      this.content.add(buy);
    });
  }

  private purchase(id: UpgradeId): void {
    const next = buyUpgrade(this.save, id);
    if (!next.ok) {
      sfx.reject();
      return;
    }
    this.save = next.save;
    writeProgress(this.save);
    sfx.ui();
    this.paintFunds();
    this.rebuildRows();
  }
}
