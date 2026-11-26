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
  | { type: 'heal'; x1: number; y1: number; x2: number; y2: number; amount: number }
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
      if (unit.kind === 'medic') {
        this.guideMedic(unit, living, dt, events);
        continue;
      }
      const foes = living.filter((other) => other.side !== unit.side && other.hp > 0);
      const baseSide: Side = unit.side === 'player' ? 'enemy' : 'player';
      const baseX = baseSide === 'enemy' ? LANE.enemyX : LANE.playerX;
      const baseDist = Math.abs(unit.x - baseX);
      const baseIn = baseDist <= unit.range + LANE.baseRadius;
      if (unit.kind === 'heli') {
        const air = nearestInRange(
          unit,
          foes.filter((other) => other.kind === 'heli'),
        );
        if (air) {
          if (trySwing(unit, dt)) hits.push({ attacker: unit, target: air });
        } else if (baseIn) {
          if (trySwing(unit, dt)) hits.push({ attacker: unit, target: baseSide });
        } else {
          stepForward(unit, dt);
          const ground = nearestInRange(
            unit,
            foes.filter((other) => other.kind !== 'heli'),
          );
          if (ground && trySwing(unit, dt)) hits.push({ attacker: unit, target: ground });
        }
      } else {
        const foe = nearestInRange(unit, foes);
        if (foe) {
          if (trySwing(unit, dt)) hits.push({ attacker: unit, target: foe });
        } else if (baseIn) {
          if (trySwing(unit, dt)) hits.push({ attacker: unit, target: baseSide });
        } else {
          stepForward(unit, dt);
        }
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
    const flying = kind === 'heli';
    const unit: SimUnit = {
      id: nextUnitId++,
      side,
      kind,
      x,
      y: flying ? LANE.groundY - 62 + (this.spawnSerial % 2) * 8 : LANE.groundY - 16 + slot,
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

  private guideMedic(unit: SimUnit, living: SimUnit[], dt: number, events: BattleEvent[]): void {
    const allies = living.filter((other) => other.side === unit.side && other.id !== unit.id && other.hp > 0);
    const wounded = allies
      .filter((other) => other.hp < other.maxHp - 0.5)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const patient = wounded.find((other) => Math.abs(other.x - unit.x) <= unit.range + other.radius);
    if (patient && trySwing(unit, dt)) {
      const amount = Math.min(BALANCE.medic.healAmount, patient.maxHp - patient.hp);
      patient.hp += amount;
      events.push({ type: 'heal', x1: unit.x, y1: unit.y, x2: patient.x, y2: patient.y, amount });
      return;
    }
    const ground = allies.filter((other) => other.kind !== 'heli');
    const anchor = ground.length > 0 ? ground : allies;
    let front = unit.side === 'player' ? LANE.playerX + 36 : LANE.enemyX - 36;
    for (const ally of anchor) {
      front = unit.side === 'player' ? Math.max(front, ally.x) : Math.min(front, ally.x);
    }
    let goal = unit.side === 'player' ? front - BALANCE.medic.followGap : front + BALANCE.medic.followGap;
    const focus = wounded[0];
    if (focus) goal = unit.side === 'player' ? Math.min(focus.x - 8, goal) : Math.max(focus.x + 8, goal);
    const minX = LANE.playerX + 20;
    const maxX = LANE.enemyX - 20;
    if (Math.abs(goal - unit.x) > 3) {
      const dir = goal > unit.x ? 1 : -1;
      unit.x = clamp(unit.x + dir * unit.speed * dt, minX, maxX);
    }
    if (unit.side === 'player') unit.x = Math.min(unit.x, front - 6);
    else unit.x = Math.max(unit.x, front + 6);
  }

  /** Area hit used by match-5 special attacks. */
  areaStrike(attacker: Side, x: number, radius: number, damage: number, baseDamage: number): BattleEvent[] {
    if (this.outcome !== 'play') return [];
    const foe: Side = attacker === 'player' ? 'enemy' : 'player';
    for (const unit of this.units) {
      if (unit.side !== foe) continue;
      if (Math.abs(unit.x - x) <= radius + unit.radius) unit.hp -= damage;
    }
    const events: BattleEvent[] = [];
    if (baseDamage > 0) {
      const baseX = foe === 'enemy' ? LANE.enemyX : LANE.playerX;
      if (Math.abs(baseX - x) <= radius + LANE.baseRadius + 24) {
        if (foe === 'enemy') this.enemyHp -= baseDamage;
        else this.playerHp -= baseDamage;
        events.push({ type: 'base', side: foe, amount: baseDamage });
      }
    }
    events.push(...this.reap());
    const end = this.checkOutcome();
    if (end) events.push(end);
    return events;
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

function stepForward(unit: SimUnit, dt: number): void {
  const dir = unit.side === 'player' ? 1 : -1;
  const minX = LANE.playerX + LANE.baseRadius * 0.35;
  const maxX = LANE.enemyX - LANE.baseRadius * 0.35;
  unit.x = clamp(unit.x + dir * unit.speed * dt, minX, maxX);
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
