import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MatchState, LivePlayer, GameSettings } from '../types';
import { CX, CY, W, H, MAXD, PC } from '../constants';
import { assetStore } from '../assetsManager';
import { Pen3DBuilder } from './Pen3DBuilder';
import { Desk3DBuilder } from './Desk3DBuilder';
import { Obstacles3DBuilder } from './Obstacles3DBuilder';
import { AimGuide3D } from './AimGuide3D';

export class ThreeManager {
  container: HTMLDivElement | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  controls: OrbitControls | null = null;

  isSoftwareGl = false;

  deskGroup: THREE.Group | null = null;
  penMeshes: Map<number, THREE.Group> = new Map();
  obsMeshes: Map<number, THREE.Group> = new Map();
  aimGuide: AimGuide3D | null = null;

  inkTexture: THREE.CanvasTexture | null = null;
  inkMesh: THREE.Mesh | null = null;

  raycaster = new THREE.Raycaster();
  groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  planeIntersection = new THREE.Vector3();
  ndcVector = new THREE.Vector2();

  disposed = false;

  init(container: HTMLDivElement, woodCanvas: HTMLCanvasElement, inkCanvas: HTMLCanvasElement) {
    this.container = container;
    this.disposed = false;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // 3. Scene & Camera setup
    const scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color(0x0b0b0d);

    const width = container.clientWidth || W;
    const height = container.clientHeight || H;
    const aspect = width / height;

    const camera = new THREE.PerspectiveCamera(46, aspect, 10, 3200);
    this.camera = camera;
    // Angled classroom-desk view: enough perspective to show the tabletop
    // thickness and legs, while keeping the whole play surface readable.
    camera.position.set(0, 760, 520);
    camera.lookAt(0, -35, 0);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    this.controls = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // don't go below desk level
    controls.minDistance = 300;
    controls.maxDistance = 1400;
    controls.target.set(0, -35, 0);

    // 5. Studio Environment Map (PMREMGenerator + RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Balanced 3-Point Studio Lighting
    // Warm morning classroom sun key light
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.0);
    keyLight.position.set(280, 600, 320);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 100;
      keyLight.shadow.camera.far = 1200;
      keyLight.shadow.camera.left = -500;
      keyLight.shadow.camera.right = 500;
      keyLight.shadow.camera.top = 350;
      keyLight.shadow.camera.bottom = -350;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Cool fill light
    const hemiLight = new THREE.HemisphereLight(0xdce8ff, 0x221c18, 0.7);
    scene.add(hemiLight);

    // Subtle rim backlight
    const rimLight = new THREE.DirectionalLight(0xffe8d6, 0.6);
    rimLight.position.set(-300, 400, -350);
    scene.add(rimLight);

    // 7. Procedural 3D Desk
    const desk = Desk3DBuilder.createDesk(
      assetStore.benchBounds,
      woodCanvas,
      renderer,
      this.isSoftwareGl
    );
    this.deskGroup = desk;
    scene.add(desk);

    // 8. Ink Layer Mesh on top of table
    const inkTexture = new THREE.CanvasTexture(inkCanvas);
    inkTexture.colorSpace = THREE.SRGBColorSpace;
    this.inkTexture = inkTexture;
    const inkGeo = new THREE.PlaneGeometry(assetStore.benchBounds.w, assetStore.benchBounds.h);
    const inkMat = new THREE.MeshBasicMaterial({
      map: inkTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    inkMesh.rotation.x = -Math.PI / 2;
    inkMesh.position.y = 0.4;
    this.inkMesh = inkMesh;
    scene.add(inkMesh);

    // 9. 3D Aim Guide
    const aimGuide = new AimGuide3D();
    this.aimGuide = aimGuide;
    scene.add(aimGuide.group);

    this.resize();
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  resetCamera() {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(0, 760, 520);
    this.controls.target.set(0, -35, 0);
    this.controls.update();
  }

  syncWithMatch(
    match: MatchState | null,
    drag: { x: number; y: number; t: number } | null,
    settings: GameSettings,
    onPowerChange?: (pw: number) => void
  ) {
    if (!this.scene || !this.renderer || !this.camera || this.disposed) return;

    // Update Ink Texture
    if (settings.ink && this.inkTexture) {
      this.inkTexture.needsUpdate = true;
    }

    if (!match) {
      this.aimGuide?.hide();
      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const now = performance.now();
    const cur = match.pl[match.t];

    // 1. Synchronize Pen Models
    for (const p of match.pl) {
      let mesh = this.penMeshes.get(p.i);

      if (!mesh) {
        const penDef = assetStore.pens[p.pen] || assetStore.pens[0];
        mesh = Pen3DBuilder.createPenModel(penDef, p.i, this.isSoftwareGl);
        this.scene.add(mesh);
        this.penMeshes.set(p.i, mesh);
      }

      const b = p.body;
      const posX = b.position.x - CX;
      const posZ = b.position.y - CY;

      if (!p.fell) {
        if (p.alive) {
          mesh.visible = true;
          mesh.position.x = posX;
          mesh.position.z = posZ;
          mesh.position.y = 5.2 + p.z * 1.5;
          mesh.rotation.y = -b.angle;
          mesh.rotation.x = p.pt;
          mesh.rotation.z = 0;
        } else {
          mesh.visible = false;
        }
      } else {
        // Falling off table animation in 3D
        const ft = p.ft || now;
        const q = Math.max(0, Math.min(1, (now - ft) / 700));
        const dx = (p.fdX || 0) * 80 * q;
        const dz = (p.fdY || 1) * 80 * q;
        const fallY = -Math.pow(q * 16, 2);

        mesh.position.x = posX + dx;
        mesh.position.z = posZ + dz;
        mesh.position.y = 5.2 + fallY;
        mesh.rotation.y = -b.angle + q * 2.5;
        mesh.rotation.x = q * 4.0;
        mesh.rotation.z = q * 3.0;

        if (q >= 1) {
          mesh.visible = false;
        }
      }
    }

    // 2. Synchronize Obstacles
    if (match.obs) {
      match.obs.forEach((o, idx) => {
        let oMesh = this.obsMeshes.get(idx);
        if (!oMesh) {
          oMesh = Obstacles3DBuilder.createObstacleModel(o, this.isSoftwareGl);
          this.scene!.add(oMesh);
          this.obsMeshes.set(idx, oMesh);
        }
        oMesh.position.x = o.x - CX;
        oMesh.position.z = o.y - CY;
        oMesh.rotation.y = -o.a;
      });
    }

    // 3. 3D Aim Guide & Slingshot Arrow
    let pwv = 0;
    if (drag && match.st === 'aim' && cur) {
      const bPos = cur.body.position;
      const c = Math.cos(cur.body.angle);
      const s = Math.sin(cur.body.angle);

      const cpX = bPos.x + c * drag.t;
      const cpY = bPos.y + s * drag.t;

      const vx = cpX - drag.x;
      const vy = cpY - drag.y;
      const len = Math.hypot(vx, vy);

      if (len >= 18) {
        const pw = Math.min(len, MAXD) / MAXD;
        const ang = Math.atan2(vy, vx);
        pwv = pw;

        const origin3DX = cpX - CX;
        const origin3DZ = cpY - CY;
        const playerColor = PC[cur.i % PC.length];

        this.aimGuide?.update(
          origin3DX,
          origin3DZ,
          ang,
          pw,
          playerColor,
          !!settings.asst
        );
      } else {
        this.aimGuide?.hide();
      }
    } else {
      this.aimGuide?.hide();
    }

    if (onPowerChange) onPowerChange(pwv);

    // 4. Update OrbitControls and Render
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  // Convert 2D client pointer (clientX, clientY) to desk ground coordinates (X, Y in 960x600 space)
  screenToPointerDesk(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.container || !this.camera) return null;
    const rect = this.container.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.ndcVector.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.ndcVector, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.planeIntersection);
    if (!hit) return null;

    // Convert 3D ground coordinates to 2D Matter world coordinates
    return {
      x: hit.x + CX,
      y: hit.z + CY,
    };
  }

  setControlsEnabled(enabled: boolean) {
    if (this.controls) {
      this.controls.enabled = enabled;
    }
  }

  dispose() {
    this.disposed = true;
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    this.penMeshes.clear();
    this.obsMeshes.clear();
  }
}

export const threeManager = new ThreeManager();
