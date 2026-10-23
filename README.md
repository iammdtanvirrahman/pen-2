# Pen Game (কলম খেলবি?)

A modern React and TypeScript recreation of the classic school-bench pen game, powered by Vite and Matter.js physics. Take turns flicking your pen with a slingshot drag, knock rival pens off the bench, and keep yours on it. The last pen on the bench wins!

## Features

- **Realistic Physics Simulation**: Powered by Matter.js with mass, friction, air resistance, restitution, and angular velocity based on where you flick the pen.
- **Authentic Bangladeshi Classroom Aesthetic**: Procedural worn wooden desk with carved initials ("Class 9B ♥", "Roll 17"), tic-tac-toe doodles, ruler scratches, bolts, and ink stains.
- **Multiple Game Modes**:
  - **Local Match (2–6 players)**: Pass-and-play with custom names, controller types (Human or AI), and pen designs.
  - **Quick Match**: Jump immediately into a 2-player match.
  - **Practice vs AI**: Battle against multiple AI opponents with adaptive difficulty (Easy, Medium, Hard).
- **Match Lab & Customization**:
  - Roster lineup cards for 2 to 6 players.
  - Pen gallery with classic ballpoints, clear plastic pens, retractable click pens, and transparent barrel grip pens.
  - Bench skin selector with support for custom uploaded desks and directory assets.
- **Sound & Haptics**: Procedural Web Audio synthesizer generating flick whooshes, pen-on-pen clacks, and victory fanfares.
- **Statistics & Persistence**: Tracks games played, win rate, knockouts, average rank, favorite pen, and streaks in localStorage.
- **House Rules & Settings**: Adjustable flick strength (Gentle, Normal, Strong), surface friction (Classic, Slippery, Grippy), aim guide, accuracy jitter, and reduced motion mode.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```


## Version 5.0

The `5.0` branch adds PWA metadata and an SVG icon, service-worker app-shell caching, keyboard focus polish and a more defensive online-room manager. Multiplayer has connection timeouts, a PeerJS signalling reconnect attempt, bounds checks for incoming guest flicks and host snapshots, and stale packet rejection. Guests can retry the previous room while its host is still running.

### Build and smoke tests

```sh
npm ci
npm run build
npm test
```

The smoke suite checks PWA wiring, service-worker syntax and static multiplayer guards; it does not replace testing with two Android devices across different networks.

### Known online limitations

Online play still uses PeerJS/WebRTC. A managed TURN relay, persistent room service, account system, matchmaking and durable match restoration are not included. Reconnection can rejoin a live room but does not restore the previous physics session. Custom local uploads are not automatically transferred between peers.
