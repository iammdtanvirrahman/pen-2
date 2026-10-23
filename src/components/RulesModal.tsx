import React from 'react';

interface RulesModalProps {
  onBack: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onBack }) => {
  return (
    <div className="p" role="dialog" aria-modal="true">
      <h2>How to play</h2>
      <h3>Core rules</h3>
      <ol className="steps">
        <li>Every player gets one pen on the bench.</li>
        <li>Players take turns.</li>
        <li>
          Grab your pen anywhere along its length and drag backward to aim. Where you hit it decides how it spins.
        </li>
        <li>Release to flick.</li>
        <li>Hit opponents’ pens toward the edge.</li>
        <li>Keep your own pen on the bench.</li>
        <li>The last pen on the bench wins.</li>
      </ol>

      <h3>This version’s details</h3>
      <p className="mu">
        A pen is out when its centre passes the bench edge and it has stopped moving; touching the edge is safe. You can only flick your own pen. If everyone falls in the same turn, it’s a draw. Online play is not implemented.
      </p>

      <h3>Optional house options</h3>
      <p className="mu">
        Aim assist line, accuracy variation, flick strength and surface (classic, slick, grippy) are in Settings.
      </p>

      <div className="g">
        <button className="pr" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};
