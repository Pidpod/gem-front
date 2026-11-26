import { sfx } from '../../audio/sfx';
import { COMMANDERS, type CommanderId } from '../../config/commanders';
import { FACTIONS } from '../../config/factions';
import { levelById } from '../../config/levels';
import { levelForXp } from '../../config/items';
import { installOverworld } from '../art/overworld';
import { installPortraits } from '../art/portraits';
import { VIEW_H, VIEW_W } from '../layout';
import { commanderUnlocked, loadProgress, setCommander, writeProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { paintMetal } from '../ui/metal';
import { UiButton } from '../ui/button';

const CARD_H = 164;
const LIST_TOP = 78;
const LIST_BOTTOM = 800;

export class CommanderScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private picked: CommanderId = 'mira';
  private back: 'title' | 'map' = 'title';
  private sheet!: Phaser.GameObjects.Container;
  private drag = false;
  private moved = false;
  private dragY = 0;
  private sheetY = 0;
  private listHeight = 0;

  constructor() {
    super('commander');
  }

  init(data?: { back?: 'title' | 'map'; picked?: CommanderId }): void {
    this.back = data?.back === 'map' ? 'map' : 'title';
    this.save = loadProgress();
    if (data?.picked && commanderUnlocked(this.save, data.picked)) this.picked = data.picked;
    else this.picked = commanderUnlocked(this.save, this.save.commander) ? this.save.commander : FACTIONS[this.save.faction].leader;
  }

  create(): void {
    this.save = loadProgress();
    installPortraits(this);
    installOverworld(this);
    paintBackdrop(this);

    const header = this.add.graphics().setDepth(4);
    paintMetal(header, 12, 8, VIEW_W - 24, 56, 0x3e4450);
    rivets(header, 12, 8, VIEW_W - 24, 56);
    this.add
      .text(VIEW_W / 2, 36, 'COMMANDER', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#e6d7a8',
        fontStyle: 'bold',
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.sheet = this.add.container(0, LIST_TOP).setDepth(6);
    const maskG = this.add.graphics().setVisible(false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, LIST_TOP, VIEW_W, LIST_BOTTOM - LIST_TOP);
    this.sheet.setMask(maskG.createGeometryMask());

    let y = 0;
    y = this.header(y, 'FACTION LEADER');
    y = this.drawCard(FACTIONS[this.save.faction].leader, y) + 8;
    y = this.header(y, 'FIELD OFFICERS');
    for (const id of ['mira', 'holt', 'ivo', 'sera'] as const) y = this.drawCard(id, y) + 8;
    y = this.header(y, 'ALLIES');
    for (const id of ['modhi', 'khaboom', 'kimfun', 'mustard'] as const) y = this.drawCard(id, y) + 8;
    this.listHeight = y;

    const bar = this.add.graphics().setDepth(8);
    paintMetal(bar, 0, LIST_BOTTOM, VIEW_W, VIEW_H - LIST_BOTTOM, 0x3a342c);
    new UiButton(this, VIEW_W / 2, 848, 300, 56, 'TAKE THE FIELD', FACTIONS[this.save.faction].color, () => this.confirm(), {
      fontSize: 18,
      depth: 10,
    });
    new UiButton(this, VIEW_W / 2, 916, 180, 44, this.back === 'map' ? 'MAP' : 'TITLE', 0x4a453c, () => {
      this.scene.start(this.back);
    }, { fontSize: 16, depth: 10 });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < LIST_TOP || pointer.y > LIST_BOTTOM) return;
      this.drag = true;
      this.moved = false;
      this.dragY = pointer.y;
      this.sheetY = this.sheet.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.drag) return;
      const dy = pointer.y - this.dragY;
      if (Math.abs(dy) > 8) this.moved = true;
      const min = LIST_TOP - Math.max(0, this.listHeight - (LIST_BOTTOM - LIST_TOP));
      this.sheet.y = Math.max(min, Math.min(LIST_TOP, this.sheetY + dy));
    });
    this.input.on('pointerup', () => {
      this.drag = false;
    });
  }

  private header(y: number, label: string): number {
    const text = this.add.text(24, y + 4, label, {
      fontFamily: FONT,
      fontSize: '13px',
      color: '#e2c15a',
      fontStyle: 'bold',
    });
    this.sheet.add(text);
    return y + 28;
  }

  private drawCard(id: CommanderId, y: number): number {
    const commander = COMMANDERS.find((entry) => entry.id === id)!;
    const open = commanderUnlocked(this.save, id);
    const selected = this.picked === id;
    const factionColor = FACTIONS[this.save.faction].color;
    const glow = id === FACTIONS[this.save.faction].leader ? factionColor : 0x3ee0c5;
    const g = this.add.graphics();
    paintMetal(g, 16, y, VIEW_W - 32, CARD_H, open ? 0x242830 : 0x1a1c22);
    if (selected && open) {
      g.lineStyle(3, glow, 1);
      g.strokeRect(16, y, VIEW_W - 32, CARD_H);
      this.tweens.add({ targets: g, alpha: 0.75, duration: 680, yoyo: true, repeat: -1 });
    }
    const face = this.add.image(86, y + 86, `px-port-${id}`).setScale(1.95);
    g.lineStyle(3, open ? glow : 0x5a5348, 1);
    g.strokeRect(32, y + 22, 108, 124);
    const shown = commander.name.startsWith(commander.rank) ? commander.name : `${commander.rank} ${commander.name}`;
    const title = this.add.text(156, y + 14, shown, {
      fontFamily: FONT,
      fontSize: '17px',
      color: open ? INK : MUTED,
      fontStyle: 'bold',
    });
    const level = levelForXp(this.save.xp[id] ?? 0);
    pips(g, 156, y + 42, level);
    const levelText = this.add.text(268, y + 36, open ? `Lv ${level}` : 'LOCKED', {
      fontFamily: FONT,
      fontSize: '12px',
      color: open ? '#8ff6e4' : '#f0c43a',
    });
    const blurb = this.add.text(156, y + 60, open ? commander.passive : `Liberate ${levelById(commander.unlockNode ?? 1).name}`, {
      fontFamily: FONT,
      fontSize: '13px',
      color: open ? '#d5dbe3' : '#f0c43a',
      wordWrap: { width: 290 },
    });
    const bits: Phaser.GameObjects.GameObject[] = [g, face, title, levelText, blurb];
    if (!open) {
      face.setTint(0x777777);
      face.preFX?.addColorMatrix().grayscale();
      bits.push(padlock(this, 86, y + 92));
    }
    drawBuffs(g, 156, y + 142, commander);
    this.sheet.add(bits);
    if (!open) return y + CARD_H;
    const zone = this.add.zone(VIEW_W / 2, y + CARD_H / 2, VIEW_W - 32, CARD_H).setInteractive({ useHandCursor: true });
    this.sheet.add(zone);
    zone.on('pointerup', () => {
      if (this.moved) return;
      this.picked = id;
      sfx.ui();
      this.scene.restart({ back: this.back, picked: id });
    });
    return y + CARD_H;
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

function pips(g: Phaser.GameObjects.Graphics, x: number, y: number, level: number): void {
  for (let i = 0; i < 10; i++) {
    g.fillStyle(i < level ? 0x3ee0c5 : 0x2a3140, 1);
    g.fillRect(x + i * 10, y, 7, 8);
  }
}

function paintBackdrop(scene: Phaser.Scene): void {
  scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x071018, 1);
  scene.add.image(VIEW_W / 2, VIEW_H / 2, 'ow-globe').setDisplaySize(VIEW_W + 40, VIEW_H + 80);
  scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x05080e, 0.5);
  const scan = scene.add.graphics().setDepth(1);
  scan.fillStyle(0x8fd0ff, 0.045);
  for (let y = 0; y < VIEW_H; y += 3) scan.fillRect(0, y, VIEW_W, 1);
}

function rivets(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  for (const [px, py] of [
    [x + 10, y + 10],
    [x + w - 10, y + 10],
    [x + 10, y + h - 10],
    [x + w - 10, y + h - 10],
  ]) {
    g.fillStyle(0x1a160f, 1);
    g.fillCircle(px, py, 4);
    g.fillStyle(0xe6d3a4, 1);
    g.fillCircle(px - 1, py - 1, 2);
  }
}

function padlock(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.lineStyle(3, 0xf0c43a, 1);
  g.beginPath();
  g.arc(x, y - 2, 8, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xf0c43a, 1);
  g.fillRoundedRect(x - 10, y - 2, 20, 16, 2);
  g.fillStyle(0x1a1c22, 1);
  g.fillCircle(x, y + 6, 2);
  return g;
}

function drawBuffs(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  commander: (typeof COMMANDERS)[number],
): void {
  const kinds: Array<'shield' | 'coin' | 'boot' | 'gem' | 'focus' | 'medic'> = [];
  if ((commander.wallHp ?? 0) > 0 || commander.tankHp > 1 || (commander.tankArmor ?? 1) > 1) kinds.push('shield');
  if ((commander.shopCut ?? 1) < 1 || (commander.upgradeCut ?? 1) < 1 || (commander.fundsMul ?? 1) > 1 || (commander.planPerLevel ?? 0) > 0) kinds.push('coin');
  if (commander.extraHop || (commander.speedMul ?? 1) > 1 || (commander.enemySlow ?? 1) < 1) kinds.push('boot');
  if ((commander.superCharge ?? 1) > 1 || (commander.paradeEvery ?? 0) > 0) kinds.push('gem');
  if (commander.medicHeal > 1 || commander.repair > 1) kinds.push('medic');
  if ((commander.focusMoves ?? 0) > 0) kinds.push('focus');
  kinds.slice(0, 4).forEach((kind, index) => icon(g, x + index * 18, y, kind));
}

function icon(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  kind: 'shield' | 'coin' | 'boot' | 'gem' | 'focus' | 'medic',
): void {
  if (kind === 'shield') {
    g.fillStyle(0x8ff6e4, 1);
    g.fillTriangle(x, y - 6, x + 6, y - 2, x, y + 6);
    g.fillTriangle(x, y - 6, x - 6, y - 2, x, y + 6);
    return;
  }
  if (kind === 'coin') {
    g.fillStyle(0xf0c43a, 1);
    g.fillCircle(x, y, 5);
    g.fillStyle(0x3a3018, 1);
    g.fillRect(x - 1, y - 3, 2, 6);
    return;
  }
  if (kind === 'boot') {
    g.fillStyle(0x7ab0ff, 1);
    g.fillRect(x - 4, y - 5, 5, 8);
    g.fillRect(x - 4, y + 1, 9, 4);
    return;
  }
  if (kind === 'gem') {
    g.fillStyle(0xd58bff, 1);
    g.fillTriangle(x, y - 6, x + 6, y, x, y + 6);
    g.fillTriangle(x, y - 6, x - 6, y, x, y + 6);
    return;
  }
  if (kind === 'medic') {
    g.fillStyle(0x5ee08f, 1);
    g.fillRect(x - 2, y - 6, 4, 12);
    g.fillRect(x - 6, y - 2, 12, 4);
    return;
  }
  g.lineStyle(2, 0x5ee08f, 1);
  g.strokeCircle(x, y, 5);
  g.fillStyle(0x5ee08f, 1);
  g.fillCircle(x, y, 2);
}
