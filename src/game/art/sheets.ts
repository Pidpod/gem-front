/**
 * Original pixel sprites, drawn into canvas textures at boot.
 * Nearest-neighbor filtering keeps the DS/GBA chunk.
 */

const PLAYER = {
  G: '#6f9a3a',
  g: '#3e6424',
  s: '#e2b48a',
  m: '#d8d2c2',
  d: '#2a241c',
  b: '#7eb6e8',
  B: '#d8efe8',
  k: '#1a1612',
  y: '#f0c43a',
  Y: '#efe6c4',
  r: '#d7dde2',
  p: '#3dbe6e',
};

const ENEMY = {
  G: '#c45448',
  g: '#7a2e28',
  s: '#e2b48a',
  m: '#c8b8a4',
  d: '#2a1816',
  b: '#e8c07a',
  B: '#f0d0c8',
  k: '#1a1210',
  y: '#f0c43a',
  Y: '#f2d2a8',
  r: '#f2d2cc',
  p: '#3dbe6e',
};

const NAVY = {
  ...PLAYER,
  b: '#2f6ea8',
  B: '#9ad4f5',
  y: '#f0c43a',
  k: '#143044',
};

const NAVY_ENEMY = {
  ...ENEMY,
  b: '#8a3430',
  B: '#e7a090',
  y: '#f0c43a',
  k: '#2a1210',
};

const FX = {
  y: '#ffe56a',
  o: '#ff8a2a',
  r: '#e24b3a',
  w: '#fff6e8',
  k: '#2a2018',
  s: '#8a8078',
  d: '#5a5048',
  g: '#7a9a44',
  n: '#c4b8a4',
};

export function installArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('px-infantry-player')) return;
  bake(scene, 'px-infantry-player', infantry(false), 2, PLAYER);
  bake(scene, 'px-infantry-enemy', infantry(true), 2, ENEMY);
  bake(scene, 'px-tank-player', tank(false), 2, PLAYER);
  bake(scene, 'px-tank-enemy', tank(true), 2, ENEMY);
  bake(scene, 'px-heavy-player', heavy(false), 2, PLAYER);
  bake(scene, 'px-heavy-enemy', heavy(true), 2, ENEMY);
  bake(scene, 'px-artillery-player', artillery(false), 2, PLAYER);
  bake(scene, 'px-artillery-enemy', artillery(true), 2, ENEMY);
  bake(scene, 'px-medic-player', medic(false), 2, PLAYER);
  bake(scene, 'px-medic-enemy', medic(true), 2, ENEMY);
  bake(scene, 'px-rocket-player', rocket(false), 2, PLAYER);
  bake(scene, 'px-rocket-enemy', rocket(true), 2, ENEMY);
  bake(scene, 'px-heli-player', heli(), 2, PLAYER);
  bake(scene, 'px-heli-enemy', heli(), 2, ENEMY);
  bake(scene, 'px-ship-player', ship(), 2, NAVY);
  bake(scene, 'px-ship-enemy', ship(), 2, NAVY_ENEMY);
  bake(scene, 'px-base-player', base(), 2, PLAYER);
  bake(scene, 'px-base-enemy', base(), 2, ENEMY);
  bake(scene, 'px-boom', boom(), 2, FX);
  bake(scene, 'px-shell', [shell()], 2, FX);
  bake(scene, 'px-grenade', [grenade()], 2, FX);
  bake(scene, 'px-missile', [missile()], 2, FX);
  bake(scene, 'px-bullet', [bullet()], 2, FX);
  bake(scene, 'px-pix', [['w']], 2, { w: '#ffffff' });
}

function bake(
  scene: Phaser.Scene,
  key: string,
  frames: string[][],
  scale: number,
  pal: Record<string, string>,
): void {
  const norm = normalize(frames);
  const width = norm[0]?.[0]?.length ?? 1;
  const height = norm[0]?.length ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * norm.length * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  norm.forEach((rows, index) => {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y] ?? '';
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (!ch || ch === '.' || ch === ' ') continue;
        const color = pal[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect((index * width + x) * scale, y * scale, scale, scale);
      }
    }
  });
  const texture = scene.textures.addCanvas(key, canvas);
  if (!texture) return;
  for (let i = 0; i < norm.length; i++) {
    texture.add(i, 0, i * width * scale, 0, width * scale, height * scale);
  }
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function normalize(frames: string[][]): string[][] {
  const width = Math.max(1, ...frames.flat().map((row) => row.length));
  const height = Math.max(1, ...frames.map((frame) => frame.length));
  return frames.map((frame) => {
    const rows = frame.map((row) => row.padEnd(width, '.'));
    while (rows.length < height) rows.push('.'.repeat(width));
    return rows;
  });
}

function infantry(alt: boolean): string[][] {
  const a = [
    '................',
    '......kkkk......',
    '.....kGGGGk.....',
    '.....kGssGk.....',
    '......kGGk......',
    '.....kGGGGk.....',
    '....kGGmmGk.....',
    '......kGGk......',
    '.....kG..Gk.....',
    '....kG....k.....',
    '.....k..........',
    '......k.........',
    '................',
    '................',
    '................',
    '................',
  ];
  const b = [
    '................',
    '......kkkk......',
    '.....kGGGGk.....',
    '.....kGssGk.....',
    '......kGGk......',
    '.....kGGGGk.....',
    '....kGGmmGk.....',
    '......kGGk......',
    '....kG..Gk......',
    '....k....Gk.....',
    '..........k.....',
    '.........k......',
    '................',
    '................',
    '................',
    '................',
  ];
  return alt ? [b, a] : [a, b];
}

function tank(alt: boolean): string[][] {
  const a = [
    '....................',
    '.........kkkk.......',
    '........kmmmmk......',
    '.......kmmmmmmk.....',
    '.kkkkkkGGGGGGGGk....',
    'kGGGGGGGGGGGGGGGk...',
    'kGmmmmmmmmmmmmmGk...',
    '.kkkkkkkkkkkkkkkk...',
    '..k.k........k.k....',
    '....................',
  ];
  const b = [
    '....................',
    '.........kkkk.......',
    '........kmmmmk......',
    '.......kmmmmmmk.....',
    '.kkkkkkGGGGGGGGk....',
    'kGGGGGGGGGGGGGGGk...',
    'kGmmmmmmmmmmmmmGk...',
    '.kkkkkkkkkkkkkkkk...',
    '...k.k......k.k.....',
    '....................',
  ];
  return alt ? [b, a] : [a, b];
}

function heavy(alt: boolean): string[][] {
  const body = [
    '......................',
    '..........kkkkk.......',
    '.........kmmmmmk......',
    '........kmmmmmmmk.....',
    '..kkkkkkGGGGGGGGGk....',
    '.kGGGGGGGGGGGGGGGGk...',
    'kGGGGGGGGGGGGGGGGGGk..',
    'kGmmmmmmmmmmmmmmmmGk..',
    '.kkkkkkkkkkkkkkkkkkk..',
    '...k..k........k..k...',
    '......................',
  ];
  const step = body.map((row, index) => (index === body.length - 2 ? '..k..k......k..k....' : row));
  return alt ? [step, body] : [body, step];
}

function artillery(alt: boolean): string[][] {
  const a = [
    '......................',
    '.........kkkkkkkkk....',
    '........kmmmmmmmmk....',
    '.......kYYYYYYYYmk....',
    '.kkkkkGGGGGGGGGGk.....',
    'kGGGGGGGGGGGGGGGk.....',
    'kGmmmmmmmmmmmmmGk.....',
    '.kkkkkkkkkkkkkkkk.....',
    '..k.k........k.k......',
    '......................',
  ];
  const b = a.map((row, index) => (index === a.length - 2 ? '...k.k......k.k.......' : row));
  return alt ? [b, a] : [a, b];
}

function medic(alt: boolean): string[][] {
  const a = [
    '................',
    '......kkkk......',
    '.....kmmmGk.....',
    '.....kmssmk.....',
    '......kpmk......',
    '.....kmmmmk.....',
    '....kmpppmk.....',
    '......kpmk......',
    '.....km..mk.....',
    '....km....k.....',
    '.....k..........',
    '......k.........',
    '................',
    '................',
  ];
  const b = a.map((row, index) => (index === 8 ? '....km..mk......' : row));
  return alt ? [b, a] : [a, b];
}

function rocket(alt: boolean): string[][] {
  const a = [
    '................',
    '......kkkk......',
    '.....kGGGGk.....',
    '.....kGssGk.....',
    '......kGGk......',
    '....kkGGGGk.....',
    '...kyyGmmGk.....',
    '......kGGk......',
    '.....kG..Gk.....',
    '....kG....k.....',
    '.....k..........',
    '................',
    '................',
    '................',
  ];
  const b = a.map((row, index) => (index === 8 ? '....kG..Gk......' : row));
  return alt ? [b, a] : [a, b];
}

function heli(): string[][] {
  return [
    [
      '......................',
      '..rrrrrrrrrrrrrr......',
      '......................',
      '......kkkk............',
      '.....kBBBBk...........',
      '....kBBBwwBBk.........',
      '...kBBBBBBBBkk........',
      '.....kBBk.............',
      '......kk..............',
      '......................',
    ],
    [
      '......................',
      '.r.r.r.r.r.r.r.r......',
      '......................',
      '......kkkk............',
      '.....kBBBBk...........',
      '....kBBBwwBBk.........',
      '...kBBBBBBBBkk........',
      '.....kBBk.............',
      '......kk..............',
      '......................',
    ],
  ];
}

function base(): string[][] {
  const a = [
    '..............kyk.......',
    '.............kGGGk......',
    '......kkkkkkkkkkkkkk....',
    '.....kGmGmGmGmGmGGk.....',
    '.....kGGGGGGGGGGGGk.....',
    '.....kGGGGGGGGGGGGk.....',
    '.....kGGGGddddGGGGk.....',
    '.....kGGGddddddGGGk.....',
    '.....kGGddddddddGGk.....',
    '.....kGddddddddddGk.....',
    '......kkkkkkkkkkkk......',
    '........................',
  ];
  const b = a.map((row, index) => (index === 0 ? '..............kky.......' : row));
  return [a, b];
}

function boom(): string[][] {
  return [
    ['....yy....', '..yooooy..', '.yooooooy.', '..yooooy..', '....yy....', '..........', '..........', '..........', '..........', '..........'],
    ['..yoooy...', '.yowwwwoy.', 'yowwwwwwy.', '.yowwwwoy.', '..yoooy...', '...yy.....', '..........', '..........', '..........', '..........'],
    ['.roooooy..', 'rowwwwwoy.', 'owwwwwwwo.', 'rowwwwwoy.', '.roooooy..', '..ryyyr...', '...rr.....', '..........', '..........', '..........'],
    ['k.o....o.k', '.k.o..o.k.', '..k.oo.k..', '...k..k...', '..k.ss.k..', '.k.s..s.k.', 'k.s....s.k', '..........', '..........', '..........'],
    ['k........k', '..k....k..', '....kk....', '...ksssk...', '....kk....', '..k....k..', 'k........k', '..........', '..........', '..........'],
  ];
}

function shell(): string[] {
  return ['..yyyy..', '.yooooy.', 'yowwwwoy', '.yooooy.', '..yyyy..'];
}

function grenade(): string[] {
  return ['..gg..', '.gddg.', 'gddddg', '.gddg.', '..gg..'];
}

function missile(): string[] {
  return ['...yy', '..yoo', '.ywwy', 'yoooy', '.yy..'];
}

function bullet(): string[] {
  return ['yy', 'yo'];
}

function ship(): string[][] {
  const hull = [
    '................',
    '.......k........',
    '......kyk.......',
    '.....kByBk......',
    '...bbbbbbbbbb...',
    '..bByByByByBbb..',
    '.bbbbbbbbbbbbbb.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................',
  ];
  const wake = [
    '................',
    '.......k........',
    '......kmk.......',
    '.....kByBk......',
    '...bbbbbbbbbb...',
    '..bByByByByBbb..',
    '.bbbbbbbbbbbbbb.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................',
  ];
  return [hull, wake];
}
