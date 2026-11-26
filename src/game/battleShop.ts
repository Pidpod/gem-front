import { SHOP, type ShopEntry } from '../config/balance';
import { unitUnlocked, type SaveData } from './progress';

export function battleShop(save: SaveData, mul = 1): ShopEntry[] {
  const scale = (cost: number) => Math.max(1, Math.round(cost * mul));
  const list: ShopEntry[] = SHOP.map((entry) => ({ ...entry, cost: scale(entry.cost) }));
  if (save.fleet) list.push({ kind: 'ship', cost: scale(72), name: 'SHIP', blurb: 'canal' });
  if (unitUnlocked(save, 'rocket')) list.push({ kind: 'rocket', cost: scale(58), name: 'ROCKET', blurb: 'armor' });
  if (unitUnlocked(save, 'artillery')) list.push({ kind: 'artillery', cost: scale(84), name: 'ARTY', blurb: 'range' });
  return list;
}
