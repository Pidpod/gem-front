# Gem Front

A portrait browser game that mixes a match-3 board with a one-lane battle. Swap gems to field infantry, tanks, and helicopters, earn credits, and charge a superweapon. Units march and fly on their own. Destroy the enemy base before yours falls.

Art and sound are original and generated in code: pixel sprites, Web Audio effects, and no third-party images or audio files. Mute also stops vibration.

## Play locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Open [http://localhost:5173/gem-front/](http://localhost:5173/gem-front/). The `/gem-front/` path matches the GitHub Pages project URL.

```bash
npm test
npm run build
npm run preview
```

Preview serves the static `dist/` site at [http://localhost:4173/gem-front/](http://localhost:4173/gem-front/).

## How to play

- Drag adjacent gems, or tap one gem and then a neighbor. A swap that does not match snaps back.
- Match 3 or more in a row or column. Gems fall, the board refills, and cascades raise the payout.
- Match 4 creates a line-blast gem (clears its row or column when matched or swapped). Match 5 creates a color bomb and calls that color's strike: infantry barrage, tank artillery, or a helicopter missile run.
- If the board has no moves, it reshuffles.
- Gold grants credits. Green sends infantry. Red sends tanks. Blue sends helicopters that fly over ground units. Purple fills the superweapon.
- Big green matches (match 4, or a cascade) send a medic along with the infantry. Medics walk behind friendlies and heal them. Keys `1` `2` `3` buy a medic, base repair, and a heavy. `F` or Space fires the superweapon. An infantry match-5 barrage also patches the base.
- The campaign is a liberation map. A commander walks the roads, regions flip when you win, and Next returns you to the map. Cities go from ruins to rebuilt streets. Raise barracks, a refinery, a hospital, a factory, and gem labs there.
- Main HQ spends war funds by unit line: infantry, tanks, helicopters, ships, medical, and base restoration, plus commander gear and battle consumables. Commanders earn XP. Some gear is only found on bosses and side roads. Story beats unlock new stock.
- Pick Mira, Holt, or Ivo before the campaign. Sera joins after Heartwood Spire. Rocket troopers and artillery unlock from later cities. Commission the fleet at HQ to buy ships in battle.
- `H` opens how-to-play. `M` toggles sound. On the result screen, Enter returns to the map and Esc does the same.

## Balance

All gameplay numbers live in [`src/config/balance.ts`](src/config/balance.ts): gem payouts, combo multiplier, shop costs, unit stats, base HP, enemy timing, and animation speeds.

## Deploy

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) installs, tests, builds, and deploys `dist/` to GitHub Pages on every push to `main`. Vite's `base` is `/gem-front/`, so asset URLs resolve on the project site.

After this workflow is on `main`, enable Pages once:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

The public URL is [https://pidpod.github.io/gem-front/](https://pidpod.github.io/gem-front/).

The first deploy runs when the workflow lands on `main`. Later pushes to `main` publish again. Pull requests only build and test.
