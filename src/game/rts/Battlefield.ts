import { sfx } from '../../audio/sfx';
import { LANE, VIEW_W } from '../layout';
import { FONT, shade } from '../theme';
import type { Outcome, Side, UnitKind } from '../types';
import { BattleSim, type BattleEvent, type SimUnit } from './sim';

interface UnitView {
  id: number;
  root: Phaser.GameObjects.Container;
  hp: Phaser.GameObjects.Graphics;
}

export class Battlefield {
  private readonly scene: Phaser.Scene;
  private readonly sim: BattleSim;
  private readonly world: Phaser.GameObjects.Container;
  private readonly views = new Map<number, UnitView>();
  private readonly playerGfx: Phaser.GameObjects.Graphics;
  private readonly enemyGfx: Phaser.GameObjects.Graphics;
  private readonly spawnQueue: UnitKind[] = [];
  private spawnCooldown = 0;
  private playerFlash = 0;
  private enemyFlash = 0;
  private banner: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, rng: () => number = Math.random) {
    this.scene = scene;
    this.sim = new BattleSim(rng);
    this.world = scene.add.container(0, 0).setDepth(6);
    this.drawLane();
    this.playerGfx = scene.add.graphics();
    this.enemyGfx = scene.add.graphics();
    this.world.add([this.playerGfx, this.enemyGfx]);
    const you = scene.add
      .text(LANE.playerX, LANE.top + 16, 'YOU', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#7af0e0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const foe = scene.add
      .text(LANE.enemyX, LANE.top + 16, 'FOE', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#ff9b90',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.world.add([you, foe]);
    const objective = scene.add
      .text(VIEW_W / 2, LANE.top + 16, 'Destroy the enemy base', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#f4f1ea',
      })
      .setOrigin(0.5);
    this.world.add(objective);
    scene.tweens.add({
      targets: objective,
      alpha: 0,
      delay: 2400,
      duration: 500,
      onComplete: () => objective.destroy(),
    });
    this.redrawBases();
  }

  get playerHp(): number {
    return this.sim.playerHp;
  }
  get enemyHp(): number {
    return this.sim.enemyHp;
  }
  get playerMax(): number {
    return this.sim.playerMax;
  }
  get enemyMax(): number {
    return this.sim.enemyMax;
  }
  get elapsed(): number {
    return this.sim.elapsed;
  }
  get outcome(): Outcome {
    return this.sim.outcome;
  }
  get unitCounts(): { player: number; enemy: number } {
    return {
      player: this.sim.units.filter((unit) => unit.side === 'player').length,
      enemy: this.sim.units.filter((unit) => unit.side === 'enemy').length,
    };
  }

  update(dt: number): Outcome {
    this.flushQueue(dt);
    const events = this.sim.update(dt);
    this.applyEvents(events);
    this.sync();
    this.playerFlash = Math.max(0, this.playerFlash - dt * 2.8);
    this.enemyFlash = Math.max(0, this.enemyFlash - dt * 2.8);
    this.redrawBases();
    return this.sim.outcome;
  }

  queueSpawn(kind: UnitKind): void {
    this.spawnQueue.push(kind);
  }

  heal(amount: number): number {
    const healed = this.sim.heal(amount);
    if (healed > 0) this.playerFlash = 0.85;
    return healed;
  }

  fireSuper(): Outcome {
    const events = this.sim.fireSuper();
    this.applyEvents(events);
    this.sync();
    return this.sim.outcome;
  }

  announce(message: string): void {
    this.banner?.destroy();
    const text = this.scene.add
      .text(VIEW_W / 2, LANE.groundY - 78, message, {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f0c43a',
        fontStyle: 'bold',
        stroke: '#10131a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(36);
    this.banner = text;
    this.scene.tweens.add({
      targets: text,
      y: text.y - 18,
      alpha: 0,
      delay: 280,
      duration: 520,
      onComplete: () => {
        text.destroy();
        if (this.banner === text) this.banner = null;
      },
    });
  }

  nudge(): void {
    this.scene.tweens.killTweensOf(this.world);
    this.world.x = 0;
    this.scene.tweens.add({
      targets: this.world,
      x: 6,
      duration: 36,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.world.x = 0;
      },
    });
  }

  private flushQueue(dt: number): void {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0 || this.spawnQueue.length === 0) return;
    const kind = this.spawnQueue[0];
    if (!kind) return;
    const event = this.sim.spawn('player', kind);
    if (!event) return;
    this.spawnQueue.shift();
    sfx.spawn('player');
    this.spawnCooldown = 0.16;
  }

  private applyEvents(events: BattleEvent[]): void {
    for (const event of events) {
      if (event.type === 'attack') this.slash(event);
      else if (event.type === 'dead') this.puff(event.x, event.y, event.side);
      else if (event.type === 'spawn' && event.side === 'enemy') sfx.spawn('enemy');
      else if (event.type === 'base') {
        if (event.side === 'player') this.playerFlash = 1;
        else this.enemyFlash = 1;
        sfx.hit();
      } else if (event.type === 'super') this.beam();
    }
  }

  private sync(): void {
    const alive = new Set<number>();
    for (const unit of this.sim.units) {
      alive.add(unit.id);
      let view = this.views.get(unit.id);
      if (!view) view = this.createView(unit);
      view.root.setPosition(unit.x, unit.y);
      this.drawHp(view, unit);
    }
    for (const [id, view] of this.views) {
      if (alive.has(id)) continue;
      view.root.destroy();
      this.views.delete(id);
    }
  }

  private createView(unit: SimUnit): UnitView {
    const root = this.scene.add.container(unit.x, unit.y);
    const body = this.scene.add.graphics();
    const hp = this.scene.add.graphics();
    drawUnit(body, unit.kind, unit.side);
    root.add([body, hp]);
    this.world.add(root);
    const view = { id: unit.id, root, hp };
    this.views.set(unit.id, view);
    return view;
  }

  private drawHp(view: UnitView, unit: SimUnit): void {
    const pct = Math.max(0, unit.hp / unit.maxHp);
    view.hp.clear();
    view.hp.fillStyle(0x000000, 0.55);
    view.hp.fillRect(-13, -24, 26, 4);
    view.hp.fillStyle(unit.side === 'player' ? 0x3ee0c5 : 0xff6b5b, 1);
    view.hp.fillRect(-13, -24, 26 * pct, 4);
  }

  private slash(event: Extract<BattleEvent, { type: 'attack' }>): void {
    const line = this.scene.add.graphics();
    line.lineStyle(2, event.side === 'player' ? 0xc8fff6 : 0xffd0c6, 0.9);
    line.lineBetween(event.x1, event.y1, event.x2, event.y2);
    this.world.add(line);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 120,
      onComplete: () => line.destroy(),
    });
  }

  private puff(x: number, y: number, side: Side): void {
    const color = side === 'player' ? 0x8ef6ea : 0xffb0a6;
    for (let i = 0; i < 4; i++) {
      const dot = this.scene.add.circle(x, y, 3, color, 0.9);
      this.world.add(dot);
      const angle = (Math.PI * 2 * i) / 4;
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 14,
        y: y + Math.sin(angle) * 14,
        alpha: 0,
        duration: 220,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private beam(): void {
    const beam = this.scene.add.rectangle(VIEW_W / 2, LANE.groundY - 16, VIEW_W - 24, 14, 0xd58bff, 0.9);
    this.world.add(beam);
    this.scene.tweens.add({
      targets: beam,
      scaleY: 3.4,
      alpha: 0,
      duration: 320,
      onComplete: () => beam.destroy(),
    });
    this.enemyFlash = 1;
    this.nudge();
  }

  private drawLane(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x1b2433, 1);
    g.fillRoundedRect(8, LANE.top, VIEW_W - 16, LANE.bottom - LANE.top, 14);
    g.fillStyle(0x26364c, 1);
    g.fillTriangle(16, LANE.groundY - 8, 130, LANE.groundY - 78, 230, LANE.groundY - 8);
    g.fillTriangle(180, LANE.groundY - 8, 320, LANE.groundY - 96, VIEW_W - 16, LANE.groundY - 8);
    g.fillStyle(0x3e382c, 1);
    g.fillRect(8, LANE.groundY, VIEW_W - 16, LANE.bottom - LANE.groundY);
    g.fillStyle(0xc6a15a, 0.4);
    g.fillRect(24, LANE.groundY + 18, VIEW_W - 48, 3);
    g.fillStyle(0x3ee0c5, 0.13);
    g.fillRect(8, LANE.groundY, 78, LANE.bottom - LANE.groundY);
    g.fillStyle(0xff5d4a, 0.13);
    g.fillRect(VIEW_W - 86, LANE.groundY, 78, LANE.bottom - LANE.groundY);
    this.world.add(g);
  }

  private redrawBases(): void {
    drawBase(this.playerGfx, LANE.playerX, LANE.groundY, 'player', this.playerFlash);
    drawBase(this.enemyGfx, LANE.enemyX, LANE.groundY, 'enemy', this.enemyFlash);
  }
}

function drawBase(g: Phaser.GameObjects.Graphics, x: number, y: number, side: Side, flash: number): void {
  g.clear();
  const color = side === 'player' ? 0x149684 : 0xc4473a;
  const accent = side === 'player' ? 0x9cf6ea : 0xffc1b6;
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(x, y + 6, 78, 16);
  g.fillStyle(shade(color, -0.22), 1);
  g.fillRoundedRect(x - 34, y - 28, 68, 36, 5);
  g.fillStyle(color, 1);
  g.fillRoundedRect(x - 32, y - 40, 64, 42, 5);
  g.fillStyle(accent, 1);
  g.fillRect(x - 30, y - 52, 14, 14);
  g.fillRect(x - 7, y - 52, 14, 14);
  g.fillRect(x + 16, y - 52, 14, 14);
  g.fillStyle(0x10131a, 1);
  g.fillRoundedRect(x - 9, y - 20, 18, 20, 3);
  g.fillStyle(accent, 0.9);
  g.fillCircle(side === 'player' ? x - 18 : x + 18, y - 30, 3);
  if (flash > 0) {
    g.fillStyle(0xffffff, Math.min(0.55, flash));
    g.fillRoundedRect(x - 32, y - 40, 64, 42, 5);
  }
}

function drawUnit(g: Phaser.GameObjects.Graphics, kind: UnitKind, side: Side): void {
  g.clear();
  const main = side === 'player' ? 0x3ee0c5 : 0xff6a58;
  const dark = shade(main, -0.25);
  const dir = side === 'player' ? 1 : -1;
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(0, 12, kind === 'heavy' ? 30 : 22, 8);
  g.fillStyle(dark, 1);
  if (kind === 'infantry') {
    g.fillCircle(0, -8, 6);
    g.fillRoundedRect(-6, -1, 12, 14, 3);
    g.fillStyle(main, 1);
    g.fillCircle(0, -9, 4);
    g.fillRect(-7, 4, 4, 7);
    g.fillRect(3, 4, 4, 7);
    return;
  }
  if (kind === 'rocket') {
    g.fillTriangle(-10, 8, 10, 8, dir * 16, -4);
    g.fillStyle(main, 1);
    g.fillTriangle(-6, 5, 6, 5, dir * 13, -2);
    return;
  }
  const wide = kind === 'heavy' ? 34 : kind === 'artillery' ? 22 : 26;
  const tall = kind === 'heavy' ? 18 : 14;
  g.fillRoundedRect(-wide / 2, -tall / 2, wide, tall, 3);
  g.fillStyle(main, 1);
  g.fillRoundedRect(-wide / 2 + 2, -tall / 2 + 2, wide - 4, tall - 4, 2);
  g.fillStyle(dark, 1);
  const barrel = kind === 'artillery' ? 18 : 10;
  g.fillRect(dir > 0 ? 6 : -6 - barrel, -2.5, barrel, 5);
}
