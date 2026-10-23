import { Engine, Bodies, Body, Composite, Events } from 'matter-js';
import {
  MatchState,
  PlayerConfig,
  MatchConfig,
  LivePlayer,
  Particle,
  GameSettings,
  BenchBounds,
  GameStats,
  Obstacle,
  SeriesMatch,
} from './types';
import {
  W,
  H,
  CX,
  CY,
  PL,
  PW,
  HL,
  TIP,
  PC,
  PHY_DATA,
  OBS_DEFS,
  ZG,
  ZC,
  VMAX,
  saveStats,
} from './constants';
import { playSound } from './audio';
import { assetStore } from './assetsManager';

export function createObstacleSprite(o: {
  k: 'eraser' | 'sharpener' | 'glue';
  w: number;
  h: number;
  r: number;
}): { c: HTMLCanvasElement; w: number; h: number } {
  const Qs = 3;
  const pad = 8;
  const w = (o.r ? o.r * 2 : o.w) + pad * 2;
  const h = (o.r ? o.r * 2 : o.h) + pad * 2;
  const c = document.createElement('canvas');
  c.width = Math.round(w * Qs);
  c.height = Math.round(h * Qs);
  const g = c.getContext('2d')!;
  g.scale(Qs, Qs);
  g.translate(w / 2, h / 2);

  const shade = (x: number, y: number, ww: number, hh: number, r: number) => {
    const v = g.createLinearGradient(0, y, 0, y + hh);
    v.addColorStop(0, 'rgba(255,255,255,.38)');
    v.addColorStop(0.45, 'rgba(255,255,255,0)');
    v.addColorStop(1, 'rgba(0,0,0,.38)');
    g.fillStyle = v;
    g.beginPath();
    g.roundRect(x, y, ww, hh, r);
    g.fill();
  };

  if (o.k === 'eraser') {
    const x = -o.w / 2;
    const y = -o.h / 2;
    g.fillStyle = '#efa7b0';
    g.beginPath();
    g.roundRect(x, y, o.w, o.h, 5);
    g.fill();

    g.fillStyle = '#1d4ed8';
    g.fillRect(x + 13, y, o.w - 26, o.h);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillRect(x + 13, y, 1.2, o.h);
    g.fillRect(x + o.w - 14.2, y, 1.2, o.h);

    g.fillStyle = '#fff';
    g.font = '700 9px Georgia,serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('9B', 0, 0.5);
    shade(x, y, o.w, o.h, 5);
  } else if (o.k === 'sharpener') {
    const x = -o.w / 2;
    const y = -o.h / 2;
    const m = g.createLinearGradient(x, y, x + o.w, y + o.h);
    m.addColorStop(0, '#e5e8ec');
    m.addColorStop(0.5, '#a9afb8');
    m.addColorStop(1, '#d3d7dd');
    g.fillStyle = m;
    g.beginPath();
    g.roundRect(x, y, o.w, o.h, 4);
    g.fill();

    g.fillStyle = '#24262b';
    g.beginPath();
    g.arc(x + 11, 0, 5.5, 0, 6.3);
    g.fill();
    g.fillStyle = '#6b7280';
    g.beginPath();
    g.arc(x + 11, 0, 2.6, 0, 6.3);
    g.fill();

    g.fillStyle = '#2c2f35';
    g.fillRect(x + 19, -1, 8, 2);
    g.fillStyle = '#4b5058';
    g.beginPath();
    g.arc(x + o.w - 5, 0, 1.8, 0, 6.3);
    g.fill();
    shade(x, y, o.w, o.h, 4);
  } else {
    // Glue stick
    const r = o.r;
    const rg = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    rg.addColorStop(0, '#a78bfa');
    rg.addColorStop(1, '#5b21b6');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, r, 0, 6.3);
    g.fill();

    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(0, 0, r * 0.55, 0, 6.3);
    g.fill();

    shade(-r, -r, r * 2, r * 2, r);
  }

  return { c, w, h };
}

export class GameEngine {
  engine: Engine;
  series: SeriesMatch | null = null;
  match: MatchState | null = null;
  drag: { x: number; y: number; t: number } | null = null;
  parts: Particle[] = [];
  shake = 0;
  paused = false;
  acc = 0;
  aiTimer: number | null = null;

  inkCanvas: HTMLCanvasElement;
  inkCtx: CanvasRenderingContext2D;

  currentSettings: GameSettings | null = null;
  currentStats: GameStats | null = null;

  onMatchUpdate?: (match: MatchState) => void;
  onSeriesUpdate?: (series: SeriesMatch) => void;
  onToast?: (msg: string) => void;
  onRoundEnd?: (winner: LivePlayer | null, isSeriesDone: boolean, seriesWinner: LivePlayer | null) => void;
  onNetBroadcast?: (match: MatchState, series: SeriesMatch) => void;

  constructor() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });

    this.inkCanvas = document.createElement('canvas');
    this.inkCanvas.width = W * 1.5;
    this.inkCanvas.height = H * 1.5;
    this.inkCtx = this.inkCanvas.getContext('2d')!;
    this.inkCtx.scale(1.5, 1.5);
    this.inkCtx.lineCap = 'round';

    Events.on(this.engine, 'collisionStart', (e) => {
      for (const pr of e.pairs) {
        const v = Math.hypot(
          pr.bodyA.velocity.x - pr.bodyB.velocity.x,
          pr.bodyA.velocity.y - pr.bodyB.velocity.y
        );
        if (v < 1) continue;

        // Collision sound
        if (this.currentSettings) {
          playSound(
            this.currentSettings,
            180 + Math.min(v, 20) * 18,
            0.08,
            'triangle',
            Math.min(0.3, v / 40)
          );
        }

        // Haptic vibration
        if (this.currentSettings?.vib && typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(Math.min(25, Math.round(v * 2)));
          } catch (err) {}
        }

        // Check if active player hit another pen
        if (this.match && this.match.st === 'sim') {
          const cur = this.match.pl[this.match.t];
          if (
            (pr.bodyA === cur?.body || pr.bodyB === cur?.body) &&
            pr.bodyA.label === 'pen' &&
            pr.bodyB.label === 'pen'
          ) {
            cur.ht++;
            this.match.hit = 1;
          }
        }

        if (this.currentSettings && !this.currentSettings.rm) {
          if (v > 8) this.shake = Math.min(8, v / 2.5);
          const c = (pr.collision.supports && pr.collision.supports[0]) || pr.bodyA.position;
          for (let i = 0; i < Math.min(8, v); i++) {
            this.parts.push({
              x: c.x,
              y: c.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              l: 0.5,
              c: '#ffe9c4',
            });
          }
        }
      }
    });
  }

  setEnvironment(settings: GameSettings, stats: GameStats) {
    this.currentSettings = settings;
    this.currentStats = stats;
  }

  inkClear() {
    this.inkCtx.clearRect(0, 0, W, H);
  }

  onB(x: number, y: number): boolean {
    const B: BenchBounds = assetStore.benchBounds;
    const r = B.r;
    const dx = Math.max(B.x + r - x, 0, x - (B.x + B.w - r));
    const dy = Math.max(B.y + r - y, 0, y - (B.y + B.h - r));
    return x >= B.x && x <= B.x + B.w && y >= B.y && y <= B.y + B.h && dx * dx + dy * dy <= r * r;
  }

  makeObstacles(clutterLevel: number): Obstacle[] {
    const B = assetStore.benchBounds;
    const kinds: ('eraser' | 'sharpener' | 'glue')[] =
      clutterLevel === 1 ? ['eraser'] : clutterLevel === 2 ? ['eraser', 'sharpener', 'glue'] : [];
    const out: Obstacle[] = [];

    for (const k of kinds) {
      const D = OBS_DEFS[k];
      let x = 0;
      let y = 0;
      let t = 0;
      do {
        x = CX + (Math.random() - 0.5) * B.w * 0.32;
        y = CY + (Math.random() - 0.5) * 110;
        t++;
      } while (t < 40 && out.some((o) => Math.hypot(o.x - x, o.y - y) < 100));

      const a = Math.random() * Math.PI;
      const sp = createObstacleSprite({
        k,
        w: (D as any).w || 0,
        h: (D as any).h || 0,
        r: (D as any).r || 0,
      });

      const body = (D as any).r
        ? Bodies.circle(x, y, (D as any).r, {
            isStatic: true,
            restitution: 0.6,
            friction: 0,
            label: 'obs',
          })
        : Bodies.rectangle(x, y, (D as any).w, (D as any).h, {
            isStatic: true,
            angle: a,
            chamfer: { radius: 4 },
            restitution: 0.6,
            friction: 0,
            label: 'obs',
          });

      out.push({
        k,
        x,
        y,
        a,
        w: (D as any).w || 0,
        h: (D as any).h || 0,
        r: (D as any).r || 0,
        n: D.n,
        body,
        sp,
      });
    }

    return out;
  }

  startSeries(cfg: MatchConfig, settings: GameSettings, stats: GameStats) {
    this.setEnvironment(settings, stats);
    this.series = {
      cfg,
      scores: cfg.pl.map(() => 0),
      round: 1,
      need: Math.ceil(cfg.series / 2),
      first: Math.floor(Math.random() * cfg.pl.length),
    };
    if (this.onSeriesUpdate) {
      this.onSeriesUpdate(this.series);
    }
    this.startRound();
  }

  startRound() {
    if (!this.series || !this.currentSettings || !this.currentStats) return;
    if (this.aiTimer) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
    Composite.clear(this.engine.world, false);
    if ((Engine as any).clear) (Engine as any).clear(this.engine);

    this.parts = [];
    this.drag = null;
    this.paused = false;
    this.acc = 0;
    this.shake = 0;
    this.inkClear();

    const cfg = this.series.cfg;
    const n = cfg.pl.length;
    const phy = PHY_DATA[this.currentSettings.phy] || PHY_DATA.classic;
    const k = phy.k;
    const m = phy.m;
    const off = Math.random() * 6.28;
    const B = assetStore.benchBounds;

    const obstacles = this.makeObstacles(cfg.clutter);

    const pl: LivePlayer[] = cfg.pl.map((c, i) => {
      const a = off + (Math.PI * 2 * i) / n;
      const x = CX + Math.cos(a) * (B.w * 0.284 + Math.random() * 40);
      const y = CY + Math.sin(a) * (B.h * 0.25 + Math.random() * 30);
      const body = Bodies.rectangle(x, y, PL, PW, {
        label: 'pen',
        chamfer: { radius: 5 },
        density: 0.002,
        frictionAir: k,
        friction: 0.25,
        frictionStatic: 0,
        restitution: 0.55,
        angle: Math.random() * 6.28,
      });

      return {
        i,
        name: c.name,
        ai: +c.ai,
        pen: +c.pen,
        alive: 1,
        fell: 0,
        rank: 0,
        el: 0,
        sh: 0,
        ht: 0,
        body,
        lt: null,
        z: 0,
        vz: 0,
        pt: 0,
        pw: 0,
        rb: 0,
        fl: 0,
        m0: body.collisionFilter.mask,
      };
    });

    Composite.add(this.engine.world, [
      ...obstacles.map((o) => o.body),
      ...pl.map((p) => p.body),
    ]);

    const activeIndex = (this.series.first + this.series.round - 1) % n;
    this.match = {
      id: Math.random(),
      cfg,
      pl,
      obs: obstacles,
      t: activeIndex,
      st: 'aim',
      k,
      m,
      simT: 0,
      sT: 0,
      win: null,
      clk: cfg.clock && !pl[activeIndex].ai ? cfg.clock * 1000 : 0,
      cs: -1,
      hit: 0,
    };

    if (this.onToast) {
      const title =
        cfg.series > 1
          ? `Round ${this.series.round} · ${pl[activeIndex].name} starts`
          : `${pl[activeIndex].name}’s turn`;
      this.onToast(title);
    }

    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.match);
    }
    this.scheduleAiTurn();
  }

  hop(p: LivePlayer, vz: number, spin: number) {
    if (!this.currentSettings || this.currentSettings.hop === 0 || p.z > 0 || p.fell || !p.alive || vz < 1.1)
      return;
    p.vz = Math.min(6, vz);
    p.z = 0.01;
    p.pw = spin * vz * 0.07;
    p.pt = 0;
    p.fl = 0;
  }

  overP(p: LivePlayer): boolean {
    if (!this.match) return false;
    const b = p.body;
    const ca = Math.cos(b.angle) * HL;
    const sa = Math.sin(b.angle) * HL;
    const x = b.position.x;
    const y = b.position.y;

    const segD = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x3: number,
      y3: number,
      x4: number,
      y4: number
    ) => {
      // Distance between 2 line segments
      const d = Math.hypot((x1 + x2) / 2 - (x3 + x4) / 2, (y1 + y2) / 2 - (y3 + y4) / 2);
      return d;
    };

    for (const q of this.match.pl) {
      if (q === p || !q.alive || q.fell || q.z >= ZC) continue;
      const c = Math.cos(q.body.angle) * HL;
      const s = Math.sin(q.body.angle) * HL;
      const qx = q.body.position.x;
      const qy = q.body.position.y;
      if (segD(x - ca, y - sa, x + ca, y + sa, qx - c, qy - s, qx + c, qy + s) < PW * 0.95) {
        return true;
      }
    }

    for (const o of this.match.obs) {
      if (Math.hypot(o.x - x, o.y - y) < (o.r || o.w / 2) + PW) {
        return true;
      }
    }
    return false;
  }

  zStep(u: number) {
    if (!this.match) return;
    for (const p of this.match.pl) {
      if (!p.alive || p.fell) continue;
      const b = p.body;

      if (p.z > 0) {
        p.vz -= ZG * u;
        p.z += p.vz * u;
        p.pt += p.pw * u;

        if (p.z >= ZC) {
          b.collisionFilter.mask = 0;
          p.fl = 1;
        } else if (p.fl && p.vz < 0 && p.z > 0 && !this.overP(p)) {
          b.collisionFilter.mask = p.m0;
          p.fl = 0;
        }

        if (p.z <= 0) {
          const vi = -p.vz;
          p.z = 0;
          if (p.fl && this.overP(p) && p.rb < 3) {
            p.z = 0.01;
            p.vz = 1.1;
            p.rb++;
            continue;
          }
          if (vi > 2.6) {
            p.z = 0.01;
            p.vz = vi * 0.3;
            p.pw *= 0.4;
            Body.setVelocity(b, { x: b.velocity.x * 0.9, y: b.velocity.y * 0.9 });
          } else {
            p.vz = 0;
            p.pt = 0;
            p.pw = 0;
            p.rb = 0;
            p.fl = 0;
            b.collisionFilter.mask = p.m0;
          }

          if (vi > 1.3) {
            Body.setVelocity(b, { x: b.velocity.x * 0.88, y: b.velocity.y * 0.88 });
            if (this.currentSettings) {
              playSound(this.currentSettings, 110 + vi * 25, 0.07, 'triangle', Math.min(0.25, vi / 14));
            }
            if (this.currentSettings && !this.currentSettings.rm) {
              this.shake = Math.max(this.shake, Math.min(4, vi));
              for (let i = 0; i < 6; i++) {
                this.parts.push({
                  x: b.position.x,
                  y: b.position.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  l: 0.5,
                  c: '#e8d3b0',
                });
              }
            }
          }
        }
      } else {
        // Sliding deceleration like real pen on wood
        const vx = b.velocity.x;
        const vy = b.velocity.y;
        const sp = Math.hypot(vx, vy);
        if (sp > 0) {
          const ns = Math.max(0, sp - this.match.m * u);
          if (ns < 0.05) Body.setVelocity(b, { x: 0, y: 0 });
          else Body.setVelocity(b, { x: (vx / sp) * ns, y: (vy / sp) * ns });
        }
        const w = b.angularVelocity;
        if (w) {
          const nw = Math.max(0, Math.abs(w) - this.match.m * 0.018 * u);
          Body.setAngularVelocity(b, Math.abs(nw) < 0.002 ? 0 : Math.sign(w) * nw);
        }
      }
    }
  }

  inkStep() {
    if (!this.match || !this.currentSettings?.ink) return;
    for (const p of this.match.pl) {
      if (!p.alive || p.fell) continue;
      const b = p.body;
      const tx = b.position.x + Math.cos(b.angle) * TIP;
      const ty = b.position.y + Math.sin(b.angle) * TIP;
      const d = assetStore.pens[p.pen] || assetStore.pens[0];

      if (p.lt && b.speed > 1.2 && !p.z) {
        this.inkCtx.globalAlpha = Math.min(0.5, 0.12 + b.speed * 0.02);
        this.inkCtx.strokeStyle = d.ink || d.c || '#2563eb';
        this.inkCtx.lineWidth = 1.3;
        this.inkCtx.beginPath();
        this.inkCtx.moveTo(p.lt[0], p.lt[1]);
        this.inkCtx.lineTo(tx, ty);
        this.inkCtx.stroke();
      }
      p.lt = [tx, ty];
    }
    this.inkCtx.globalAlpha = 1;
  }

  flick(ang: number, pw: number, t = 0) {
    if (!this.match || !this.currentSettings) return;
    const p = this.match.pl[this.match.t];
    const b = p.body;

    if (this.currentSettings.acc) {
      ang += (Math.random() - 0.5) * 0.16 * (0.4 + pw);
    }
    const sp = 3 + (VMAX * this.currentSettings.pw - 3) * Math.pow(pw, 1.3);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const rx = Math.cos(b.angle) * t;
    const ry = Math.sin(b.angle) * t;
    const w = ((rx * dy - ry * dx) * sp * b.mass) / b.inertia * 0.3;

    Body.setVelocity(b, { x: dx * sp, y: dy * sp });
    Body.setAngularVelocity(b, Math.max(-0.35, Math.min(0.35, w)));

    // Z-axis jump on off-center hard flicks
    if (this.currentSettings.hop !== 0 && pw > 0.7) {
      const e = Math.min(1, Math.abs(t) / (PL / 2));
      if (Math.random() < 0.25 + 0.5 * e) {
        this.hop(p, (pw - 0.65) * 5.5 * (0.5 + 0.5 * e) * (0.5 + Math.random() * 0.6), t < 0 ? -1 : 1);
      }
    }

    p.sh++;
    this.match.hit = 0;
    p.lt = null;
    this.match.st = 'sim';
    this.match.simT = 0;
    this.match.sT = 0;
    this.acc = 0;
    this.drag = null;

    playSound(this.currentSettings, 260 + pw * 300, 0.12, 'square', 0.12, 90);
    if (this.currentSettings.vib && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch (err) {}
    }

    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.match);
    }
    if (this.onNetBroadcast && this.series) {
      this.onNetBroadcast(this.match, this.series);
    }
  }

  simCheck(dt: number) {
    if (!this.match || this.match.st !== 'sim') return;
    this.match.simT += dt;
    let mv = 0;
    const now = performance.now();
    const B = assetStore.benchBounds;

    for (const p of this.match.pl) {
      if (!p.alive || p.fell) continue;
      const b = p.body;
      const q = b.position;

      if (!this.onB(q.x, q.y)) {
        p.fell = 1;
        p.ft = now;
        const dx = q.x - (B.x + B.w / 2);
        const dy = q.y - (B.y + B.h / 2);
        const len = Math.hypot(dx, dy) || 1;
        p.fdX = dx / len;
        p.fdY = dy / len;
        b.collisionFilter.mask = 0;

        if (this.currentSettings) {
          playSound(this.currentSettings, 520, 0.5, 'triangle', 0.18, 110);
        }
        if (this.currentSettings?.vib && typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([40, 30, 40]);
          } catch (err) {}
        }
      } else if (p.z > 0 || b.speed > 0.12 || Math.abs(b.angularSpeed) > 0.004) {
        mv = 1;
      }
    }

    this.match.sT = mv ? 0 : this.match.sT + dt;
    if (this.match.sT > 350 || this.match.simT > 15000) {
      this.resolveTurn();
    }
  }

  resolveTurn() {
    if (!this.match) return;
    for (const p of this.match.pl) {
      if (p.alive) {
        Body.setVelocity(p.body, { x: 0, y: 0 });
        Body.setAngularVelocity(p.body, 0);
        if (!p.fell) {
          p.z = 0;
          p.vz = 0;
          p.pt = 0;
          p.pw = 0;
          p.fl = 0;
          p.body.collisionFilter.mask = p.m0;
        }
      }
    }

    const cur = this.match.pl[this.match.t];
    const out = this.match.pl.filter((p) => p.alive && p.fell);
    const left = this.match.pl.filter((p) => p.alive && !p.fell);

    out.forEach((p) => {
      p.alive = 0;
      p.rank = left.length + 1;
      if (p !== cur) cur.el++;
      Composite.remove(this.engine.world, p.body);
    });

    if (out.length && this.onToast) {
      this.onToast(out.map((p) => p.name).join(' & ') + ' eliminated');
    }

    if (left.length <= 1) {
      return this.endRound(left[0] || null);
    }

    do {
      this.match.t = (this.match.t + 1) % this.match.pl.length;
    } while (!this.match.pl[this.match.t].alive);

    this.match.st = 'aim';
    this.match.clk =
      this.match.cfg.clock && !this.match.pl[this.match.t].ai
        ? this.match.cfg.clock * 1000
        : 0;

    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.match);
    }
    this.scheduleAiTurn();
    if (this.onNetBroadcast && this.series) {
      this.onNetBroadcast(this.match, this.series);
    }
  }

  timeUp() {
    if (!this.match || this.match.st !== 'aim') return;
    const p = this.match.pl[this.match.t];
    this.drag = null;
    this.match.clk = 0;
    if (this.onToast) {
      this.onToast(p.name + ' ran out of time');
    }
    if (this.currentSettings) {
      playSound(this.currentSettings, 150, 0.35, 'sawtooth', 0.15, 70);
    }
    do {
      this.match.t = (this.match.t + 1) % this.match.pl.length;
    } while (!this.match.pl[this.match.t].alive);
    this.match.clk =
      this.match.cfg.clock && !this.match.pl[this.match.t].ai
        ? this.match.cfg.clock * 1000
        : 0;
    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.match);
    }
    this.scheduleAiTurn();
  }

  endRound(w: LivePlayer | null) {
    if (!this.match || !this.series) return;
    this.match.st = 'over';
    this.match.win = w;
    if (w) {
      w.rank = 1;
      this.series.scores[w.i]++;
    }

    const ser = this.series.cfg.series > 1;
    const fin = this.series.scores.findIndex((s) => s >= this.series!.need);
    const done = !ser || fin >= 0;
    const sw = fin >= 0 ? this.match.pl[fin] : null;
    const p0 = this.match.pl[0];
    const st = this.currentStats;

    if (st) {
      st.rec.unshift((ser ? `R${this.series.round} · ` : '') + (w ? w.name + ' won' : 'Draw') + ' · ' + this.match.pl.length + ' players');
      if (done && ser && sw) {
        st.rec.unshift(`Series ${this.series.scores.join('–')} · ${sw.name} won`);
      }
      st.rec.length = Math.min(6, st.rec.length);

      if (!p0.ai) {
        st.p++;
        st.rs += p0.rank || 1;
        st.e += p0.el;
        st.sh += p0.sh;
        st.ht += p0.ht;
        st.pens[p0.pen] = (st.pens[p0.pen] || 0) + 1;
        if (w === p0) {
          st.w++;
          st.st++;
          st.bs = Math.max(st.bs, st.st);
        } else {
          st.st = 0;
        }
        if (done && ser) {
          st.sp++;
          if (sw === p0) st.sw++;
        }
      }
      saveStats(st);
    }

    if (w && this.currentSettings && !this.currentSettings.rm) {
      for (let i = 0; i < 140; i++) {
        this.parts.push({
          x: CX,
          y: CY - 100,
          vx: (Math.random() - 0.5) * 14,
          vy: -Math.random() * 12,
          l: 3,
          c: PC[i % 6],
          g: 1,
        });
      }
    }

    if (this.currentSettings) {
      playSound(this.currentSettings, 520, 0.5, 'sine', 0.2, 880);
    }

    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.match);
    }
    if (this.onSeriesUpdate) {
      this.onSeriesUpdate(this.series);
    }
    if (this.onRoundEnd) {
      this.onRoundEnd(w, done, sw);
    }
    if (this.onNetBroadcast && this.series) {
      this.onNetBroadcast(this.match, this.series);
    }
  }

  scheduleAiTurn() {
    if (this.aiTimer) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
    if (!this.match || this.paused || this.match.st !== 'aim' || !this.match.pl[this.match.t].ai) return;

    const id = this.match.id;
    const delay = this.currentSettings?.rm ? 250 : 900;
    this.aiTimer = window.setTimeout(() => this.aiPlay(id), delay);
  }

  aiPlay(id: number) {
    if (!this.match || this.match.id !== id || this.paused || this.match.st !== 'aim') return;
    const p = this.match.pl[this.match.t];
    if (!p.ai || !this.currentSettings) return;

    const me = p.body.position;
    const lv = p.ai;
    const foes = this.match.pl.filter((q) => q !== p && q.alive);
    if (!foes.length) return;

    const vm = VMAX * this.currentSettings.pw;
    const B = assetStore.benchBounds;
    const edge = (x: number, y: number) => Math.min(x - B.x, B.x + B.w - x, y - B.y, B.y + B.h - y);
    const gs = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    let best: { sc: number; vd: number; ang: number; q: LivePlayer } | null = null;
    for (const q of foes) {
      const t = q.body.position;
      const dx = t.x - me.x;
      const dy = t.y - me.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;

      let ox = t.x - CX;
      let oy = t.y - CY;
      const ol = Math.hypot(ox, oy) || 1;
      ox /= ol;
      oy /= ol;

      const vd = Math.min(vm, Math.max(4, d * this.match.k * 1.2 + 3 + (lv > 2 ? 4 : 1)));
      const ov = Math.max(0, vd / this.match.k - d) * 0.25;
      const ex = me.x + ux * (d + ov);
      const ey = me.y + uy * (d + ov);

      const sc =
        (1 - Math.min(edge(t.x, t.y), 300) / 300) * 1.5 +
        (ux * ox + uy * oy) * 0.8 -
        d / 1500 -
        (this.onB(ex, ey) ? 0 : 3);

      if (!best || sc > best.sc) {
        best = { sc, vd, ang: Math.atan2(dy, dx), q };
      }
    }

    const pwOf = (v: number) =>
      Math.min(1, Math.max(0.1, Math.pow(Math.max(0, (v - 3) / (vm - 3)), 1 / 1.3)));
    let ang = 0;
    let pw = 0.5;

    if (lv === 1) {
      const q = foes[Math.floor(Math.random() * foes.length)];
      const t = q.body.position;
      ang = Math.atan2(t.y - me.y, t.x - me.x) + gs() * 0.3;
      pw = 0.35 + Math.random() * 0.4;
    } else if (lv === 2 && (edge(me.x, me.y) < 70 || Math.random() < 0.15)) {
      ang = Math.atan2(CY - me.y, CX - me.x) + gs() * 0.2;
      pw = 0.25 + Math.random() * 0.15;
    } else if (best) {
      ang = best.ang + gs() * (lv === 2 ? 0.12 : 0.03);
      pw = pwOf(best.vd);
    }

    this.flick(ang, pw);
  }

  pause() {
    if (!this.match || this.match.st === 'over') return;
    this.paused = true;
    if (this.aiTimer) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  resume() {
    this.paused = false;
    this.scheduleAiTurn();
  }

  stop() {
    if (this.aiTimer) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
    this.match = null;
    this.series = null;
    this.paused = false;
    this.drag = null;
    this.parts = [];
    this.inkClear();
    Composite.clear(this.engine.world, false);
  }
}
