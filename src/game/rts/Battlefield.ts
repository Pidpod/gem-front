import { sfx } from '../../audio/sfx';
import { BALANCE, STRIKE_LABEL } from '../../config/balance';
import { installArt } from '../art/sheets';
import { LANE, VIEW_W } from '../layout';
import { FONT } from '../theme';
import type { Side, StrikeKind, UnitKind } from '../types';
import { BattleSim, type BattleEvent, type SimUnit } from './sim';

interface UnitView {
  id: number;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  hp: Phaser.GameObjects.Graphics;
  frames: number;
  lastPct: number;
}

const LOOK: Record<UnitKind, string> = {
  infantry: 'px-infantry',
  tank: 'px-tank',
  heli: 'px-heli',
  medic: 'px-medic',
  rocket: 'px-rocket',
  heavy: 'px-heavy',
  artillery: 'px-artillery',
};

export class Battlefield {
  private readonly scene: Phaser.Scene;
  private readonly sim: BattleSim;
  private readonly world: Phaser.GameObjects.Container;
  private readonly views = new Map<number, UnitView>();
  private readonly spawnQueue: UnitKind[] = [];
  private readonly clouds: Phaser.GameObjects.Container;
  private readonly hills: Phaser.GameObjects.Container;
  private spawnCooldown = 0;
  private cloudShift = 0;
  private hillShift = 0;
  private fxCount = 0;
  private playerBase!: Phaser.GameObjects.Sprite;
  private enemyBase!: Phaser.GameObjects.Sprite;
  private banner: Phaser.GameObjects.Text | null = null;
  private flashRect: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, rng: () => number = Math.random) {
    this.scene = scene;
    this.sim = new BattleSim(rng);
    installArt(scene);
    this.world = scene.add.container(0, 0).setDepth(6);
    this.clouds = scene.add.container(0, 0);
    this.hills = scene.add.container(0, 0);
    this.world.add([this.clouds, this.hills]);
    this.drawScenery();
    this.playerBase = this.makeBase('player');
    this.enemyBase = this.makeBase('enemy');
    const you = scene.add
      .text(LANE.playerX, LANE.top + 14, 'YOU', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#d7ec9a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const foe = scene.add
      .text(LANE.enemyX, LANE.top + 14, 'FOE', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#ffb0a4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.world.add([you, foe]);
    const objective = scene.add
      .text(VIEW_W / 2, LANE.top + 14, 'Destroy the enemy base', {
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
  get outcome() {
    return this.sim.outcome;
  }
  get unitCounts(): { player: number; enemy: number } {
    return {
      player: this.sim.units.filter((unit) => unit.side === 'player').length,
      enemy: this.sim.units.filter((unit) => unit.side === 'enemy').length,
    };
  }

  update(dt: number) {
    this.flushQueue(dt);
    const events = this.sim.outcome === 'play' ? this.sim.update(dt) : [];
    this.applyEvents(events);
    this.sync(this.scene.time.now);
    this.scroll(dt);
    return this.sim.outcome;
  }

  queueSpawn(kind: UnitKind): void {
    this.spawnQueue.push(kind);
  }

  heal(amount: number): number {
    const healed = this.sim.heal(amount);
    if (healed > 0) this.playerBase.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.playerBase.clearTint());
    return healed;
  }

  fireSuper() {
    const events = this.sim.fireSuper();
    this.applyEvents(events);
    this.sync(this.scene.time.now);
    this.beam();
    return this.sim.outcome;
  }

  /** Match-5 highlight. Damage lands when the projectile hits. */
  playStrike(kind: StrikeKind): void {
    const spec = BALANCE.strikes[kind];
    const center = this.impactX('player');
      if (spec.allyRepair > 0) {
        const healed = this.heal(spec.allyRepair);
        if (healed > 0) {
          sfx.heal();
          this.plusBurst(LANE.playerX, LANE.groundY - 24);
        }
      }
      if (kind === 'shell') {
      this.arc(LANE.playerX + 24, LANE.groundY - 36, center, LANE.groundY - 6, 640, 'px-shell', 3.2, () => {
        this.boom(center, LANE.groundY - 8, 3.6);
        this.debris(center, LANE.groundY - 8, 10);
        this.nudge(9);
        this.flash(0.45);
        sfx.explosion();
        this.resolveStrike('player', center, spec.radius, spec.damage, spec.baseDamage);
      });
    } else if (kind === 'barrage') {
      for (let i = 0; i < spec.hits; i++) {
        const x = center + (i - (spec.hits - 1) / 2) * spec.spread;
        this.arc(LANE.playerX + 16 + i * 6, LANE.groundY - 30, x, LANE.groundY - 2, 260 + i * 55, 'px-grenade', 1.5, () => {
          this.boom(x, LANE.groundY - 4, 1.7);
          this.debris(x, LANE.groundY, 4);
          sfx.explosion();
          this.resolveStrike('player', x, spec.radius, spec.damage, i === spec.hits - 1 ? spec.baseDamage : 0);
        });
      }
      this.nudge(4);
    } else {
      const heli = this.scene.add.sprite(LANE.playerX - 40, LANE.top + 46, 'px-heli-player', 0);
      this.world.add(heli);
      this.scene.tweens.add({
        targets: heli,
        x: LANE.enemyX + 36,
        duration: 760,
        onUpdate: () => heli.setFrame(String(Math.floor(this.scene.time.now / 70) % 2)),
        onComplete: () => heli.destroy(),
      });
      for (let i = 0; i < spec.hits; i++) {
        const x = center + (i - (spec.hits - 1) / 2) * spec.spread;
        this.scene.time.delayedCall(160 + i * 90, () => {
          this.arc(heli.x, heli.y + 6, x, LANE.groundY - 4, 220, 'px-missile', 1.6, () => {
            this.boom(x, LANE.groundY - 6, 2.1);
            this.debris(x, LANE.groundY, 5);
            sfx.explosion();
            this.resolveStrike('player', x, spec.radius, spec.damage, i === spec.hits - 1 ? spec.baseDamage : 0);
          });
        });
      }
      this.nudge(5);
    }
    this.announce(STRIKE_LABEL[kind]);
  }

  announce(message: string): void {
    this.banner?.destroy();
    const text = this.scene.add
      .text(VIEW_W / 2, LANE.groundY - 86, message, {
        fontFamily: FONT,
        fontSize: message.length > 10 ? '26px' : '34px',
        color: '#ffe56a',
        fontStyle: 'bold',
        stroke: '#1a1208',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(80)
      .setScale(0.6);
    this.banner = text;
    this.scene.tweens.add({
      targets: text,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: text,
      y: text.y - 16,
      alpha: 0,
      delay: 700,
      duration: 480,
      onComplete: () => {
        text.destroy();
        if (this.banner === text) this.banner = null;
      },
    });
  }

  nudge(amount = 5): void {
    this.scene.tweens.killTweensOf(this.world);
    this.world.x = 0;
    this.scene.tweens.add({
      targets: this.world,
      x: amount,
      duration: 32,
      yoyo: true,
      repeat: amount > 6 ? 4 : 2,
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
      if (event.type === 'attack') this.shot(event);
      else if (event.type === 'dead') this.boom(event.x, event.y, event.kind === 'tank' || event.kind === 'heavy' ? 2 : 1.3);
      else if (event.type === 'heal') this.healBeam(event);
      else if (event.type === 'spawn' && event.side === 'enemy') sfx.spawn('enemy');
      else if (event.type === 'base') {
        const base = event.side === 'player' ? this.playerBase : this.enemyBase;
        base.setTintFill(0xffffff);
        this.scene.time.delayedCall(70, () => base.clearTint());
        sfx.hit();
      }
    }
  }

  private resolveStrike(
    side: Side,
    x: number,
    radius: number,
    damage: number,
    baseDamage: number,
  ): void {
    const events = this.sim.areaStrike(side, x, radius, damage, baseDamage);
    this.applyEvents(events);
  }

  private sync(time: number): void {
    const alive = new Set<number>();
    for (const unit of this.sim.units) {
      alive.add(unit.id);
      let view = this.views.get(unit.id);
      if (!view) view = this.createView(unit);
      const bob = unit.kind === 'heli' ? Math.sin(time / 180 + unit.id) * 2 : 0;
      view.root.setPosition(unit.x, unit.y + bob);
      view.body.setFrame(String(Math.floor(time / 140 + unit.id) % view.frames));
      const pct = Math.max(0, unit.hp / unit.maxHp);
      if (Math.abs(pct - view.lastPct) > 0.02) {
        view.lastPct = pct;
        this.drawHp(view, unit.side, pct);
      }
    }
    for (const [id, view] of this.views) {
      if (alive.has(id)) continue;
      view.root.destroy();
      this.views.delete(id);
    }
    this.playerBase.setFrame(String(Math.floor(time / 280) % 2));
    this.enemyBase.setFrame(String(Math.floor(time / 280) % 2));
  }

  private scroll(dt: number): void {
    this.cloudShift = (this.cloudShift + dt * 10) % (VIEW_W - 16);
    this.hillShift = (this.hillShift + dt * 18) % (VIEW_W - 16);
    this.clouds.x = -this.cloudShift;
    this.hills.x = -this.hillShift;
  }

  private createView(unit: SimUnit): UnitView {
    const key = `${LOOK[unit.kind]}-${unit.side}`;
    const root = this.scene.add.container(unit.x, unit.y);
    const body = this.scene.add.sprite(0, unit.kind === 'heli' ? 0 : 6, key, '0');
    body.setOrigin(0.5, unit.kind === 'heli' ? 0.5 : 0.9);
    const small = unit.kind === 'infantry' || unit.kind === 'rocket' || unit.kind === 'medic';
    body.setScale(unit.kind === 'heli' ? 1.55 : small ? 1.65 : 1.4);
    if (unit.side === 'enemy') body.setFlipX(true);
    const hp = this.scene.add.graphics();
    root.add([body, hp]);
    this.world.add(root);
    const frames = Math.max(1, body.texture.frameTotal - 1);
    const view: UnitView = { id: unit.id, root, body, hp, frames, lastPct: -1 };
    this.views.set(unit.id, view);
    this.drawHp(view, unit.side, 1);
    return view;
  }

  private drawHp(view: UnitView, side: Side, pct: number): void {
    view.hp.clear();
    view.hp.fillStyle(0x000000, 0.55);
    view.hp.fillRect(-12, -28, 24, 3);
    view.hp.fillStyle(side === 'player' ? 0xc6e07a : 0xff6b5b, 1);
    view.hp.fillRect(-12, -28, 24 * pct, 3);
  }

  private healBeam(event: Extract<BattleEvent, { type: 'heal' }>): void {
    sfx.heal();
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x5ee08f, 0.95);
    line.lineBetween(event.x1, event.y1 - 6, event.x2, event.y2 - 8);
    this.world.add(line);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 200,
      onComplete: () => line.destroy(),
    });
    this.plusBurst(event.x2, event.y2 - 10);
  }

  private plusBurst(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const plus = this.scene.add.image(x + (i - 1) * 5, y, 'px-pix').setTint(0x5ee08f).setScale(2.2);
      this.world.add(plus);
      this.scene.tweens.add({
        targets: plus,
        y: y - 16 - i * 5,
        alpha: 0,
        duration: 380,
        onComplete: () => plus.destroy(),
      });
    }
  }

  private shot(event: Extract<BattleEvent, { type: 'attack' }>): void {
    if (this.fxCount > 36) return;
    this.fxCount += 1;
    const flash = this.scene.add.sprite(event.x1, event.y1, 'px-bullet', 0);
    this.world.add(flash);
    this.scene.tweens.add({
      targets: flash,
      x: event.x2,
      y: event.y2,
      duration: event.side === 'player' ? 90 : 90,
      onComplete: () => {
        flash.destroy();
        this.fxCount -= 1;
      },
    });
  }

  private boom(x: number, y: number, scale: number): void {
    if (this.fxCount > 40) return;
    this.fxCount += 1;
    const blast = this.scene.add.sprite(x, y, 'px-boom', 0).setScale(scale);
    this.world.add(blast);
    this.scene.tweens.addCounter({
      from: 0,
      to: 4,
      duration: 280,
      onUpdate: (tween) => blast.setFrame(String(Math.min(4, Math.floor(tween.getValue() ?? 0)))),
      onComplete: () => {
        blast.destroy();
        this.fxCount -= 1;
      },
    });
    this.smoke(x, y);
  }

  private smoke(x: number, y: number): void {
    if (this.fxCount > 44) return;
    for (let i = 0; i < 2; i++) {
      this.fxCount += 1;
      const puff = this.scene.add.circle(x + (i - 0.5) * 6, y, 4 + i, 0x8a847c, 0.7);
      this.world.add(puff);
      this.scene.tweens.add({
        targets: puff,
        y: y - 16 - i * 6,
        alpha: 0,
        duration: 420,
        onComplete: () => {
          puff.destroy();
          this.fxCount -= 1;
        },
      });
    }
  }

  private debris(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.fxCount > 48) return;
      this.fxCount += 1;
      const bit = this.scene.add.image(x, y, 'px-pix').setTint(i % 2 === 0 ? 0xc4b48a : 0x6a5434);
      this.world.add(bit);
      const angle = -Math.PI / 2 + (i - count / 2) * 0.35;
      this.scene.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * (10 + i * 3),
        y: y - 18 + i * 2,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => {
          bit.destroy();
          this.fxCount -= 1;
        },
      });
    }
  }

  private arc(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration: number,
    key: string,
    scale: number,
    onDone: () => void,
  ): void {
    const proj = this.scene.add.sprite(x1, y1, key, 0).setScale(scale);
    this.world.add(proj);
    const start = this.scene.time.now;
    const tick = () => {
      const t = Math.min(1, (this.scene.time.now - start) / duration);
      const arcHeight = Math.min(90, Math.abs(x2 - x1) * 0.28);
      proj.x = x1 + (x2 - x1) * t;
      proj.y = y1 + (y2 - y1) * t - Math.sin(Math.PI * t) * arcHeight;
      proj.rotation = t * 2;
      if (t < 1) {
        this.scene.time.delayedCall(16, tick);
      } else {
        proj.destroy();
        onDone();
      }
    };
    tick();
  }

  private flash(alpha: number): void {
    this.flashRect?.destroy();
    const rect = this.scene.add.rectangle(VIEW_W / 2, (LANE.top + LANE.bottom) / 2, VIEW_W, LANE.bottom - LANE.top, 0xfff2cc, alpha);
    rect.setDepth(70);
    this.flashRect = rect;
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        rect.destroy();
        if (this.flashRect === rect) this.flashRect = null;
      },
    });
  }

  private beam(): void {
    const beam = this.scene.add.rectangle(VIEW_W / 2, LANE.groundY - 20, VIEW_W - 24, 10, 0xd58bff, 0.95);
    this.world.add(beam);
    this.scene.tweens.add({
      targets: beam,
      scaleY: 4,
      alpha: 0,
      duration: 280,
      onComplete: () => beam.destroy(),
    });
    this.nudge(6);
  }

  private impactX(side: Side): number {
    const foes = this.sim.units.filter((unit) => unit.side !== side);
    if (foes.length === 0) return side === 'player' ? LANE.enemyX - 20 : LANE.playerX + 20;
    return foes.reduce((sum, unit) => sum + unit.x, 0) / foes.length;
  }

  private makeBase(side: Side): Phaser.GameObjects.Sprite {
    const key = side === 'player' ? 'px-base-player' : 'px-base-enemy';
    const sprite = this.scene.add.sprite(side === 'player' ? LANE.playerX : LANE.enemyX, LANE.groundY + 2, key, '0');
    sprite.setOrigin(0.5, 1);
    sprite.setScale(1.55);
    this.world.add(sprite);
    return sprite;
  }

  private drawScenery(): void {
    const sky = this.scene.add.graphics();
    const bands = [0x8ec8ef, 0x7eb6e4, 0x6aa6d8, 0x8fb8c8, 0xa9c4b0];
    const top = LANE.top;
    const span = LANE.groundY - LANE.top;
    bands.forEach((color, index) => {
      sky.fillStyle(color, 1);
      sky.fillRect(8, top + Math.floor((span * index) / bands.length), VIEW_W - 16, Math.ceil(span / bands.length) + 1);
    });
    sky.fillStyle(0x6d8f4a, 1);
    sky.fillRect(8, LANE.groundY - 8, VIEW_W - 16, LANE.bottom - LANE.groundY + 8);
    sky.fillStyle(0x8a7044, 1);
    sky.fillRect(8, LANE.groundY + 10, VIEW_W - 16, LANE.bottom - LANE.groundY - 10);
    sky.fillStyle(0xc6a15a, 0.55);
    for (let x = 16; x < VIEW_W - 16; x += 8) sky.fillRect(x, LANE.groundY + 18, 4, 2);
    sky.fillStyle(0x5e7a38, 1);
    for (let x = 20; x < VIEW_W - 20; x += 14) sky.fillRect(x, LANE.groundY - 6, 2, 4);
    this.world.addAt(sky, 0);

    const paintCloud = (g: Phaser.GameObjects.Graphics, x: number) => {
      g.fillStyle(0xfffaf2, 0.92);
      g.fillRect(x, 8, 28, 8);
      g.fillRect(x + 6, 4, 16, 6);
      g.fillRect(x + 40, 14, 22, 6);
      g.fillRect(x + 90, 6, 34, 8);
      g.fillRect(x + 150, 16, 20, 6);
      g.fillRect(x + 210, 8, 26, 8);
      g.fillRect(x + 280, 14, 30, 6);
      g.fillRect(x + 340, 6, 24, 8);
    };
    const cloudA = this.scene.add.graphics();
    const cloudB = this.scene.add.graphics();
    paintCloud(cloudA, 0);
    paintCloud(cloudB, VIEW_W - 16);
    this.clouds.add([cloudA, cloudB]);
    this.clouds.setPosition(8, LANE.top + 8);

    const paintHills = (g: Phaser.GameObjects.Graphics, shift: number) => {
      steppedHill(g, shift + 10, 8, 120, 36, 0x5d7a3e);
      steppedHill(g, shift + 150, 4, 150, 42, 0x6e8c48);
      steppedHill(g, shift + 300, 10, 130, 34, 0x547038);
    };
    const hillA = this.scene.add.graphics();
    const hillB = this.scene.add.graphics();
    paintHills(hillA, 0);
    paintHills(hillB, VIEW_W - 16);
    this.hills.add([hillA, hillB]);
    this.hills.setPosition(8, LANE.groundY - 48);
  }
}

function steppedHill(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  const step = 4;
  for (let i = 0; i < height; i += step) {
    const t = i / height;
    const inset = Math.floor((((1 - t) * width) / 2) / step) * step;
    g.fillRect(x + inset, y + i, Math.max(step, width - inset * 2), step);
  }
}
