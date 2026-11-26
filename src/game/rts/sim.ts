import { attackMultiplier, BALANCE, enemyInterval, rollEnemyKind } from '../../config/balance';
import { LANE, LANES_Y } from '../layout';
import type { Outcome, Rng, Side, UnitKind } from '../types';

export interface SimUnit {
  id: number;
  side: Side;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  range: number;
  radius: number;
  speed: number;
  damage: number;
  interval: number;
}

export type BattleEvent =
  | { type: 'attack'; x1: number; y1: number; x2: number; y2: number; side: Side; amount: number }
  | { type: 'dead'; id: number; x: number; y: number; side: Side; kind: UnitKind }
  | { type: 'spawn'; id: number; side: Side; kind: UnitKind }
  | { type: 'base'; side: Side; amount: number }
  | { type: 'super' }
  | { type: 'end'; result: 'win' | 'lose' };

interface PendingHit {
  attacker: SimUnit;
  target: SimUnit | Side;
}

let nextUnitId = 1;

export class BattleSim {
  units: SimUnit[] = [];
  playerHp = BALANCE.bases.playerHp;
  enemyHp = BALANCE.bases.enemyHp;
  readonly playerMax = BALANCE.bases.playerHp;
  readonly enemyMax = BALANCE.bases.enemyHp;
  elapsed = 0;
  outcome: Outcome = 'play';
  private spawnTimer = BALANCE.enemy.firstDelay;
  private spawnSerial = 0;
  private readonly rng: Rng;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
  }

  update(dt: number): BattleEvent[] {
    if (this.outcome !== 'play') return [];
    const events: BattleEvent[] = [];
    this.elapsed += dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const spawned = this.spawn('enemy', rollEnemyKind(this.elapsed, this.rng));
      if (spawned) events.push(spawned);
      if (this.elapsed > 18) {
        const escort = this.spawn('enemy', rollEnemyKind(this.elapsed, this.rng));
        if (escort) events.push(escort);
      }
      this.spawnTimer = enemyInterval(this.elapsed);
    }

    const living = this.units.filter((unit) => unit.hp > 0);
    const hits: PendingHit[] = [];

    for (const unit of living) {
      const foes = living.filter((other) => other.side !== unit.side && other.hp > 0);
      const foe = nearestInRange(unit, foes);
      const baseSide: Side = unit.side === 'player' ? 'enemy' : 'player';
      const baseX = baseSide === 'enemy' ? LANE.enemyX : LANE.playerX;
      const baseDist = Math.abs(unit.x - baseX);
      if (foe) {
        if (trySwing(unit, dt)) hits.push({ attacker: unit, target: foe });
      } else if (baseDist <= unit.range + LANE.baseRadius) {
        if (trySwing(unit, dt)) hits.push({ attacker: unit, target: baseSide });
      } else {
        const dir = unit.side === 'player' ? 1 : -1;
        const minX = LANE.playerX + LANE.baseRadius * 0.35;
        const maxX = LANE.enemyX - LANE.baseRadius * 0.35;
        unit.x = clamp(unit.x + dir * unit.speed * dt, minX, maxX);
      }
    }

    for (const hit of hits) {
      if (hit.attacker.hp <= 0) continue;
      if (typeof hit.target === 'string') {
        const amount = hit.attacker.damage;
        if (hit.target === 'player') this.playerHp -= amount;
        else this.enemyHp -= amount;
        const baseX = hit.target === 'player' ? LANE.playerX : LANE.enemyX;
        events.push({
          type: 'attack',
          x1: hit.attacker.x,
          y1: hit.attacker.y,
          x2: baseX,
          y2: LANE.groundY - 24,
          side: hit.attacker.side,
          amount,
        });
        events.push({ type: 'base', side: hit.target, amount });
      } else if (hit.target.hp > 0) {
        const amount = Math.round(hit.attacker.damage * attackMultiplier(hit.attacker.kind, hit.target.kind));
        hit.target.hp -= amount;
        events.push({
          type: 'attack',
          x1: hit.attacker.x,
          y1: hit.attacker.y,
          x2: hit.target.x,
          y2: hit.target.y,
          side: hit.attacker.side,
          amount,
        });
      }
    }

    events.push(...this.reap());
    const end = this.checkOutcome();
    if (end) events.push(end);
    return events;
  }

  spawn(side: Side, kind: UnitKind): BattleEvent | null {
    if (this.outcome !== 'play') return null;
    const friendly = this.units.filter((unit) => unit.side === side).length;
    if (friendly >= BALANCE.fieldCap) return null;
    const stat = BALANCE.units[kind];
    const baseX = side === 'player' ? LANE.playerX + LANE.spawnInset : LANE.enemyX - LANE.spawnInset;
    const crowd = this.units.filter((unit) => unit.side === side && Math.abs(unit.x - baseX) < 18).length;
    const spread = Math.min(crowd, 4) * 12;
    const x = side === 'player' ? baseX + spread : baseX - spread;
    const slot = LANES_Y[this.spawnSerial % LANES_Y.length] ?? 0;
    this.spawnSerial += 1;
    const unit: SimUnit = {
      id: nextUnitId++,
      side,
      kind,
      x,
      y: LANE.groundY - 18 + slot,
      hp: stat.maxHp,
      maxHp: stat.maxHp,
      cooldown: 0.12,
      range: stat.range,
      radius: stat.radius,
      speed: stat.speed,
      damage: stat.damage,
      interval: stat.interval,
    };
    this.units.push(unit);
    return { type: 'spawn', id: unit.id, side, kind };
  }

  heal(amount: number): number {
    if (amount <= 0 || this.outcome !== 'play') return 0;
    const before = this.playerHp;
    this.playerHp = Math.min(this.playerMax, this.playerHp + amount);
    return this.playerHp - before;
  }

  fireSuper(): BattleEvent[] {
    if (this.outcome !== 'play') return [];
    for (const unit of this.units) {
      if (unit.side === 'enemy') unit.hp -= BALANCE.superWeapon.unitDamage;
    }
    this.enemyHp -= BALANCE.superWeapon.baseDamage;
    const events: BattleEvent[] = [
      { type: 'super' },
      { type: 'base', side: 'enemy', amount: BALANCE.superWeapon.baseDamage },
    ];
    events.push(...this.reap());
    const end = this.checkOutcome();
    if (end) events.push(end);
    return events;
  }

  private reap(): BattleEvent[] {
    const events: BattleEvent[] = [];
    const alive: SimUnit[] = [];
    for (const unit of this.units) {
      if (unit.hp > 0) alive.push(unit);
      else events.push({ type: 'dead', id: unit.id, x: unit.x, y: unit.y, side: unit.side, kind: unit.kind });
    }
    this.units = alive;
    return events;
  }

  private checkOutcome(): BattleEvent | null {
    if (this.outcome !== 'play') return null;
    if (this.enemyHp <= 0) {
      this.enemyHp = 0;
      this.outcome = 'win';
      return { type: 'end', result: 'win' };
    }
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.outcome = 'lose';
      return { type: 'end', result: 'lose' };
    }
    return null;
  }
}

function trySwing(unit: SimUnit, dt: number): boolean {
  unit.cooldown -= dt;
  if (unit.cooldown > 0) return false;
  unit.cooldown += unit.interval;
  return true;
}

function nearestInRange(unit: SimUnit, foes: SimUnit[]): SimUnit | null {
  let best: SimUnit | null = null;
  let bestDist = Infinity;
  for (const foe of foes) {
    const dist = Math.abs(unit.x - foe.x);
    if (dist <= unit.range + foe.radius && dist < bestDist) {
      best = foe;
      bestDist = dist;
    }
  }
  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
