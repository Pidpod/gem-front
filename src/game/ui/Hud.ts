import { BALANCE, type ShopEntry } from '../../config/balance';
import { COMMAND, HUD, VIEW_W } from '../layout';
import { FONT, GEM_HEX, MUTED } from '../theme';
import type { ShopKind } from '../types';
import { UiButton } from './button';

export interface HudModel {
  credits: number;
  superCharge: number;
  playerHp: number;
  playerMax: number;
  enemyHp: number;
  enemyMax: number;
  locked: boolean;
  muted: boolean;
}

interface HudHandlers {
  onBuy: (kind: ShopKind) => void;
  onFire: () => void;
  onHelp: () => void;
  onMute: () => void;
}

export class Hud {
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly meter: Phaser.GameObjects.Graphics;
  private readonly playerText: Phaser.GameObjects.Text;
  private readonly enemyText: Phaser.GameObjects.Text;
  private readonly creditsText: Phaser.GameObjects.Text;
  private readonly meterText: Phaser.GameObjects.Text;
  private readonly fire: UiButton;
  private readonly shop: UiButton[];
  private readonly entries: ShopEntry[];
  private readonly mute: UiButton;
  private lastKey = '';

  constructor(scene: Phaser.Scene, handlers: HudHandlers, shop: ShopEntry[]) {
    this.bars = scene.add.graphics().setDepth(40);
    this.meter = scene.add.graphics().setDepth(40);
    this.playerText = scene.add
      .text(HUD.leftX + HUD.barW / 2, HUD.barY + HUD.barH / 2, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#f4f1ea',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.enemyText = scene.add
      .text(HUD.rightX + HUD.barW / 2, HUD.barY + HUD.barH / 2, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#f4f1ea',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.creditsText = scene.add
      .text(12, 58, 'CR 0', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#f0c43a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setDepth(41);
    this.meterText = scene.add
      .text(250, 58, '0', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#f4f1ea',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(42);

    const gapLeft = HUD.leftX + HUD.barW;
    const gapRight = HUD.rightX;
    const mid = (gapLeft + gapRight) / 2;
    this.mute = new UiButton(scene, mid - 24, HUD.barY + HUD.barH / 2, 44, 26, 'SFX', 0x2a3344, handlers.onMute, {
      fontSize: 11,
      depth: 42,
    });
    new UiButton(scene, mid + 24, HUD.barY + HUD.barH / 2, 36, 26, '?', 0x2a3344, handlers.onHelp, {
      fontSize: 16,
      depth: 42,
    });

    this.fire = new UiButton(scene, 424, 58, 100, 34, 'SUPER', 0x6a3cae, handlers.onFire, { fontSize: 14 });
    this.entries = shop;
    const count = Math.max(1, shop.length);
    const gap = 6;
    const buttonW = Math.min(COMMAND.buttonW, Math.floor((VIEW_W - 16 - gap * (count - 1)) / count));
    const buttonH = count > 3 ? 50 : COMMAND.buttonH;
    this.shop = shop.map((item, index) => {
      const total = buttonW * count + gap * (count - 1);
      const x = (VIEW_W - total) / 2 + buttonW / 2 + index * (buttonW + gap);
      return new UiButton(
        scene,
        x,
        COMMAND.buttonY,
        buttonW,
        buttonH,
        item.name,
        shopColor(item.kind),
        () => handlers.onBuy(item.kind),
        { sub: `${item.cost}`, fontSize: count > 3 ? 12 : 15 },
      );
    });
    this.drawLegend(scene);
  }

  refresh(model: HudModel, time: number): void {
    const key = [
      model.credits,
      model.superCharge,
      Math.round(model.playerHp),
      Math.round(model.enemyHp),
      model.locked ? 1 : 0,
      model.muted ? 1 : 0,
    ].join(':');
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.drawBars(model);
      this.creditsText.setText(`CR ${model.credits}`);
      this.playerText.setText(`YOU ${Math.max(0, Math.round(model.playerHp))}`);
      this.enemyText.setText(`FOE ${Math.max(0, Math.round(model.enemyHp))}`);
      const ready = model.superCharge >= BALANCE.superMax && !model.locked;
      this.fire.setEnabled(ready);
      this.fire.setPulse(ready);
      this.fire.setLabel(ready ? 'FIRE' : 'SUPER');
      this.meterText.setText(String(Math.round(model.superCharge)));
      this.mute.setLabel(model.muted ? 'OFF' : 'SFX');
      this.mute.setFill(model.muted ? 0x3a3038 : 0x2a3344);
      this.entries.forEach((item, index) => {
        const button = this.shop[index];
        button?.setEnabled(model.credits >= item.cost && !model.locked);
      });
    }
    this.fire.update(time);
  }

  private drawBars(model: HudModel): void {
    const playerPct = clamp01(model.playerHp / model.playerMax);
    const enemyPct = clamp01(model.enemyHp / model.enemyMax);
    this.bars.clear();
    paintBar(this.bars, HUD.leftX, HUD.barY, HUD.barW, HUD.barH, playerPct, 0x149684);
    paintBar(this.bars, HUD.rightX, HUD.barY, HUD.barW, HUD.barH, enemyPct, 0xc4473a);
    const meterX = 118;
    const meterW = 196;
    const meterY = 50;
    const charge = clamp01(model.superCharge / BALANCE.superMax);
    this.meter.clear();
    this.meter.fillStyle(0x10141d, 1);
    this.meter.fillRoundedRect(meterX, meterY, meterW, 16, 6);
    if (charge > 0) {
      this.meter.fillStyle(0x8a4ec4, 1);
      this.meter.fillRoundedRect(meterX, meterY, Math.max(10, meterW * charge), 16, 6);
    }
    this.meterText.setPosition(meterX + meterW - 8, meterY + 8);
    this.meterText.setOrigin(1, 0.5);
  }

  private drawLegend(scene: Phaser.Scene): void {
    const items = [
      { color: GEM_HEX.credit, label: 'credits' },
      { color: GEM_HEX.infantry, label: 'troops' },
      { color: GEM_HEX.tank, label: 'tanks' },
      { color: GEM_HEX.heli, label: 'helis' },
      { color: GEM_HEX.super, label: 'super' },
    ];
    let x = 16;
    for (const item of items) {
      scene.add.circle(x + 5, 498, 5, item.color).setDepth(40);
      const text = scene.add
        .text(x + 14, 498, item.label, {
          fontFamily: FONT,
          fontSize: '11px',
          color: MUTED,
        })
        .setOrigin(0, 0.5)
        .setDepth(40);
      x += text.width + 20;
    }
  }
}

function paintBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  color: number,
): void {
  g.fillStyle(0x1c1812, 1);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(0xd9c89a, 1);
  g.fillRect(x - 2, y - 2, w + 4, 2);
  g.fillStyle(0x10141d, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, 1);
  g.fillRect(x, y, Math.max(8, w * pct), h);
}

function shopColor(kind: ShopKind): number {
  if (kind === 'medic') return 0x2f8a4e;
  if (kind === 'repair') return 0x1f7a78;
  if (kind === 'ship') return 0x1d4e78;
  if (kind === 'rocket') return 0x8a6230;
  if (kind === 'artillery') return 0x6a5340;
  return 0x8a6230;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
