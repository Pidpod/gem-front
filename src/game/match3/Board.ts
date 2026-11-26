import { sfx } from '../../audio/sfx';
import { BALANCE } from '../../config/balance';
import { boardGeom, cellCenter, VIEW_H, VIEW_W } from '../layout';
import { GEM_HEX } from '../theme';
import type { Cell, GemColor, Pos, Rng, Special } from '../types';
import { paintMetal } from '../ui/metal';
import { drawGem } from './drawGem';
import { blastPoints } from './bonus';
import {
  activationForSwap,
  adjacent,
  createInitialGrid,
  ensurePlayable,
  pasteGrid,
  posKey,
  resolveStep,
  samePos,
  swapActivates,
  swapCells,
  type ClearStep,
  type Grid,
} from './logic';
import { rewardForStep, type MatchReward } from './rewards';
import { suggestMove } from './suggest';

interface GemSprite {
  id: number;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  ring: Phaser.GameObjects.Graphics;
}

interface Drag {
  pos: Pos;
  x: number;
  y: number;
  pointerId: number;
  consumed: boolean;
}

export interface CellSnapshot {
  r: number;
  c: number;
  color: GemColor;
  special: Special;
}

function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, () => resolve());
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function glide(scene: Phaser.Scene, target: Phaser.GameObjects.Container, x: number, y: number, ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (!scene.sys.isActive()) {
      resolve();
      return;
    }
    scene.tweens.add({
      targets: target,
      x,
      y,
      duration: ms,
      ease: 'Quad.easeOut',
      onComplete: () => resolve(),
    });
  });
}

export interface GemPop {
  x: number;
  y: number;
  color: GemColor;
}

export class Board {
  private readonly scene: Phaser.Scene;
  private readonly rng: Rng;
  private readonly onReward: (reward: MatchReward, pops: GemPop[]) => void;
  private panel!: Phaser.GameObjects.Graphics;
  private readonly geom = boardGeom();
  private readonly grid: Grid;
  private readonly gems = new Map<number, GemSprite>();
  private readonly gemLayer: Phaser.GameObjects.Container;
  private drag: Drag | null = null;
  private selected: Pos | null = null;
  private resolving = false;
  private suspended = false;
  private idle = 0;
  private movedOnce = false;
  private hinting = false;
  private hintTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, onReward: (reward: MatchReward, pops: GemPop[]) => void, rng: Rng = Math.random) {
    this.scene = scene;
    this.onReward = onReward;
    this.rng = rng;
    this.grid = createInitialGrid(rng);
    this.gemLayer = this.drawChrome();
    this.syncFromGrid();
    this.bindInput();
  }

  update(dt: number): void {
    if (this.resolving || this.suspended) return;
    this.idle += dt;
    const delay = this.movedOnce ? BALANCE.hint.repeat : BALANCE.hint.first;
    if (!this.hinting && this.idle >= delay) this.showHint();
  }

  setSuspended(value: boolean): void {
    this.suspended = value;
    if (value) {
      this.drag = null;
      this.clearHint();
    }
  }

  isBusy(): boolean {
    return this.resolving;
  }

  /** Plays the suggested swap. Used by Yoga Focus and the satellite scan. */
  playFocusMove(): boolean {
    if (this.resolving || this.suspended) return false;
    const move = this.hint();
    if (!move) return false;
    void this.trySwap(move.a, move.b);
    return true;
  }

  hint(): { a: Pos; b: Pos } | null {
    if (this.resolving) return null;
    return suggestMove(this.grid);
  }

  snapshot(): CellSnapshot[] {
    const list: CellSnapshot[] = [];
    for (let r = 0; r < this.geom.rows; r++) {
      for (let c = 0; c < this.geom.cols; c++) {
        const cell = this.grid[r]?.[c];
        if (!cell) continue;
        list.push({ r, c, color: cell.color, special: cell.special });
      }
    }
    return list;
  }

  private drawChrome(): Phaser.GameObjects.Container {
    const g = this.geom;
    const pad = 10;
    const panel = this.scene.add.graphics().setDepth(12);
    this.panel = panel;
    paintMetal(panel, g.originX - pad - 8, g.originY - pad - 8, g.size + pad * 2 + 16, g.size + pad * 2 + 16, 0x5c5648);
    panel.fillStyle(0x10141d, 1);
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const x = g.originX + c * g.stride;
        const y = g.originY + r * g.stride;
        panel.fillRoundedRect(x, y, g.cell, g.cell, 8);
      }
    }
    const layer = this.scene.add.container(0, 0).setDepth(16);
    const maskG = this.scene.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRoundedRect(g.originX - 14, g.originY - 14, g.size + 28, g.size + 28, 12);
    layer.setMask(maskG.createGeometryMask());
    return layer;
  }

  private bindInput(): void {
    this.scene.input.on('pointerdown', this.onDown, this);
    this.scene.input.on('pointermove', this.onMove, this);
    this.scene.input.on('pointerup', this.onUp, this);
    this.scene.input.on('pointerupoutside', this.onUp, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
  }

  private dispose(): void {
    this.clearHint();
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.resolving || this.suspended) return;
    void sfx.unlock();
    this.idle = 0;
    this.clearHint();
    const pos = this.posAt(pointer.x, pointer.y);
    if (!pos) {
      this.selected = null;
      this.drag = null;
      this.redrawRings();
      return;
    }
    this.drag = { pos, x: pointer.x, y: pointer.y, pointerId: pointer.id, consumed: false };
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || pointer.id !== this.drag.pointerId || this.drag.consumed) return;
    if (this.resolving || this.suspended) return;
    const dx = pointer.x - this.drag.x;
    const dy = pointer.y - this.drag.y;
    if (Math.hypot(dx, dy) < BALANCE.input.dragPx) return;
    const dir: Pos =
      Math.abs(dx) > Math.abs(dy)
        ? { r: this.drag.pos.r, c: this.drag.pos.c + Math.sign(dx) }
        : { r: this.drag.pos.r + Math.sign(dy), c: this.drag.pos.c };
    const start = this.drag.pos;
    this.drag.consumed = true;
    this.drag = null;
    this.selected = null;
    this.redrawRings();
    if (dir.c < 0 || dir.r < 0 || dir.c >= this.geom.cols || dir.r >= this.geom.rows) return;
    void this.trySwap(start, dir);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || pointer.id !== this.drag.pointerId) return;
    const start = this.drag;
    this.drag = null;
    if (start.consumed || this.resolving || this.suspended) return;
    const pos = this.posAt(pointer.x, pointer.y) ?? start.pos;
    if (this.selected && samePos(this.selected, pos)) {
      this.selected = null;
    } else if (this.selected && adjacent(this.selected, pos)) {
      const from = this.selected;
      this.selected = null;
      this.redrawRings();
      void this.trySwap(from, pos);
      return;
    } else {
      this.selected = pos;
    }
    this.redrawRings();
  }

  private posAt(x: number, y: number): Pos | null {
    const g = this.geom;
    const localX = x - g.originX;
    const localY = y - g.originY;
    if (localX < 0 || localY < 0) return null;
    const c = Math.floor(localX / g.stride);
    const r = Math.floor(localY / g.stride);
    if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return null;
    if (localX - c * g.stride > g.cell || localY - r * g.stride > g.cell) return null;
    return { r, c };
  }

  private async trySwap(a: Pos, b: Pos): Promise<void> {
    if (this.resolving || this.suspended || !adjacent(a, b)) return;
    const cellA = this.grid[a.r]?.[a.c];
    const cellB = this.grid[b.r]?.[b.c];
    if (!cellA || !cellB) return;
    this.clearHint();
    this.selected = null;
    this.resolving = true;
    this.redrawRings();

    if (!swapActivates(this.grid, a, b)) {
      sfx.reject();
      await Promise.all([this.moveGem(cellA.id, b, BALANCE.anim.reject), this.moveGem(cellB.id, a, BALANCE.anim.reject)]);
      await Promise.all([this.moveGem(cellA.id, a, BALANCE.anim.reject), this.moveGem(cellB.id, b, BALANCE.anim.reject)]);
      this.resolving = false;
      this.idle = 0;
      return;
    }

    sfx.swap();
    swapCells(this.grid, a, b);
    await Promise.all([this.moveGem(cellA.id, b, BALANCE.anim.swap), this.moveGem(cellB.id, a, BALANCE.anim.swap)]);
    if (!this.scene.sys.isActive()) return;

    const act = activationForSwap(this.grid, a, b);
    let combo = 1;
    let first = true;
    while (combo <= BALANCE.match.maxCascades && this.scene.sys.isActive()) {
      const step = resolveStep(this.grid, first ? { ...act, rng: this.rng } : { rng: this.rng });
      if (!step) break;
      first = false;
      const reward = rewardForStep(step, combo);
      const pops = step.cleared.slice(0, 8).map(({ cell, pos }) => {
        const point = cellCenter(pos.c, pos.r);
        return { x: point.x, y: point.y, color: cell.color };
      });
      this.onReward(reward, pops);
      this.shake(reward.strikes.length > 0 ? 7 : reward.combo >= 2 || reward.big ? 4 : 0);
      await this.animateStep(step, reward.combo + reward.strikes.length * 2);
      combo += 1;
      if (combo <= BALANCE.match.maxCascades && this.scene.sys.isActive()) {
        await wait(this.scene, BALANCE.anim.cascadeGap);
      }
    }
    if (!this.scene.sys.isActive()) return;

    const status = ensurePlayable(this.grid, this.rng);
    if (status === 'reshuffled') {
      sfx.reshuffle();
      await this.playReshuffle();
    } else {
      this.syncFromGrid();
    }
    this.movedOnce = true;
    this.resolving = false;
    this.idle = 0;
  }

  private shake(amount: number): void {
    if (amount <= 0) return;
    const targets = [this.gemLayer, this.panel];
    this.scene.tweens.killTweensOf(targets);
    this.gemLayer.x = 0;
    this.panel.x = 0;
    this.scene.tweens.add({
      targets,
      x: amount,
      duration: 34,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.gemLayer.x = 0;
        this.panel.x = 0;
      },
    });
  }

  private async animateStep(step: ClearStep, intensity: number): Promise<void> {
    for (const created of step.transforms) {
      const sprite = this.gems.get(created.id);
      const cell = this.findById(created.id);
      if (!sprite || !cell) continue;
      drawGem(sprite.body, cell.color, cell.special, this.geom.cell);
      sprite.root.setScale(1.18);
      this.scene.tweens.add({ targets: sprite.root, scale: 1, duration: 180, ease: 'Back.easeOut' });
    }

    await Promise.all(
      step.cleared.map(async ({ cell, pos }) => {
        this.burst(pos, cell.color, intensity);
        const sprite = this.gems.get(cell.id);
        if (!sprite) return;
        await new Promise<void>((resolve) => {
          this.scene.tweens.add({
            targets: sprite.root,
            scale: 0,
            alpha: 0,
            duration: BALANCE.anim.clear,
            onComplete: () => resolve(),
          });
        });
        sprite.root.destroy();
        this.gems.delete(cell.id);
      }),
    );

    await Promise.all(
      step.falls.map(async (move) => {
        let sprite = this.gems.get(move.id);
        if (!sprite) sprite = this.makeSprite(move.cell, move.c, move.fromR);
        const target = cellCenter(move.c, move.toR);
        const distance = Math.max(1, Math.abs(move.toR - move.fromR));
        const ms = BALANCE.anim.fallBase + distance * BALANCE.anim.fallPerRow;
        await glide(this.scene, sprite.root, target.x, target.y, ms);
      }),
    );
  }

  private async playReshuffle(): Promise<void> {
    const banner = this.scene.add
      .text(this.geom.originX + this.geom.size / 2, this.geom.originY - 18, 'RESHUFFLE', {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '16px',
        color: '#f4f1ea',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(70);
    const sprites = [...this.gems.values()].map((gem) => gem.root);
    await new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: sprites,
        alpha: 0,
        duration: BALANCE.anim.reshuffle,
        onComplete: () => resolve(),
      });
    });
    this.syncFromGrid();
    const next = [...this.gems.values()].map((gem) => gem.root);
    for (const root of next) root.setAlpha(0);
    await new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: next,
        alpha: 1,
        duration: BALANCE.anim.reshuffle,
        onComplete: () => resolve(),
      });
    });
    banner.destroy();
  }

  private moveGem(id: number, pos: Pos, ms: number): Promise<void> {
    const sprite = this.gems.get(id);
    if (!sprite) return Promise.resolve();
    const point = cellCenter(pos.c, pos.r);
    return glide(this.scene, sprite.root, point.x, point.y, ms);
  }

  private burst(pos: Pos, color: GemColor, intensity: number): void {
    const point = cellCenter(pos.c, pos.r);
    const hex = GEM_HEX[color];
    const count = Math.min(10, 4 + intensity);
    const reach = 16 + intensity * 4;
    for (let i = 0; i < count; i++) {
      const dot = this.scene.add.circle(point.x, point.y, i % 3 === 0 ? 4 : 2.4, hex, 1);
      this.gemLayer.add(dot);
      const angle = (Math.PI * 2 * i) / count;
      this.scene.tweens.add({
        targets: dot,
        x: point.x + Math.cos(angle) * reach,
        y: point.y + Math.sin(angle) * reach,
        alpha: 0,
        duration: 220 + intensity * 20,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private showHint(): void {
    const hint = suggestMove(this.grid);
    if (!hint) return;
    this.hinting = true;
    for (const pos of [hint.a, hint.b]) {
      const cell = this.grid[pos.r]?.[pos.c];
      const sprite = cell ? this.gems.get(cell.id) : undefined;
      if (!sprite) continue;
      this.hintTweens.push(
        this.scene.tweens.add({
          targets: sprite.root,
          scale: 1.08,
          duration: 320,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      );
    }
  }

  private clearHint(): void {
    this.hinting = false;
    for (const tween of this.hintTweens) tween.stop();
    this.hintTweens = [];
    if (!this.resolving) {
      for (const sprite of this.gems.values()) sprite.root.setScale(1);
    }
  }

  private syncFromGrid(): void {
    const seen = new Set<number>();
    for (let r = 0; r < this.geom.rows; r++) {
      for (let c = 0; c < this.geom.cols; c++) {
        const cell = this.grid[r]?.[c];
        if (!cell) continue;
        seen.add(cell.id);
        let sprite = this.gems.get(cell.id);
        if (!sprite) sprite = this.makeSprite(cell, c, r);
        const point = cellCenter(c, r);
        sprite.root.setPosition(point.x, point.y);
        sprite.root.setScale(1);
        sprite.root.setAlpha(1);
        drawGem(sprite.body, cell.color, cell.special, this.geom.cell);
      }
    }
    for (const [id, sprite] of this.gems) {
      if (seen.has(id)) continue;
      sprite.root.destroy();
      this.gems.delete(id);
    }
    this.redrawRings();
  }

  private makeSprite(cell: Cell, c: number, r: number): GemSprite {
    const point = cellCenter(c, r);
    const root = this.scene.add.container(point.x, point.y);
    const body = this.scene.add.graphics();
    const ring = this.scene.add.graphics();
    root.add([body, ring]);
    this.gemLayer.add(root);
    drawGem(body, cell.color, cell.special, this.geom.cell);
    const sprite: GemSprite = { id: cell.id, root, body, ring };
    this.gems.set(cell.id, sprite);
    return sprite;
  }

  private findById(id: number): Cell | null {
    for (const row of this.grid) {
      for (const cell of row) if (cell?.id === id) return cell;
    }
    return null;
  }

  /** Field shuffle. Resolves false when a match is already falling. */
  async useShuffle(): Promise<boolean> {
    if (this.resolving || this.suspended) return false;
    this.clearHint();
    this.resolving = true;
    pasteGrid(this.grid, createInitialGrid(this.rng));
    sfx.reshuffle();
    await this.playReshuffle();
    if (!this.scene.sys.isActive()) return true;
    this.resolving = false;
    this.idle = 0;
    return true;
  }

  /**
   * End-of-level bonus. Plants extra power gems, then detonates every special
   * one by one. Cascades score too. `skip` shortens the waits.
   */
  async bonusBlast(opts: {
    extras: number;
    skip: () => boolean;
    onStep: (points: number, pops: GemPop[], combo: number) => void;
  }): Promise<number> {
    if (!this.scene.sys.isActive()) return 0;
    this.clearHint();
    this.selected = null;
    this.resolving = true;
    this.plantExtras(opts.extras);
    this.syncFromGrid();
    if (!opts.skip()) await sleep(320);
    let total = 0;
    let guard = 0;
    while (guard < 40 && this.scene.sys.isActive()) {
      const specials = this.specials();
      const pos = specials[0];
      if (!pos) break;
      guard += 1;
      const cell = this.grid[pos.r]?.[pos.c];
      const kind = cell?.special ?? 'lineRow';
      const bombTargets = new Map<string, GemColor | 'all'>();
      if (cell?.special === 'bomb') bombTargets.set(posKey(pos), cell.color);
      let combo = 1;
      let first = true;
      while (combo <= BALANCE.match.maxCascades && this.scene.sys.isActive()) {
        const step = resolveStep(this.grid, first ? { activate: [pos], bombTargets, rng: this.rng } : { rng: this.rng });
        if (!step) break;
        first = false;
        const specialsCleared = step.cleared.filter((entry) => entry.cell.special !== 'none').length;
        const points = blastPoints(rewardForStep(step, combo).credits, specialsCleared, combo);
        const pops = step.cleared.slice(0, 8).map(({ cell: cleared, pos: at }) => {
          const point = cellCenter(at.c, at.r);
          return { x: point.x, y: point.y, color: cleared.color };
        });
        total += points;
        opts.onStep(points, pops, combo);
        const focus = pops[0] ?? cellCenter(pos.c, pos.r);
        this.blastFx(focus.x, focus.y, kind);
        if (opts.skip()) {
          this.syncFromGrid();
          await sleep(36);
        } else {
          await this.animateStep(step, 4 + combo);
          await sleep(160);
        }
        combo += 1;
      }
    }
    if (this.scene.sys.isActive()) {
      ensurePlayable(this.grid, this.rng);
      this.syncFromGrid();
    }
    this.resolving = false;
    return total;
  }

  private specials(): Pos[] {
    const list: Pos[] = [];
    for (let r = 0; r < this.geom.rows; r++) {
      for (let c = 0; c < this.geom.cols; c++) {
        const cell = this.grid[r]?.[c];
        if (cell && cell.special !== 'none') list.push({ r, c });
      }
    }
    return list;
  }

  private plantExtras(count: number): void {
    const kinds: Special[] = ['lineRow', 'lineCol', 'bomb'];
    for (let n = 0; n < count; n++) {
      const spots: Pos[] = [];
      for (let r = 0; r < this.geom.rows; r++) {
        for (let c = 0; c < this.geom.cols; c++) {
          const cell = this.grid[r]?.[c];
          if (cell && cell.special === 'none') spots.push({ r, c });
        }
      }
      if (spots.length === 0) return;
      const spot = spots[Math.floor(this.rng() * spots.length)];
      const cell = spot ? this.grid[spot.r]?.[spot.c] : undefined;
      if (!cell || !spot) return;
      cell.special = kinds[Math.floor(this.rng() * kinds.length)] ?? 'bomb';
    }
  }

  private blastFx(x: number, y: number, special: Special): void {
    const heavy = special === 'bomb';
    if (this.scene.textures.exists('iso-boom')) {
      const boom = this.scene.add.sprite(x, y, 'iso-boom', '0').setScale(heavy ? 2.3 : 1.55).setDepth(62);
      this.scene.tweens.addCounter({
        from: 0,
        to: 4,
        duration: 320,
        onUpdate: (tween) => boom.setFrame(String(Math.min(4, Math.floor(tween.getValue() ?? 0)))),
        onComplete: () => boom.destroy(),
      });
    }
    const ring = this.scene.add.circle(x, y, 12).setStrokeStyle(heavy ? 6 : 3, 0xffc14a, 0.95).setDepth(63);
    this.scene.tweens.add({
      targets: ring,
      scale: heavy ? 5.4 : 3.2,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy(),
    });
    const flash = this.scene.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0xfff1c4, heavy ? 0.42 : 0.22)
      .setDepth(72);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 160,
      onComplete: () => flash.destroy(),
    });
    for (let i = 0; i < (heavy ? 12 : 7); i++) {
      const dot = this.scene.add.circle(x, y, i % 2 === 0 ? 4 : 2.5, i % 3 === 0 ? 0xfff1c4 : 0xe24b4b, 1).setDepth(64);
      const angle = (Math.PI * 2 * i) / (heavy ? 12 : 7);
      const reach = heavy ? 54 : 32;
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * reach,
        y: y + Math.sin(angle) * reach,
        alpha: 0,
        duration: 280,
        onComplete: () => dot.destroy(),
      });
    }
    this.shake(heavy ? 11 : 7);
    sfx.explosion();
  }

  /** Plants a color bomb on a random plain gem. */
  plantBomb(): boolean {
    if (this.resolving || this.suspended) return false;
    const spots: { r: number; c: number }[] = [];
    for (let r = 0; r < this.geom.rows; r++) {
      for (let c = 0; c < this.geom.cols; c++) {
        const cell = this.grid[r]?.[c];
        if (cell && cell.special === 'none') spots.push({ r, c });
      }
    }
    if (spots.length === 0) return false;
    const spot = spots[Math.floor(this.rng() * spots.length)];
    const cell = spot ? this.grid[spot.r]?.[spot.c] : undefined;
    if (!cell) return false;
    cell.special = 'bomb';
    this.syncFromGrid();
    return true;
  }

  private redrawRings(): void {
    for (const sprite of this.gems.values()) sprite.ring.clear();
    if (!this.selected) return;
    const cell = this.grid[this.selected.r]?.[this.selected.c];
    const sprite = cell ? this.gems.get(cell.id) : undefined;
    if (!sprite) return;
    sprite.ring.lineStyle(3, 0xffffff, 0.95);
    sprite.ring.strokeCircle(0, 0, this.geom.cell * 0.42);
  }
}
