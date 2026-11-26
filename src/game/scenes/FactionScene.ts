import { sfx } from '../../audio/sfx';
import { FACTIONS, type FactionId } from '../../config/factions';
import { installOverworld } from '../art/overworld';
import { installPortraits } from '../art/portraits';
import { VIEW_H, VIEW_W } from '../layout';
import { loadProgress, writeProgress } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { paintMetal } from '../ui/metal';
import { UiButton } from '../ui/button';

const ORDER: FactionId[] = ['azure', 'crimson', 'frost'];
const CARD_H = 214;
const CARD_Y = [76, 302, 528];

export class FactionScene extends Phaser.Scene {
  private picked: FactionId = 'azure';

  constructor() {
    super('faction');
  }

  init(data?: { picked?: FactionId }): void {
    if (data?.picked === 'azure' || data?.picked === 'crimson' || data?.picked === 'frost') this.picked = data.picked;
  }

  create(): void {
    installOverworld(this);
    installPortraits(this);
    paintBackdrop(this);
    const header = this.add.graphics().setDepth(4);
    paintMetal(header, 12, 10, VIEW_W - 24, 56, 0x3e4450);
    rivets(header, 12, 10, VIEW_W - 24, 56);
    this.add
      .text(VIEW_W / 2, 38, 'CHOOSE A SIDE', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#e6d7a8',
        fontStyle: 'bold',
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    ORDER.forEach((id, index) => this.drawCard(id, CARD_Y[index] ?? 78));

    new UiButton(this, VIEW_W / 2, 820, 300, 58, 'MARCH', FACTIONS[this.picked].color, () => this.confirm(), {
      fontSize: 22,
      depth: 8,
    });
    new UiButton(this, VIEW_W / 2, 892, 180, 44, 'TITLE', 0x4a453c, () => this.scene.start('title'), {
      fontSize: 16,
      depth: 8,
    });
  }

  private drawCard(id: FactionId, y: number): void {
    const faction = FACTIONS[id];
    const selected = this.picked === id;
    const root = this.add.container(0, 0).setDepth(6).setAlpha(selected ? 1 : 0.48);
    const g = this.add.graphics();
    const faceTone = id === 'azure' ? 0x24344c : id === 'crimson' ? 0x3c2424 : 0x4c5560;
    paintMetal(g, 16, y, VIEW_W - 32, CARD_H, faceTone);
    rivets(g, 16, y, VIEW_W - 32, CARD_H);
    g.fillStyle(id === 'frost' ? 0xe8eef5 : faction.color, id === 'frost' ? 0.14 : 0.16);
    g.fillRect(22, y + 8, VIEW_W - 44, CARD_H - 16);
    const glow = this.add.graphics();
    if (selected) {
      glow.lineStyle(4, faction.color, 1);
      glow.strokeRect(13, y - 3, VIEW_W - 26, CARD_H + 6);
      this.tweens.add({ targets: glow, alpha: 0.4, duration: 680, yoyo: true, repeat: -1 });
    }
    const face = this.add.image(92, y + 108, `px-port-${faction.leader}`).setScale(2.15);
    g.lineStyle(4, faction.color, 1);
    g.strokeRect(34, y + 42, 116, 132);
    if (!selected) {
      g.fillStyle(0x000000, 0.35);
      g.fillRect(20, y + 6, VIEW_W - 40, CARD_H - 12);
    }
    const badge = this.add.graphics();
    drawEmblem(badge, id, 118, y + 150);
    const name = this.add.text(164, y + 16, faction.name, {
      fontFamily: FONT,
      fontSize: '18px',
      color: INK,
      fontStyle: 'bold',
    });
    drawBars(g, 164, y + 52, faction.economy, faction.tech, faction.diplomacy);
    const labels = this.add.text(164, y + 50, 'ECO\nTEC\nPAC', {
      fontFamily: FONT,
      fontSize: '11px',
      color: MUTED,
      lineSpacing: 5,
    });
    const perk = this.add.text(164, y + 118, faction.perk, {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#f4f1ea',
      wordWrap: { width: 280 },
    });
    const beach = this.add.text(164, y + 172, faction.beachhead, {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#f0c43a',
    });
    root.add([g, glow, face, badge, name, labels, perk, beach]);
    const zone = this.add.zone(VIEW_W / 2, y + CARD_H / 2, VIEW_W - 32, CARD_H).setInteractive({ useHandCursor: true });
    root.add(zone);
    zone.on('pointerup', () => {
      if (this.picked === id) return;
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

function paintBackdrop(scene: Phaser.Scene): void {
  scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x071018, 1);
  scene.add.image(VIEW_W / 2, VIEW_H / 2, 'ow-globe').setDisplaySize(VIEW_W + 40, VIEW_H + 80);
  scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x05080e, 0.48);
  const scan = scene.add.graphics().setDepth(2);
  scan.fillStyle(0x8fd0ff, 0.05);
  for (let y = 0; y < VIEW_H; y += 3) scan.fillRect(0, y, VIEW_W, 1);
  scan.lineStyle(8, 0x3ee0c5, 0.08);
  scan.strokeRect(4, 4, VIEW_W - 8, VIEW_H - 8);
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

function drawBars(g: Phaser.GameObjects.Graphics, x: number, y: number, eco: number, tech: number, pact: number): void {
  [eco, tech, pact].forEach((value, index) => {
    const row = y + index * 16;
    g.fillStyle(0x10141c, 1);
    g.fillRect(x + 28, row, 90, 8);
    g.fillStyle(index === 2 ? 0xe2c15a : 0x3ee0c5, 1);
    g.fillRect(x + 28, row, 18 * Math.max(0, Math.min(5, value)), 8);
  });
}

function drawEmblem(g: Phaser.GameObjects.Graphics, id: FactionId, x: number, y: number): void {
  if (id === 'azure') {
    g.fillStyle(0x16345c, 1);
    g.fillCircle(x, y, 22);
    g.fillStyle(0x3a78c8, 1);
    g.fillTriangle(x, y - 18, x + 16, y + 8, x - 16, y + 8);
    g.fillStyle(0x9fd0f2, 1);
    g.fillRect(x - 6, y + 8, 12, 10);
    g.fillStyle(0xe6d7a8, 1);
    g.fillCircle(x, y - 2, 3);
    return;
  }
  if (id === 'frost') {
    g.fillStyle(0xd5e6f5, 1);
    g.fillRect(x - 20, y - 16, 40, 32);
    g.fillStyle(0x7eb6e8, 1);
    g.fillTriangle(x, y - 20, x + 10, y + 2, x - 10, y + 2);
    g.fillStyle(0x2a4a68, 1);
    g.fillRect(x - 16, y + 4, 32, 6);
    g.fillRect(x - 4, y - 8, 8, 18);
    return;
  }
  g.fillStyle(0x3a1412, 1);
  g.fillCircle(x, y, 22);
  g.fillStyle(0xc4473a, 1);
  g.fillCircle(x, y, 16);
  g.fillStyle(0xe2c15a, 1);
  g.fillCircle(x, y - 2, 7);
  g.fillStyle(0x7ad7ff, 1);
  g.fillCircle(x + 14, y + 12, 5);
  g.lineStyle(2, 0x7ad7ff, 1);
  g.strokeCircle(x + 14, y + 12, 8);
}
