import { PenDef, BenchSkin, BenchBounds } from './types';
import { INITIAL_PENS, W, H, DEFAULT_B, PC, PL, PW } from './constants';

export const Q = 4; // Canvas scale factor for high-resolution sprite rendering

export interface PenSprite {
  c: HTMLCanvasElement;
  w: number;
  h: number;
}

export class AssetStore {
  pens: PenDef[] = [...INITIAL_PENS];
  benchSkins: BenchSkin[] = [];
  selectedBenchSrc: string = '';
  benchBounds: BenchBounds = { ...DEFAULT_B };
  benchImg: HTMLImageElement | null = null;
  procBench: HTMLCanvasElement | null = null;
  cache = new Map<string, PenSprite>();

  constructor() {
    this.initDefaultBundledAssets();
    this.restoreCustomPens();
  }

  private initDefaultBundledAssets() {
    // Add default bundled bench from assets/bench/
    this.benchSkins.push({
      n: 'Worn Wooden Desk With Doodles',
      src: `${import.meta.env.BASE_URL}assets/bench/Worn Wooden Desk with Doodles.png`,
    });

    // Add bundled pens from assets/pens/
    this.addPen({
      n: 'Black Grip Pen',
      src: `${import.meta.env.BASE_URL}assets/pens/Transparent Barrel Black Grip Pen.png`,
      len: 84,
      band: -10,
      origin: 'repo',
    });
    this.addPen({
      n: 'Blue Retractable Pen',
      src: `${import.meta.env.BASE_URL}assets/pens/Transparent Blue Retractable Pen.png`,
      len: 84,
      band: -10,
      origin: 'repo',
    });
  }

  private restoreCustomPens() {
    try {
      const raw = localStorage.getItem('pg.customPens');
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          saved.forEach((p) => {
            if (p && p.src) this.addPen({ ...p, origin: 'local' });
          });
        }
      }
    } catch (e) {}
  }

  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  addPen(def: PenDef): number {
    const d: PenDef = {
      n: def.n || 'Custom pen',
      origin: def.origin || 'custom',
      len: def.len || 84,
      band: def.band != null ? def.band : -10,
      c: def.c || '#888',
      ...def,
    };
    if (d.src && !d.img) {
      this.loadImage(d.src)
        .then((img) => {
          d.img = img;
          this.cache.clear();
        })
        .catch(() => {
          // silently continue if image fails
        });
    }
    this.pens.push(d);
    return this.pens.length - 1;
  }

  async setBench(src: string | null) {
    if (!src) {
      this.selectedBenchSrc = '';
      this.benchImg = null;
      this.benchBounds = { ...DEFAULT_B };
      return;
    }
    try {
      const img = await this.loadImage(src);
      this.selectedBenchSrc = src;
      this.benchImg = img;
      const iw = img.naturalWidth || img.width || W;
      const ih = img.naturalHeight || img.height || H;
      const fit = Math.min(W / iw, H / ih);
      const dw = iw * fit;
      const dh = ih * fit;
      this.benchBounds = {
        x: (W - dw) / 2,
        y: (H - dh) / 2,
        w: dw,
        h: dh,
        r: Math.min(26 * fit, dw / 2, dh / 2),
      };
    } catch (e) {
      this.selectedBenchSrc = '';
      this.benchImg = null;
      this.benchBounds = { ...DEFAULT_B };
    }
  }

  resetAssets() {
    this.benchImg = null;
    this.selectedBenchSrc = '';
    this.benchBounds = { ...DEFAULT_B };
    for (let i = this.pens.length - 1; i >= 0; i--) {
      if (this.pens[i].origin === 'local' || this.pens[i].origin === 'custom') {
        this.pens.splice(i, 1);
      }
    }
    this.cache.clear();
    try {
      localStorage.removeItem('pg.customPens');
    } catch (e) {}
  }

  async loadRemoteDirectoryAssets() {
    try {
      const benchApi = 'https://api.github.com/repos/iammdtanvirrahman/pen-game/contents/assets/bench';
      const res = await fetch(benchApi + '?ref=main&per_page=100', {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (res.ok) {
        const files = await res.json();
        if (Array.isArray(files)) {
          files
            .filter((f: any) => f.type === 'file' && /\.(png|webp|jpe?g|gif|avif)$/i.test(f.name))
            .forEach((f: any) => {
              const src = f.download_url || `https://raw.githubusercontent.com/iammdtanvirrahman/pen-game/main/${f.path}`;
              if (!this.benchSkins.some((b) => b.src === src || b.n.toLowerCase() === f.name.toLowerCase())) {
                const n = f.name
                  .replace(/\.(png|webp|jpe?g|gif|avif)$/i, '')
                  .replace(/[_-]+/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
                  .slice(0, 32);
                this.benchSkins.push({ n, src });
              }
            });
        }
      }
    } catch (e) {}

    try {
      const penApi = 'https://api.github.com/repos/iammdtanvirrahman/pen-game/contents/assets/pens';
      const existing = new Set(this.pens.map((p) => p.src).filter(Boolean));
      const res = await fetch(penApi + '?ref=main&per_page=100', {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (res.ok) {
        const files = await res.json();
        if (Array.isArray(files)) {
          files
            .filter((f: any) => f.type === 'file' && /\.(png|webp|jpe?g|gif|avif)$/i.test(f.name))
            .forEach((f: any) => {
              const src = f.download_url || `https://raw.githubusercontent.com/iammdtanvirrahman/pen-game/main/${f.path}`;
              if (!existing.has(src)) {
                const n = f.name
                  .replace(/\.(png|webp|jpe?g|gif|avif)$/i, '')
                  .replace(/[_-]+/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
                  .slice(0, 28);
                this.addPen({ n, src, len: 84, band: -10, origin: 'repo' });
                existing.add(src);
              }
            });
        }
      }
    } catch (e) {}
  }
}

export const assetStore = new AssetStore();

/* ---- Procedural pen drawing on high-res sprite canvas ---- */
function drawProceduralPen(g: CanvasRenderingContext2D, d: PenDef, pc: string) {
  const V = (h: number) => {
    const v = g.createLinearGradient(0, -h, 0, h);
    [
      [0, 'rgba(0,0,0,.6)'],
      [0.1, 'rgba(0,0,0,.28)'],
      [0.27, 'rgba(255,255,255,.6)'],
      [0.36, 'rgba(255,255,255,.22)'],
      [0.55, 'rgba(255,255,255,0)'],
      [0.8, 'rgba(0,0,0,.3)'],
      [0.94, 'rgba(0,0,0,.55)'],
      [1, 'rgba(255,255,255,.14)'],
    ].forEach(([o, c]) => v.addColorStop(o as number, c as string));
    return v;
  };

  const M = (h: number) => {
    const v = g.createLinearGradient(0, -h, 0, h);
    [
      [0, '#3a3d42'],
      [0.12, '#d9dde3'],
      [0.25, '#fff'],
      [0.4, '#9aa0a8'],
      [0.58, '#e8ebef'],
      [0.75, '#7b828b'],
      [0.92, '#c3c8ce'],
      [1, '#30333a'],
    ].forEach(([o, c]) => v.addColorStop(o as number, c as string));
    return v;
  };

  const part = (x0: number, x1: number, h: number, base: string, r = 1.2) => {
    g.beginPath();
    g.roundRect(x0, -h, x1 - x0, 2 * h, r);
    g.save();
    g.clip();
    g.fillStyle = base;
    g.fillRect(x0, -h, x1 - x0, 2 * h);
    g.fillStyle = V(h);
    g.fillRect(x0, -h, x1 - x0, 2 * h);
    g.restore();
  };

  const metal = (x0: number, x1: number, h: number, r = 1) => {
    g.beginPath();
    g.roundRect(x0, -h, x1 - x0, 2 * h, r);
    g.fillStyle = M(h);
    g.fill();
  };

  const cone = (x0: number, x1: number, h0: number, h1: number, base: string | CanvasGradient) => {
    g.beginPath();
    g.moveTo(x0, -h0);
    g.lineTo(x1, -h1);
    g.lineTo(x1, h1);
    g.lineTo(x0, h0);
    g.closePath();
    g.save();
    g.clip();
    g.fillStyle = base;
    g.fillRect(x0, -h0, x1 - x0, 2 * h0);
    g.fillStyle = V(h0);
    g.fillRect(x0, -h0, x1 - x0, 2 * h0);
    g.restore();
  };

  const ball = (x: number) => {
    g.fillStyle = '#14161a';
    g.beginPath();
    g.arc(x, 0, 0.95, 0, 6.3);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.beginPath();
    g.arc(x - 0.3, -0.35, 0.3, 0, 6.3);
    g.fill();
  };

  if (d.k === 'stick') {
    part(-44, -18, 5.7, d.cap || '#2563eb', 2.4);
    g.save();
    g.translate(0, -6.6);
    part(-41, -22, 1.5, d.cap || '#2563eb', 0.8);
    g.restore();
    part(-20, -17, 5.2, pc, 0.6);
    part(-17, 30, 5.1, d.c || '#fff', 1.2);
    g.save();
    g.beginPath();
    g.roundRect(-17, -5.1, 47, 10.2, 1.2);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,.22)';
    g.fillRect(-17, -5.1, 47, 2.7);
    g.fillStyle = 'rgba(0,0,0,.14)';
    g.fillRect(-17, 2.4, 47, 2.7);
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.fillRect(-17, -2.45, 47, 0.35);
    g.fillRect(-17, 2.4, 47, 0.35);
    g.restore();
    g.save();
    g.beginPath();
    g.roundRect(-14, -1.35, 40, 2.7, 1.3);
    g.clip();
    g.fillStyle = d.ink || '#2563eb';
    g.fillRect(-14, -1.35, 40, 2.7);
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.fillRect(-14, -1.35, 8, 2.7);
    g.fillStyle = V(1.35);
    g.fillRect(-14, -1.35, 40, 2.7);
    g.restore();
    cone(30, 38, 4.6, 1.7, d.cap || '#2563eb');
    cone(38, 40.4, 1.7, 0.95, M(1.7));
    ball(40.6);
  } else {
    metal(-44, -39.5, 2.6, 1.2);
    part(-39.5, -9.5, 5.2, d.c || '#2b2d33', 1.4);
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.font = 'bold 2.6px Arial,sans-serif';
    g.textBaseline = 'middle';
    g.fillText('PEN GAME 0.7', -36, 1.2);
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.fillRect(-37, -5.2, 23, 2);
    g.save();
    g.translate(0, -6.2);
    g.beginPath();
    g.roundRect(-38, -1.3, 25, 2.6, 1.2);
    g.fillStyle = M(1.3);
    g.fill();
    g.restore();
    part(-9.5, -6.2, 5.2, pc, 0.8);
    metal(-6.2, -5.2, 5.25, 0.5);
    part(-5.2, 18, 4.8, d.g || '#0b0b0d', 1.2);
    for (let x = -3; x < 17; x += 2.2) {
      g.fillStyle = 'rgba(0,0,0,.38)';
      g.fillRect(x, -4.7, 0.55, 9.4);
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(x + 0.6, -4.7, 0.3, 9.4);
    }
    cone(18, 33, 4.8, 2.1, M(4.8));
    g.fillStyle = 'rgba(0,0,0,.3)';
    for (let x = 19; x < 22.6; x += 1.2) g.fillRect(x, -4.5, 0.35, 9);
    cone(33, 39.6, 2.1, 0.95, M(2.1));
    ball(39.8);
  }
}

export function spriteFor(playerIndex: number, penDefIndex: number): PenSprite {
  const key = `${penDefIndex}:${playerIndex}`;
  let s = assetStore.cache.get(key);
  if (s) return s;

  const d = assetStore.pens[penDefIndex] || assetStore.pens[0];
  const len = d.len || PL;
  const cv = document.createElement('canvas');

  if (d.img) {
    const sw = len + 8;
    const hh = (len * d.img.height) / d.img.width;
    const sh = Math.max(PW + 12, hh + 8);
    cv.width = Math.round(sw * Q);
    cv.height = Math.round(sh * Q);
    const g = cv.getContext('2d')!;
    g.scale(Q, Q);
    g.imageSmoothingQuality = 'high';
    g.drawImage(d.img, sw / 2 - len / 2, sh / 2 - hh / 2, len, hh);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = PC[playerIndex % PC.length];
    g.fillRect(sw / 2 + (d.band != null ? d.band : -10), 0, 3, sh);
  } else {
    cv.width = 92 * Q;
    cv.height = 18 * Q;
    const g = cv.getContext('2d')!;
    g.scale(Q, Q);
    g.translate(46, 9);
    drawProceduralPen(g, d, PC[playerIndex % PC.length]);
  }

  s = { c: cv, w: cv.width / Q, h: cv.height / Q };
  assetStore.cache.set(key, s);
  return s;
}
