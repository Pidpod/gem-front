import { pinFor } from '../../config/pins';

const TEX_W = 512;
const TEX_H = 256;

type Poly = Array<[number, number]>;

const LAND: Poly[] = [
  [
    [-168, 66], [-166, 60], [-158, 58], [-152, 60], [-141, 60], [-130, 55], [-126, 50], [-124, 46],
    [-124, 40], [-120, 34], [-114, 32], [-110, 24], [-106, 23], [-97, 26], [-97, 29], [-94, 29],
    [-90, 29], [-84, 30], [-81, 25], [-80, 31], [-76, 35], [-74, 40], [-70, 42], [-66, 45],
    [-60, 47], [-56, 51], [-62, 58], [-70, 62], [-78, 72], [-88, 74], [-100, 73], [-112, 70],
    [-128, 71], [-141, 70], [-156, 71], [-166, 68],
  ],
  [
    [-73, 78], [-68, 76], [-60, 75], [-52, 70], [-44, 68], [-44, 61], [-50, 60], [-56, 64],
    [-64, 66], [-70, 70], [-73, 76], [-68, 82], [-55, 83], [-42, 80], [-40, 74], [-48, 70],
  ],
  [
    [-80, 10], [-77, 8], [-74, 11], [-68, 12], [-60, 8], [-51, 4], [-46, -1], [-35, -6],
    [-35, -15], [-40, -22], [-48, -28], [-52, -33], [-58, -38], [-63, -42], [-67, -50],
    [-72, -53], [-75, -48], [-74, -40], [-73, -30], [-76, -18], [-78, -8], [-81, 1], [-81, 8],
  ],
  [
    [-10, 36], [-9, 43], [-5, 49], [-2, 52], [2, 51], [5, 58], [8, 62], [12, 65], [18, 69],
    [26, 70], [30, 64], [28, 56], [22, 55], [16, 48], [12, 42], [18, 40], [28, 41], [36, 46],
    [32, 36], [20, 36], [8, 36], [0, 36],
  ],
  [
    [-17, 15], [-16, 21], [-10, 32], [-6, 35], [0, 36], [10, 37], [20, 33], [32, 31], [42, 12],
    [51, 12], [51, 2], [44, -1], [42, -12], [36, -20], [32, -28], [26, -34], [18, -35], [14, -28],
    [12, -18], [8, -5], [9, 4], [4, 6], [-6, 5], [-14, 8], [-17, 12],
  ],
  [
    [42, 40], [50, 46], [60, 52], [74, 58], [90, 64], [110, 70], [140, 71], [160, 66], [178, 66],
    [178, 58], [164, 54], [150, 50], [142, 46], [132, 43], [128, 34], [122, 31], [118, 24],
    [110, 14], [104, 8], [100, 16], [108, 22], [118, 28], [126, 36], [136, 42], [148, 50],
    [140, 58], [120, 60], [96, 54], [78, 48], [64, 44], [50, 38],
  ],
  [
    [68, 24], [72, 19], [76, 10], [80, 8], [85, 16], [88, 22], [86, 26], [78, 26], [72, 24],
  ],
  [
    [98, 10], [102, 4], [106, 2], [109, 8], [110, 16], [104, 18], [100, 14],
  ],
  [
    [114, -22], [124, -16], [132, -12], [142, -11], [146, -16], [153, -26], [150, -36],
    [145, -39], [138, -36], [128, -33], [116, -34], [113, -26],
  ],
  [
    [166, -46], [172, -41], [178, -37], [176, -42], [170, -46],
  ],
];

let albedo: Uint8ClampedArray | null = null;

function inside(poly: Poly, lon: number, lat: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    const yi = a[1];
    const yj = b[1];
    const xi = a[0];
    const xj = b[0];
    const cross = yj - yi !== 0 && lat >= Math.min(yi, yj) && lat < Math.max(yi, yj) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cross) hit = !hit;
  }
  return hit;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function landAt(lat: number, lon: number): boolean {
  return onLand(lon, lat);
}

function onLand(lon: number, lat: number): boolean {
  if (lat < -63 + 5 * Math.sin(lon * 0.05)) return true;
  for (const poly of LAND) if (inside(poly, lon, lat)) return true;
  return false;
}

function ensureAlbedo(): Uint8ClampedArray {
  if (albedo) return albedo;
  const data = new Uint8ClampedArray(TEX_W * TEX_H * 4);
  for (let y = 0; y < TEX_H; y++) {
    const lat = 90 - (y / (TEX_H - 1)) * 180;
    for (let x = 0; x < TEX_W; x++) {
      const lon = -180 + (x / (TEX_W - 1)) * 360;
      const i = (y * TEX_W + x) * 4;
      if (!onLand(lon, lat)) {
        const deep = lat > 0 ? 18 : 10;
        data[i] = 8 + deep;
        data[i + 1] = 48 + Math.floor((90 - Math.abs(lat)) * 0.35);
        data[i + 2] = 96;
        data[i + 3] = 255;
        continue;
      }
      const n = hash(x * 0.17 + y * 1.7) * 0.65 + hash(x * 0.05 + y * 0.4) * 0.35;
      const ice = lat > 64 || lat < -58 || n > 0.86;
      const desert = !ice && Math.abs(lat) > 12 && Math.abs(lat) < 32 && n < 0.42;
      const mountain = !ice && n > 0.72;
      let r = 46;
      let g = 108;
      let b = 52;
      if (ice) {
        r = 232;
        g = 238;
        b = 244;
      } else if (desert) {
        r = 196;
        g = 164;
        b = 92;
      } else if (mountain) {
        r = 110;
        g = 96;
        b = 78;
      } else if (n > 0.55) {
        r = 58;
        g = 128;
        b = 60;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  albedo = data;
  return data;
}

function sample(tex: Uint8ClampedArray, lon: number, lat: number): [number, number, number] {
  const u = ((lon + 180) / 360) * (TEX_W - 1);
  const v = ((90 - lat) / 180) * (TEX_H - 1);
  const x = Math.max(0, Math.min(TEX_W - 1, Math.floor(u)));
  const y = Math.max(0, Math.min(TEX_H - 1, Math.floor(v)));
  const i = (y * TEX_W + x) * 4;
  return [tex[i] ?? 0, tex[i + 1] ?? 0, tex[i + 2] ?? 0];
}

export interface PinSpot {
  id: number;
  x: number;
  y: number;
  depth: number;
}

export function projectPin(
  latDeg: number,
  lonDeg: number,
  yaw: number,
  pitch: number,
  zoom: number,
  cx: number,
  cy: number,
  radius: number,
): PinSpot | null {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const x1 = x * cyaw + z * syaw;
  const z1 = -x * syaw + z * cyaw;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  if (z2 < 0.08) return null;
  return {
    id: 0,
    x: cx + x1 * radius * zoom,
    y: cy - y2 * radius * zoom,
    depth: z2,
  };
}

export function yawPitchFor(latDeg: number, lonDeg: number): { yaw: number; pitch: number } {
  return { yaw: (-lonDeg * Math.PI) / 180, pitch: (latDeg * Math.PI) / 180 };
}

/** Paints an orthographic globe into ctx. Original procedural land, no labels. */
export function paintSphere(
  ctx: CanvasRenderingContext2D,
  size: number,
  yaw: number,
  pitch: number,
  zoom: number,
): void {
  const tex = ensureAlbedo();
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x1 = (px + 0.5 - cx) / r / zoom;
      const yUp = (cy - (py + 0.5)) / r / zoom;
      const i = (py * size + px) * 4;
      const r2 = x1 * x1 + yUp * yUp;
      if (r2 > 1) {
        const edge = Math.sqrt(r2);
        if (edge < 1.08) {
          const glow = 1 - (edge - 1) / 0.08;
          data[i] = Math.floor(80 * glow);
          data[i + 1] = Math.floor(180 * glow);
          data[i + 2] = Math.floor(220 * glow);
          data[i + 3] = Math.floor(160 * glow);
        }
        continue;
      }
      const z2 = Math.sqrt(1 - r2);
      const y = yUp * cp + z2 * sp;
      const z1 = -yUp * sp + z2 * cp;
      const x = x1 * cyaw - z1 * syaw;
      const z = x1 * syaw + z1 * cyaw;
      const lat = (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
      const lon = (Math.atan2(x, z) * 180) / Math.PI;
      let [cr, cg, cb] = sample(tex, lon, lat);
      const light = 0.42 + 0.58 * z2;
      cr *= light;
      cg *= light;
      cb *= light;
      const lonBand = Math.abs(((lon % 20) + 20) % 20);
      const latBand = Math.abs(((lat % 20) + 20) % 20);
      if (lonBand < 0.7 || latBand < 0.7) {
        cr = cr * 0.55 + 90;
        cg = cg * 0.55 + 190;
        cb = cb * 0.55 + 210;
      }
      if (r2 > 0.78) {
        const rim = (r2 - 0.78) / 0.22;
        cr = cr * (1 - rim) + 120 * rim;
        cg = cg * (1 - rim) + 200 * rim;
        cb = cb * (1 - rim) + 230 * rim;
      }
      data[i] = cr;
      data[i + 1] = cg;
      data[i + 2] = cb;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function pinScreen(
  id: number,
  yaw: number,
  pitch: number,
  zoom: number,
  cx: number,
  cy: number,
  radius: number,
): PinSpot | null {
  const pin = pinFor(id);
  const spot = projectPin(pin.lat, pin.lon, yaw, pitch, zoom, cx, cy, radius);
  if (!spot) return null;
  spot.id = id;
  return spot;
}
