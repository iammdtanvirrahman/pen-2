import React from 'react';
import { MatchState, SeriesMatch } from '../types';
import { PC } from '../constants';

interface HudProps {
  match: MatchState | null;
  series: SeriesMatch | null;
  power: number;
  viewMode: '3d' | '2d';
  onToggleViewMode: () => void;
  onResetCamera: () => void;
  onLandscape: () => void;
  onPause: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export const Hud: React.FC<HudProps> = ({
  match,
  series,
  power,
  viewMode,
  onToggleViewMode,
  onResetCamera,
  onLandscape,
  onPause,
  onRestart,
  onMenu,
}) => {
  if (!match) return null;

  const cur = match.pl[match.t];
  const curColor = cur ? PC[cur.i % PC.length] : '#fff';
  const ini = (n: string) => (String(n).trim()[0] || '?').toUpperCase();

  const isSeriesActive = series && series.cfg.series > 1;
  const isClockActive = match.st === 'aim' && match.clk > 0 && !cur?.ai;
  const clockSecs = Math.max(0, Math.ceil(match.clk / 1000));
  const isClockLow = match.clk <= 5000;

  return (
    <div id="top" style={{ display: 'flex' }}>
      <div id="turn">
        {match.st === 'over' ? (
          <span>🏁 Round over</span>
        ) : (
          <>
            <span className="dot" style={{ color: curColor }} />
            <span>
              {cur?.name}
              {cur?.ai ? ' · AI' : ''}
            </span>
            <small>
              {match.st === 'aim'
                ? cur?.ai
                  ? 'thinking…'
                  : 'drag back, release'
                : 'in motion…'}
            </small>
          </>
        )}
      </div>

      {isSeriesActive && (
        <span id="ser">
          Best of {series.cfg.series} · Round {series.round}
        </span>
      )}

      {isClockActive && (
        <div id="clk" className={isClockLow ? 'low' : ''}>
          {clockSecs}
        </div>
      )}

      <div id="order">
        {match.pl.map((p) => {
          const color = PC[p.i % PC.length];
          const isCurrent = p === cur && match.st !== 'over';
          const pScore = series ? series.scores[p.i] || 0 : 0;
          const need = series ? series.need : 1;

          return (
            <span
              key={p.i}
              className={`chip ${p.alive ? '' : 'x'} ${isCurrent ? 'on' : ''}`}
              title={p.name}
            >
              <b style={{ ['--c' as any]: color }}>
                {p.alive ? ini(p.name) : '✕'}
              </b>
              <em>{p.name}</em>
              {isSeriesActive && (
                <span className="pips" style={{ ['--c' as any]: color }}>
                  {Array.from({ length: need }, (_, k) => (
                    <i key={k} className={k < pScore ? 'f' : ''} />
                  ))}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div id="pwr" title="Flick power">
        <div id="pwf" style={{ width: `${Math.round(power * 100)}%` }} />
      </div>

      <button
        type="button"
        data-a="landscape"
        aria-label="Enter fullscreen landscape mode"
        title="Fullscreen / landscape mode"
        onClick={onLandscape}
      >
        ⛶
      </button>

      {viewMode === '3d' && (
        <button
          type="button"
          aria-label="Reset Camera"
          title="Reset 3D camera to overhead view"
          onClick={onResetCamera}
          style={{ width: 'auto', padding: '0 10px', borderRadius: '99px', fontSize: '12px' }}
        >
          🎯 View
        </button>
      )}

      <button
        type="button"
        aria-label="Toggle 2D/3D View"
        title="Switch between 3D Three.js and 2D Canvas"
        onClick={onToggleViewMode}
        style={{ width: 'auto', padding: '0 10px', borderRadius: '99px', fontSize: '12px' }}
      >
        {viewMode === '3d' ? '3D' : '2D'}
      </button>

      <button data-a="pause" aria-label="Pause" onClick={onPause}>
        ⏸
      </button>
      <button data-a="rst" aria-label="Restart" onClick={onRestart}>
        ↻
      </button>
      <button data-a="menu" aria-label="Main menu" onClick={onMenu}>
        ☰
      </button>
    </div>
  );
};
