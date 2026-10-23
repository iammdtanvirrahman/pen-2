import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onMenu }) => {
  return (
    <div className="p" role="dialog" aria-modal="true">
      <h2>Paused</h2>
      <div className="g">
        <button className="pr" onClick={onResume}>
          Resume
        </button>
        <button onClick={onRestart}>Restart</button>
        <button onClick={onMenu}>Main menu</button>
      </div>
    </div>
  );
};
