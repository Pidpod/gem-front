import { levelById, LEVELS } from '../../config/levels';
import { VIEW_W } from '../layout';
import { FONT, INK, MUTED } from '../theme';
import { grantVictory, loadProgress, writeProgress } from '../progress';
import type { Outcome, RunStats } from '../types';
import { emptyStats } from '../types';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

interface EndData {
  result?: Outcome;
  stats?: RunStats;
  levelId?: number;
  playerHp?: number;
  playerMax?: number;
}

export class EndScene extends Phaser.Scene {
  private result: 'win' | 'lose' = 'lose';
  private stats: RunStats = emptyStats();
  private levelId = 1;
  private stars = 0;
  private funds = 0;
  private hasNext = false;

  constructor() {
    super('end');
  }

  init(data: EndData): void {
    this.result = data.result === 'win' ? 'win' : 'lose';
    this.stats = data.stats ?? emptyStats();
    this.levelId = data.levelId && data.levelId > 0 ? data.levelId : 1;
    this.stars = 0;
    this.funds = 0;
    this.hasNext = this.levelId < LEVELS.length;
    if (this.result === 'win') {
      const ratio = (data.playerMax ?? 1) > 0 ? (data.playerHp ?? 0) / (data.playerMax ?? 1) : 0;
      const granted = grantVictory(loadProgress(), this.levelId, this.stats, ratio);
      writeProgress(granted.save);
      this.stars = granted.stars;
      this.funds = granted.funds;
      this.hasNext = granted.hasNext;
    }
  }

  create(): void {
    addBackdrop(this);
    const won = this.result === 'win';
    const level = levelById(this.levelId);
    this.add
      .text(VIEW_W / 2, 128, won ? 'VICTORY' : 'DEFEAT', {
        fontFamily: FONT,
        fontSize: '52px',
        color: won ? '#8ff6e4' : '#ff8d80',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 184, `${level.id}. ${level.name}`, {
        fontFamily: FONT,
        fontSize: '18px',
        color: INK,
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 214, won ? 'The enemy base has fallen.' : 'Your base was overrun.', {
        fontFamily: FONT,
        fontSize: '15px',
        color: MUTED,
      })
      .setOrigin(0.5);

    if (won) {
      this.add
        .text(VIEW_W / 2, 258, starLine(this.stars), {
          fontFamily: FONT,
          fontSize: '28px',
          color: '#f0c43a',
        })
        .setOrigin(0.5);
      this.add
        .text(VIEW_W / 2, 296, `+${this.funds} WAR FUNDS`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: '#f0c43a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    }

    const lines = [
      `Time  ${formatTime(this.stats.elapsed)}`,
      `Best cascade  ${this.stats.bestCombo}`,
      `Gems cleared  ${this.stats.gemsCleared}`,
      `Units fielded  ${this.stats.unitsSpawned}`,
    ];
    const panelTop = won ? 328 : 260;
    const panel = this.add.graphics();
    panel.fillStyle(0x171b26, 0.95);
    panel.fillRoundedRect(48, panelTop, VIEW_W - 96, 150, 16);
    this.add
      .text(VIEW_W / 2, panelTop + 18, lines.join('\n'), {
        fontFamily: FONT,
        fontSize: '16px',
        color: MUTED,
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    if (won && this.hasNext) {
      new UiButton(this, VIEW_W / 2, 560, 280, 64, 'NEXT', 0x149684, () => {
        this.scene.start('game', { level: this.levelId + 1 });
      }, { fontSize: 26 });
    } else if (!won) {
      new UiButton(this, VIEW_W / 2, 500, 280, 64, 'RETRY', 0xc4473a, () => {
        this.scene.start('game', { level: this.levelId });
      }, { fontSize: 26 });
    }
    const lower = won ? 650 : 590;
    new UiButton(this, VIEW_W / 2, lower, 240, 52, 'UPGRADES', 0x2a3344, () => this.scene.start('upgrades'), {
      fontSize: 18,
    });
    new UiButton(this, VIEW_W / 2, lower + 70, 240, 52, 'MAP', 0x2a3344, () => this.scene.start('map'), {
      fontSize: 18,
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        if (won && this.hasNext) this.scene.start('game', { level: this.levelId + 1 });
        else if (!won) this.scene.start('game', { level: this.levelId });
        else this.scene.start('map');
      } else if (event.key === 'Escape') this.scene.start('map');
    });
  }
}

function starLine(stars: number): string {
  return [1, 2, 3].map((n) => (n <= stars ? '★' : '☆')).join('  ');
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
