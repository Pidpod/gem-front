import { sfx } from '../../audio/sfx';
import { BALANCE, STRIKE_LABEL } from '../../config/balance';
import { installIso, project } from '../art/iso';
import { installArt } from '../art/sheets';
import { defaultTuning, type Tuning } from '../loadout';
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
  infantry: 'iso-infantry',
  tank: 'iso-tank',
  heli: 'iso-heli',
  medic: 'iso-medic',
  rocket: 'iso-rocket',
  heavy: 'iso-heavy',
  artillery: 'iso-artillery',
  ship: 'iso-ship',
};

export class Battlefield {
  private readonly scene: Phaser.Scene;
  private readonly sim: BattleSim;
  private readonly tuning: Tuning;
  private readonly world: Phaser.GameObjects.Container;
  private readonly views = new Map<number, UnitView>();
  private readonly spawnQueue: UnitKind[] = [];
  private readonly clouds: Phaser.GameObjects.Container;
  private readonly radar: Phaser.GameObjects.Graphics;
  private spawnCooldown = 0;
  private cloudShift = 0;
  private fxCount = 0;
  private playerBase!: Phaser.GameObjects.Sprite;
  private enemyBase!: Phaser.GameObjects.Sprite;
  private banner: Phaser.GameObjects.Text | null = null;
  private flashRect: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, rng: () => number = Math.random, tuning: Tuning = defaultTuning()) {
    this.scene = scene;
    this.tuning = tuning;
    this.sim = new BattleSim(rng, tuning);
    installArt(scene);
    installIso(scene);
    this.world = scene.add.container(0, 0).setDepth(6);
    this.clouds = scene.add.container(0, 0);
    this.world.add(this.clouds);
    this.drawScenery();
    this.playerBase = this.makeBase('player');
    this.enemyBase = this.makeBase('enemy');
    if (tuning.boss) this.enemyBase.setScale(1.35);
    const youAt = project(LANE.playerX + 30, LANE.groundY);
    const foeAt = project(LANE.enemyX - 30, LANE.groundY);
    const you = scene.add
      .text(youAt.sx, youAt.sy - 46, 'YOU', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#d7ec9a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(youAt.sy);
    const foe = scene.add
      .text(foeAt.sx, foeAt.sy - 46, 'FOE', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#ffb0a4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(foeAt.sy);
    this.world.add([you, foe]);
    const objective = scene.add
      .text(VIEW_W / 2, LANE.top + 14, tuning.title, {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#f4f1ea',
      })
      .setOrigin(0.5);
    this.world.add(objective);
    this.radar = scene.add.graphics().setDepth(28);
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
    this.drawRadar();
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
        const healed = this.heal(Math.round(spec.allyRepair * this.tuning.repairMul));
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
      else if (event.type === 'dead') this.boom(event.x, event.y, event.kind === 'tank' || event.kind === 'heavy' || event.kind === 'ship' ? 2 : 1.3);
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
    const power = this.tuning.strikePower;
    const events = this.sim.areaStrike(side, x, radius, Math.round(damage * power), Math.round(baseDamage * power));
    this.applyEvents(events);
  }

  private sync(time: number): void {
    const alive = new Set<number>();
    for (const unit of this.sim.units) {
      alive.add(unit.id);
      let view = this.views.get(unit.id);
      if (!view) view = this.createView(unit);
      const at = project(unit.x, unit.y);
      const bob = unit.kind === 'heli' ? Math.sin(time / 180 + unit.id) * 3 : 0;
      view.root.setPosition(at.sx, at.sy + bob);
      view.root.setDepth(at.sy);
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
    this.cloudShift = (this.cloudShift + dt * 8) % (VIEW_W - 16);
    this.clouds.x = -this.cloudShift;
  }

  private createView(unit: SimUnit): UnitView {
    const key = `${LOOK[unit.kind]}-${unit.side}`;
    const root = this.scene.add.container(unit.x, unit.y);
    const body = this.scene.add.sprite(0, 0, key, '0');
    body.setOrigin(0.5, 0.78);
    const small = unit.kind === 'infantry' || unit.kind === 'rocket' || unit.kind === 'medic';
    body.setScale(unit.kind === 'heli' ? 1.05 : unit.kind === 'ship' || unit.kind === 'heavy' ? 1.15 : small ? 0.95 : 1.08);
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
    view.hp.fillRect(-14, -36, 28, 4);
    view.hp.fillStyle(side === 'player' ? 0xc6e07a : 0xff6b5b, 1);
    view.hp.fillRect(-14, -36, 28 * pct, 4);
  }

  private healBeam(event: Extract<BattleEvent, { type: 'heal' }>): void {
    sfx.heal();
    const from = project(event.x1, event.y1);
    const to = project(event.x2, event.y2);
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x5ee08f, 0.95);
    line.lineBetween(from.sx, from.sy - 10, to.sx, to.sy - 12);
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
    const at = project(x, y);
    for (let i = 0; i < 3; i++) {
      const plus = this.scene.add.image(at.sx + (i - 1) * 5, at.sy, 'px-pix').setTint(0x5ee08f).setScale(2.2);
      this.world.add(plus);
      this.scene.tweens.add({
        targets: plus,
        y: at.sy - 16 - i * 5,
        alpha: 0,
        duration: 380,
        onComplete: () => plus.destroy(),
      });
    }
  }

  private shot(event: Extract<BattleEvent, { type: 'attack' }>): void {
    if (this.fxCount > 36) return;
    this.fxCount += 1;
    const from = project(event.x1, event.y1);
    const to = project(event.x2, event.y2);
    const muzzle = this.scene.add.sprite(from.sx, from.sy - 12, 'iso-flash', '0').setScale(0.7);
    this.world.add(muzzle);
    this.scene.tweens.add({
      targets: muzzle,
      alpha: 0,
      scale: 1.3,
      duration: 80,
      onComplete: () => muzzle.destroy(),
    });
    const flash = this.scene.add.sprite(from.sx, from.sy - 8, 'px-bullet', 0);
    this.world.add(flash);
    this.scene.tweens.add({
      targets: flash,
      x: to.sx,
      y: to.sy,
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
    const at = project(x, y);
    const blast = this.scene.add.sprite(at.sx, at.sy, 'iso-boom', '0').setScale(scale * 1.35).setDepth(at.sy + 2);
    this.world.add(blast);
    this.scene.tweens.addCounter({
      from: 0,
      to: 4,
      duration: 360,
      onUpdate: (tween) => blast.setFrame(String(Math.min(4, Math.floor(tween.getValue() ?? 0)))),
      onComplete: () => {
        blast.destroy();
        this.fxCount -= 1;
      },
    });
    this.smoke(x, y);
    if (scale > 2) this.nudge(5);
  }

  private smoke(x: number, y: number): void {
    if (this.fxCount > 44) return;
    const at = project(x, y);
    for (let i = 0; i < 3; i++) {
      this.fxCount += 1;
      const puff = this.scene.add.circle(at.sx + (i - 1) * 8, at.sy, 6 + i * 2, 0x6a6660, 0.55);
      this.world.add(puff);
      this.scene.tweens.add({
        targets: puff,
        y: at.sy - 22 - i * 8,
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
    const at = project(x, y);
    for (let i = 0; i < count; i++) {
      if (this.fxCount > 48) return;
      this.fxCount += 1;
      const bit = this.scene.add.image(at.sx, at.sy, 'px-pix').setTint(i % 2 === 0 ? 0xc4b48a : 0x6a5434).setScale(1.6);
      this.world.add(bit);
      const angle = -Math.PI / 2 + (i - count / 2) * 0.35;
      this.scene.tweens.add({
        targets: bit,
        x: at.sx + Math.cos(angle) * (14 + i * 4),
        y: at.sy - 22 + i * 2,
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
    const from = project(x1, y1);
    const to = project(x2, y2);
    const proj = this.scene.add.sprite(from.sx, from.sy, key, 0).setScale(scale);
    this.world.add(proj);
    const start = this.scene.time.now;
    const tick = () => {
      const t = Math.min(1, (this.scene.time.now - start) / duration);
      const arcHeight = Math.min(70, Math.hypot(to.sx - from.sx, to.sy - from.sy) * 0.35);
      proj.x = from.sx + (to.sx - from.sx) * t;
      proj.y = from.sy + (to.sy - from.sy) * t - Math.sin(Math.PI * t) * arcHeight;
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
    const from = project(LANE.playerX, LANE.groundY);
    const to = project(LANE.enemyX, LANE.groundY);
    const beam = this.scene.add.graphics();
    beam.lineStyle(16, 0xd58bff, 0.9);
    beam.lineBetween(from.sx, from.sy, to.sx, to.sy);
    this.world.add(beam);
    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 320,
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
    const key = side === 'player' ? 'iso-base-player' : 'iso-base-enemy';
    const at = project(side === 'player' ? LANE.playerX + 30 : LANE.enemyX - 30, LANE.groundY);
    const sprite = this.scene.add.sprite(at.sx, at.sy, key, '0');
    sprite.setOrigin(0.5, 0.78);
    sprite.setScale(1.25);
    sprite.setDepth(at.sy);
    this.world.add(sprite);
    return sprite;
  }

  private drawScenery(): void {
    const field = this.scene.add.image(0, 0, 'iso-terrain').setOrigin(0, 0);
    this.world.addAt(field, 0);
    if (this.tuning.regionTint) {
      const wash = this.scene.add.graphics();
      wash.fillStyle(this.tuning.regionTint, 0.18);
      wash.fillRect(16, LANE.top, VIEW_W - 32, LANE.bottom - LANE.top);
      this.world.add(wash);
    }
    const paintCloud = (g: Phaser.GameObjects.Graphics, x: number) => {
      g.fillStyle(0xfffaf2, 0.8);
      g.fillRect(x, 8, 28, 8);
      g.fillRect(x + 6, 4, 16, 6);
      g.fillRect(x + 90, 6, 34, 8);
      g.fillRect(x + 210, 8, 26, 8);
      g.fillRect(x + 340, 6, 24, 8);
    };
    const cloudA = this.scene.add.graphics();
    const cloudB = this.scene.add.graphics();
    paintCloud(cloudA, 0);
    paintCloud(cloudB, VIEW_W - 16);
    this.clouds.add([cloudA, cloudB]);
    this.clouds.setPosition(8, LANE.top - 4);
  }

  private drawRadar(): void {
    const x = 12;
    const y = 78;
    const w = 86;
    const h = 52;
    this.radar.clear();
    this.radar.fillStyle(0x14120e, 1);
    this.radar.fillRect(x, y, w, h);
    this.radar.fillStyle(0xd9c89a, 1);
    this.radar.fillRect(x, y, w, 2);
    this.radar.fillRect(x, y, 2, h);
    this.radar.fillStyle(0x1c1812, 1);
    this.radar.fillRect(x, y + h - 3, w, 3);
    this.radar.fillRect(x + w - 3, y, 3, h);
    this.radar.fillStyle(0x102018, 1);
    this.radar.fillRect(x + 4, y + 4, w - 8, h - 8);
    const plot = (sx: number, sy: number, color: number) => {
      const px = x + 6 + ((sx - 24) / 430) * (w - 12);
      const py = y + 6 + ((sy - 90) / 250) * (h - 12);
      this.radar.fillStyle(color, 1);
      this.radar.fillRect(px, py, 3, 3);
    };
    const you = project(LANE.playerX, LANE.groundY);
    const foe = project(LANE.enemyX, LANE.groundY);
    plot(you.sx, you.sy, 0xc6e07a);
    plot(foe.sx, foe.sy, 0xff6b5b);
    for (const unit of this.sim.units) {
      const at = project(unit.x, unit.y);
      plot(at.sx, at.sy, unit.side === 'player' ? 0xe2c15a : 0xd24a3c);
    }
  }
}
