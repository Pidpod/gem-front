# Gem Front

A portrait browser game that mixes a match-3 board with a one-lane battle. Swap gems to pay for troops, repair your base, and charge a superweapon. Units march on their own. Destroy the enemy base before yours falls.

Placeholder art is drawn in code (colored gems and simple shapes). There are no third-party images or trademarked faction names.

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
- Match 4 creates a line-blast gem (clears its row or column when matched or swapped). Match 5 creates a color bomb.
- If the board has no moves, it reshuffles.
- Gold grants credits. Red sends infantry. Blue sends tanks. Green repairs your base. Purple fills the superweapon.
- Spend credits on rockets, heavies, and artillery. Keys `1` `2` `3` buy them. `F` or Space fires the superweapon when the meter is full.
- Units walk forward, fight enemies they meet, and damage a base when they reach it. The enemy sends stronger waves over time.
- `H` opens how-to-play. `M` toggles sound. On the result screen, Enter plays again and Esc returns to the title.

## Balance

All gameplay numbers live in [`src/config/balance.ts`](src/config/balance.ts): gem payouts, combo multiplier, shop costs, unit stats, base HP, enemy timing, and animation speeds.

## Deploy

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) installs, tests, builds, and deploys `dist/` to GitHub Pages on every push to `main`. Vite's `base` is `/gem-front/`, so asset URLs resolve on the project site.

After this workflow is on `main`, enable Pages once:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

The public URL is [https://pidpod.github.io/gem-front/](https://pidpod.github.io/gem-front/).

The first deploy runs when the workflow lands on `main`. Later pushes to `main` publish again. Pull requests only build and test.
