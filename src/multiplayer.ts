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
  };

  syncInterval: number | null = null;
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
    this.state.role = 'host';
    this.state.localName = name;
    this.state.localPen = pen;
    this.state.series = series;
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

      peer.on('open', (id) => {
        if (this.closing || this.state.role !== 'host') return;
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
    this.state.role = 'guest';
    this.state.localName = name;
    this.state.localPen = pen;
    this.state.series = series;
    this.state.room = cleanRoom;
    this.state.invite = getInviteUrl(cleanRoom);
    this.notify();

    try {
      const peer = new Peer({ debug: 0 });
      this.state.peer = peer;

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
      this.state.connected = true;

      if (this.state.role === 'guest') {
        this.send({ type: 'hello', name: this.state.localName, pen: this.state.localPen });
      } else {
        this.state.remoteName = String(conn.metadata?.name || 'Opponent').slice(0, 14);
        this.state.remotePen = Number(conn.metadata?.pen ?? 1);
        this.send({
          type: 'lobby',
          host: this.state.localName,
          guest: this.state.remoteName,
          started: this.state.started,
        });
      }
      this.notify();
    });

    conn.on('data', (data: any) => {
      this.handleMessage(data);
    });

    conn.on('close', () => {
      if (this.closing || this.state.conn !== conn) return;
      if (this.state.role === 'host') {
        this.state.connected = false;
        this.state.remoteName = 'Opponent';
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
    if (!message || typeof message !== 'object') return;

    if (this.state.role === 'host') {
      if (message.type === 'hello') {
        this.state.remoteName = String(message.name || 'Opponent').trim().slice(0, 14) || 'Opponent';
        this.state.remotePen = Number(message.pen ?? 1);
        this.state.connected = true;
        this.send({
          type: 'lobby',
          host: this.state.localName,
          guest: this.state.remoteName,
          started: this.state.started,
        });
        this.notify();
        return;
      }

      if (message.type === 'flick') {
        // Guest submitted a flick
        const B = assetStore.benchBounds;
        const ang = Math.atan2(Number(message.dirY) * B.h, Number(message.dirX) * B.w);
        const pw = Math.min(1, Math.max(0, Number(message.pw)));
        const t = Number(message.t) || 0;
        this.onGuestFlickReceived?.(ang, pw, t);
        return;
      }

      if (message.type === 'action') {
        if (message.action === 'next' || message.action === 'rst') {
          this.onRoundActionReceived?.(message.action);
        } else if (message.action === 'leave') {
          this.send({ type: 'closed', reason: 'Opponent left the room.' });
          this.state.connected = false;
          this.notify();
        }
        return;
      }

      if (message.type === 'leave') {
        this.state.connected = false;
        this.notify();
      }
      return;
    }

    // Guest handlers
    if (message.type === 'lobby') {
      this.state.remoteName = String(message.host || 'Host').slice(0, 14);
      if (message.started && !this.state.started) {
        this.state.started = true;
      }
      this.notify();
      return;
    }

    if (message.type === 'state') {
      this.onIncomingState?.(message as NetStatePacket);
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
      clock: 0,
      clutter: 0,
      pl: [
        { name: this.state.localName, ai: 0, pen: this.state.localPen },
        { name: this.state.remoteName || 'Opponent', ai: 0, pen: this.state.remotePen },
      ],
    };

    this.state.started = true;
    this.send({
      type: 'lobby',
      host: this.state.localName,
      guest: this.state.remoteName,
      started: true,
    });
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
      started: false,
      lastSeq: 0,
      lastGameId: null,
      qrDataUrl: null,
    };
    this.closing = false;
  }
}

export const multiplayerManager = new MultiplayerManager();
