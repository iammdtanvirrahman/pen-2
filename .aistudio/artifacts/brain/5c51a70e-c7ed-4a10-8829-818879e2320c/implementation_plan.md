# 3D Pen Game: Three.js Classroom Arena & Procedural Pen Models

Upgrade Pen Game with a rich, interactive 3D Three.js rendering pipeline that replaces 2D canvas sprites with tactile, multi-part procedural 3D pen models on an authentic wood-textured classroom desk, while retaining the proven 60fps Matter.js physics engine, local pass-and-play, and PeerJS multiplayer.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during interactive requirements gathering:
> - **Primary Upgrade**: 3D desk scene built with Three.js featuring realistic procedural 3D pen models (barrel, ink tube, grip ribs, metal cone, steel ballpoint, pocket clip, clicker plunger).
> - **Camera Choreography**: Classic overhead top-down view by default with smooth orbit camera controls for 360° desk inspection and dynamic impact zoom.
> - **Persistence & Multiplayer**: Retain local pass-and-play and direct PeerJS room sharing without requiring third-party cloud accounts.

- **2D / 3D Seamless Toggle**: Provide a quick toggle between the classic high-res 2D canvas view and the new 3D Three.js viewport in the HUD and Settings so players on lower-end devices or battery saver modes can always choose their preferred visual mode.
- **Physics Authority**: Maintain the existing Matter.js 2D simulation coordinates as the authoritative physics driver (X/Y coordinates, collisions, and Z-hops mapped seamlessly to 3D world space) ensuring zero gameplay disruptions, zero physics regressions, and full compatibility with PeerJS networking.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the Bangladeshi school-bench pen game into a tactile 3D experience. Players view a classroom wooden bench in full 3D with realistic studio PBR lighting, soft contact shadows, depth of field, and procedural pens built from physical materials (translucent plastic barrels, metallic clips, rubber grip ribs, and ink cartridges).
- **Target Audience / Persona**: Casual gamers, nostalgic schoolmates, and multiplayer duelists seeking the authentic feel of school-desk pen fighting with modern 3D graphics and responsive slingshot controls.
- **Key Value**: Delivers depth, weight, and spatial drama to every flick and table-edge knockdown without sacrificing the instant responsiveness of the 2D slingshot drag.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Title & Match Start**: The player launches into a 3D desk view. The desk features realistic wood grain, carved doodles, and soft warm classroom ambient lighting. A sleek bottom HUD and perimeter badges show player rosters.
2. **Aiming & Slingshot Drag**: On their turn, the active player clicks/touches their 3D pen. A luminous 3D directional arrow with color gradient projects across the desk surface, indicating power and trajectory. Orbit controls automatically lock during active drag so aim is rock-solid.
3. **Flick & 3D Flight**: Releasing launches the pen. Off-center hard flicks trigger real 3D vertical hops with pitch tilt, dynamic contact shadows, and wood impact sound.
4. **Collision & Knockdown**: Pens collide with metallic clacks, generating 3D spark particles. Pens crossing the desk edge tumble down off the table in 3D perspective before being eliminated.
5. **Round & Series Tally**: Victory celebrations trigger 3D confetti ribbons raining down over the desk, presenting the series score summary.

### Visual Identity & Theme
- **Aesthetic Direction**: Authentic nostalgic classroom realism meets sleek modern game shell. Warm studio key light (amber morning classroom sun) paired with cool ambient fill and soft contact shadows.
- **Color Palette & Mood**:
  - Dominant Neutral: Deep charcoal desk floor (`#0b0b0d`), aged teak wood planks (`#b57c44` to `#6b4220`).
  - Player Accents: Vibrant student ink tones (`#3b82f6` Royal Blue, `#dc3545` Crimson, `#22c55e` Emerald, `#f59e0b` Amber, `#a855f7` Purple, `#06b6d4` Cyan).
  - Material Finishes: High-gloss clear acrylic (`roughness: 0.1, transmission: 0.9`), brushed chrome clip (`metalness: 0.9, roughness: 0.2`), matte rubber grip (`roughness: 0.8`).
- **Typography & Hierarchy**: *Permanent Marker* for brand headings and doodle engravings; *Hind Siliguri* for clean tabular numerals and player stats.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid Matter.js 2D Physics + Three.js 3D Presentation**
  - *Chosen Approach*: Matter.js handles the authoritative 2D collision geometry, restitution, angular spin, and boundary checks. Three.js synchronizes mesh positions, rotations, and vertical Z-hops (`mesh.position.set(x, zElevation, y)`).
  - *Why*: Eliminates complex 3D rigid-body tunneling bugs while guaranteeing 100% deterministic local and online PeerJS multiplayer.
  - *Alternatives Considered*: Migrating to Rapier3D or Cannon.js — rejected because it would require rewriting proven collision algorithms and networking packets.

- **Decision 2: 100% Procedural 3D Geometry and Textures**
  - *Chosen Approach*: Build pen models as 7-part `THREE.Group` meshes (`CylinderGeometry` barrel, inner ink capillary tube, ribbed grip, `ConeGeometry` tip, steel ball sphere, metal clip, top clicker) and procedural canvas textures for desk wood grain and doodles.
  - *Why*: Zero external asset downloads, zero 404 risks, instant loading, and infinite color/material variation.

- **Decision 3: Camera Perspectives (Overhead + Orbit Controls)**
  - *Chosen Approach*: Default overhead camera angled slightly (75° elevation) for optimal slingshot aiming, with smooth OrbitControls allowing the user to rotate and tilt the view when not actively dragging.
  - *Why*: Gives players full tactical overview during play while allowing cinematic 3D appreciation between turns.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                               REACT APP                                │
│                                                                        │
│   ┌───────────────────────┐             ┌──────────────────────────┐   │
│   │     HUD & Modals      │             │    MultiplayerManager    │   │
│   │  (Score, Turn, Pause) │             │    (WebRTC / PeerJS)     │   │
│   └───────────┬───────────┘             └─────────────┬────────────┘   │
│               │                                       │                │
│   ┌───────────▼───────────────────────────────────────▼────────────┐   │
│   │                           GameEngine                           │   │
│   │  - Matter.js 2D Rigid Bodies (Position, Velocity, Spin)        │   │
│   │  - Z-Hop Dynamics & Slingshot Trajectory Calculations          │   │
│   │  - Series State, Shot Clocks & Eliminator Resolution           │   │
│   └───────────┬────────────────────────────────────────────────────┘   │
│               │                                                        │
│               ▼                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                   ThreeSceneRenderer (WebGL)                   │   │
│   │  - Scene, PerspectiveCamera, OrbitControls (damping: 0.05)     │   │
│   │  - Studio PBR Lighting: Key Directional + Hemisphere + Shadows │   │
│   │  - Procedural Wood Desk with Beveled Edges & Doodle Shaders    │   │
│   │  - 3D Multi-Part Procedural Pen Groups (Barrel, Tip, Clip)     │   │
│   │  - 3D Obstacles (Eraser, Sharpener, Glue Stick)                │   │
│   │  - 3D Slingshot Aim Arrow & Ink Surface Decals Layer           │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Implementation Breakdown
1. **`src/three/ThreeScene.ts`**: Core Three.js lifecycle manager (scene, camera, PBR renderer, PMREM studio environment, PCF soft shadows, animation loop with frame clamping).
2. **`src/three/PenModelBuilder.ts`**: Procedural 3D model generator assembling 7-part pen groups (`MeshPhysicalMaterial` for transparent plastic, metallic clips, colored ink refills).
3. **`src/three/DeskBuilder.ts`**: Procedural beveled desk mesh with realistic wood grain textures, etched doodles, ruler marks, and bolts.
4. **`src/three/AimGuide3D.ts`**: Interactive 3D trajectory arrow mesh dynamically scaling with drag distance and color gradient.
5. **`src/three/ObstacleBuilder.ts`**: 3D procedural meshes for the student eraser, sharpener, and glue stick.
6. **`src/App.tsx` Integration**: Mounts the 3D viewport with pointer event raycasting for seamless pen picking and slingshot dragging.
