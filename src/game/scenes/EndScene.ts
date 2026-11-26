import type { Outcome, RunStats } from '../types';
import { emptyStats } from '../types';
import { VIEW_W } from '../layout';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

interface EndData {
  result?: Outcome;
  stats?: RunStats;
}

export class EndScene extends Phaser.Scene {
  private result: 'win' | 'lose' = 'lose';
  private stats: RunStats = emptyStats();

  constructor() {
    super('end');
  }

  init(data: EndData): void {
    this.result = data.result === 'win' ? 'win' : 'lose';
    this.stats = data.stats ?? emptyStats();
  }

  create(): void {
    addBackdrop(this);
    const won = this.result === 'win';
    this.add
      .text(VIEW_W / 2, 180, won ? 'VICTORY' : 'DEFEAT', {
        fontFamily: FONT,
        fontSize: '56px',
        color: won ? '#8ff6e4' : '#ff8d80',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 240, won ? 'The enemy base has fallen.' : 'Your base was overrun.', {
        fontFamily: FONT,
        fontSize: '18px',
        color: INK,
      })
      .setOrigin(0.5);

    const lines = [
      `Time  ${formatTime(this.stats.elapsed)}`,
      `Gems cleared  ${this.stats.gemsCleared}`,
      `Units fielded  ${this.stats.unitsSpawned}`,
      `Longest cascade  ${this.stats.bestCombo}`,
      `Superweapons  ${this.stats.supersFired}`,
      `Credits earned  ${this.stats.creditsEarned}`,
    ];
    const panel = this.add.graphics();
    panel.fillStyle(0x171b26, 0.95);
    panel.fillRoundedRect(48, 290, VIEW_W - 96, 250, 16);
    this.add
      .text(VIEW_W / 2, 310, lines.join('\n'), {
        fontFamily: FONT,
        fontSize: '18px',
        color: MUTED,
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0);

    new UiButton(this, VIEW_W / 2, 640, 280, 64, 'PLAY AGAIN', 0x149684, () => this.scene.start('game'), {
      fontSize: 24,
    });
    new UiButton(this, VIEW_W / 2, 730, 220, 52, 'TITLE', 0x2a3344, () => this.scene.start('title'), {
      fontSize: 18,
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') this.scene.start('game');
      else if (event.key === 'Escape') this.scene.start('title');
    });
  }
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
