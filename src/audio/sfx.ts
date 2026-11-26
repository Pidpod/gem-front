const MUTE_KEY = 'gem-front-muted';

class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private lastHit = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* private mode */
    }
    return this.muted;
  }

  async unlock(): Promise<void> {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      if (!this.ctx) this.ctx = new Ctx();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }

  ui(): void {
    this.tone(620, 0.06, 'sine', 0.05);
    this.tone(880, 0.08, 'sine', 0.03, undefined, 0.04);
  }

  swap(): void {
    this.tone(360, 0.07, 'triangle', 0.04);
  }

  reject(): void {
    this.tone(180, 0.09, 'sawtooth', 0.03, 90);
  }

  match(combo: number, big: boolean): void {
    const base = 480 + Math.min(combo, 6) * 55;
    this.tone(base, 0.09, 'sine', 0.05);
    this.tone(base * 1.5, 0.12, 'triangle', big ? 0.05 : 0.03, undefined, 0.05);
  }

  spawn(side: 'player' | 'enemy'): void {
    if (side === 'player') this.tone(280, 0.08, 'square', 0.03, 420);
    else this.tone(160, 0.07, 'square', 0.02);
  }

  hit(): void {
    const now = performance.now();
    if (now - this.lastHit < 90) return;
    this.lastHit = now;
    this.tone(140, 0.04, 'square', 0.02);
  }

  heal(): void {
    this.tone(520, 0.08, 'sine', 0.04, 760);
  }

  superBlast(): void {
    this.tone(180, 0.28, 'sawtooth', 0.05, 720);
    this.tone(90, 0.32, 'square', 0.04, 40);
  }

  reshuffle(): void {
    this.tone(240, 0.12, 'triangle', 0.04, 480);
  }

  win(): void {
    [523, 659, 784, 1046].forEach((freq, i) => this.tone(freq, 0.18, 'sine', 0.05, undefined, i * 0.12));
  }

  lose(): void {
    [392, 311, 247, 196].forEach((freq, i) => this.tone(freq, 0.2, 'triangle', 0.05, undefined, i * 0.14));
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slide?: number,
    delay = 0,
  ): void {
    if (this.muted || !this.ctx || !this.unlocked) return;
    const ctx = this.ctx;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const start = ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, freq), start);
      if (slide && slide > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), start + dur);
      amp.gain.setValueAtTime(gain, start);
      amp.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    } catch {
      /* ignore audio glitches */
    }
  }
}

export const sfx = new Sfx();
