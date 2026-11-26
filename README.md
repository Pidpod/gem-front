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
- Campaign has 10 levels. A win pays war funds and stars, and Next unlocks the following level. Spend funds in Upgrades between battles. Settings on the map can reset progress.
- `H` opens how-to-play. `M` toggles sound. On the result screen, Enter plays again and Esc returns to the title.

## Balance

All gameplay numbers live in [`src/config/balance.ts`](src/config/balance.ts): gem payouts, combo multiplier, shop costs, unit stats, base HP, enemy timing, and animation speeds.

## Deploy

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) installs, tests, builds, and deploys `dist/` to GitHub Pages on every push to `main`. Vite's `base` is `/gem-front/`, so asset URLs resolve on the project site.

After this workflow is on `main`, enable Pages once:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

The public URL is [https://pidpod.github.io/gem-front/](https://pidpod.github.io/gem-front/).

The first deploy runs when the workflow lands on `main`. Later pushes to `main` publish again. Pull requests only build and test.
