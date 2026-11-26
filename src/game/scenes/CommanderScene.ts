import { sfx } from '../../audio/sfx';
import { COMMANDERS, type CommanderId } from '../../config/commanders';
import { levelById } from '../../config/levels';
import { levelForXp } from '../../config/items';
import { installPortraits } from '../art/portraits';
import { VIEW_W } from '../layout';
import { commanderUnlocked, loadProgress, setCommander, writeProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

export class CommanderScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private picked: CommanderId = 'mira';
  private back: 'title' | 'map' = 'title';
  private sheet!: Phaser.GameObjects.Container;
  private drag = false;
  private moved = false;
  private dragY = 0;
  private sheetY = 0;

  constructor() {
    super('commander');
  }

  init(data?: { back?: 'title' | 'map'; picked?: CommanderId }): void {
    this.back = data?.back === 'map' ? 'map' : 'title';
    this.save = loadProgress();
    if (data?.picked && commanderUnlocked(this.save, data.picked)) this.picked = data.picked;
    else this.picked = commanderUnlocked(this.save, this.save.commander) ? this.save.commander : 'mira';
  }

  create(): void {
    this.save = loadProgress();
    installPortraits(this);
    addBackdrop(this);
    this.add
      .text(VIEW_W / 2, 36, 'COMMANDER', {
        fontFamily: FONT,
        fontSize: '28px',
        color: INK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 68, 'Who leads the liberation.', {
        fontFamily: FONT,
        fontSize: '14px',
        color: MUTED,
      })
      .setOrigin(0.5);
    this.sheet = this.add.container(0, 100);
    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, 96, VIEW_W, 700);
    this.sheet.setMask(maskG.createGeometryMask());
    COMMANDERS.forEach((commander, index) => this.drawCard(commander.id, index * 118));
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < 100 || pointer.y > 790) return;
      this.drag = true;
      this.moved = false;
      this.dragY = pointer.y;
      this.sheetY = this.sheet.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.drag) return;
      const dy = pointer.y - this.dragY;
      if (Math.abs(dy) > 8) this.moved = true;
      const min = 100 - Math.max(0, COMMANDERS.length * 118 - 680);
      this.sheet.y = Math.max(min, Math.min(100, this.sheetY + dy));
    });
    this.input.on('pointerup', () => {
      this.drag = false;
    });
    new UiButton(this, VIEW_W / 2, 820, 260, 56, 'TAKE THE FIELD', 0x149684, () => this.confirm(), { fontSize: 18 });
    new UiButton(this, VIEW_W / 2, 890, 180, 44, this.back === 'map' ? 'MAP' : 'TITLE', 0x2a3344, () => {
      this.scene.start(this.back);
    }, { fontSize: 16 });
  }

  private drawCard(id: CommanderId, y: number): void {
    const commander = COMMANDERS.find((entry) => entry.id === id)!;
    const open = commanderUnlocked(this.save, id);
    const selected = this.picked === id;
    const g = this.add.graphics();
    this.sheet.add(g);
    g.fillStyle(selected ? 0x1c2c30 : 0x171b26, 1);
    g.fillRoundedRect(24, y, VIEW_W - 48, 108, 12);
    g.lineStyle(2, selected ? 0x3ee0c5 : 0xffffff, selected ? 0.9 : 0.06);
    g.strokeRoundedRect(24, y, VIEW_W - 48, 108, 12);
    const face = this.add.image(64, y + 54, `px-port-${id}`).setScale(0.7);
    const title = this.add.text(110, y + 10, `${commander.rank} ${commander.name}`, {
      fontFamily: FONT,
      fontSize: '16px',
      color: open ? INK : MUTED,
      fontStyle: 'bold',
    });
    const xp = levelForXp(this.save.xp[id] ?? 0);
    const meta = this.add.text(110, y + 32, open ? `Level ${xp}` : `Liberate ${levelById(commander.unlockNode ?? 1).name}`, {
      fontFamily: FONT,
      fontSize: '12px',
      color: '#f0c43a',
    });
    const blurb = this.add.text(110, y + 52, commander.passive, {
      fontFamily: FONT,
      fontSize: '14px',
      color: MUTED,
      wordWrap: { width: 330 },
    });
    this.sheet.add([face, title, meta, blurb]);
    if (!open) return;
    const zone = this.add.zone(VIEW_W / 2, y + 54, VIEW_W - 48, 108).setInteractive({ useHandCursor: true });
    this.sheet.add(zone);
    zone.on('pointerup', () => {
      if (this.moved) return;
      this.picked = id;
      sfx.ui();
      this.scene.restart({ back: this.back, picked: id });
    });
  }

  private confirm(): void {
    const next = setCommander(this.save, this.picked);
    if (!next.ok) {
      sfx.reject();
      return;
    }
    writeProgress(next.save);
    sfx.ui();
    this.scene.start('map');
  }
}
