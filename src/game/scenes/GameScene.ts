import { sfx } from '../../audio/sfx';
import { BALANCE, comboMultiplier, STRIKE_LABEL, UNIT_NAME, type ShopEntry } from '../../config/balance';
import { itemById } from '../../config/items';
import { levelById } from '../../config/levels';
import { battleShop } from '../battleShop';
import { HOW_TO_LINES } from '../copy';
import { boardGeom, commandButtonX, COMMAND, LANE, VIEW_H, VIEW_W } from '../layout';
import { tuningForLevel } from '../loadout';
import { Board, type GemPop } from '../match3/Board';
import { bonusExtras } from '../match3/bonus';
import { consumeItem, countOf, grantVictory, isCleared, isReachable, loadProgress, startNode, writeProgress, type SaveData } from '../progress';
import type { MatchReward } from '../match3/rewards';
import { Battlefield } from '../rts/Battlefield';
import { FONT, GEM_CSS, GEM_HEX, GOLD, INK, MUTED } from '../theme';
import type { GemColor, Outcome, RunStats, ShopKind, StrikeKind, UnitKind } from '../types';
import { emptyStats } from '../types';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';
import { floatText } from '../ui/floatText';
import { paintMetal } from '../ui/metal';
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
  private focusLeft = 0;
  private parades = 0;
  private paradeEvery = 0;
  private moraleMul = 1;
  private moraleTime = 0;
  private rocketUsed = false;
  private repairAmount = BALANCE.repair.amount;
  private creditMul = 1;
  private superGemMul = 1;
  private spawnBonus: Partial<Record<UnitKind, number>> = {};
  private offers: ShopEntry[] = [];
  private save: SaveData = loadProgress();
  private mode: 'play' | 'bonus' | 'clear' = 'play';
  private skipping = false;
  private bonusScore = 0;
  private bonusLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('game');
  }

  init(data?: { level?: number; chain?: boolean }): void {
    const save = loadProgress();
    const requested = data?.level && data.level > 0 ? data.level : startNode(save);
    if (data?.chain && requested > 0) this.levelId = Math.min(400, requested);
    else this.levelId = isReachable(save, requested) || isCleared(save, requested) ? requested : startNode(save);
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
    this.save = loadProgress();
    const tuning = tuningForLevel(this.levelId, this.save);
    this.chargeMul = tuning.superCharge;
    this.repairAmount = tuning.repairAmount;
    this.creditMul = tuning.creditMul;
    this.superGemMul = tuning.superGemMul;
    this.spawnBonus = tuning.spawnBonus;
    this.offers = battleShop(this.save, tuning.shopCostMul);
    this.focusLeft = tuning.focusMoves;
    this.paradeEvery = tuning.paradeEvery;
    this.moraleMul = tuning.moraleMul;
    this.moraleTime = tuning.moraleTime;
    this.parades = 0;
    this.rocketUsed = false;
    this.mode = 'play';
    this.skipping = false;
    this.bonusScore = 0;
    this.bonusLabel = null;
    this.battle = new Battlefield(this, Math.random, tuning);
    for (const kind of tuning.startUnits) {
      this.battle.queueSpawn(kind);
      this.stats.unitsSpawned += 1;
    }
    this.board = new Board(this, (reward, pops) => this.applyReward(reward, pops));
    this.hud = new Hud(this, {
      onBuy: (kind) => this.buy(kind),
      onFire: () => this.fire(),
      onHelp: () => this.toggleHelp(),
      onMute: () => this.toggleMute(),
    }, this.offers);
    this.drawBelt();
    if (this.focusLeft > 0) {
      new UiButton(this, 420, 484, 88, 28, 'FOCUS', 0x3a6a4a, () => this.useFocus(), { fontSize: 11, depth: 46 });
    }

    this.input.on('pointerdown', () => {
      if (this.mode === 'bonus') this.skipping = true;
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.mode === 'bonus') {
        this.skipping = true;
        return;
      }
      if (this.mode === 'clear') {
        if (event.key === 'Enter' || event.key === ' ') this.advance();
        else if (event.key === 'Escape') this.scene.start('map');
        return;
      }
      const key = event.key.toLowerCase();
      const shopIndex = '123456'.indexOf(key);
      const offered = shopIndex >= 0 ? this.offers[shopIndex] : undefined;
      if (offered) this.buy(offered.kind);
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
      if (this.paradeEvery > 0) {
        const due = Math.floor(this.battle.elapsed / this.paradeEvery);
        if (due > this.parades) {
          this.parades = due;
          sfx.strike('missiles');
          this.battle.playStrike('missiles');
          this.battle.announce('PARADE');
        }
      }
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
    const credits = Math.round(reward.credits * this.creditMul);
    this.credits += credits;
    this.stats.creditsEarned += credits;
    this.stats.gemsCleared += reward.cleared;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, reward.combo);
    if (reward.super > 0) {
      const gain = Math.max(1, Math.round(reward.super * this.chargeMul * this.superGemMul));
      this.superCharge = Math.min(BALANCE.superMax, this.superCharge + gain);
    }
    for (const spawn of reward.spawns) {
      const count = spawn.count + (spawn.count > 0 ? (this.spawnBonus[spawn.kind] ?? 0) : 0);
      for (let i = 0; i < count; i++) this.battle.queueSpawn(spawn.kind);
      this.stats.unitsSpawned += count;
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
    if (reward.big && this.moraleTime > 0) this.battle.setMorale(this.moraleTime, this.moraleMul);
    this.showReward(reward);
  }

  private useFocus(): void {
    if (this.helpOpen || this.finished || this.focusLeft <= 0) return;
    if (!this.board.playFocusMove()) return;
    this.focusLeft -= 1;
    floatText(this, VIEW_W / 2, 500, 'FOCUS', '#8ff6e4');
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
    if (reward.credits > 0) lines.push({ text: `+${Math.round(reward.credits * this.creditMul)} CR`, color: GEM_CSS.credit });
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
    const item = this.offers.find((entry) => entry.kind === kind);
    if (!item || this.credits < item.cost) return;
    if (item.kind === 'repair') {
      const healed = this.battle.heal(this.repairAmount);
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

  private drawBelt(): void {
    this.save.belt.forEach((id, index) => {
      const item = itemById(id);
      if (!item) return;
      const x = 70 + index * 88;
      new UiButton(this, x, 484, 80, 28, item.name.split(' ')[0] ?? item.name, 0x243044, () => this.useBelt(id), {
        fontSize: 10,
        depth: 46,
      });
    });
  }

  private useBelt(id: string): void {
    if (this.helpOpen || this.finished || this.board.isBusy()) return;
    const item = itemById(id);
    if (!item || item.kind !== 'consumable' || countOf(this.save, id) < 1) return;
    if (item.effect === 'repair') {
      const healed = this.battle.heal(Math.round((item.power ?? 80) * (this.repairAmount / BALANCE.repair.amount)));
      if (healed <= 0) return;
      if (!this.spendBelt(id)) return;
      sfx.heal();
      floatText(this, LANE.playerX, LANE.groundY - 36, `+${healed} BASE`, '#5ee08f');
      return;
    }
    if (item.effect === 'charge') {
      if (this.superCharge >= BALANCE.superMax) return;
      if (!this.spendBelt(id)) return;
      this.superCharge = Math.min(BALANCE.superMax, this.superCharge + (item.power ?? 40));
      floatText(this, VIEW_W / 2, 80, 'CHARGE', '#c45bff');
      return;
    }
    if (item.effect === 'airstrike') {
      if (item.reusable) {
        if (this.rocketUsed) return;
        this.rocketUsed = true;
      } else if (!this.spendBelt(id)) return;
      sfx.strike('missiles');
      this.battle.playStrike('missiles');
      return;
    }
    if (item.effect === 'focus') {
      if (!this.board.playFocusMove()) return;
      if (!this.spendBelt(id)) return;
      return;
    }
    if (item.effect === 'bomb') {
      if (!this.board.plantBomb()) return;
      if (!this.spendBelt(id)) return;
      floatText(this, VIEW_W / 2, 500, 'BOMB', '#c45bff');
      return;
    }
    if (item.effect === 'shuffle') {
      if (!this.spendBelt(id)) return;
      void this.board.useShuffle();
    }
  }

  private spendBelt(id: string): boolean {
    const next = consumeItem(this.save, id);
    if (!next.ok) return false;
    this.save = next.save;
    writeProgress(this.save);
    return true;
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
    if (result === 'lose') {
      sfx.lose();
      this.battle.announce('DEFEAT');
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
      return;
    }
    sfx.win();
    void this.runBonus();
  }

  private async runBonus(): Promise<void> {
    if (!this.scene.isActive()) return;
    this.mode = 'bonus';
    const playerHp = this.battle.playerHp;
    const playerMax = this.battle.playerMax;
    const baseScore = this.stats.creditsEarned;
    while (this.board.isBusy() && this.scene.isActive()) await sleep(40);
    if (!this.scene.isActive()) return;
    const level = levelById(this.levelId);
    const extras = bonusExtras({
      elapsed: this.battle.elapsed,
      starTime: level.starTime,
      bestCombo: this.stats.bestCombo,
      superCharge: this.superCharge,
    });
    this.battle.announce('BONUS BLAST');
    this.bonusLabel = this.add
      .text(VIEW_W / 2, 482, 'BONUS 0', {
        fontFamily: FONT,
        fontSize: '22px',
        color: GOLD,
        fontStyle: 'bold',
        stroke: '#1a1208',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(80);
    await this.board.bonusBlast({
      extras,
      skip: () => this.skipping,
      onStep: (points, pops, combo) => {
        const scored = Math.round(points * this.creditMul);
        this.bonusScore += scored;
        this.stats.creditsEarned += scored;
        this.stats.gemsCleared += pops.length;
        this.stats.bestCombo = Math.max(this.stats.bestCombo, combo);
        this.bonusLabel?.setText(`BONUS ${this.bonusScore}`);
        const pop = pops[0];
        if (pop) floatText(this, pop.x, pop.y, `+${scored}`, GOLD);
        this.battle.salvo(combo === 1 && scored >= 80 ? 'bomb' : 'line');
      },
    });
    if (!this.scene.isActive()) return;
    const ratio = playerMax > 0 ? playerHp / playerMax : 0;
    const granted = grantVictory(loadProgress(), this.levelId, { ...this.stats, elapsed: this.battle.elapsed }, ratio, this.bonusScore);
    writeProgress(granted.save);
    this.save = granted.save;
    this.mode = 'clear';
    this.openClear(level.name, baseScore, this.bonusScore, granted.stars, granted.funds);
  }

  private openClear(name: string, base: number, bonus: number, stars: number, funds: number): void {
    this.bonusLabel?.destroy();
    this.bonusLabel = null;
    const layer = this.add.container(0, 0).setDepth(130);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x07080c, 0.62);
    dim.setInteractive();
    const panel = this.add.graphics();
    paintMetal(panel, 24, 150, VIEW_W - 48, 660, 0x3a342c);
    const title = this.add
      .text(VIEW_W / 2, 188, 'LEVEL CLEAR', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#e6d7a8',
        fontStyle: 'bold',
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    const place = this.add
      .text(VIEW_W / 2, 228, name, { fontFamily: FONT, fontSize: '16px', color: MUTED })
      .setOrigin(0.5);
    const lines = this.add
      .text(
        VIEW_W / 2,
        280,
        `BASE   ${base}\nBONUS   ${bonus}\nTOTAL   ${base + bonus}`,
        { fontFamily: FONT, fontSize: '22px', color: INK, align: 'center', lineSpacing: 10 },
      )
      .setOrigin(0.5, 0);
    const star = this.add
      .text(VIEW_W / 2, 430, [1, 2, 3].map((n) => (n <= stars ? '★' : '☆')).join('  '), {
        fontFamily: FONT,
        fontSize: '32px',
        color: GOLD,
      })
      .setOrigin(0.5);
    const pay = this.add
      .text(VIEW_W / 2, 478, `+${funds} WAR FUNDS`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: GOLD,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    layer.add([dim, panel, title, place, lines, star, pay]);
    const next = new UiButton(this, VIEW_W / 2, 560, 300, 64, 'NEXT', 0x149684, () => this.advance(), {
      fontSize: 26,
      depth: 140,
    });
    const hq = new UiButton(this, VIEW_W / 2, 650, 240, 48, 'HQ', 0x2a3344, () => this.scene.start('hq'), {
      fontSize: 18,
      depth: 140,
    });
    const map = new UiButton(this, VIEW_W / 2, 716, 240, 48, 'MAP', 0x2a3344, () => this.scene.start('map'), {
      fontSize: 18,
      depth: 140,
    });
    layer.add([next.root, hq.root, map.root]);
  }

  private advance(): void {
    if (this.mode !== 'clear') return;
    this.mode = 'play';
    this.scene.start('game', { level: this.levelId + 1, chain: true });
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
        phase: this.mode,
        bonus: this.bonusScore,
        busy: this.board.isBusy(),
        elapsed: this.battle.elapsed,
        help: this.helpOpen,
        units: this.battle.unitCounts,
      }),
      win: () => this.finish('win'),
      plant: () => this.board.plantBomb(),
      spawn: (kind: 'infantry' | 'tank' | 'heli' | 'medic' | 'rocket' | 'ship' | 'artillery' | 'heavy') => {
        this.battle.queueSpawn(kind);
      },
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
  if (kind === 'tank' || kind === 'heavy' || kind === 'artillery' || kind === 'ship') return 'tank';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
