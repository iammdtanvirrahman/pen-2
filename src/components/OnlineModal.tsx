import React, { useState, useEffect } from 'react';
import { NetState, multiplayerManager } from '../multiplayer';
import { assetStore } from '../assetsManager';
import { SERIES_OPTIONS } from '../constants';

interface OnlineModalProps {
  netState: NetState;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const OnlineModal: React.FC<OnlineModalProps> = ({ netState, onBack, onToast }) => {
  const [name, setName] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pg.net') || '{}');
      return saved.name || 'Player';
    } catch (e) {
      return 'Player';
    }
  });

  const [pen, setPen] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pg.net') || '{}');
      return Number(saved.pen) || 0;
    } catch (e) {
      return 0;
    }
  });

  const [series, setSeries] = useState<number>(1);
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParam = new URLSearchParams(window.location.search).get('room');
      return urlParam || '';
    }
    return '';
  });

  useEffect(() => {
    try {
      localStorage.setItem('pg.net', JSON.stringify({ name, pen }));
    } catch (e) {}
  }, [name, pen]);

  const handleCreateRoom = () => {
    multiplayerManager.createRoom(name.trim() || 'Player', pen, series);
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      onToast('Enter a room code');
      return;
    }
    multiplayerManager.joinRoom(roomCode.trim(), name.trim() || 'Player', pen, series);
  };

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => onToast(`Copied ${label} to clipboard`));
    } else {
      const x = document.createElement('textarea');
      x.value = text;
      x.style.position = 'fixed';
      x.style.opacity = '0';
      document.body.appendChild(x);
      x.select();
      try {
        document.execCommand('copy');
        onToast(`Copied ${label} to clipboard`);
      } catch (err) {}
      x.remove();
    }
  };

  const handleShareInvite = () => {
    if (!netState.invite) return;
    if (navigator.share) {
      navigator
        .share({
          title: 'Join my Pen Game match',
          text: 'Let’s play Pen Game! Open this invite link to join my room.',
          url: netState.invite,
        })
        .then(() => onToast('Invite ready to share'))
        .catch(() => handleCopy(netState.invite, 'invite link'));
    } else {
      handleCopy(netState.invite, 'invite link');
    }
  };

  const handleLeaveRoom = () => {
    multiplayerManager.leave();
  };

  // If in a room (role !== null)
  if (netState.role) {
    const isHost = netState.role === 'host';
    const isConnected = netState.connected;

    return (
      <div className="p" role="dialog" aria-modal="true">
        <div className="logo">
          <b>
            Room <span>{isHost ? 'created' : 'joined'}</span>
          </b>
        </div>

        <div className="st">
          <div>
            <b>{isHost ? netState.localName : netState.remoteName}</b>
            <span>Host</span>
          </div>
          <div>
            <b>{isHost ? (isConnected ? netState.remoteName : 'Waiting…') : netState.localName}</b>
            <span>{isHost ? (isConnected ? 'Opponent connected' : 'Waiting for friend') : 'You'}</span>
          </div>
          <div>
            <b>{isConnected ? '● Online' : '…'}</b>
            <span>Connection</span>
          </div>
        </div>

        {isHost ? (
          <div className="invite-layout">
            <div className="invite-actions">
              <h3>Invite a friend</h3>
              <p className="mu">
                Easiest: share the link or let your friend scan the QR code with their phone camera.
              </p>
              <button type="button" className="pr" onClick={handleShareInvite}>
                Share invite ↗
              </button>
              <button type="button" onClick={() => handleCopy(netState.invite, 'invite link')}>
                Copy invite link
              </button>
              <button type="button" onClick={() => handleCopy(netState.room, 'room code')}>
                Copy room code
              </button>
              <div className="invite-code">{netState.room}</div>
            </div>

            <div className="invite-qr-wrap">
              <div id="roomqr" className="invite-qr" aria-label="Room invite QR code">
                {netState.qrDataUrl ? (
                  <img
                    src={netState.qrDataUrl}
                    alt="Invite QR code"
                    style={{ width: '136px', height: '136px', display: 'block', borderRadius: '8px' }}
                  />
                ) : (
                  <span>Generating QR…</span>
                )}
              </div>
              <span>Scan using the other phone</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="mu">You are connected to the host. The host will start the match.</p>
            <div className="rk">
              <span className="nm">Room code</span>
              <strong>{netState.room}</strong>
            </div>
          </div>
        )}

        <div className="g2">
          <button type="button" onClick={handleLeaveRoom}>
            Leave room
          </button>
          {isHost ? (
            <button
              type="button"
              className="pr"
              disabled={!isConnected}
              onClick={() => multiplayerManager.startHostMatch()}
            >
              Start match
            </button>
          ) : (
            <button type="button" disabled>
              Waiting for host…
            </button>
          )}
        </div>

        {isHost && !isConnected && (
          <p className="mu">
            Keep this screen open while your friend joins. Start match will unlock when they connect.
          </p>
        )}
      </div>
    );
  }

  // Pre-room Online Lobby form
  return (
    <div className="p" role="dialog" aria-modal="true">
      <div className="logo">
        <b>
          Pen<span> Online</span>
        </b>
        <p className="mu">Challenge a friend anywhere.</p>
      </div>

      <p className="mu">
        Create a room and share its invite link, or enter a friend's room code. Online matches support
        two players; the host controls physics and both players see the same moves.
      </p>

      <div className="player-fields">
        <label>
          Your name
          <input
            type="text"
            maxLength={14}
            value={name}
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Your pen
          <select value={pen} onChange={(e) => setPen(Number(e.target.value))}>
            {assetStore.pens.map((p, i) => (
              <option key={i} value={i}>
                {p.n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Series
        <select value={series} onChange={(e) => setSeries(Number(e.target.value))}>
          {SERIES_OPTIONS.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Room code
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={roomCode}
          placeholder="Paste the room code"
          onChange={(e) => setRoomCode(e.target.value)}
        />
      </label>

      <div className="g2">
        <button
          type="button"
          className={roomCode ? '' : 'pr'}
          onClick={handleCreateRoom}
        >
          Create room
        </button>
        <button
          type="button"
          className={roomCode ? 'pr' : ''}
          onClick={handleJoinRoom}
        >
          {roomCode ? 'Join this room →' : 'Join room'}
        </button>
      </div>

      {roomCode && (
        <p className="mu">
          Invite link detected — your room code is filled in. Choose your name and pen, then tap Join.
        </p>
      )}

      <div className="g">
        <button type="button" onClick={onBack}>
          Back to main menu
        </button>
      </div>
      <p className="mu">Requires internet and a browser with WebRTC support.</p>
    </div>
  );
};
