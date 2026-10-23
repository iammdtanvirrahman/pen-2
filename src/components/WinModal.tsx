import React from 'react';
import { MatchState, SeriesMatch, LivePlayer } from '../types';
import { PC } from '../constants';

interface WinModalProps {
  match: MatchState;
  series: SeriesMatch | null;
  onNextRound: () => void;
  onRematch: () => void;
  onMenu: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  match,
  series,
  onNextRound,
  onRematch,
  onMenu,
}) => {
  const winner = match.win;
  const isSeries = series && series.cfg.series > 1;
  const isDone = !isSeries || series.scores.some((s) => s >= series.need);
  const finIndex = isSeries ? series.scores.findIndex((s) => s >= series.need) : -1;
  const seriesWinner: LivePlayer | null = finIndex >= 0 ? match.pl[finIndex] : null;

  const sortedPlayers = [...match.pl].sort((a, b) => a.rank - b.rank || a.i - b.i);
  const ord = (n: number) =>
    n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

  const kick = isSeries
    ? isDone
      ? 'Series winner'
      : `Round ${series.round} of up to ${series.cfg.series}`
    : 'Match over';

  const title = isSeries
    ? isDone
      ? `${seriesWinner?.name || 'Player'} wins the series!`
      : winner
      ? `${winner.name} takes the round!`
      : 'Round drawn'
    : winner
    ? `${winner.name} wins!`
    : 'Draw';

  const winColor = isDone
    ? seriesWinner
      ? PC[seriesWinner.i % PC.length]
      : 'inherit'
    : winner
    ? PC[winner.i % PC.length]
    : 'inherit';

  return (
    <div className="p" role="dialog" aria-modal="true">
      <div className="win">
        <div className="kick">{kick}</div>
        <div className="tr">{isDone ? (winner ? '🏆' : '🤝') : '🥊'}</div>
        <h2 style={{ color: winColor }}>{title}</h2>
      </div>

      {isSeries && (
        <div className="score">
          {match.pl.map((p) => (
            <div key={p.i} style={{ ['--c' as any]: PC[p.i % PC.length] }}>
              <b>{series.scores[p.i] || 0}</b>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {sortedPlayers.map((p) => (
        <div
          key={p.i}
          className="rk"
          style={{ ['--c' as any]: PC[p.i % PC.length], borderLeft: `4px solid ${PC[p.i % PC.length]}` }}
        >
          <span className="pos">{winner ? ord(p.rank) : '='}</span>
          <span className="nm">{p.name}</span>
          <span className="ms">
            {p.el} out · {p.ht}/{p.sh} hits
          </span>
        </div>
      ))}

      <div className="g">
        {isDone ? (
          <>
            <button className="pr" onClick={onRematch}>
              Rematch
            </button>
            <button onClick={onMenu}>Main menu</button>
          </>
        ) : (
          <>
            <button className="pr" onClick={onNextRound}>
              Next round →
            </button>
            <button onClick={onMenu}>Main menu</button>
          </>
        )}
      </div>
    </div>
  );
};
