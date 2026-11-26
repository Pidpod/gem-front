import { sfx } from '../../audio/sfx';
import { levelById } from '../../config/levels';
import { buildingsFor } from '../../config/cities';
import { commanderById } from '../../config/commanders';
import { levelForXp } from '../../config/items';
import { NODES, PATHS, REGIONS, WORLD_H, nodeById, regionById, route, type WorldNode } from '../../config/world';
import { installArt } from '../art/sheets';
import { VIEW_H, VIEW_W } from '../layout';
import { isCleared, isReachable, loadProgress, resetProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { DialogueBox } from '../ui/dialogueBox';
import { UiButton } from '../ui/button';

const VIEW_TOP = 100;
const VIEW_BOTTOM = 820;

export class MapScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private focus = 0;
  private pos = 1;
  private world!: Phaser.GameObjects.Container;
  private token!: Phaser.GameObjects.Sprite;
  private busy = false;
  private uiLock = false;
  private panel: Phaser.GameObjects.Container | null = null;
  private settings: Phaser.GameObjects.Container | null = null;
  private dragging = false;
  private moved = false;
  private dragStart = 0;
  private worldStart = 0;

  constructor() {
    super('map');
  }

  init(data?: { focus?: number }): void {
    this.focus = data?.focus && data.focus > 0 ? data.focus : 0;
  }

  create(): void {
    this.save = loadProgress();
    this.busy = false;
    this.uiLock = false;
    this.panel = null;
    this.settings = null;
    installArt(this);
    this.cameras.main.setBackgroundColor('#10131a');
    this.drawChrome();
    this.world = this.add.container(0, VIEW_TOP);
    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, VIEW_TOP, VIEW_W, VIEW_BOTTOM - VIEW_TOP);
    this.world.setMask(maskG.createGeometryMask());
    this.drawLand();
    this.pos = this.bootNode();
    const start = nodeById(this.pos);
    this.token = this.add.sprite(start.x, start.y + 6, 'px-infantry-player', '0').setScale(1.8);
    this.world.add(this.token);
    this.scrollTo(this.pos);
    this.bindPointer();
    this.bootStory();
  }

  private drawChrome(): void {
    const commander = commanderById(this.save.commander);
    const level = levelForXp(this.save.xp[this.save.commander] ?? 0);
    this.add
      .text(20, 28, 'THE FRONT', { fontFamily: FONT, fontSize: '26px', color: INK, fontStyle: 'bold' })
      .setDepth(30);
    this.add
      .text(20, 58, `${commander.rank} ${commander.name}  ·  Lv ${level}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: MUTED,
      })
      .setDepth(30);
    this.add
      .text(VIEW_W - 20, 36, `${this.save.funds} FUNDS`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f0c43a',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(30);
    new UiButton(this, 120, 852, 200, 48, 'MAIN HQ', 0x149684, () => this.scene.start('hq'), { fontSize: 16, depth: 40 });
    new UiButton(this, 330, 852, 200, 48, 'COMMANDER', 0x2a3344, () => this.scene.start('commander', { back: 'map' }), {
      fontSize: 14,
      depth: 40,
    });
    new UiButton(this, VIEW_W / 2, 912, 200, 40, 'SETTINGS', 0x2a3344, () => this.openSettings(), { fontSize: 14, depth: 40 });
  }

  private drawLand(): void {
    const land = this.add.graphics();
    for (const region of REGIONS) {
      land.fillStyle(region.ground, 1);
      land.fillRect(0, region.y, VIEW_W, region.height);
      land.fillStyle(0x000000, 0.15);
      land.fillRect(0, region.y, VIEW_W, 8);
    }
    for (const region of REGIONS) {
      if (region.id === 'forest') {
        land.fillStyle(0x245028, 1);
        for (let x = 30; x < VIEW_W; x += 46) land.fillTriangle(x, region.y + 70, x + 14, region.y + 36, x + 28, region.y + 70);
      } else if (region.id === 'desert') {
        land.fillStyle(0xe6c98a, 0.45);
        for (let x = 20; x < VIEW_W; x += 70) land.fillTriangle(x, region.y + 80, x + 40, region.y + 28, x + 80, region.y + 80);
      }
    }
    land.lineStyle(8, 0xc4b48a, 1);
    for (const [a, b] of PATHS) {
      const from = nodeById(a);
      const to = nodeById(b);
      land.lineStyle(10, regionById(to.region).path, 1);
      land.lineBetween(from.x, from.y, to.x, to.y);
    }
    for (const node of NODES) {
      const region = regionById(node.region);
      const cleared = isCleared(this.save, node.id);
      land.fillStyle(cleared ? region.owned : region.enemy, cleared ? 0.45 : 0.28);
      land.fillCircle(node.x, node.y, node.kind === 'boss' ? 34 : 28);
      if (node.city) this.drawCity(land, node, cleared);
      else {
        land.fillStyle(cleared ? 0xf4f1ea : 0x2a241c, 1);
        land.fillCircle(node.x, node.y, node.kind === 'side' ? 8 : node.kind === 'boss' ? 12 : 10);
      }
    }
    this.world.add(land);
    const coast = REGIONS.find((region) => region.id === 'coast');
    if (coast) {
      const water = this.add.rectangle(VIEW_W / 2, coast.y + 48, VIEW_W, 28, 0x8fd0f0, 0.28);
      this.tweens.add({ targets: water, alpha: 0.08, duration: 1600, yoyo: true, repeat: -1 });
      this.world.add(water);
    }
    for (const region of REGIONS) {
      const label = this.add.text(16, region.y + 16, region.name.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#f4f1ea',
        fontStyle: 'bold',
      });
      this.world.add(label);
    }
    for (const node of NODES) {
      const level = levelById(node.id);
      const open = isCleared(this.save, node.id) || isReachable(this.save, node.id);
      const label = this.add
        .text(node.x, node.y + 30, open ? level.name : '—', {
          fontFamily: FONT,
          fontSize: '11px',
          color: open ? INK : '#8a8078',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 96 },
        })
        .setOrigin(0.5, 0);
      this.world.add(label);
      if (isReachable(this.save, node.id) && !isCleared(this.save, node.id)) {
        const ring = this.add.circle(node.x, node.y, node.kind === 'boss' ? 22 : 16).setStrokeStyle(2, 0xf0c43a, 1);
        this.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
        this.world.add(ring);
      }
    }
  }

  private drawCity(land: Phaser.GameObjects.Graphics, node: WorldNode, cleared: boolean): void {
    const x = node.x;
    const y = node.y - 38;
    if (!cleared) {
      land.fillStyle(0x5a463c, 1);
      land.fillRect(x - 20, y - 6, 14, 20);
      land.fillRect(x + 2, y, 16, 14);
      land.fillStyle(0x2a241c, 1);
      land.fillRect(x - 22, y + 14, 42, 5);
      land.fillStyle(0xc4b8a4, 0.9);
      land.fillCircle(x - 10, y - 14, 4);
      land.fillCircle(x + 8, y - 18, 3);
      return;
    }
    const built = buildingsFor(node.id).some((entry) => this.save.buildings.includes(entry.id));
    land.fillStyle(0xc4a46a, 1);
    land.fillRect(x - 20, y - 2, 40, 22);
    land.fillStyle(built ? 0x8f3a32 : 0x6a3a32, 1);
    land.fillTriangle(x - 24, y - 2, x, y - 24, x + 24, y - 2);
    land.fillStyle(0xf0c43a, 1);
    land.fillRect(x - 5, y + 4, 8, 8);
    land.fillStyle(0x1a1612, 1);
    land.fillRect(x + 8, y + 8, 8, 12);
    land.fillStyle(built ? 0xf0c43a : 0xf4f1ea, 1);
    land.fillRect(x + 16, y - 20, 2, 16);
    land.fillTriangle(x + 18, y - 20, x + 30, y - 15, x + 18, y - 10);
  }

  private bootNode(): number {
    const pending = this.pendingAfter();
    if (pending.length > 0) return pending[pending.length - 1] ?? 1;
    if (this.focus && (isCleared(this.save, this.focus) || isReachable(this.save, this.focus))) return this.focus;
    const cleared = [...this.save.cleared].sort((a, b) => b - a);
    return cleared[0] ?? 1;
  }

  private pendingAfter(): number[] {
    return NODES.filter((node) => node.after && isCleared(this.save, node.id) && !this.save.seen.includes(node.after)).map(
      (node) => node.id,
    );
  }

  private bootStory(): void {
    const pending = this.pendingAfter();
    if (pending.length > 0) {
      const ids = pending.map((id) => nodeById(id).after).filter((id): id is string => Boolean(id));
      this.playQueue(ids, () => this.openPanel(this.pos));
      return;
    }
    const node = nodeById(this.pos);
    if (!isCleared(this.save, node.id) && node.before && !this.save.seen.includes(node.before)) {
      this.playTalk(node.before, () => this.openPanel(node.id));
    }
  }

  private playQueue(ids: string[], done: () => void): void {
    const [head, ...rest] = ids;
    if (!head) {
      done();
      return;
    }
    this.playTalk(head, () => this.playQueue(rest, done));
  }

  private playTalk(id: string, done: () => void): void {
    this.uiLock = true;
    this.closePanel();
    new DialogueBox(this, id, this.save, (save) => {
      this.save = save;
      this.uiLock = false;
      done();
    });
  }

  private bindPointer(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < VIEW_TOP || pointer.y > VIEW_BOTTOM) return;
      this.dragging = true;
      this.moved = false;
      this.dragStart = pointer.y;
      this.worldStart = this.world.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dy = pointer.y - this.dragStart;
      if (Math.abs(dy) > 12) this.moved = true;
      this.world.y = this.clampScroll(this.worldStart + dy);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const wasDrag = this.moved;
      this.dragging = false;
      if (wasDrag || this.busy || this.uiLock || this.settings) return;
      if (pointer.y < VIEW_TOP || pointer.y > VIEW_BOTTOM) return;
      const wx = pointer.x;
      const wy = pointer.y - this.world.y;
      let best: WorldNode | null = null;
      let bestDist = 36;
      for (const node of NODES) {
        const dist = Math.hypot(node.x - wx, node.y - wy);
        if (dist < bestDist) {
          best = node;
          bestDist = dist;
        }
      }
      if (best) this.march(best.id);
    });
  }

  private march(id: number): void {
    if (id === this.pos) {
      this.arrive(id);
      return;
    }
    const path = route(this.pos, id, (node) => isCleared(this.save, node) || isReachable(this.save, node));
    if (!path) {
      sfx.reject();
      return;
    }
    void sfx.unlock();
    sfx.ui();
    this.busy = true;
    this.closePanel();
    const step = (index: number): void => {
      const next = path[index];
      if (next === undefined) {
        this.busy = false;
        this.token.setFrame('0');
        this.arrive(id);
        return;
      }
      const node = nodeById(next);
      this.token.setFlipX(node.x < this.token.x);
      this.tweens.add({
        targets: this.token,
        x: node.x,
        y: node.y + 6,
        duration: 380,
        onUpdate: () => {
          const frame = Math.floor(this.time.now / 120) % 2;
          this.token.setFrame(String(frame));
        },
        onComplete: () => {
          this.pos = node.id;
          step(index + 1);
        },
      });
    };
    step(1);
  }

  private arrive(id: number): void {
    const node = nodeById(id);
    if (!isCleared(this.save, id) && node.before && !this.save.seen.includes(node.before)) {
      this.playTalk(node.before, () => this.openPanel(id));
      return;
    }
    this.openPanel(id);
  }

  private openPanel(id: number): void {
    this.closePanel();
    this.uiLock = true;
    const level = levelById(id);
    const node = nodeById(id);
    const stars = this.save.stars[String(id)] ?? 0;
    const layer = this.add.container(0, 0).setDepth(70);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.35).setInteractive();
    dim.on('pointerup', () => this.closePanel());
    const panel = this.add.graphics();
    panel.fillStyle(0x141820, 1);
    panel.fillRoundedRect(40, 250, VIEW_W - 80, 280, 16);
    const title = this.add
      .text(VIEW_W / 2, 280, level.name, { fontFamily: FONT, fontSize: '22px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5);
    const sub = this.add
      .text(VIEW_W / 2, 312, `${regionById(node.region).name}  ·  ${level.blurb}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: MUTED,
        align: 'center',
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);
    const star = this.add
      .text(VIEW_W / 2, 348, [1, 2, 3].map((n) => (n <= stars ? '★' : '☆')).join('  '), {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#f0c43a',
      })
      .setOrigin(0.5);
    layer.add([dim, panel, title, sub, star]);
    const fight = new UiButton(this, VIEW_W / 2, 400, 240, 52, isCleared(this.save, id) ? 'REPLAY' : 'FIGHT', 0x149684, () => {
      this.scene.start('game', { level: id });
    }, { fontSize: 18, depth: 80 });
    layer.add(fight.root);
    if (node.city && isCleared(this.save, id)) {
      const city = new UiButton(this, VIEW_W / 2, 462, 240, 48, 'CITY', 0x2a3344, () => {
        this.scene.start('city', { nodeId: id });
      }, { fontSize: 16, depth: 80 });
      layer.add(city.root);
    }
    this.panel = layer;
  }

  private closePanel(): void {
    this.panel?.destroy(true);
    this.panel = null;
    if (!this.settings) this.uiLock = false;
  }

  private scrollTo(id: number): void {
    const node = nodeById(id);
    const viewH = VIEW_BOTTOM - VIEW_TOP;
    const target = VIEW_TOP + viewH / 2 - node.y;
    this.world.y = this.clampScroll(target);
  }

  private clampScroll(y: number): number {
    const viewH = VIEW_BOTTOM - VIEW_TOP;
    const min = VIEW_TOP + viewH - WORLD_H;
    return Math.max(min, Math.min(VIEW_TOP, y));
  }

  private openSettings(): void {
    this.settings?.destroy(true);
    this.uiLock = true;
    const layer = this.add.container(0, 0).setDepth(120);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.8).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x171b26, 1);
    panel.fillRoundedRect(40, 280, VIEW_W - 80, 340, 16);
    const text = this.add
      .text(VIEW_W / 2, 340, 'SETTINGS\n\nErase stars, funds, cities,\ngear, and the front?', {
        fontFamily: FONT,
        fontSize: '18px',
        color: INK,
        align: 'center',
      })
      .setOrigin(0.5);
    layer.add([dim, panel, text]);
    const erase = new UiButton(this, VIEW_W / 2, 450, 240, 48, 'RESET PROGRESS', 0xc4473a, () => {
      resetProgress();
      this.scene.start('map');
    }, { fontSize: 16, depth: 130 });
    const title = new UiButton(this, VIEW_W / 2, 510, 200, 44, 'TITLE', 0x2a3344, () => this.scene.start('title'), {
      fontSize: 16,
      depth: 130,
    });
    const cancel = new UiButton(this, VIEW_W / 2, 566, 180, 44, 'CLOSE', 0x2a3344, () => {
      this.settings?.destroy(true);
      this.settings = null;
      this.uiLock = false;
    }, { fontSize: 16, depth: 130 });
    layer.add([erase.root, title.root, cancel.root]);
    this.settings = layer;
  }
}
