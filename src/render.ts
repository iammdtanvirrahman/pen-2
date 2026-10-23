import { W, H, CX, CY, PL, PW, PS, MAXD, PC } from './constants';
import { MatchState, Particle, GameSettings, BenchBounds } from './types';
import { assetStore, spriteFor } from './assetsManager';

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function createProceduralWoodBench(B: BenchBounds): HTMLCanvasElement {
  const o = document.createElement('canvas');
  o.width = W;
  o.height = H;
  const g = o.getContext('2d')!;
  let s = 7;
  const R = () => (s = (s * 16807) % 2147483647) / 2147483647;

  // Background floor
  const bg = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 620);
  bg.addColorStop(0, '#1d1b1a');
  bg.addColorStop(1, '#050505');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Bench 3D bevel / thickness
  const th = g.createLinearGradient(0, B.y, 0, B.y + B.h + 16);
  th.addColorStop(0, '#6b4220');
  th.addColorStop(1, '#3a210e');
  g.fillStyle = th;
  rr(g, B.x, B.y + 16, B.w, B.h, B.r);
  g.fill();

  // Bench shadow
  g.save();
  g.shadowColor = 'rgba(0,0,0,.85)';
  g.shadowBlur = 30;
  g.shadowOffsetY = 12;
  rr(g, B.x, B.y, B.w, B.h, B.r);
  g.fillStyle = '#b57c44';
  g.fill();
  g.restore();

  // Bench surface
  g.save();
  rr(g, B.x, B.y, B.w, B.h, B.r);
  g.clip();

  const gr = g.createLinearGradient(0, B.y, 0, B.y + B.h);
  gr.addColorStop(0, '#cb935a');
  gr.addColorStop(0.5, '#b67d45');
  gr.addColorStop(1, '#a46c3a');
  g.fillStyle = gr;
  g.fillRect(B.x, B.y, B.w, B.h);

  // Wood grain wavy lines
  for (let i = 0; i < 150; i++) {
    const y = B.y + R() * B.h;
    const a = R() * 6 + 1;
    const ph = R() * 6;
    g.strokeStyle = R() < 0.5 ? `rgba(70,40,15,${0.05 + R() * 0.09})` : `rgba(235,190,130,${0.05 + R() * 0.08})`;
    g.lineWidth = 0.6 + R() * 1.6;
    g.beginPath();
    for (let x = B.x; x <= B.x + B.w; x += 20) {
      g.lineTo(x, y + Math.sin(x / 90 + ph) * a);
    }
    g.stroke();
  }

  // Scratches
  for (let i = 0; i < 20; i++) {
    const x = B.x + R() * B.w;
    const y = B.y + R() * B.h;
    const a = R() * 6.28;
    const l = 10 + R() * 40;
    g.strokeStyle = 'rgba(240,205,155,.35)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.restore();

  // Bevel edges
  rr(g, B.x + 3, B.y + 3, B.w - 6, B.h - 6, B.r - 2);
  g.strokeStyle = 'rgba(255,232,195,.55)';
  g.lineWidth = 3;
  g.stroke();

  rr(g, B.x, B.y, B.w, B.h, B.r);
  g.strokeStyle = 'rgba(55,28,8,.95)';
  g.lineWidth = 3;
  g.stroke();

  // Planks and metal bolts
  g.save();
  rr(g, B.x + 5, B.y + 5, B.w - 10, B.h - 10, B.r - 4);
  g.clip();

  for (let k = 1; k < 4; k++) {
    const y = B.y + (B.h * k) / 4;
    g.fillStyle = 'rgba(40,20,5,.55)';
    g.fillRect(B.x, y - 1, B.w, 2.2);
    g.fillStyle = 'rgba(255,225,180,.28)';
    g.fillRect(B.x, y + 1.2, B.w, 1.2);
    for (const x of [B.x + 34, B.x + B.w - 34]) {
      g.fillStyle = '#8d9199';
      g.beginPath();
      g.arc(x, y, 5, 0, 6.3);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.5)';
      g.lineWidth = 1;
      g.stroke();
      g.beginPath();
      g.moveTo(x - 3, y - 1);
      g.lineTo(x + 3, y + 1);
      g.stroke();
    }
  }

  // Wood knots
  for (let i = 0; i < 5; i++) {
    const x = B.x + 60 + R() * (B.w - 120);
    const y = B.y + 30 + R() * (B.h - 60);
    const r = 8 + R() * 9;
    const kg = g.createRadialGradient(x, y, 1, x, y, r);
    kg.addColorStop(0, 'rgba(60,30,8,.7)');
    kg.addColorStop(1, 'rgba(60,30,8,0)');
    g.fillStyle = kg;
    g.beginPath();
    g.ellipse(x, y, r * 1.6, r, 0, 0, 6.3);
    g.fill();
    g.strokeStyle = 'rgba(60,30,8,.35)';
    g.lineWidth = 0.8;
    for (let j = 1; j < 4; j++) {
      g.beginPath();
      g.ellipse(x, y, r * (1 + j * 0.5) * 1.6, r * (1 + j * 0.5), 0, 0, 6.3);
      g.stroke();
    }
  }

  // Ink stains
  for (const [c, x, y] of [
    ['rgba(30,60,160,.28)', 150, 130],
    ['rgba(20,20,20,.25)', 700, 420],
    ['rgba(160,30,40,.2)', 420, 500],
  ] as [string, number, number][]) {
    const q = g.createRadialGradient(x, y, 1, x, y, 26);
    q.addColorStop(0, c);
    q.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = q;
    g.beginPath();
    g.arc(x, y, 26, 0, 6.3);
    g.fill();
  }

  // Doodles: Tic-Tac-Toe
  g.strokeStyle = 'rgba(70,35,10,.55)';
  g.lineWidth = 1.6;
  g.beginPath();
  [815, 845].forEach((x) => {
    g.moveTo(x, 68);
    g.lineTo(x, 132);
  });
  [89, 111].forEach((y) => {
    g.moveTo(793, y);
    g.lineTo(867, y);
  });
  g.stroke();
  g.font = '700 20px Georgia,serif';
  g.fillStyle = 'rgba(70,35,10,.6)';
  g.fillText('X', 798, 84);
  g.fillText('O', 824, 106);
  g.fillText('X', 852, 128);

  // Doodles: "Class 9B ♥"
  g.save();
  g.translate(100, 520);
  g.rotate(-0.04);
  g.font = 'italic 700 20px Georgia,serif';
  g.fillStyle = 'rgba(255,235,200,.28)';
  g.fillText('Class 9B ♥', 1, 1);
  g.fillStyle = 'rgba(60,30,8,.6)';
  g.fillText('Class 9B ♥', 0, 0);
  g.restore();

  // Doodles: "Roll 17"
  g.save();
  g.strokeStyle = 'rgba(30,64,175,.55)';
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI * 4) / 5 - 1.57;
    g.lineTo(300 + Math.cos(a) * 14, 520 + Math.sin(a) * 14);
  }
  g.stroke();
  g.font = 'italic 15px "Segoe Script","Comic Sans MS",cursive';
  g.fillStyle = 'rgba(30,64,175,.5)';
  g.fillText('Roll 17', 326, 526);
  g.restore();

  // Ruler tick marks
  for (let i = 0; i < 60; i++) {
    g.fillStyle = 'rgba(50,25,8,.45)';
    g.fillRect(B.x + 80 + i * 10, B.y + 7, 1, i % 5 ? 4 : 8);
  }

  // Soft gloss
  const gl = g.createLinearGradient(B.x, B.y, B.x + B.w * 0.7, B.y + B.h);
  gl.addColorStop(0, 'rgba(255,245,225,.22)');
  gl.addColorStop(0.45, 'rgba(255,245,225,0)');
  gl.addColorStop(1, 'rgba(0,0,0,.12)');
  g.fillStyle = gl;
  g.fillRect(B.x, B.y, B.w, B.h);

  // Vignette
  const vg = g.createRadialGradient(CX, CY, 200, CX, CY, 560);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.38)');
  g.fillStyle = vg;
  g.fillRect(B.x, B.y, B.w, B.h);

  g.restore();
  return o;
}

export function drawPenItem(
  g: CanvasRenderingContext2D,
  playerIndex: number,
  penIndex: number,
  x: number,
  y: number,
  a: number,
  s: number,
  al: number,
  sh = 5,
  pt = 0,
  scaleFactor = 1
) {
  const sp = spriteFor(playerIndex, penIndex);
  const k = (sh || 5) / 5;
  g.save();
  g.globalAlpha = al;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.translate(x, y);
  g.rotate(a);

  // Scale with PS multiplier and pitch tilt from Z-hop
  const sx = s * PS * (pt ? Math.max(0.45, Math.abs(Math.cos(pt))) : 1);
  const sy = s * PS;
  g.scale(sx, sy);

  // Shadow
  g.shadowColor = 'rgba(0,0,0,.42)';
  g.shadowBlur = 7 * scaleFactor * k;
  g.shadowOffsetX = 3 * scaleFactor * k;
  g.shadowOffsetY = 5 * scaleFactor * k;
  g.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  g.restore();
}

export function renderScene(
  cx: CanvasRenderingContext2D,
  cv: HTMLCanvasElement,
  match: MatchState | null,
  drag: { x: number; y: number; t: number } | null,
  parts: Particle[],
  shake: number,
  settings: GameSettings,
  scx: number,
  scy: number,
  sc: number,
  timeMs: number,
  woodCanvas: HTMLCanvasElement,
  inkCanvas: HTMLCanvasElement,
  onPowerChange?: (pw: number) => void
) {
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, cv.width, cv.height);

  const sx = shake && !settings.rm ? (Math.random() - 0.5) * shake : 0;
  const sy = shake && !settings.rm ? (Math.random() - 0.5) * shake : 0;

  cx.setTransform(scx, 0, 0, scy, sx * scx, sy * scy);

  // 1. Draw bench
  const benchImg = assetStore.benchImg || assetStore.procBench || woodCanvas;
  if (benchImg) {
    const iw = benchImg instanceof HTMLImageElement ? benchImg.naturalWidth || benchImg.width || W : benchImg.width;
    const ih = benchImg instanceof HTMLImageElement ? benchImg.naturalHeight || benchImg.height || H : benchImg.height;
    const fit = Math.min(W / iw, H / ih);
    const dw = iw * fit;
    const dh = ih * fit;
    cx.drawImage(benchImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  // 2. Draw ink layer
  if (settings.ink) {
    cx.globalCompositeOperation = 'multiply';
    cx.drawImage(inkCanvas, 0, 0, W, H);
    cx.globalCompositeOperation = 'source-over';
  }

  if (!match) {
    if (onPowerChange) onPowerChange(0);
    return;
  }

  const now = performance.now();
  const cur = match.pl[match.t];

  // 3. Draw obstacles
  if (match.obs) {
    for (const o of match.obs) {
      cx.save();
      cx.translate(o.x, o.y);
      cx.rotate(o.a);
      cx.shadowColor = 'rgba(0,0,0,.45)';
      cx.shadowBlur = 8 * sc;
      cx.shadowOffsetX = 3 * sc;
      cx.shadowOffsetY = 5 * sc;
      cx.drawImage(o.sp.c, -o.sp.w / 2, -o.sp.h / 2, o.sp.w, o.sp.h);
      cx.restore();
    }
  }

  // 4. Active player pulsating indicator
  if (match.st === 'aim' && cur && cur.alive) {
    const b = cur.body.position;
    const r0 = settings.rm ? PL * 0.42 : PL * 0.42 + 3 * Math.sin(timeMs / 200);
    const ga = cx.createRadialGradient(b.x, b.y, 8, b.x, b.y, r0 + 14);
    const col = PC[cur.i % PC.length];
    ga.addColorStop(0, col + '55');
    ga.addColorStop(1, col + '00');
    cx.fillStyle = ga;
    cx.beginPath();
    cx.arc(b.x, b.y, r0 + 14, 0, 6.283);
    cx.fill();

    cx.strokeStyle = col;
    cx.lineWidth = 2.5;
    cx.globalAlpha = 0.85;
    cx.beginPath();
    cx.arc(b.x, b.y, r0, 0, 6.283);
    cx.stroke();
    cx.globalAlpha = 1;
  }

  // 5. Render pens with Z-hop elevation
  for (const p of match.pl) {
    const b = p.body;
    if (!p.fell) {
      if (p.alive) {
        // Motion blur trails
        if (!settings.rm && b.speed > 4) {
          for (const m of [4, 2]) {
            drawPenItem(
              cx,
              p.i,
              p.pen,
              b.position.x - b.velocity.x * m,
              b.position.y - b.velocity.y * m,
              b.angle,
              1,
              0.1,
              5,
              0,
              sc
            );
          }
        }
        drawPenItem(
          cx,
          p.i,
          p.pen,
          b.position.x,
          b.position.y,
          b.angle,
          1 + p.z * 0.011,
          1,
          p.z ? 5 + p.z * 0.5 : 5,
          p.pt,
          sc
        );
      }
    } else {
      // Pen is falling off bench
      const ft = p.ft || now;
      const q = Math.max(0, Math.min(1, (now - ft) / 700));
      const dx = p.fdX || 0;
      const dy = p.fdY || 1;
      const side = Math.abs(dx) > 0.65;
      const fx = b.position.x + dx * q * (side ? 92 : 48);
      const fy = b.position.y + dy * q * (side ? 48 : 78) + q * q * 42;
      const rot = b.angle + (settings.rm ? 0 : q * (side ? 4.2 : 3.2));
      const scale = settings.rm ? 1 : 1 - 0.35 * q;
      const alpha = 1 - q;
      drawPenItem(cx, p.i, p.pen, fx, fy, rot, scale, alpha, 5 + q * 14, 0, sc);
    }
  }

  // 6. Drag & slingshot aim arrow
  let pwv = 0;
  if (drag && match.st === 'aim' && cur) {
    const bPos = cur.body.position;
    const ang = cur.body.angle;
    const cpX = bPos.x + Math.cos(ang) * drag.t;
    const cpY = bPos.y + Math.sin(ang) * drag.t;

    const vx = cpX - drag.x;
    const vy = cpY - drag.y;
    const l = Math.hypot(vx, vy);

    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(cpX, cpY, 4, 0, 6.3);
    cx.fill();

    if (l >= 18) {
      const pw = Math.min(l, MAXD) / MAXD;
      const a = Math.atan2(vy, vx);
      const len = 40 + pw * 140;
      const col = `hsl(${120 - 120 * pw},85%,55%)`;
      pwv = pw;

      cx.setLineDash([]);
      cx.strokeStyle = col;
      cx.fillStyle = col;
      cx.lineWidth = 5;
      cx.beginPath();
      cx.moveTo(cpX, cpY);
      cx.lineTo(cpX + Math.cos(a) * len, cpY + Math.sin(a) * len);
      cx.stroke();

      const ex = cpX + Math.cos(a) * len;
      const ey = cpY + Math.sin(a) * len;
      cx.beginPath();
      cx.moveTo(ex + Math.cos(a) * 14, ey + Math.sin(a) * 14);
      cx.lineTo(ex + Math.cos(a + 2.5) * 12, ey + Math.sin(a + 2.5) * 12);
      cx.lineTo(ex + Math.cos(a - 2.5) * 12, ey + Math.sin(a - 2.5) * 12);
      cx.fill();

      // Aim assist guide line
      if (settings.asst) {
        cx.setLineDash([4, 6]);
        cx.strokeStyle = 'rgba(255,255,255,0.3)';
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.moveTo(ex, ey);
        cx.lineTo(ex + Math.cos(a) * 150, ey + Math.sin(a) * 150);
        cx.stroke();
        cx.setLineDash([]);
      }
    }
  }

  if (onPowerChange) onPowerChange(pwv);

  // 7. Particles
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.x += (q.vx * 16) / 16;
    q.y += (q.vy * 16) / 16;
    if (q.g) q.vy += (0.25 * 16) / 16;
    q.l -= 16 / (q.g ? 1500 : 400);
    if (q.l <= 0) {
      parts.splice(i, 1);
      continue;
    }
    cx.globalAlpha = Math.min(1, q.l * 2);
    cx.fillStyle = q.c;
    if (q.g) {
      cx.fillRect(q.x, q.y, 7, 4);
    } else {
      cx.beginPath();
      cx.arc(q.x, q.y, 2.5 * q.l + 1, 0, 6.3);
      cx.fill();
    }
  }
  cx.globalAlpha = 1;
}
