import { GameSettings, GameStats, PenDef, BenchBounds } from './types';

export const H = 600;
export const W = 960;
export const VM = 28;
export const PS = 1.3;
export const PL0 = 84;
export const PL = Math.round(PL0 * PS);
export const PW = Math.round(11 * PS);
export const HL = 37 * PS;
export const TIP = 40 * PS;
export const MAXD = 150;
export const VMAX = 22;
export const Q = 4;

export const ZG = 0.5;
export const ZC = 4; // Above ZC a pen clears other pens

export const DEFAULT_B: BenchBounds = { x: 40, y: 40, w: 880, h: 520, r: 26 };
export const CX = DEFAULT_B.x + DEFAULT_B.w / 2;
export const CY = DEFAULT_B.y + DEFAULT_B.h / 2;

export const PC = ['#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#06b6d4', '#ec4899'];

export const INITIAL_PENS: PenDef[] = [
  { n: 'Blue ballpoint', k: 'click', c: '#1e40af', g: '#14171d', ink: '#1e40af', origin: 'default' },
  { n: 'Black ballpoint', k: 'click', c: '#2b2d33', g: '#0b0b0d', ink: '#111111', origin: 'default' },
  { n: 'Red ballpoint', k: 'click', c: '#c62828', g: '#17171a', ink: '#dc2626', origin: 'default' },
  { n: 'Clear hex pen', k: 'stick', c: 'rgba(205,228,255,.34)', cap: '#2563eb', ink: '#2563eb', origin: 'default' },
  { n: 'Neon green', k: 'click', c: '#6fbf0a', g: '#2a313c', ink: '#65a30d', origin: 'default' },
  { n: 'Orange student', k: 'stick', c: 'rgba(255,214,170,.36)', cap: '#f97316', ink: '#ea580c', origin: 'default' },
];

export const PHY_DATA = {
  classic: { k: 0.012, m: 0.36 },
  slick: { k: 0.008, m: 0.24 },
  grippy: { k: 0.018, m: 0.5 },
};

export const OBS_DEFS = {
  eraser: { w: 58, h: 26, n: 'the eraser' },
  sharpener: { w: 36, h: 24, n: 'the sharpener' },
  glue: { r: 17, n: 'the glue stick' },
};

export const SERIES_OPTIONS: [number, string][] = [
  [1, 'Single'],
  [3, 'Best of 3'],
  [5, 'Best of 5'],
];

export const CLOCK_OPTIONS: [number, string][] = [
  [0, 'Off'],
  [15, '15 s'],
  [30, '30 s'],
];

export const CLUTTER_OPTIONS: [number, string][] = [
  [0, 'Clear'],
  [1, 'Eraser'],
  [2, 'Cluttered'],
];

export const DEFAULT_SETTINGS: GameSettings = {
  snd: 1,
  vol: 0.6,
  rm: typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion:reduce)').matches : false,
  pw: 1,
  asst: 1,
  acc: 0,
  phy: 'classic',
  hop: 1,
  ink: 1,
  hud: 1,
  vib: 1,
};

export const DEFAULT_STATS: GameStats = {
  p: 0,
  w: 0,
  e: 0,
  rs: 0,
  pens: {},
  st: 0,
  bs: 0,
  sh: 0,
  ht: 0,
  sp: 0,
  sw: 0,
  rec: [],
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem('pg.s');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem('pg.s', JSON.stringify(s));
  } catch (e) {}
}

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem('pg.st');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = { ...DEFAULT_STATS, ...parsed };
      if (!st.pens || typeof st.pens !== 'object') st.pens = {};
      if (!Array.isArray(st.rec)) st.rec = [];
      for (const k of ['p', 'w', 'e', 'rs', 'st', 'bs', 'sh', 'ht', 'sp', 'sw'] as const) {
        if (!isFinite(st[k])) st[k] = 0;
      }
      return st;
    }
  } catch (e) {}
  return { ...DEFAULT_STATS };
}

export function saveStats(st: GameStats) {
  try {
    localStorage.setItem('pg.st', JSON.stringify(st));
  } catch (e) {}
}
