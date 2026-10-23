import type { Body } from 'matter-js';

export interface GameSettings {
  snd: number; // 0 or 1
  vol: number; // 0..1
  rm: boolean; // reduced motion
  pw: number; // flick strength multiplier (0.75, 1, 1.25)
  asst: number; // aim assist line (0 or 1)
  acc: number; // accuracy variation (0 or 1)
  phy: 'classic' | 'slick' | 'grippy';
  hop: number; // 0 or 1 (pen jumps/hops on strong flicks)
  ink: number; // 0 or 1 (pen ink trails on desk)
  hud: number; // 0 or 1 (0: slim/hidden, 1: scoreboard visible)
  vib: number; // 0 or 1 (haptic feedback)
}

export interface GameStats {
  p: number; // played rounds
  w: number; // won rounds
  e: number; // eliminations (knockouts)
  rs: number; // sum of ranks
  pens: Record<number, number>; // usage count
  st: number; // current streak
  bs: number; // best streak
  sh: number; // shots taken
  ht: number; // hits landed
  sp: number; // series played
  sw: number; // series won
  rec: string[]; // recent matches (up to 6)
}

export interface PenDef {
  n: string;
  k?: 'click' | 'stick';
  c?: string;
  g?: string;
  cap?: string;
  ink?: string;
  t?: string;
  src?: string;
  img?: HTMLImageElement | null;
  len?: number;
  band?: number;
  origin?: 'default' | 'repo' | 'local' | 'custom';
}

export interface BenchSkin {
  n: string;
  src: string;
  img?: HTMLImageElement | null;
}

export interface PlayerConfig {
  name: string;
  ai: number; // 0: Human, 1: AI Easy, 2: AI Medium, 3: AI Hard
  pen: number;
}

export interface MatchConfig {
  pl: PlayerConfig[];
  series: number; // 1, 3, 5
  clock: number; // 0, 15, 30
  clutter: number; // 0: Clear, 1: Eraser, 2: Cluttered
}

export interface LivePlayer {
  i: number;
  name: string;
  ai: number;
  pen: number;
  alive: number; // 1 or 0
  fell: number; // 1 or 0
  ft?: number; // fall start timestamp
  fdX?: number; // fall direction X
  fdY?: number; // fall direction Y
  rank: number;
  el: number; // knockouts count
  sh: number; // shots taken
  ht: number; // hits landed
  body: Body;
  z: number; // elevation above desk
  vz: number; // z velocity
  pt: number; // pitch tilt angle
  pw: number; // pitch angular velocity
  rb: number; // rebound counter
  fl: number; // flying / cleared others flag
  m0: number; // original collision mask
  lt: [number, number] | null; // last tip position for ink trail
}

export interface Obstacle {
  k: 'eraser' | 'sharpener' | 'glue';
  x: number;
  y: number;
  a: number;
  w: number;
  h: number;
  r: number;
  n: string;
  body: Body;
  sp: {
    c: HTMLCanvasElement;
    w: number;
    h: number;
  };
}

export interface SeriesMatch {
  cfg: MatchConfig;
  scores: number[];
  round: number;
  need: number;
  first: number;
}

export interface MatchState {
  id: number;
  cfg: MatchConfig;
  pl: LivePlayer[];
  obs: Obstacle[];
  t: number; // current player index in pl
  st: 'aim' | 'sim' | 'over';
  k: number; // frictionAir
  m: number; // sliding deceleration
  simT: number;
  sT: number;
  win: LivePlayer | null;
  clk: number; // turn clock ms
  cs: number;
  hit: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number; // lifetime 0..1
  c: string;
  g?: number; // gravity flag
}

export interface BenchBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export interface NetStatePacket {
  type: 'state';
  seq: number;
  cfg: MatchConfig;
  match: {
    scores: number[];
    round: number;
    need: number;
    first: number;
  };
  game: {
    id: number;
    t: number;
    st: 'aim' | 'sim' | 'over';
    simT: number;
    sT: number;
    clk: number;
    cs: number;
    hit: number;
    win: number | null;
    pl: {
      i: number;
      name: string;
      alive: boolean;
      fell: boolean;
      rank: number;
      el: number;
      sh: number;
      ht: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      av: number;
      z: number;
      vz: number;
      pt: number;
      pw: number;
      rb: number;
      fl: number;
      mask: number;
    }[];
    obs: {
      k: 'eraser' | 'sharpener' | 'glue';
      x: number;
      y: number;
      a: number;
      w: number;
      h: number;
      r: number;
    }[];
  };
}
