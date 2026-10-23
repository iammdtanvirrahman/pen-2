import Peer, { DataConnection } from 'peerjs';
import QRCode from 'qrcode';
import { MatchConfig, MatchState, NetStatePacket, SeriesMatch } from './types';
import { assetStore } from './assetsManager';

export interface NetState {
  role: 'host' | 'guest' | null;
  peer: Peer | null;
  conn: DataConnection | null;
  connected: boolean;
  room: string;
  invite: string;
  localName: string;
  remoteName: string;
  localPen: number;
  remotePen: number;
  series: number;
  started: boolean;
  lastSeq: number;
  lastGameId: number | null;
  qrDataUrl: string | null;
  hostPen: number;
  guestPen: number;
  hostPenName: string;
  guestPenName: string;
  clock: number;
  clutter: number;
}

export function generateRoomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = 'pg-';
  for (let i = 0; i < 16; i++) {
    s += chars[(Math.random() * chars.length) | 0];
  }
  return s;
}

export function getInviteUrl(roomId: string): string {
  if (typeof window === 'undefined') return '';
  const u = new URL(window.location.href);
  u.searchParams.set('room', roomId);
  u.hash = '';
  return u.href;
}

export class MultiplayerManager {
  state: NetState = {
    role: null,
    peer: null,
    conn: null,
    connected: false,
    room: '',
    invite: '',
    localName: 'Player',
    remoteName: 'Opponent',
    localPen: 0,
    remotePen: 1,
    series: 1,
    started: false,
    lastSeq: 0,
    lastGameId: null,
    qrDataUrl: null,
    hostPen: 0,
    guestPen: 1,
    hostPenName: 'Pen',
    guestPenName: 'Pen',
    clock: 0,
    clutter: 0,
  };

  syncInterval: number | null = null;
  connectionTimer: number | null = null;
  recoveryTimer: number | null = null;
  lastJoin: { roomCode: string; name: string; pen: number; series: number } | null = null;
  closing = false;

  onStateChange?: (state: NetState) => void;
  onToast?: (msg: string) => void;
  onStartMatchByHost?: (cfg: MatchConfig) => void;
  onIncomingState?: (packet: NetStatePacket) => void;
  onGuestFlickReceived?: (ang: number, pw: number, t: number) => void;
  onRoundActionReceived?: (action: 'next' | 'rst') => void;
  onOpponentDisconnected?: (msg: string) => void;

  notify() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  send(msg: any) {
    try {
      if (this.state.conn && this.state.conn.open) {
        this.state.conn.send(msg);
      }
    } catch (e) {}
  }

  async createRoom(name: string, pen: number, series: number) {
    this.cleanup();
    this.lastJoin = null;
    this.state.role = 'host';
    this.state.localName = name;
    this.state.localPen = this.safePen(pen);
    this.state.hostPen = this.state.localPen;
    this.state.hostPenName = assetStore.pens[this.state.localPen]?.n || 'Pen';
    this.state.series = [1, 3, 5].includes(series) ? series : 1;
    this.state.clock = 0;
    this.state.clutter = 0;
    this.state.started = false;
    this.notify();

    const roomCode = generateRoomCode();
    const inviteUrl = getInviteUrl(roomCode);
    this.state.room = roomCode;
    this.state.invite = inviteUrl;

    try {
      this.state.qrDataUrl = await QRCode.toDataURL(inviteUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#101013', light: '#ffffff' },
      });
    } catch (e) {}

    try {
      const peer = new Peer(roomCode, { debug: 0 });
      this.state.peer = peer;
      this.watchPeer(peer);
      this.connectionTimer = window.setTimeout(() => {
        if (this.state.role === 'host' && this.state.peer === peer && !peer.id) this.failConnection('Room creation timed out. Check your connection and try again.');
      }, 18000);

      peer.on('open', (id) => {
        if (this.closing || this.state.role !== 'host') return;
        this.clearConnectionTimer();
        this.state.room = id;
        this.state.invite = getInviteUrl(id);
        this.notify();
      });

      peer.on('connection', (conn) => {
        if (this.closing || this.state.role !== 'host') return;
        if (this.state.conn && this.state.connected) {
          conn.close();
          return;
        }
        this.attachConnection(conn);
      });

      peer.on('error', (err: any) => {
        if (this.closing || this.state.role !== 'host') return;
        this.onToast?.(
          err && err.type === 'unavailable-id'
            ? 'Room code in use, please retry.'
            : 'Unable to create room. Check connection.'
        );
      });
    } catch (e) {
      this.onToast?.('Could not initialize room peer.');
    }
    this.notify();
  }

  joinRoom(roomCode: string, name: string, pen: number, series: number) {
    const cleanRoom = roomCode.trim();
    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(cleanRoom)) {
      this.onToast?.('Enter a valid room code');
      return;
    }
    this.cleanup();
    this.lastJoin = { roomCode: cleanRoom, name, pen, series };
    this.state.role = 'guest';
    this.state.localName = name;
    this.state.localPen = this.safePen(pen);
    this.state.guestPen = this.state.localPen;
    this.state.guestPenName = assetStore.pens[this.state.localPen]?.n || 'Pen';
    this.state.series = [1, 3, 5].includes(series) ? series : 1;
    this.state.clock = 0;
    this.state.clutter = 0;
    this.state.started = false;
    this.state.room = cleanRoom;
    this.state.invite = getInviteUrl(cleanRoom);
    this.notify();

    try {
      const peer = new Peer({ debug: 0 });
      this.state.peer = peer;
      this.watchPeer(peer);
      this.connectionTimer = window.setTimeout(() => {
        if (this.state.role === 'guest' && this.state.peer === peer && !this.state.connected) this.failConnection('Connection timed out. Check the network and try again.');
      }, 20000);

      peer.on('open', () => {
        if (this.closing || this.state.role !== 'guest') return;
        const conn = peer.connect(cleanRoom, {
          reliable: true,
          serialization: 'json',
          metadata: { name: this.state.localName, pen: this.state.localPen },
        });
        this.attachConnection(conn);
      });

      peer.on('error', (err: any) => {
        if (this.closing || this.state.role !== 'guest') return;
        this.onToast?.(
          err && err.type === 'peer-unavailable'
            ? 'Room not found or host left.'
            : 'Could not connect to host.'
        );
      });
    } catch (e) {
      this.onToast?.('Could not join room.');
    }
    this.notify();
  }

  attachConnection(conn: DataConnection) {
    this.state.conn = conn;

    conn.on('open', () => {
      if (this.closing || this.state.conn !== conn) return;
      this.clearConnectionTimer();
      this.state.connected = true;
      this.state.lastSeq = 0;

      if (this.state.role === 'guest') {
        this.send({ type: 'hello', name: this.state.localName, pen: this.state.localPen });
      } else {
        this.state.remoteName = String(conn.metadata?.name || 'Opponent').slice(0, 14);
        this.state.remotePen = this.safePen(conn.metadata?.pen ?? 1);
        this.state.guestPen = this.state.remotePen;
        this.state.guestPenName = assetStore.pens[this.state.guestPen]?.n || 'Pen';
        this.send(this.lobbyPacket());
      }
      this.notify();
    });

    conn.on('data', (data: any) => {
      this.handleMessage(data);
    });

    conn.on('close', () => {
      this.clearConnectionTimer();
      if (this.closing || this.state.conn !== conn) return;
      if (this.state.role === 'host') {
        this.state.connected = false;
        this.state.remoteName = 'Opponent';
        this.state.started = false;
        this.state.lastSeq = 0;
        this.state.lastGameId = null;
        this.onToast?.('Opponent left the room');
        this.notify();
      } else {
        this.onOpponentDisconnected?.('Connection to the host was lost.');
      }
    });

    conn.on('error', () => {
      if (!this.closing) {
        this.onToast?.('Connection hiccup — attempting to recover…');
      }
    });
  }

  handleMessage(message: any) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;

    if (this.state.role === 'host') {
      if (message.type === 'hello') {
        this.state.remoteName = String(message.name || 'Opponent').trim().slice(0, 14) || 'Opponent';
        this.state.remotePen = this.safePen(message.pen ?? 1);
        this.state.guestPen = this.state.remotePen;
        this.state.guestPenName = assetStore.pens[this.state.guestPen]?.n || 'Pen';
        this.state.connected = true;
        // Re-send the lobby after both player identities are known.
        this.send(this.lobbyPacket());
        this.notify();
        return;
      }

      if (message.type === 'flick') {
        const B = assetStore.benchBounds;
        const dx = Number(message.dirX), dy = Number(message.dirY);
        const pw = Number(message.pw), t = Number(message.t);
        if (!this.state.started || !this.state.connected ||
            !Number.isFinite(dx) || !Number.isFinite(dy) ||
            Math.abs(dx) > 1.01 || Math.abs(dy) > 1.01 ||
            !Number.isFinite(pw) || pw < 0 || pw > 1 ||
            !Number.isFinite(t) || Math.abs(t) > 120) return;
        const ang = Math.atan2(dy * B.h, dx * B.w);
        this.onGuestFlickReceived?.(ang, pw, t);
        return;
      }

      if (message.type === 'action') {
        if (message.action === 'next' || message.action === 'rst') {
          if (this.state.started && this.state.connected) this.onRoundActionReceived?.(message.action);
        } else if (message.action === 'leave') {
          this.send({ type: 'closed', reason: 'Opponent left the room.' });
          this.state.connected = false;
          this.state.started = false;
          this.state.lastSeq = 0;
          this.notify();
        }
        return;
      }

      if (message.type === 'leave') {
        this.send({ type: 'closed', reason: 'Opponent left the room.' });
        this.state.connected = false;
        this.state.started = false;
        this.state.lastSeq = 0;
        this.notify();
      }
      return;
    }

    // Guest handlers
    if (message.type === 'lobby') {
      this.state.remoteName = String(message.host || 'Host').slice(0, 14);
      this.state.hostPen = this.safePen(message.hostPen ?? 0);
      this.state.guestPen = this.safePen(message.guestPen ?? this.state.localPen);
      this.state.hostPenName = String(message.hostPenName || assetStore.pens[this.state.hostPen]?.n || 'Pen');
      this.state.guestPenName = String(message.guestPenName || assetStore.pens[this.state.guestPen]?.n || 'Pen');
      if ([1, 3, 5].includes(Number(message.series))) this.state.series = Number(message.series);
      if ([0, 15, 30].includes(Number(message.clock))) this.state.clock = Number(message.clock);
      if ([0, 1, 2].includes(Number(message.clutter))) this.state.clutter = Number(message.clutter);
      if (message.started && !this.state.started) {
        this.state.started = true;
        this.state.lastSeq = 0;
      }
      this.notify();
      return;
    }

    if (message.type === 'state') {
      if (!this.isValidSnapshot(message)) return;
      const packet = message as NetStatePacket;
      if (packet.seq <= this.state.lastSeq) return;
      this.state.lastSeq = packet.seq;
      this.onIncomingState?.(packet);
      return;
    }

    if (message.type === 'closed') {
      this.onOpponentDisconnected?.(message.reason || 'Host closed the room.');
    }
  }

  startHostMatch() {
    if (this.state.role !== 'host' || !this.state.connected || !this.state.conn) return;

    const cfg: MatchConfig = {
      series: this.state.series,
      clock: this.state.clock,
      clutter: this.state.clutter,
      pl: [
        { name: this.state.localName, ai: 0, pen: this.state.localPen },
        { name: this.state.remoteName || 'Opponent', ai: 0, pen: this.state.remotePen },
      ],
    };

    this.state.started = true;
    this.state.lastSeq = 0;
    this.send(this.lobbyPacket(true));
    this.notify();

    this.onStartMatchByHost?.(cfg);
  }

  broadcastMatchState(match: MatchState, series: SeriesMatch) {
    if (this.state.role !== 'host' || !this.state.connected || !this.state.started || !this.state.conn)
      return;

    const B = assetStore.benchBounds;
    const packet: NetStatePacket = {
      type: 'state',
      seq: ++this.state.lastSeq,
      cfg: series.cfg,
      match: {
        scores: series.scores,
        round: series.round,
        need: series.need,
        first: series.first,
      },
      game: {
        id: match.id,
        t: match.t,
        st: match.st,
        simT: match.simT,
        sT: match.sT,
        clk: match.clk,
        cs: match.cs,
        hit: match.hit,
        win: match.win ? match.win.i : null,
        pl: match.pl.map((p) => {
          const b = p.body;
          return {
            i: p.i,
            name: p.name,
            alive: !!p.alive,
            fell: !!p.fell,
            rank: p.rank,
            el: p.el,
            sh: p.sh,
            ht: p.ht,
            x: (b.position.x - B.x) / B.w,
            y: (b.position.y - B.y) / B.h,
            vx: b.velocity.x / B.w,
            vy: b.velocity.y / B.h,
            angle: b.angle,
            av: b.angularVelocity,
            z: p.z,
            vz: p.vz,
            pt: p.pt,
            pw: p.pw,
            rb: p.rb,
            fl: p.fl,
            mask: b.collisionFilter.mask,
          };
        }),
        obs: match.obs.map((o) => ({
          k: o.k,
          x: (o.x - B.x) / B.w,
          y: (o.y - B.y) / B.h,
          a: o.a,
          w: o.w,
          h: o.h,
          r: o.r,
        })),
      },
    };

    this.send(packet);
  }

  sendGuestFlick(dirX: number, dirY: number, pw: number, t: number) {
    if (this.state.role !== 'guest' || !this.state.connected) return;
    this.send({
      type: 'flick',
      player: 1,
      dirX,
      dirY,
      pw,
      t,
    });
  }

  sendRoundAction(action: 'next' | 'rst') {
    this.send({ type: 'action', action });
  }

  leave() {
    this.closing = true;
    if (this.state.role === 'guest') {
      this.send({ type: 'leave' });
    } else if (this.state.connected) {
      this.send({ type: 'closed', reason: 'The host closed the room.' });
    }
    this.cleanup();
    this.notify();
  }

  cleanup() {
    this.closing = true;
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.clearConnectionTimer();
    if (this.recoveryTimer !== null) window.clearTimeout(this.recoveryTimer);
    this.recoveryTimer = null;
    if (this.state.conn) {
      try {
        this.state.conn.close();
      } catch (e) {}
      this.state.conn = null;
    }
    if (this.state.peer && !this.state.peer.destroyed) {
      try {
        this.state.peer.destroy();
      } catch (e) {}
      this.state.peer = null;
    }
    this.state = {
      role: null,
      peer: null,
      conn: null,
      connected: false,
      room: '',
      invite: '',
      localName: 'Player',
      remoteName: 'Opponent',
      localPen: 0,
      remotePen: 1,
      series: 1,
      clock: 0,
      clutter: 0,
      started: false,
      lastSeq: 0,
      lastGameId: null,
      qrDataUrl: null,
      hostPen: 0,
      guestPen: 1,
      hostPenName: 'Pen',
      guestPenName: 'Pen',
    };
    this.closing = false;
  }
  private safePen(value: unknown): number {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n < assetStore.pens.length ? n : 0;
  }

  private lobbyPacket(started = this.state.started) {
    return {
      type: 'lobby',
      host: this.state.localName,
      guest: this.state.remoteName,
      hostPen: this.state.localPen,
      guestPen: this.state.remotePen,
      hostPenName: assetStore.pens[this.state.localPen]?.n || 'Pen',
      guestPenName: assetStore.pens[this.state.remotePen]?.n || 'Pen',
      series: this.state.series,
      clock: this.state.clock,
      clutter: this.state.clutter,
      started,
    };
  }

  private clearConnectionTimer() {
    if (this.connectionTimer !== null) window.clearTimeout(this.connectionTimer);
    this.connectionTimer = null;
  }

  private failConnection(message: string) {
    this.clearConnectionTimer();
    this.onToast?.(message);
    if (this.state.role === 'guest' && this.state.conn) {
      try { this.state.conn.close(); } catch (e) {}
      this.state.conn = null;
      this.state.connected = false;
      this.onOpponentDisconnected?.(message);
    } else if (this.state.role === 'host') {
      this.state.connected = false;
      this.notify();
    }
  }

  private watchPeer(peer: Peer) {
    peer.on('disconnected', () => {
      if (this.closing || this.state.peer !== peer || peer.destroyed) return;
      this.onToast?.('Room service disconnected. Trying to reconnect…');
      if (this.recoveryTimer !== null) window.clearTimeout(this.recoveryTimer);
      this.recoveryTimer = window.setTimeout(() => {
        this.recoveryTimer = null;
        if (this.closing || this.state.peer !== peer || peer.destroyed || !peer.disconnected) return;
        try { peer.reconnect(); } catch (e) {
          this.onToast?.('Room service recovery failed. Rejoin the room if needed.');
        }
      }, 1200);
    });
  }

  reconnect() {
    const previous = this.lastJoin;
    if (!previous) {
      this.onToast?.('Create or join a room first.');
      return;
    }
    this.joinRoom(previous.roomCode, previous.name, previous.pen, previous.series);
  }

  private isValidSnapshot(message: any): boolean {
    if (!Number.isSafeInteger(Number(message.seq)) || Number(message.seq) < 1) return false;
    const g = message.game, m = message.match;
    if (!g || !m || !Array.isArray(g.pl) || g.pl.length !== 2 ||
        !Array.isArray(g.obs) || g.obs.length > 10 ||
        !Array.isArray(m.scores) || m.scores.length !== 2 ||
        !['aim', 'sim', 'over'].includes(g.st) ||
        !Number.isInteger(Number(g.t)) || g.t < 0 || g.t > 1) return false;
    return g.pl.every((p: any) =>
      p && Number.isInteger(Number(p.i)) && p.i >= 0 && p.i <= 1 &&
      ['x', 'y', 'vx', 'vy', 'angle', 'av'].every((key) => Number.isFinite(Number(p[key]))) &&
      Math.abs(Number(p.x)) <= 3 && Math.abs(Number(p.y)) <= 3 &&
      Math.abs(Number(p.vx)) <= 5 && Math.abs(Number(p.vy)) <= 5
    );
  }

}

export const multiplayerManager = new MultiplayerManager();
