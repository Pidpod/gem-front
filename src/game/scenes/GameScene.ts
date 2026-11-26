import { sfx } from '../../audio/sfx';
import { BALANCE, comboMultiplier, SHOP, STRIKE_LABEL, UNIT_NAME } from '../../config/balance';
import { HOW_TO_LINES } from '../copy';
import { boardGeom, commandButtonX, COMMAND, LANE, VIEW_H, VIEW_W } from '../layout';
import { tuningForLevel } from '../loadout';
import { Board, type GemPop } from '../match3/Board';
import { loadProgress } from '../progress';
import type { MatchReward } from '../match3/rewards';
import { Battlefield } from '../rts/Battlefield';
import { FONT, GEM_CSS, GEM_HEX, INK } from '../theme';
import type { GemColor, Outcome, RunStats, ShopKind, StrikeKind } from '../types';
import { emptyStats } from '../types';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';
import { floatText } from '../ui/floatText';
import { Hud, type HudModel } from '../ui/Hud';

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private battle!: Battlefield;
  private hud!: Hud;
  private credits = 0;
  private superCharge = 0;
  private stats: RunStats = emptyStats();
  private helpOpen = false;
  private finished = false;
  private endResult: Outcome = 'play';
  private helpLayer: Phaser.GameObjects.Container | null = null;
  private floatSlot = 0;
  private frozenUntil = 0;
  private slowUntil = 0;
  private levelId = 1;
  private chargeMul = 1;

  constructor() {
    super('game');
  }

  init(data?: { level?: number }): void {
    const save = loadProgress();
    const requested = data?.level && data.level > 0 ? data.level : save.unlocked;
    this.levelId = Math.max(1, Math.min(requested, save.unlocked));
  }

  create(): void {
    this.credits = 0;
    this.superCharge = 0;
    this.stats = emptyStats();
    this.helpOpen = false;
    this.finished = false;
    this.floatSlot = 0;
    this.frozenUntil = 0;
    this.slowUntil = 0;
    this.endResult = 'play';
    this.helpLayer = null;

    addBackdrop(this);
    const tuning = tuningForLevel(this.levelId);
    this.chargeMul = tuning.superCharge;
    this.battle = new Battlefield(this, Math.random, tuning);
    this.board = new Board(this, (reward, pops) => this.applyReward(reward, pops));
    this.hud = new Hud(this, {
      onBuy: (kind) => this.buy(kind),
      onFire: () => this.fire(),
      onHelp: () => this.toggleHelp(),
      onMute: () => this.toggleMute(),
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === '1') this.buy('medic');
      else if (key === '2') this.buy('repair');
      else if (key === '3') this.buy('heavy');
      else if (key === 'f' || key === ' ') this.fire();
      else if (key === 'h') this.toggleHelp();
      else if (key === 'm') this.toggleMute();
      else if (key === 'escape' && this.helpOpen) this.toggleHelp();
    });

    this.exposeDebug();
    this.hud.refresh(this.model(), 0);
  }

  update(time: number, delta: number): void {
    let scale = 1;
    if (time < this.frozenUntil) scale = 0;
    else if (time < this.slowUntil) scale = BALANCE.juice.slowScale;
    const dt = Math.min(0.05, (delta / 1000) * scale);
    if (!this.finished && !this.helpOpen && !document.hidden) {
      const outcome = this.battle.update(dt);
      this.board.update(dt);
      if (outcome !== 'play') this.finish(outcome);
    }
    this.hud.refresh(this.model(), time);
  }

  private model(): HudModel {
    return {
      credits: this.credits,
      superCharge: this.superCharge,
      playerHp: this.battle.playerHp,
      playerMax: this.battle.playerMax,
      enemyHp: this.battle.enemyHp,
      enemyMax: this.battle.enemyMax,
      locked: this.helpOpen || this.finished,
      muted: sfx.muted,
    };
  }

  private applyReward(reward: MatchReward, pops: GemPop[]): void {
    if (this.finished) return;
    this.credits += reward.credits;
    this.stats.creditsEarned += reward.credits;
    this.stats.gemsCleared += reward.cleared;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, reward.combo);
    if (reward.super > 0) {
      const gain = Math.max(1, Math.round(reward.super * this.chargeMul));
      this.superCharge = Math.min(BALANCE.superMax, this.superCharge + gain);
    }
    for (const spawn of reward.spawns) {
      for (let i = 0; i < spawn.count; i++) this.battle.queueSpawn(spawn.kind);
      this.stats.unitsSpawned += spawn.count;
    }
    sfx.match(reward.combo, reward.big || reward.strikes.length > 0);
    this.trails(pops);
    if (reward.strikes.length > 0) {
      this.frozenUntil = this.time.now + BALANCE.juice.hitStop * 1000;
      this.slowUntil = this.frozenUntil + BALANCE.juice.slowMo * 1000;
      sfx.vibrate([22, 36, 28]);
      for (const strike of reward.strikes) {
        sfx.strike(strike);
        this.battle.playStrike(strike);
      }
    } else if (reward.combo >= 2 || reward.big) {
      sfx.vibrate(reward.combo >= 3 ? [12, 24, 12] : 10);
      this.battle.nudge(reward.combo >= 3 ? 6 : 4);
      if (reward.combo >= 2) this.battle.announce(`CASCADE x${formatMult(comboMultiplier(reward.combo))}`);
    }
    this.showReward(reward);
  }

  private trails(pops: GemPop[]): void {
    const limited = pops.slice(0, BALANCE.juice.trailCap);
    for (const pop of limited) {
      const target = trailTarget(pop.color);
      const dot = this.add.circle(pop.x, pop.y, 4, GEM_CSS_NUM[pop.color], 1).setDepth(75);
      this.tweens.add({
        targets: dot,
        x: target.x,
        y: target.y,
        duration: 420,
        ease: 'Cubic.easeIn',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private showReward(reward: MatchReward): void {
    const lines: { text: string; color: string }[] = [];
    if (reward.credits > 0) lines.push({ text: `+${reward.credits} CR`, color: GEM_CSS.credit });
    for (const spawn of reward.spawns) {
      lines.push({
        text: `+${spawn.count} ${UNIT_NAME[spawn.kind]}`,
        color: GEM_CSS[spawnColor(spawn.kind)],
      });
    }
    if (reward.super > 0) lines.push({ text: `+${reward.super} SUPER`, color: GEM_CSS.super });
    for (const strike of reward.strikes) lines.push({ text: STRIKE_LABEL[strike], color: '#ffe56a' });
    if (lines.length === 0) return;
    const geom = boardGeom();
    const y = geom.originY + 36 + (this.floatSlot % 3) * 18;
    this.floatSlot += 1;
    floatText(this, VIEW_W / 2, y, lines.map((line) => line.text).join('   '), lines[0]?.color ?? '#f4f1ea');
  }

  private buy(kind: ShopKind): void {
    if (this.helpOpen || this.finished) return;
    const item = SHOP.find((entry) => entry.kind === kind);
    if (!item || this.credits < item.cost) return;
    if (item.kind === 'repair') {
      const healed = this.battle.heal(BALANCE.repair.amount);
      if (healed <= 0) return;
      this.credits -= item.cost;
      sfx.heal();
      floatText(this, LANE.playerX, LANE.groundY - 36, `+${healed} BASE`, '#5ee08f');
      return;
    }
    this.credits -= item.cost;
    this.battle.queueSpawn(item.kind);
    this.stats.unitsSpawned += 1;
    floatText(this, VIEW_W / 2, 400, item.name, item.kind === 'medic' ? '#5ee08f' : '#f4f1ea');
  }

  private fire(): void {
    if (this.helpOpen || this.finished) return;
    if (this.superCharge < BALANCE.superMax) return;
    this.superCharge = 0;
    this.stats.supersFired += 1;
    const outcome = this.battle.fireSuper();
    sfx.superBlast();
    sfx.vibrate([30, 40, 30]);
    this.battle.announce('SUPER');
    if (outcome !== 'play') this.finish(outcome);
  }

  private toggleMute(): void {
    sfx.toggle();
  }

  private toggleHelp(): void {
    if (this.finished) return;
    this.helpOpen = !this.helpOpen;
    this.board.setSuspended(this.helpOpen);
    if (this.helpOpen) this.openHelp();
    else this.closeHelp();
  }

  private openHelp(): void {
    this.closeHelp();
    const layer = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.78);
    dim.setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x171b26, 1);
    panel.fillRoundedRect(24, 160, VIEW_W - 48, 560, 16);
    const body = this.add
      .text(44, 184, `HOW TO PLAY\n\n${HOW_TO_LINES.map((line) => `•  ${line}`).join('\n\n')}`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: INK,
        wordWrap: { width: VIEW_W - 88 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    layer.add([dim, panel, body]);
    const close = new UiButton(this, VIEW_W / 2, 760, 220, 56, 'RESUME', 0x149684, () => this.toggleHelp(), {
      depth: 120,
      fontSize: 20,
    });
    layer.add(close.root);
    this.helpLayer = layer;
  }

  private closeHelp(): void {
    this.helpLayer?.destroy(true);
    this.helpLayer = null;
  }

  private finish(result: 'win' | 'lose'): void {
    if (this.finished) return;
    this.finished = true;
    this.endResult = result;
    this.helpOpen = false;
    this.board.setSuspended(true);
    this.closeHelp();
    if (result === 'win') sfx.win();
    else sfx.lose();
    this.battle.announce(result === 'win' ? 'VICTORY' : 'DEFEAT');
    window.setTimeout(() => {
      if (!this.scene.isActive()) return;
      this.scene.start('end', {
        result,
        stats: { ...this.stats, elapsed: this.battle.elapsed },
        levelId: this.levelId,
        playerHp: this.battle.playerHp,
        playerMax: this.battle.playerMax,
      });
    }, 900);
  }

  private exposeDebug(): void {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const api = {
      cells: () => {
        const canvas = this.game.canvas.getBoundingClientRect();
        return this.board.snapshot().map((cell) => {
          const geom = boardGeom();
          const gx = geom.originX + cell.c * geom.stride + geom.cell / 2;
          const gy = geom.originY + cell.r * geom.stride + geom.cell / 2;
          return {
            ...cell,
            x: canvas.left + (gx / VIEW_W) * canvas.width,
            y: canvas.top + (gy / VIEW_H) * canvas.height,
          };
        });
      },
      status: () => ({
        credits: this.credits,
        super: this.superCharge,
        playerHp: this.battle.playerHp,
        enemyHp: this.battle.enemyHp,
        outcome: this.finished ? this.endResult : this.battle.outcome,
        busy: this.board.isBusy(),
        elapsed: this.battle.elapsed,
        help: this.helpOpen,
        units: this.battle.unitCounts,
      }),
      win: () => this.finish('win'),
      strike: (kind: StrikeKind) => {
        sfx.strike(kind);
        this.battle.playStrike(kind);
      },
      hint: () => {
        const move = this.board.hint();
        if (!move) return null;
        return { from: this.toClient(move.a), to: this.toClient(move.b) };
      },
      buttons: () => ({
        medic: this.toClientPoint(commandButtonX(0), COMMAND.buttonY),
        repair: this.toClientPoint(commandButtonX(1), COMMAND.buttonY),
        heavy: this.toClientPoint(commandButtonX(2), COMMAND.buttonY),
        fire: this.toClientPoint(424, 58),
      }),
    };
    (window as unknown as { __gemFront?: typeof api }).__gemFront = api;
  }

  private toClient(pos: { r: number; c: number }): { x: number; y: number } {
    const geom = boardGeom();
    return this.toClientPoint(geom.originX + pos.c * geom.stride + geom.cell / 2, geom.originY + pos.r * geom.stride + geom.cell / 2);
  }

  private toClientPoint(gx: number, gy: number): { x: number; y: number } {
    const canvas = this.game.canvas.getBoundingClientRect();
    return {
      x: canvas.left + (gx / VIEW_W) * canvas.width,
      y: canvas.top + (gy / VIEW_H) * canvas.height,
    };
  }
}

const GEM_CSS_NUM = GEM_HEX;

function spawnColor(kind: string): GemColor {
  if (kind === 'tank' || kind === 'heavy' || kind === 'artillery') return 'tank';
  if (kind === 'heli') return 'heli';
  if (kind === 'medic') return 'infantry';
  if (kind === 'rocket') return 'infantry';
  return 'infantry';
}

function trailTarget(color: GemColor): { x: number; y: number } {
  if (color === 'credit') return { x: 70, y: 58 };
  if (color === 'super') return { x: 250, y: 58 };
  return { x: LANE.playerX + 36, y: LANE.groundY - 24 };
}

function formatMult(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
