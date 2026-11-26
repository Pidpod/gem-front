import type { PortraitId } from '../../config/dialogue';

const PAL: Record<string, string> = {
  k: '#1a1612',
  s: '#e2b48a',
  d: '#2a241c',
  t: '#1f8f86',
  g: '#2f8a4e',
  w: '#f4f1ea',
  p: '#6a3cae',
  r: '#c4473a',
  y: '#c4a46a',
  b: '#8a5a32',
  m: '#d8d2c2',
  a: '#9aa4ae',
};

const FACES: Record<PortraitId, string[]> = {
  mira: [
    '....kkkkkk....',
    '...kssssssk...',
    '..kksddssk...',
    '..ksssssssk...',
    '...ksssssk....',
    '....kkkkkk....',
    '...tttttttt...',
    '..ttmttmttt...',
    '..ttttttttt...',
    '...ttttttt....',
    '....tttt......',
    '..............',
    '..............',
    '..............',
  ],
  holt: [
    '....gggggg....',
    '...ggssssgg...',
    '..ggksddsgg...',
    '..ggsssssgg...',
    '...ggsssgg....',
    '....gggggg....',
    '...gggggggg...',
    '..ggmggmggg...',
    '..ggggggggg...',
    '...ggggggg....',
    '....gggg......',
    '..............',
    '..............',
    '..............',
  ],
  ivo: [
    '....wwwwww....',
    '...wssssssw...',
    '..wwsddssww...',
    '..wsssssssw...',
    '...wsssssw....',
    '....wwwwww....',
    '...pppppppp...',
    '..ppmyppmpp...',
    '..ppppppppp...',
    '...ppppppp....',
    '....pppp......',
    '..............',
    '..............',
    '..............',
  ],
  vesper: [
    '....kkkkkk....',
    '...kkrrrrkk...',
    '..kkrrddrrkk..',
    '..kkrrrrrrkk..',
    '...kkrrrrkk...',
    '....kkkkkk....',
    '...aaaaaaaa...',
    '..aamaaaamaa..',
    '..aaaaaaaaa...',
    '...aaaaaaa....',
    '....aaaa......',
    '..............',
    '..............',
    '..............',
  ],
  sera: [
    '....bbbbbb....',
    '...bssssssb...',
    '..bbsddssbb...',
    '..bsssssssb...',
    '...bsssssb....',
    '....bbbbbb....',
    '...yyyyyyyy...',
    '..yymyyymyy...',
    '..yyyyyyyyy...',
    '...yyyyyyy....',
    '....yyyy......',
    '..............',
    '..............',
    '..............',
  ],
};

export function installPortraits(scene: Phaser.Scene): void {
  (Object.keys(FACES) as PortraitId[]).forEach((id) => {
    const key = `px-port-${id}`;
    if (scene.textures.exists(key)) return;
    const rows = FACES[id];
    const scale = 4;
    const width = rows[0]?.length ?? 1;
    const height = rows.length;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < height; y++) {
      const row = rows[y] ?? '';
      for (let x = 0; x < width; x++) {
        const color = PAL[row[x] ?? ''];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    const texture = scene.textures.addCanvas(key, canvas);
    texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
}
