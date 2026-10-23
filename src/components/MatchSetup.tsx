import React, { useState } from 'react';
import { PlayerConfig, MatchConfig } from '../types';
import { PC, SERIES_OPTIONS, CLOCK_OPTIONS, CLUTTER_OPTIONS } from '../constants';
import { assetStore } from '../assetsManager';

interface MatchSetupProps {
  isPractice: boolean;
  onStartMatch: (cfg: MatchConfig, benchSrc: string | null) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({
  isPractice,
  onStartMatch,
  onBack,
  onToast,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(isPractice ? 3 : 2);
  const [setupTarget, setSetupTarget] = useState<number>(0);
  const [selectedBenchSrc, setSelectedBenchSrc] = useState<string>(assetStore.selectedBenchSrc);

  const [series, setSeries] = useState<number>(1);
  const [clock, setClock] = useState<number>(0);
  const [clutter, setClutter] = useState<number>(0);

  const [players, setPlayers] = useState<PlayerConfig[]>(() =>
    [0, 1, 2, 3, 4, 5].map((i) => ({
      name: isPractice ? (i === 0 ? 'You' : `AI Rival ${i}`) : `Player ${i + 1}`,
      ai: isPractice && i > 0 ? 2 : 0,
      pen: i % assetStore.pens.length,
    }))
  );

  const targetPlayer = players[setupTarget] || players[0];
  const targetColor = PC[setupTarget % PC.length];

  const handlePlayerCountChange = (n: number) => {
    setPlayerCount(n);
    if (setupTarget >= n) {
      setSetupTarget(n - 1);
    }
  };

  const handleSelectBench = async (src: string) => {
    setSelectedBenchSrc(src);
    await assetStore.setBench(src || null);
    onToast(src ? 'Bench selected' : 'Default bench selected');
  };

  const handleUpdatePlayer = (field: keyof PlayerConfig, value: any) => {
    setPlayers((prev) => {
      const copy = [...prev];
      copy[setupTarget] = {
        ...copy[setupTarget],
        [field]: value,
      };
      return copy;
    });
  };

  const handleStart = async () => {
    await assetStore.setBench(selectedBenchSrc || null);
    const selectedPlayers = players.slice(0, playerCount).map((p) => ({
      ...p,
      name: p.name.trim() || 'Player',
    }));

    const cfg: MatchConfig = {
      pl: selectedPlayers,
      series,
      clock,
      clutter,
    };

    onStartMatch(cfg, selectedBenchSrc || null);
  };

  const renderPenVisual = (penIdx: number) => {
    const d = assetStore.pens[penIdx] || assetStore.pens[0];
    if (d.src) {
      return <img src={d.src} alt={d.n} loading="lazy" />;
    }
    return (
      <span
        className="pen-shape"
        style={{ ['--pen-color' as any]: d.c || '#777' }}
      />
    );
  };

  return (
    <div className="p" role="dialog" aria-modal="true">
      <div className="setup-screen">
        <div className="setup-hero">
          <div className="setup-kicker">PEN GAME / MATCH LAB</div>
          <h2>
            Build your lineup<span>.</span>
          </h2>
          <p>Pick a pen for every player, then set the rules for the match.</p>
          <div className="mode-pill">
            {isPractice ? '🤖 PRACTICE VS AI' : '👥 LOCAL MATCH'}
          </div>
        </div>

        {/* 01 / Lineup */}
        <div className="setup-section">
          <div className="section-head">
            <div>
              <h3>01 / Lineup</h3>
              <p>Tap a player to customize their pen.</p>
            </div>
            <div className="player-count">
              <span>PLAYERS</span>
              <div className="seg">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n === playerCount ? 'on' : ''}
                    aria-pressed={n === playerCount}
                    onClick={() => handlePlayerCountChange(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="roster-grid">
            {players.slice(0, playerCount).map((p, i) => {
              const color = PC[i % PC.length];
              const isActive = setupTarget === i;
              const penDef = assetStore.pens[p.pen] || assetStore.pens[0];
              return (
                <button
                  key={i}
                  type="button"
                  className={`roster-card ${isActive ? 'active' : ''}`}
                  onClick={() => setSetupTarget(i)}
                  style={{ ['--player-color' as any]: color }}
                >
                  <div className="roster-head">
                    <span className="roster-dot" />
                    <span className="role-label">
                      {p.ai ? 'AI OPPONENT' : 'YOU / PLAYER'}
                    </span>
                    <span className="roster-num">0{i + 1}</span>
                  </div>
                  <div className="roster-preview">{renderPenVisual(p.pen)}</div>
                  <strong>{p.name || 'Player'}</strong>
                  <span className="roster-pen-name">{penDef.n}</span>
                  <span className="roster-edit">
                    {isActive ? 'EDITING PEN' : 'EDIT PEN ↗'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 02 / Match Rules */}
        <div className="setup-section">
          <div className="section-head">
            <div>
              <h3>02 / Match rules</h3>
              <p>The clock skips a human turn when it runs out. Clutter adds solid objects pens bounce off.</p>
            </div>
          </div>
          <div className="rules-grid">
            <div className="rule">
              <span>SERIES</span>
              <div className="seg">
                {SERIES_OPTIONS.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={series === val ? 'on' : ''}
                    aria-pressed={series === val}
                    onClick={() => setSeries(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rule">
              <span>SHOT CLOCK</span>
              <div className="seg">
                {CLOCK_OPTIONS.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={clock === val ? 'on' : ''}
                    aria-pressed={clock === val}
                    onClick={() => setClock(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rule">
              <span>BENCH CLUTTER</span>
              <div className="seg">
                {CLUTTER_OPTIONS.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={clutter === val ? 'on' : ''}
                    aria-pressed={clutter === val}
                    onClick={() => setClutter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 03 / Bench */}
        <div className="setup-section bench-picker-section">
          <div className="section-head">
            <div>
              <h3>03 / Choose your bench</h3>
              <p>
                Bench skins from <code>assets/bench/</code>.
              </p>
            </div>
            <span className="gallery-head">
              {assetStore.benchSkins.length + 1} BENCH SKINS
            </span>
          </div>

          <div className="bench-gallery">
            <button
              type="button"
              className={`bench-option ${selectedBenchSrc === '' ? 'selected' : ''}`}
              onClick={() => handleSelectBench('')}
            >
              <span className="bench-art procedural-bench" />
              <strong>Classic wooden bench</strong>
              <small>{selectedBenchSrc === '' ? '✓ SELECTED' : 'USE DEFAULT'}</small>
            </button>

            {assetStore.benchSkins.map((b, i) => (
              <button
                key={i}
                type="button"
                className={`bench-option ${selectedBenchSrc === b.src ? 'selected' : ''}`}
                onClick={() => handleSelectBench(b.src)}
              >
                <span className="bench-art">
                  <img src={b.src} alt={b.n} loading="lazy" />
                </span>
                <strong>{b.n}</strong>
                <small>{selectedBenchSrc === b.src ? '✓ SELECTED' : 'SELECT BENCH'}</small>
              </button>
            ))}
          </div>
        </div>

        {/* 04 / Customize selected player */}
        <div className="pen-editor">
          <div className="editor-title">
            <div>
              <div className="setup-kicker">04 / CUSTOMIZE SELECTED PLAYER</div>
              <h3>{targetPlayer.name || 'Player'}'s pen</h3>
              <p>
                Selected: <b>{(assetStore.pens[targetPlayer.pen] || assetStore.pens[0]).n}</b>
              </p>
            </div>
            <span className="editor-badge" style={{ ['--player-color' as any]: targetColor }}>
              {targetPlayer.ai ? 'AI' : 'HUMAN'}
            </span>
          </div>

          <div className="player-fields">
            <label>
              Display name
              <input
                type="text"
                value={targetPlayer.name}
                maxLength={14}
                aria-label="Selected player name"
                onChange={(e) => handleUpdatePlayer('name', e.target.value)}
              />
            </label>
            <label>
              Controller
              <select
                value={targetPlayer.ai}
                aria-label="Selected player controller"
                onChange={(e) => handleUpdatePlayer('ai', Number(e.target.value))}
              >
                <option value={0}>Human</option>
                <option value={1}>AI Easy</option>
                <option value={2}>AI Medium</option>
                <option value={3}>AI Hard</option>
              </select>
            </label>
          </div>

          <div className="gallery-head">
            <h4>Choose a pen</h4>
            <span>{assetStore.pens.length} PEN SKINS</span>
          </div>

          <div className="pen-gallery">
            {assetStore.pens.map((p, i) => {
              const isSelected = targetPlayer.pen === i;
              return (
                <button
                  key={i}
                  type="button"
                  className={`pen-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleUpdatePlayer('pen', i)}
                  aria-pressed={isSelected}
                  style={{ ['--player-color' as any]: targetColor }}
                >
                  <span className="pen-art">{renderPenVisual(i)}</span>
                  <span className="pen-option-name">{p.n}</span>
                  <span className="pen-option-status">
                    {isSelected ? '✓ SELECTED' : 'SELECT PEN'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="setup-footer">
          <span>Rules apply to this match.</span>
          <div className="g2">
            <button type="button" onClick={onBack}>
              Back
            </button>
            <button type="button" className="pr" onClick={handleStart}>
              Start match <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
