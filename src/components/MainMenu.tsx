import React from 'react';
import { GameStats } from '../types';
import { assetStore } from '../assetsManager';

interface MainMenuProps {
  stats: GameStats;
  onPlaySetup: () => void;
  onPlayOnline: () => void;
  onQuickMatch: () => void;
  onPracticeMatch: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  stats,
  onPlaySetup,
  onPlayOnline,
  onQuickMatch,
  onPracticeMatch,
  onOpenRules,
  onOpenSettings,
}) => {
  const favEntry = Object.entries(stats.pens).sort((x, y) => y[1] - x[1])[0];
  const favPen = favEntry ? assetStore.pens[Number(favEntry[0])] : null;
  const favPenName = favPen ? favPen.n.split(' ')[0] : '–';

  const winRate = stats.p ? `${Math.round((stats.w / stats.p) * 100)}%` : '–';
  const hitRate = stats.sh ? `${Math.round((stats.ht / stats.sh) * 100)}%` : '–';

  return (
    <div className="p" role="dialog" aria-modal="true">
      <div className="logo">
        <b>
          Pen<span> Game</span>
        </b>
        <span lang="bn" className="bn">
          কলম খেলবি?
        </span>
        <div className="pg" />
        <p className="mu">Flick. Knock. Survive.</p>
      </div>

      <div className="g">
        <div className="g2">
          <button onClick={onPlaySetup}>Play local · 2–6</button>
          <button className="pr" onClick={onPlayOnline}>
            Play online · 2 players
          </button>
        </div>
        <div className="g2">
          <button onClick={onQuickMatch}>⚡ Quick match</button>
          <button onClick={onPracticeMatch}>🤖 Practice vs AI</button>
          <button onClick={onOpenRules}>📖 Rules</button>
          <button onClick={onOpenSettings}>⚙ Settings</button>
        </div>
      </div>

      <h3>Player 1 stats</h3>
      <div className="st">
        <div>
          <b>{stats.p}</b>
          <span>Rounds</span>
        </div>
        <div>
          <b>{stats.w}</b>
          <span>Won</span>
        </div>
        <div>
          <b>{winRate}</b>
          <span>Win rate</span>
        </div>
        <div>
          <b>{stats.e}</b>
          <span>Knock-outs</span>
        </div>
        <div>
          <b>{hitRate}</b>
          <span>Hit rate</span>
        </div>
        <div>
          <b>{stats.p ? (stats.rs / stats.p).toFixed(1) : '–'}</b>
          <span>Avg rank</span>
        </div>
        <div>
          <b>{stats.bs}</b>
          <span>Best streak</span>
        </div>
        <div>
          <b>
            {stats.sw}/{stats.sp}
          </b>
          <span>Series won</span>
        </div>
        <div>
          <b>{favPenName}</b>
          <span>Fav pen</span>
        </div>
      </div>

      <h3>Recent</h3>
      <div className="mu">
        {stats.rec.length > 0 ? (
          stats.rec.map((r, i) => (
            <React.Fragment key={i}>
              {r}
              {i < stats.rec.length - 1 && <br />}
            </React.Fragment>
          ))
        ) : (
          'No matches yet.'
        )}
      </div>
    </div>
  );
};
