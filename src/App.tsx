import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Engine, Body, Composite, Bodies } from 'matter-js';
import { GameSettings, GameStats, MatchState, MatchConfig, SeriesMatch, NetStatePacket } from './types';
import {
  W,
  H,
  PL,
  DEFAULT_B,
  loadSettings,
  saveSettings,
  loadStats,
  saveStats,
  OBS_DEFS,
} from './constants';
import { GameEngine, createObstacleSprite } from './engine';
import { assetStore } from './assetsManager';
import { createProceduralWoodBench, renderScene } from './render';
import { threeManager } from './three/ThreeManager';
import { multiplayerManager, NetState } from './multiplayer';
import { Hud } from './components/Hud';
import { MainMenu } from './components/MainMenu';
import { MatchSetup } from './components/MatchSetup';
import { OnlineModal } from './components/OnlineModal';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { WinModal } from './components/WinModal';
import { Toast } from './components/Toast';

type ModalScreen = 'menu' | 'setup' | 'online' | 'rules' | 'settings' | 'pause' | 'win' | null;

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const threeContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const woodBenchRef = useRef<HTMLCanvasElement | null>(null);

  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [currentMatch, setCurrentMatch] = useState<MatchState | null>(null);
  const [currentSeries, setCurrentSeries] = useState<SeriesMatch | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [activeScreen, setActiveScreen] = useState<ModalScreen>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('room')) {
      return 'online';
    }
    return 'menu';
  });
  const [isPractice, setIsPractice] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [flickPower, setFlickPower] = useState<number>(0);
  const [netState, setNetState] = useState<NetState>(multiplayerManager.state);

  const toastTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const scaleRef = useRef<{ scx: number; scy: number; sc: number }>({ scx: 1, scy: 1, sc: 1 });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 1600);
  }, []);

  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }

  // Generate procedural wood bench on load and init 3D Three.js
  useEffect(() => {
    const wood = createProceduralWoodBench(DEFAULT_B);
    woodBenchRef.current = wood;
    assetStore.loadRemoteDirectoryAssets().catch(() => {});

    if (threeContainerRef.current && engineRef.current) {
      threeManager.init(threeContainerRef.current, wood, engineRef.current.inkCanvas);
    }

    return () => {
      threeManager.dispose();
    };
  }, []);

  // Update engine environment when settings/stats change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setEnvironment(settings, stats);
      saveSettings(settings);
      document.body.classList.toggle('rm', !!settings.rm);
    }
  }, [settings, stats]);

  // Hook engine callbacks
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    eng.onMatchUpdate = (m) => {
      setCurrentMatch({ ...m });
    };

    eng.onSeriesUpdate = (s) => {
      setCurrentSeries({ ...s });
    };

    eng.onToast = (msg) => {
      showToast(msg);
    };

    eng.onRoundEnd = (w, isDone, sw) => {
      setStats({ ...loadStats() });
      window.setTimeout(() => {
        setActiveScreen('win');
      }, settings.rm ? 200 : 1300);
    };

    eng.onNetBroadcast = (m, s) => {
      multiplayerManager.broadcastMatchState(m, s);
    };
  }, [showToast, settings.rm]);

  // Hook multiplayer callbacks
  useEffect(() => {
    multiplayerManager.onStateChange = (state) => {
      setNetState(state);
    };

    multiplayerManager.onToast = (msg) => {
      showToast(msg);
    };

    multiplayerManager.onStartMatchByHost = (cfg) => {
      engineRef.current?.startSeries(cfg, settings, stats);
      setActiveScreen(null);

      if (multiplayerManager.syncInterval) {
        clearInterval(multiplayerManager.syncInterval);
      }
      multiplayerManager.syncInterval = window.setInterval(() => {
        if (engineRef.current?.match && engineRef.current.series) {
          multiplayerManager.broadcastMatchState(engineRef.current.match, engineRef.current.series);
        }
      }, 50);
    };

    multiplayerManager.onGuestFlickReceived = (ang, pw, t) => {
      if (engineRef.current?.match && engineRef.current.match.st === 'aim') {
        engineRef.current.flick(ang, pw, t);
      }
    };

    multiplayerManager.onRoundActionReceived = (action) => {
      if (action === 'next') {
        if (engineRef.current?.series) {
          engineRef.current.series.round++;
          engineRef.current.startRound();
          setActiveScreen(null);
        }
      } else if (action === 'rst') {
        if (engineRef.current?.series) {
          engineRef.current.startSeries(engineRef.current.series.cfg, settings, stats);
          setActiveScreen(null);
        }
      }
    };

    multiplayerManager.onIncomingState = (packet: NetStatePacket) => {
      const eng = engineRef.current;
      if (!eng || multiplayerManager.state.role !== 'guest') return;

      const B = assetStore.benchBounds;
      const s = packet;

      if (!eng.match || eng.match.id !== s.game.id) {
        eng.series = {
          cfg: s.cfg,
          scores: [...s.match.scores],
          round: s.match.round,
          need: s.match.need,
          first: s.match.first,
        };
        setCurrentSeries({ ...eng.series });
        eng.startRound();
        eng.match!.id = s.game.id;
        setActiveScreen(null);
      }

      if (eng.series) {
        eng.series.scores = [...s.match.scores];
        eng.series.round = s.match.round;
        setCurrentSeries({ ...eng.series });
      }

      if (eng.match) {
        // Apply the host's authoritative player identity and pen choices on every snapshot.
        for (const pd of s.game.pl) {
          const player = eng.match.pl[pd.i];
          if (player) {
            player.name = String(pd.name || player.name).slice(0, 14);
            const cfgPlayer = s.cfg.pl[pd.i];
            if (cfgPlayer) {
              player.pen = Number.isInteger(cfgPlayer.pen) ? cfgPlayer.pen : player.pen;
              player.ai = 0;
            }
          }
        }
        eng.match.t = s.game.t;
        eng.match.st = s.game.st;
        eng.match.simT = s.game.simT;
        eng.match.sT = s.game.sT;
        eng.match.clk = s.game.clk;
        eng.match.hit = s.game.hit;
        eng.match.win = s.game.win != null ? eng.match.pl[s.game.win] || null : null;

        for (const pd of s.game.pl) {
          const p = eng.match.pl[pd.i];
          if (!p) continue;
          p.alive = pd.alive ? 1 : 0;
          p.fell = pd.fell ? 1 : 0;
          p.rank = pd.rank;
          p.el = pd.el;
          p.sh = pd.sh;
          p.ht = pd.ht;
          p.z = pd.z;
          p.vz = pd.vz;
          p.pt = pd.pt;
          p.pw = pd.pw;
          p.rb = pd.rb;
          p.fl = pd.fl;

          Body.setPosition(p.body, {
            x: B.x + pd.x * B.w,
            y: B.y + pd.y * B.h,
          });
          Body.setAngle(p.body, pd.angle);
          Body.setVelocity(p.body, {
            x: pd.vx * B.w,
            y: pd.vy * B.h,
          });
          Body.setAngularVelocity(p.body, pd.av);
          p.body.collisionFilter.mask = pd.mask;

          const inWorld = Composite.allBodies(eng.engine.world).includes(p.body);
          if (p.alive && !inWorld) Composite.add(eng.engine.world, p.body);
          else if (!p.alive && inWorld) Composite.remove(eng.engine.world, p.body);
        }

        if (s.game.obs && s.game.obs.length !== eng.match.obs.length) {
          eng.match.obs = s.game.obs.map((o) => {
            const D = OBS_DEFS[o.k] as any;
            const q = {
              k: o.k,
              x: B.x + o.x * B.w,
              y: B.y + o.y * B.h,
              a: o.a,
              w: D.w || 0,
              h: D.h || 0,
              r: D.r || 0,
              n: D.n,
            };
            const body = q.r
              ? Bodies.circle(q.x, q.y, q.r, { isStatic: true, restitution: 0.6, friction: 0, label: 'obs' })
              : Bodies.rectangle(q.x, q.y, q.w, q.h, { isStatic: true, angle: q.a, restitution: 0.6, friction: 0, label: 'obs' });
            const sp = createObstacleSprite(q);
            return { ...q, body, sp };
          });
        }

        setCurrentMatch({ ...eng.match });

        if (eng.match.st === 'over') {
          setActiveScreen('win');
        }
      }
    };

    multiplayerManager.onOpponentDisconnected = (msg) => {
      showToast(msg);
      setActiveScreen('menu');
    };
  }, [showToast, settings, stats]);

  // Resize canvas and 3D viewport handler
  const handleResize = useCallback(() => {
    const cv = canvasRef.current;
    const stage = stageRef.current;
    if (!stage) return;

    threeManager.resize();

    if (!cv) return;
    const r = stage.getBoundingClientRect();
    const isLand = window.matchMedia('(max-width:900px) and (orientation:landscape)').matches;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const sx = isLand ? r.width / W : Math.min(r.width / W, r.height / H);
    const sy = isLand ? r.height / H : sx;

    cv.style.width = `${Math.max(1, W * sx)}px`;
    cv.style.height = `${Math.max(1, H * sy)}px`;
    cv.width = Math.round(W * sx * d);
    cv.height = Math.round(H * sy * d);

    scaleRef.current = {
      scx: cv.width / W,
      scy: cv.height / H,
      sc: sx * d,
    };
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Mobile orientation helper
  const requestGameLandscape = () => {
    if (!/Android|Mobile/i.test(navigator.userAgent)) return;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
    try {
      const scr = screen as any;
      if (scr.orientation && scr.orientation.lock) {
        scr.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {}
  };

  // Keyboard navigation & tab visibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && engineRef.current?.match && engineRef.current.match.st !== 'over') {
        if (multiplayerManager.state.role === 'guest') {
          showToast('Only host can pause this match');
          return;
        }
        if (engineRef.current.paused) {
          engineRef.current.resume();
          setActiveScreen(null);
        } else {
          engineRef.current.pause();
          setActiveScreen('pause');
        }
      }
    };

    const onVisibilityChange = () => {
      if (
        document.hidden &&
        engineRef.current?.match &&
        engineRef.current.match.st !== 'over' &&
        !engineRef.current.paused &&
        !multiplayerManager.state.role
      ) {
        engineRef.current.pause();
        setActiveScreen('pause');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [showToast]);

  // Main rendering & physics animation loop
  useEffect(() => {
    let animId: number;

    const loop = (t: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min(50, t - lastTimeRef.current || 16);
      lastTimeRef.current = t;

      const eng = engineRef.current;
      if (!eng) return;

      // Update turn shot clock if human turn
      if (
        eng.match &&
        eng.match.st === 'aim' &&
        eng.match.clk > 0 &&
        !eng.paused &&
        !eng.match.pl[eng.match.t].ai
      ) {
        eng.match.clk = Math.max(0, eng.match.clk - dt);
        if (eng.match.clk <= 0) {
          eng.timeUp();
        }
      }

      // Update Matter physics and zStep (host authoritative or local)
      if (eng.match && !eng.paused && eng.match.st === 'sim') {
        const u = 1;
        eng.zStep(u);
        eng.inkStep();

        eng.acc += dt;
        const h = 1000 / 240;
        let c = 0;
        while (eng.acc >= h && c < 24) {
          Engine.update(eng.engine, h);
          eng.acc -= h;
          c++;
        }
        if (c >= 24) eng.acc = 0;
        eng.simCheck(dt);
      }

      // Render 3D or 2D
      if (viewMode === '3d') {
        threeManager.syncWithMatch(eng.match, eng.drag, settings, (pw) => setFlickPower(pw));
      } else {
        const cv = canvasRef.current;
        if (cv) {
          const cx = cv.getContext('2d');
          if (cx) {
            if (!woodBenchRef.current) {
              woodBenchRef.current = createProceduralWoodBench(assetStore.benchBounds);
            }
            renderScene(
              cx,
              cv,
              eng.match,
              eng.drag,
              eng.parts,
              eng.shake,
              settings,
              scaleRef.current.scx,
              scaleRef.current.scy,
              scaleRef.current.sc,
              t,
              woodBenchRef.current,
              eng.inkCanvas,
              (pw) => setFlickPower(pw)
            );
          }
        }
      }

      if (eng.shake > 0) {
        eng.shake *= 0.88;
        if (eng.shake < 0.3) eng.shake = 0;
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [settings, viewMode]);

  // Pointer event coordinate translation for 2D Canvas
  const get2DCanvasPoint = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  // Unified Pointer Down (works in 3D perspective and 2D canvas)
  const handlePointerDown = (e: React.PointerEvent) => {
    const eng = engineRef.current;
    if (!eng || !eng.match || eng.paused || eng.match.st !== 'aim') return;
    const cur = eng.match.pl[eng.match.t];
    if (cur.ai) return;

    if (multiplayerManager.state.role === 'host' && cur.i !== 0) return;
    if (multiplayerManager.state.role === 'guest' && cur.i !== 1) return;

    let q: { x: number; y: number } | null = null;
    if (viewMode === '3d') {
      q = threeManager.screenToPointerDesk(e.clientX, e.clientY);
    } else {
      q = get2DCanvasPoint(e);
    }
    if (!q) return;

    const bPos = cur.body.position;
    const c = Math.cos(cur.body.angle);
    const s = Math.sin(cur.body.angle);

    const t = Math.max(-PL / 2, Math.min(PL / 2, (q.x - bPos.x) * c + (q.y - bPos.y) * s));
    const hitX = bPos.x + c * t;
    const hitY = bPos.y + s * t;

    if (Math.hypot(q.x - hitX, q.y - hitY) > 34) return;

    eng.drag = { x: q.x, y: q.y, t };
    if (viewMode === '3d') {
      threeManager.setControlsEnabled(false);
    }
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const eng = engineRef.current;
    if (eng && eng.drag) {
      let q: { x: number; y: number } | null = null;
      if (viewMode === '3d') {
        q = threeManager.screenToPointerDesk(e.clientX, e.clientY);
      } else {
        q = get2DCanvasPoint(e);
      }
      if (q) {
        eng.drag.x = q.x;
        eng.drag.y = q.y;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const eng = engineRef.current;
    if (viewMode === '3d') {
      threeManager.setControlsEnabled(true);
    }

    if (!eng || !eng.drag || !eng.match || eng.match.st !== 'aim') {
      if (eng) eng.drag = null;
      return;
    }

    const cur = eng.match.pl[eng.match.t];
    const bPos = cur.body.position;
    const c = Math.cos(cur.body.angle);
    const s = Math.sin(cur.body.angle);

    const cpX = bPos.x + c * eng.drag.t;
    const cpY = bPos.y + s * eng.drag.t;

    let q: { x: number; y: number } | null = null;
    if (viewMode === '3d') {
      q = threeManager.screenToPointerDesk(e.clientX, e.clientY);
    } else {
      q = get2DCanvasPoint(e);
    }
    if (!q) {
      eng.drag = null;
      return;
    }

    const vx = cpX - q.x;
    const vy = cpY - q.y;
    const len = Math.hypot(vx, vy);

    if (len < 18) {
      eng.drag = null;
      return;
    }

    const MAXD = 150;
    const pw = Math.min(len, MAXD) / MAXD;
    const ang = Math.atan2(vy, vx);
    const tOffset = eng.drag.t;
    eng.drag = null;

    if (multiplayerManager.state.role === 'guest') {
      const B = assetStore.benchBounds;
      multiplayerManager.sendGuestFlick(Math.cos(ang) / B.w, Math.sin(ang) / B.h, pw, tOffset);
    } else {
      eng.flick(ang, pw, tOffset);
    }
  };

  const handlePointerCancel = () => {
    if (viewMode === '3d') {
      threeManager.setControlsEnabled(true);
    }
    if (engineRef.current) engineRef.current.drag = null;
  };

  // Actions
  const handleStartMatch = (cfg: MatchConfig, benchSrc: string | null) => {
    requestGameLandscape();
    if (benchSrc !== null && benchSrc !== assetStore.selectedBenchSrc) {
      assetStore.setBench(benchSrc).then(() => {
        woodBenchRef.current = createProceduralWoodBench(assetStore.benchBounds);
      });
    }
    engineRef.current?.startSeries(cfg, settings, stats);
    setActiveScreen(null);
  };

  const handleQuickMatch = () => {
    requestGameLandscape();
    const quickCfg: MatchConfig = {
      series: 1,
      clock: 0,
      clutter: 0,
      pl: [
        { name: 'Player 1', ai: 0, pen: 0 },
        { name: 'Player 2', ai: 0, pen: 1 },
      ],
    };
    engineRef.current?.startSeries(quickCfg, settings, stats);
    setActiveScreen(null);
  };

  const handlePracticeVsAi = () => {
    setIsPractice(true);
    setActiveScreen('setup');
  };

  const handlePlaySetup = () => {
    setIsPractice(false);
    setActiveScreen('setup');
  };

  const handlePlayOnline = () => {
    setActiveScreen('online');
  };

  const handlePause = () => {
    if (!engineRef.current?.match || engineRef.current.match.st === 'over') return;
    if (multiplayerManager.state.role === 'guest') {
      showToast('Only host can pause this match');
      return;
    }
    engineRef.current.pause();
    setActiveScreen('pause');
  };

  const handleResume = () => {
    engineRef.current?.resume();
    setActiveScreen(null);
  };

  const handleRestart = () => {
    if (multiplayerManager.state.role === 'guest') {
      multiplayerManager.sendRoundAction('rst');
      return;
    }
    if (engineRef.current?.series) {
      engineRef.current.startSeries(engineRef.current.series.cfg, settings, stats);
      setActiveScreen(null);
    }
  };

  const handleNextRound = () => {
    if (multiplayerManager.state.role === 'guest') {
      multiplayerManager.sendRoundAction('next');
      return;
    }
    if (engineRef.current?.series) {
      engineRef.current.series.round++;
      engineRef.current.startRound();
      setActiveScreen(null);
    }
  };

  const handleMainMenu = () => {
    if (multiplayerManager.state.role) {
      multiplayerManager.leave();
    }
    engineRef.current?.stop();
    setCurrentMatch(null);
    setCurrentSeries(null);
    setActiveScreen('menu');
  };

  return (
    <>
      <Hud
        match={currentMatch}
        series={currentSeries}
        power={flickPower}
        viewMode={viewMode}
        onToggleViewMode={() => {
          const next = viewMode === '3d' ? '2d' : '3d';
          setViewMode(next);
          showToast(next === '3d' ? '3D View active (drag to aim, orbit with 2 fingers)' : '2D View active');
        }}
        onResetCamera={() => {
          threeManager.resetCamera();
          showToast('Camera reset to overhead');
        }}
        onPause={handlePause}
        onRestart={handleRestart}
        onMenu={handleMainMenu}
      />

      <div
        id="stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* 3D Three.js Container */}
        <div
          ref={threeContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: viewMode === '3d' ? 'block' : 'none',
          }}
        />

        {/* 2D Canvas Fallback View */}
        <canvas
          id="c"
          ref={canvasRef}
          aria-label="Pen Game bench"
          style={{ display: viewMode === '2d' ? 'block' : 'none' }}
        />
      </div>

      <Toast message={toastMsg} />

      {/* Screen Modals */}
      {activeScreen && (
        <div id="scr" style={{ display: 'flex' }}>
          {activeScreen === 'menu' && (
            <MainMenu
              stats={stats}
              onPlaySetup={handlePlaySetup}
              onPlayOnline={handlePlayOnline}
              onQuickMatch={handleQuickMatch}
              onPracticeMatch={handlePracticeVsAi}
              onOpenRules={() => setActiveScreen('rules')}
              onOpenSettings={() => setActiveScreen('settings')}
            />
          )}

          {activeScreen === 'setup' && (
            <MatchSetup
              isPractice={isPractice}
              onStartMatch={handleStartMatch}
              onBack={() => setActiveScreen('menu')}
              onToast={showToast}
            />
          )}

          {activeScreen === 'online' && (
            <OnlineModal
              netState={netState}
              onBack={() => setActiveScreen('menu')}
              onToast={showToast}
            />
          )}

          {activeScreen === 'rules' && (
            <RulesModal onBack={() => setActiveScreen(currentMatch ? null : 'menu')} />
          )}

          {activeScreen === 'settings' && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={(s) => setSettings(s)}
              onBack={() => setActiveScreen(currentMatch ? 'pause' : 'menu')}
              onToast={showToast}
            />
          )}

          {activeScreen === 'pause' && (
            <PauseModal
              onResume={handleResume}
              onRestart={handleRestart}
              onMenu={handleMainMenu}
            />
          )}

          {activeScreen === 'win' && currentMatch && (
            <WinModal
              match={currentMatch}
              series={currentSeries}
              onNextRound={handleNextRound}
              onRematch={handleRestart}
              onMenu={handleMainMenu}
            />
          )}
        </div>
      )}
    </>
  );
};
