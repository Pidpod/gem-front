import { sfx } from '../../audio/sfx';
import { levelById } from '../../config/levels';
import { otherFaction, skinFor } from '../../config/factions';
import { GLOBE_H, GLOBE_W, PLATE_H, PLATE_W, TERRITORIES, platePos, territoryByRegion } from '../../config/globe';
import { commanderById } from '../../config/commanders';
import { levelForXp } from '../../config/items';
import { NODES, PATHS, nodeById, regionById, route, type RegionId, type WorldNode } from '../../config/world';
import { installIso } from '../art/iso';
import { installOverworld } from '../art/overworld';
import { installArt } from '../art/sheets';
import { VIEW_H, VIEW_W } from '../layout';
import { homeRegion, isCleared, isReachable, loadProgress, resetProgress, type SaveData } from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { paintFrame, paintMetal } from '../ui/metal';
import { DialogueBox } from '../ui/dialogueBox';
import { UiButton } from '../ui/button';

const VIEW_TOP = 88;
const VIEW_BOTTOM = 728;

export class MapScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private focus = 0;
  private pos = 1;
  private mode: 'world' | 'region' = 'world';
  private region: RegionId = 'town';
  private mapW = GLOBE_W;
  private mapH = GLOBE_H;
  private world!: Phaser.GameObjects.Container;
  private token: Phaser.GameObjects.Sprite | null = null;
  private globeButton!: UiButton;
  private placeLabel!: Phaser.GameObjects.Text;
  private busy = false;
  private uiLock = false;
  private panel: Phaser.GameObjects.Container | null = null;
  private settings: Phaser.GameObjects.Container | null = null;
  private dragging = false;
  private moved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private worldStartX = 0;
  private worldStartY = 0;

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
    this.token = null;
    installArt(this);
    installIso(this);
    installOverworld(this);
    this.cameras.main.setBackgroundColor('#0e2436');
    this.drawChrome();
    this.drawSidebar();
    this.world = this.add.container(0, VIEW_TOP);
    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, VIEW_TOP, VIEW_W, VIEW_BOTTOM - VIEW_TOP);
    this.world.setMask(maskG.createGeometryMask());
    this.pos = this.bootNode();
    this.region = nodeById(this.pos).region;
    this.bindPointer();
    this.bootStory();
  }

  private drawChrome(): void {
    const bar = this.add.graphics().setDepth(20);
    const face = this.save.faction === 'crimson' ? 0x4a2a28 : 0x24344a;
    paintMetal(bar, 0, 0, VIEW_W, 80, face);
    const frame = this.add.graphics().setDepth(28);
    paintFrame(frame, 0, 80, VIEW_W, VIEW_BOTTOM - 72, 8);
    const commander = commanderById(this.save.commander);
    const level = levelForXp(this.save.xp[this.save.commander] ?? 0);
    this.add
      .text(20, 26, 'THE FRONT', { fontFamily: FONT, fontSize: '24px', color: INK, fontStyle: 'bold' })
      .setDepth(30);
    this.add
      .text(20, 54, `${commander.rank} ${commander.name}  ·  Lv ${level}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: MUTED,
      })
      .setDepth(30);
    this.add
      .text(VIEW_W - 20, 32, `${this.save.funds} FUNDS`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f0c43a',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(30);
    this.placeLabel = this.add
      .text(24, 92, '', { fontFamily: FONT, fontSize: '16px', color: '#f4f1ea', fontStyle: 'bold' })
      .setDepth(31);
  }

  private drawSidebar(): void {
    const g = this.add.graphics().setDepth(32);
    paintMetal(g, 0, VIEW_BOTTOM, VIEW_W, VIEW_H - VIEW_BOTTOM, 0x3a342c);
    const ratio = this.save.cleared.length / NODES.length;
    g.fillStyle(0x1a100e, 1);
    g.fillRect(12, 748, 18, 180);
    g.fillStyle(ratio > 0.5 ? 0x3dbe6e : 0xc4473a, 1);
    g.fillRect(12, 748 + 180 * (1 - ratio), 18, 180 * ratio);
    this.add
      .text(40, 748, `${this.save.funds}`, { fontFamily: FONT, fontSize: '22px', color: '#f0c43a', fontStyle: 'bold' })
      .setDepth(34);
    this.add
      .text(40, 774, `LIBERATED ${Math.round(ratio * 100)}%`, { fontFamily: FONT, fontSize: '12px', color: MUTED })
      .setDepth(34);
    this.drawRadar();
    new UiButton(this, 250, 880, 100, 58, 'HQ', 0x8a7040, () => this.scene.start('hq'), { fontSize: 14, depth: 40 });
    new UiButton(this, 360, 880, 100, 58, 'LEADER', 0x5c5648, () => this.scene.start('commander', { back: 'map' }), {
      fontSize: 12,
      depth: 40,
    });
    new UiButton(this, 250, 800, 100, 48, 'SETUP', 0x4a453c, () => this.openSettings(), { fontSize: 12, depth: 40 });
    this.globeButton = new UiButton(this, 360, 800, 100, 48, 'GLOBE', 0x2a4a6a, () => this.showWorld(), {
      fontSize: 12,
      depth: 40,
    });
    this.globeButton.root.setVisible(false);
  }

  private drawRadar(): void {
    const g = this.add.graphics().setDepth(34);
    g.fillStyle(0x102018, 1);
    g.fillRect(40, 800, 150, 100);
    g.lineStyle(2, 0xd9c89a, 1);
    g.strokeRect(40, 800, 150, 100);
    for (const territory of TERRITORIES) {
      const owned = this.hold(territory.region);
      const color = owned === 'player' ? (this.save.faction === 'azure' ? 0x3a78c8 : 0xc4473a) : owned === 'enemy' ? (this.save.faction === 'azure' ? 0xc4473a : 0x3a78c8) : 0xc4a15a;
      const x = 48 + (territory.x / GLOBE_W) * 134;
      const y = 808 + (territory.y / GLOBE_H) * 84;
      g.fillStyle(color, 1);
      g.fillCircle(x, y, territory.region === this.region && this.mode === 'region' ? 5 : 3);
    }
  }

  private hold(region: RegionId): 'player' | 'enemy' | 'split' {
    const ids = NODES.filter((node) => node.region === region);
    const owned = ids.filter((node) => isCleared(this.save, node.id)).length;
    if (owned === ids.length) return 'player';
    if (owned === 0) return region === homeRegion(this.save) ? 'split' : 'enemy';
    return 'split';
  }

  private showWorld(): void {
    this.mode = 'world';
    this.mapW = GLOBE_W;
    this.mapH = GLOBE_H;
    this.globeButton.root.setVisible(false);
    this.placeLabel.setText('');
    this.world.removeAll(true);
    this.token = null;
    const map = this.add.image(0, 0, 'ow-globe').setOrigin(0, 0);
    this.world.add(map);
    const marks = this.add.graphics();
    for (const territory of TERRITORIES) {
      const state = this.hold(territory.region);
      const playerColor = this.save.faction === 'azure' ? 0x3a78c8 : 0xc4473a;
      const enemyColor = this.save.faction === 'azure' ? 0xc4473a : 0x3a78c8;
      const color = state === 'player' ? playerColor : state === 'enemy' ? enemyColor : 0xe6c14a;
      marks.fillStyle(color, state === 'split' ? 0.45 : 0.62);
      marks.fillEllipse(territory.x, territory.y, 108, 64);
      marks.lineStyle(2, state === 'player' ? 0xf4f1ea : color, 0.9);
      marks.strokeEllipse(territory.x, territory.y, 108, 64);
    }
    this.world.add(marks);
    for (const territory of TERRITORIES) {
      const open = NODES.some((node) => node.region === territory.region && (isCleared(this.save, node.id) || isReachable(this.save, node.id)));
      const label = this.add
        .text(territory.x, territory.y + 28, territory.name, {
          fontFamily: FONT,
          fontSize: '13px',
          color: open ? INK : '#d7d0c4',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0);
      this.world.add(label);
    }
    const home = territoryByRegion(homeRegion(this.save));
    this.scrollToPoint(home.x, home.y);
    this.addCloud();
  }

  private showRegion(region: RegionId): void {
    this.mode = 'region';
    this.region = region;
    this.mapW = PLATE_W;
    this.mapH = PLATE_H;
    this.globeButton.root.setVisible(true);
    this.placeLabel.setText(territoryByRegion(region).name.toUpperCase());
    this.world.removeAll(true);
    const plate = this.add.image(0, 0, `ow-plate-${region}`).setOrigin(0, 0);
    this.world.add(plate);
    const roads = this.add.graphics();
    for (const [a, b] of PATHS) {
      const from = nodeById(a);
      const to = nodeById(b);
      if (from.region !== region || to.region !== region) continue;
      const p = platePos(a);
      const q = platePos(b);
      roads.lineStyle(16, 0x8a7048, 1);
      roads.lineBetween(p.x, p.y, q.x, q.y);
      roads.lineStyle(10, 0x2a2e32, 1);
      roads.lineBetween(p.x, p.y, q.x, q.y);
      roads.lineStyle(2, 0xe6d7a4, 0.8);
      roads.lineBetween(p.x, p.y, q.x, q.y);
    }
    this.world.add(roads);
    this.addTrees(region);
    for (const node of NODES.filter((entry) => entry.region === region)) this.addSite(node);
    const here = platePos(this.pos);
    const skin = skinFor(this.save.faction, true);
    this.token = this.add.sprite(here.x, here.y + 8, `iso-infantry-${skin}`, '0').setOrigin(0.5, 0.78).setScale(0.55);
    this.world.add(this.token);
    this.addCloud();
    if (region === 'coast') this.addSearchlight();
    this.scrollTo(this.pos);
  }

  private addSite(node: WorldNode): void {
    const at = platePos(node.id);
    const owned = isCleared(this.save, node.id);
    const faction = owned ? this.save.faction : otherFaction(this.save.faction);
    let key = 'ow-rubble';
    if (!(node.city && !owned)) key = faction === 'azure' ? (node.kind === 'boss' ? 'ow-azure-fort' : 'ow-azure') : node.kind === 'boss' ? 'ow-crimson-fort' : 'ow-crimson';
    const sprite = this.add.sprite(at.x, at.y, key).setOrigin(0.5, 0.82).setScale(node.kind === 'side' ? 0.72 : node.kind === 'boss' ? 1.05 : 0.9);
    this.world.add(sprite);
    if (faction === 'crimson' && key !== 'ow-rubble') {
      const glow = this.add.circle(at.x + 28, at.y - 20, 5, 0x7ad7ff, 0.85);
      this.tweens.add({ targets: glow, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
      this.world.add(glow);
      const smoke = this.add.circle(at.x + 8, at.y - 48, 6, 0x222222, 0.35);
      this.tweens.add({ targets: smoke, y: at.y - 70, alpha: 0.05, yoyo: true, repeat: -1, duration: 1600 });
      this.world.add(smoke);
    }
    if (owned) {
      const troop = this.add.sprite(at.x + 34, at.y + 6, `iso-infantry-${skinFor(this.save.faction, true)}`, '0').setOrigin(0.5, 0.8).setScale(0.4);
      this.tweens.add({ targets: troop, x: at.x + 40, duration: 900, yoyo: true, repeat: -1 });
      this.world.add(troop);
    }
    const open = owned || isReachable(this.save, node.id);
    const label = this.add
      .text(at.x, at.y + 18, open ? levelById(node.id).name : '—', {
        fontFamily: FONT,
        fontSize: '12px',
        color: INK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.world.add(label);
    if (open && !owned) {
      const ring = this.add.circle(at.x, at.y, 18).setStrokeStyle(2, 0xf0c43a, 1);
      this.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
      this.world.add(ring);
    }
  }

  private addTrees(region: RegionId): void {
    const palm = region === 'coast' || region === 'town';
    const spots = [
      [40, 120],
      [80, 500],
      [500, 140],
      [470, 520],
      [60, 300],
      [510, 340],
    ];
    for (const [x, y] of spots) {
      const tree = this.add.image(x!, y!, palm ? 'ow-palm' : 'ow-tree').setOrigin(0.5, 1);
      this.tweens.add({ targets: tree, angle: 3, duration: 1600 + (x ?? 0), yoyo: true, repeat: -1 });
      this.world.add(tree);
    }
  }

  private addCloud(): void {
    const cloud = this.add.ellipse(80, 80, 140, 36, 0x000000, 0.12);
    this.world.add(cloud);
    this.tweens.add({ targets: cloud, x: this.mapW - 40, duration: 18000, yoyo: true, repeat: -1 });
  }

  private addSearchlight(): void {
    const beam = this.add.graphics().setPosition(480, 40);
    beam.fillStyle(0xfff0c0, 0.12);
    beam.fillTriangle(0, 0, -40, 220, 50, 220);
    this.world.add(beam);
    this.tweens.add({ targets: beam, angle: 18, duration: 2800, yoyo: true, repeat: -1 });
    const water = this.add.rectangle(460, 400, 80, PLATE_H, 0x8fd0f0, 0.12);
    this.tweens.add({ targets: water, alpha: 0.02, duration: 1400, yoyo: true, repeat: -1 });
    this.world.add(water);
  }

  private bootNode(): number {
    const pending = this.pendingAfter();
    if (pending.length > 0) return pending[pending.length - 1] ?? this.homeNode();
    if (this.focus && (isCleared(this.save, this.focus) || isReachable(this.save, this.focus))) return this.focus;
    const cleared = [...this.save.cleared].sort((a, b) => b - a);
    return cleared[0] ?? this.homeNode();
  }

  private homeNode(): number {
    return homeRegion(this.save) === 'coast' ? 15 : 1;
  }

  private pendingAfter(): number[] {
    return NODES.filter((node) => node.after && isCleared(this.save, node.id) && !this.save.seen.includes(node.after)).map(
      (node) => node.id,
    );
  }

  private bootStory(): void {
    const pending = this.pendingAfter();
    if (pending.length > 0) {
      const node = nodeById(pending[pending.length - 1] ?? this.pos);
      this.pos = node.id;
      this.showRegion(node.region);
      const ids = pending.map((id) => nodeById(id).after).filter((id): id is string => Boolean(id));
      this.playQueue(ids, () => this.openPanel(this.pos));
      return;
    }
    const node = nodeById(this.pos);
    if (!isCleared(this.save, node.id) && node.before && !this.save.seen.includes(node.before)) {
      this.showRegion(node.region);
      this.playTalk(node.before, () => this.openPanel(node.id));
      return;
    }
    this.showWorld();
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
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.worldStartX = this.world.x;
      this.worldStartY = this.world.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      if (Math.hypot(dx, dy) > 12) this.moved = true;
      this.world.x = this.clampX(this.worldStartX + dx);
      this.world.y = this.clampY(this.worldStartY + dy);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const wasDrag = this.moved;
      this.dragging = false;
      if (wasDrag || this.busy || this.uiLock || this.settings) return;
      if (pointer.y < VIEW_TOP || pointer.y > VIEW_BOTTOM) return;
      const wx = pointer.x - this.world.x;
      const wy = pointer.y - this.world.y;
      if (this.mode === 'world') {
        let best: (typeof TERRITORIES)[number] | null = null;
        let bestDist = 70;
        for (const territory of TERRITORIES) {
          const dist = Math.hypot(territory.x - wx, territory.y - wy);
          if (dist < bestDist) {
            best = territory;
            bestDist = dist;
          }
        }
        if (best) this.enterRegion(best.region);
        return;
      }
      let bestNode: WorldNode | null = null;
      let bestDist = 46;
      for (const node of NODES) {
        if (node.region !== this.region) continue;
        const at = platePos(node.id);
        const dist = Math.hypot(at.x - wx, at.y - wy);
        if (dist < bestDist) {
          bestNode = node;
          bestDist = dist;
        }
      }
      if (bestNode) this.march(bestNode.id);
    });
  }

  private enterRegion(region: RegionId): void {
    const open = NODES.some((node) => node.region === region && (isCleared(this.save, node.id) || isReachable(this.save, node.id)));
    if (!open) {
      sfx.reject();
      return;
    }
    if (nodeById(this.pos).region !== region) {
      const spot =
        NODES.find((node) => node.region === region && isCleared(this.save, node.id)) ??
        NODES.find((node) => node.region === region && isReachable(this.save, node.id));
      if (spot) this.pos = spot.id;
    }
    sfx.ui();
    this.showRegion(region);
  }

  private march(id: number): void {
    if (nodeById(id).region !== this.region) return;
    if (id === this.pos) {
      this.arrive(id);
      return;
    }
    const path = route(this.pos, id, (node) => isCleared(this.save, node) || isReachable(this.save, node));
    if (!path || path.some((step) => nodeById(step).region !== this.region)) {
      sfx.reject();
      return;
    }
    void sfx.unlock();
    sfx.ui();
    this.busy = true;
    this.closePanel();
    const step = (index: number): void => {
      const next = path[index];
      if (next === undefined || !this.token) {
        this.busy = false;
        this.token?.setFrame('0');
        this.arrive(id);
        return;
      }
      const at = platePos(next);
      this.token.setFlipX(at.x < this.token.x);
      this.tweens.add({
        targets: this.token,
        x: at.x,
        y: at.y + 8,
        duration: 420,
        onUpdate: () => {
          const frame = Math.floor(this.time.now / 120) % 2;
          this.token?.setFrame(String(frame));
        },
        onComplete: () => {
          this.pos = next;
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
    panel.fillRoundedRect(40, 220, VIEW_W - 80, 280, 16);
    const title = this.add
      .text(VIEW_W / 2, 250, level.name, { fontFamily: FONT, fontSize: '22px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5);
    const sub = this.add
      .text(VIEW_W / 2, 282, `${regionById(node.region).name}  ·  ${level.blurb}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: MUTED,
        align: 'center',
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);
    const star = this.add
      .text(VIEW_W / 2, 318, [1, 2, 3].map((n) => (n <= stars ? '★' : '☆')).join('  '), {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#f0c43a',
      })
      .setOrigin(0.5);
    layer.add([dim, panel, title, sub, star]);
    const fight = new UiButton(this, VIEW_W / 2, 370, 240, 52, isCleared(this.save, id) ? 'REPLAY' : 'FIGHT', 0x149684, () => {
      this.scene.start('game', { level: id });
    }, { fontSize: 18, depth: 80 });
    layer.add(fight.root);
    if (node.city && isCleared(this.save, id)) {
      const city = new UiButton(this, VIEW_W / 2, 432, 240, 48, 'CITY', 0x2a3344, () => {
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
    const at = platePos(id);
    this.scrollToPoint(at.x, at.y);
  }

  private scrollToPoint(x: number, y: number): void {
    const viewH = VIEW_BOTTOM - VIEW_TOP;
    this.world.x = this.clampX(VIEW_W / 2 - x);
    this.world.y = this.clampY(VIEW_TOP + viewH / 2 - y);
  }

  private clampX(x: number): number {
    const min = Math.min(0, VIEW_W - this.mapW);
    return Math.max(min, Math.min(0, x));
  }

  private clampY(y: number): number {
    const viewH = VIEW_BOTTOM - VIEW_TOP;
    const min = Math.min(VIEW_TOP, VIEW_TOP + viewH - this.mapH);
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
