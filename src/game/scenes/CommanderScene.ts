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
    COMMANDERS.forEach((commander, index) => this.drawCard(commander.id, 118 + index * 168));
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
    g.fillStyle(selected ? 0x1c2c30 : 0x171b26, 1);
    g.fillRoundedRect(24, y, VIEW_W - 48, 152, 12);
    g.lineStyle(2, selected ? 0x3ee0c5 : 0xffffff, selected ? 0.9 : 0.06);
    g.strokeRoundedRect(24, y, VIEW_W - 48, 152, 12);
    this.add.image(78, y + 70, `px-port-${id}`).setScale(0.9);
    this.add.text(140, y + 16, `${commander.rank} ${commander.name}`, {
      fontFamily: FONT,
      fontSize: '16px',
      color: open ? INK : MUTED,
      fontStyle: 'bold',
    });
    const xp = levelForXp(this.save.xp[id] ?? 0);
    this.add.text(140, y + 40, open ? `Level ${xp}` : `Liberate ${levelById(commander.unlockNode ?? 1).name}`, {
      fontFamily: FONT,
      fontSize: '12px',
      color: '#f0c43a',
    });
    this.add.text(140, y + 64, commander.passive, {
      fontFamily: FONT,
      fontSize: '14px',
      color: MUTED,
      wordWrap: { width: 300 },
    });
    if (!open) return;
    const zone = this.add.zone(VIEW_W / 2, y + 76, VIEW_W - 48, 152).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
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
