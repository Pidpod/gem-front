import { sfx } from '../../audio/sfx';
import { FLEET_COST, HQ_SECTIONS, type HqSectionId } from '../../config/hq';
import { ITEMS, RARITY_COLOR, itemById } from '../../config/items';
import { levelById } from '../../config/levels';
import { commanderById } from '../../config/commanders';
import { xpSpan, type GearSlot } from '../../config/items';
import { upgradeById } from '../../config/upgrades';
import { VIEW_W } from '../layout';
import {
  buyFleet,
  buyItem,
  buyUpgrade,
  clearSlot,
  countOf,
  equipItem,
  itemStocked,
  loadProgress,
  priceOf,
  toggleBelt,
  upgradeLine,
  writeProgress,
  type SaveData,
} from '../progress';
import { FONT, INK, MUTED } from '../theme';
import { addBackdrop } from '../ui/backdrop';
import { UiButton } from '../ui/button';

const TOP = 176;

export class HqScene extends Phaser.Scene {
  private save: SaveData = loadProgress();
  private section: HqSectionId = 'infantry';
  private content!: Phaser.GameObjects.Container;
  private fundsText!: Phaser.GameObjects.Text;
  private dragging = false;
  private moved = false;
  private dragStart = 0;
  private contentStart = 0;
  private contentHeight = 0;

  constructor() {
    super('hq');
  }

  create(): void {
    this.save = loadProgress();
    addBackdrop(this);
    this.add
      .text(20, 28, 'MAIN HQ', { fontFamily: FONT, fontSize: '26px', color: INK, fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(30);
    this.fundsText = this.add
      .text(VIEW_W - 20, 28, '', { fontFamily: FONT, fontSize: '16px', color: '#f0c43a', fontStyle: 'bold' })
      .setOrigin(1, 0.5)
      .setDepth(30);
    this.paintFunds();
    HQ_SECTIONS.forEach((section, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 62 + col * 116;
      const y = 78 + row * 40;
      new UiButton(this, x, y, 108, 34, section.name, this.section === section.id ? 0x149684 : 0x2a3344, () => {
        this.section = section.id;
        this.scene.restart();
      }, { fontSize: 10, depth: 30 });
    });
    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, TOP - 8, VIEW_W, 700);
    this.content = this.add.container(0, TOP);
    this.content.setMask(maskG.createGeometryMask());
    this.rebuild();
    new UiButton(this, VIEW_W / 2, 910, 200, 48, 'MAP', 0x2a3344, () => this.scene.start('map'), { fontSize: 16, depth: 40 });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < TOP || pointer.y > 870) return;
      this.dragging = true;
      this.moved = false;
      this.dragStart = pointer.y;
      this.contentStart = this.content.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dy = pointer.y - this.dragStart;
      if (Math.abs(dy) > 8) this.moved = true;
      const min = TOP - Math.max(0, this.contentHeight - 680);
      this.content.y = Math.max(min, Math.min(TOP, this.contentStart + dy));
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
    });
  }

  private paintFunds(): void {
    const cut = this.save.discount < 1 ? '  ·  DOCK PRICES' : '';
    this.fundsText.setText(`${this.save.funds} FUNDS${cut}`);
  }

  private rebuild(): void {
    this.content.removeAll(true);
    const section = HQ_SECTIONS.find((entry) => entry.id === this.section) ?? HQ_SECTIONS[0]!;
    let y = 0;
    y = this.paragraph(y, section.blurb, MUTED);
    if (section.id === 'ships') y = this.fleetRow(y);
    for (const id of section.upgrades) y = this.upgradeRow(y, id);
    if (section.id === 'gear') y = this.gear(y);
    if (section.id === 'supplies') y = this.supplies(y);
    this.contentHeight = y + 20;
  }

  private paragraph(y: number, text: string, color: string): number {
    const label = this.add.text(20, y, text, {
      fontFamily: FONT,
      fontSize: '13px',
      color,
      wordWrap: { width: VIEW_W - 40 },
    });
    this.content.add(label);
    return y + label.height + 12;
  }

  private fleetRow(y: number): number {
    const price = priceOf(this.save, FLEET_COST);
    this.rowChrome(y, 64);
    this.content.add(
      this.add.text(28, y + 8, 'COMMISSION FLEET', { fontFamily: FONT, fontSize: '15px', color: INK, fontStyle: 'bold' }),
    );
    this.content.add(
      this.add.text(28, y + 30, this.save.fleet ? 'Ships can be bought in battle.' : 'Unlocks the ship on the battle shop.', {
        fontFamily: FONT,
        fontSize: '13px',
        color: MUTED,
      }),
    );
    if (!this.save.fleet) this.buyButton(y + 32, `${price}`, () => this.act(() => buyFleet(this.save)));
    return y + 72;
  }

  private upgradeRow(y: number, id: (typeof HQ_SECTIONS)[number]['upgrades'][number]): number {
    const def = upgradeById(id);
    const rank = this.save.ranks[id] ?? 0;
    const line = upgradeLine(id, rank);
    const price = line.cost === null ? null : priceOf(this.save, line.cost);
    this.rowChrome(y, 70);
    this.content.add(this.add.text(28, y + 8, def.name, { fontFamily: FONT, fontSize: '15px', color: INK, fontStyle: 'bold' }));
    const detail = line.maxed
      ? `${def.unit} ${line.current}   MAX`
      : `${def.unit} ${line.current} → ${line.next}    ${price} funds`;
    this.content.add(this.add.text(28, y + 32, detail, { fontFamily: FONT, fontSize: '13px', color: line.maxed ? '#7d8794' : MUTED }));
    if (!line.maxed) this.buyButton(y + 34, 'BUY', () => this.act(() => buyUpgrade(this.save, id)));
    return y + 78;
  }

  private gear(y: number): number {
    const commander = commanderById(this.save.commander);
    const span = xpSpan(this.save.xp[commander.id] ?? 0);
    const xpLine = span.span === null ? `Lv ${span.level}  MAX` : `Lv ${span.level}   ${span.into}/${span.span} XP`;
    y = this.paragraph(y, `${commander.rank} ${commander.name}   ${xpLine}`, '#f0c43a');
    const gear = this.save.equipped[commander.id] ?? {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const worn = gear[slot] ? itemById(gear[slot]!) : undefined;
      this.rowChrome(y, 52);
      this.content.add(
        this.add.text(28, y + 16, `${slot.toUpperCase()}  ${worn ? worn.name : 'empty'}`, {
          fontFamily: FONT,
          fontSize: '14px',
          color: worn ? RARITY_COLOR[worn.rarity] : MUTED,
        }),
      );
      if (worn) this.buyButton(y + 26, 'CLEAR', () => this.apply(clearSlot(this.save, slot as GearSlot)));
      y += 58;
    }
    y = this.paragraph(y, 'OWNED', INK);
    const owned = this.save.inventory.filter((stack) => itemById(stack.id)?.kind === 'equip');
    if (owned.length === 0) y = this.paragraph(y, 'No gear yet. Buy a rifle or take a relic off a stronghold.', MUTED);
    for (const stack of owned) {
      const item = itemById(stack.id);
      if (!item) continue;
      const worn = gear[item.slot ?? 'weapon'] === item.id;
      this.rowChrome(y, 64);
      this.content.add(this.add.text(28, y + 8, item.name, { fontFamily: FONT, fontSize: '14px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold' }));
      this.content.add(this.add.text(28, y + 30, item.blurb, { fontFamily: FONT, fontSize: '12px', color: MUTED, wordWrap: { width: 280 } }));
      if (!worn) this.buyButton(y + 32, 'EQUIP', () => this.act(() => equipItem(this.save, item.id)));
      y += 72;
    }
    y = this.paragraph(y, 'QUARTERMASTER', INK);
    for (const item of ITEMS.filter((entry) => entry.kind === 'equip')) y = this.stockRow(y, item.id);
    return y;
  }

  private supplies(y: number): number {
    const belt = this.save.belt.map((id) => itemById(id)?.name ?? id).join('   ');
    y = this.paragraph(y, belt ? `BELT  ${belt}` : 'BELT  empty. Add up to four consumables.', '#f0c43a');
    const owned = this.save.inventory.filter((stack) => itemById(stack.id)?.kind === 'consumable' && stack.count > 0);
    if (owned.length === 0) y = this.paragraph(y, 'No supplies in the locker.', MUTED);
    for (const stack of owned) {
      const item = itemById(stack.id);
      if (!item) continue;
      const onBelt = this.save.belt.includes(item.id);
      this.rowChrome(y, 64);
      this.content.add(
        this.add.text(28, y + 8, `${item.name}  x${stack.count}`, {
          fontFamily: FONT,
          fontSize: '14px',
          color: RARITY_COLOR[item.rarity],
          fontStyle: 'bold',
        }),
      );
      this.content.add(this.add.text(28, y + 30, item.blurb, { fontFamily: FONT, fontSize: '12px', color: MUTED, wordWrap: { width: 280 } }));
      this.buyButton(y + 32, onBelt ? 'REMOVE' : 'BELT', () => this.apply(toggleBelt(this.save, item.id)));
      y += 72;
    }
    y = this.paragraph(y, 'QUARTERMASTER', INK);
    for (const item of ITEMS.filter((entry) => entry.kind === 'consumable')) y = this.stockRow(y, item.id);
    return y;
  }

  private stockRow(y: number, id: string): number {
    const item = itemById(id);
    if (!item || item.price <= 0) return y;
    const open = itemStocked(this.save, id);
    const owned = item.kind === 'equip' && countOf(this.save, id) > 0;
    this.rowChrome(y, 70);
    this.content.add(this.add.text(28, y + 8, item.name, { fontFamily: FONT, fontSize: '14px', color: open ? RARITY_COLOR[item.rarity] : '#7d8794', fontStyle: 'bold' }));
    const lock = item.requiresCleared ? `After ${levelById(item.requiresCleared).name}. ` : '';
    this.content.add(
      this.add.text(28, y + 30, open ? item.blurb : `${lock}${item.blurb}`, {
        fontFamily: FONT,
        fontSize: '12px',
        color: MUTED,
        wordWrap: { width: 280 },
      }),
    );
    if (open && !owned) this.buyButton(y + 34, `${priceOf(this.save, item.price)}`, () => this.act(() => buyItem(this.save, id)));
    if (owned) {
      this.content.add(this.add.text(VIEW_W - 28, y + 34, 'OWNED', { fontFamily: FONT, fontSize: '12px', color: '#3ee0c5' }).setOrigin(1, 0.5));
    }
    return y + 78;
  }

  private rowChrome(y: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x171b26, 1);
    g.fillRoundedRect(16, y, VIEW_W - 32, h - 8, 10);
    this.content.add(g);
  }

  private buyButton(y: number, label: string, onClick: () => void): void {
    const root = this.add.container(VIEW_W - 78, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x149684, 1);
    bg.fillRoundedRect(-46, -16, 92, 32, 8);
    const text = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '13px', color: '#f4f1ea', fontStyle: 'bold' }).setOrigin(0.5);
    const zone = this.add.zone(0, 0, 92, 32).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.moved) return;
      onClick();
    });
    root.add([bg, text, zone]);
    this.content.add(root);
  }

  private act(run: () => { save: SaveData; ok: boolean }): void {
    const next = run();
    if (!next.ok) {
      sfx.reject();
      return;
    }
    this.apply(next.save);
  }

  private apply(save: SaveData): void {
    this.save = save;
    writeProgress(save);
    sfx.ui();
    this.paintFunds();
    this.rebuild();
  }
}
