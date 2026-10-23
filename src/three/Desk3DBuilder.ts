import * as THREE from 'three';
import { BenchBounds } from '../types';

export class Desk3DBuilder {
  static createDesk(
    bounds: BenchBounds,
    woodCanvas: HTMLCanvasElement,
    renderer: THREE.WebGLRenderer,
    isSoftwareGl = false
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'classroom_desk';

    const width = bounds.w;
    const depth = bounds.h;
    const thickness = 22;

    // 1. Procedural Desk Wood Texture from Canvas
    const woodTexture = new THREE.CanvasTexture(woodCanvas);
    woodTexture.colorSpace = THREE.SRGBColorSpace;
    if (renderer && renderer.capabilities) {
      woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    woodTexture.needsUpdate = true;

    // Table Top Materials
    const topMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.65,
      metalness: 0.05,
    });

    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5a3418,
      roughness: 0.75,
      metalness: 0.05,
    });

    const metalBoltMat = new THREE.MeshStandardMaterial({
      color: 0x8d9199,
      roughness: 0.35,
      metalness: 0.85,
    });

    // 2. Desk Top Board (Box with beveled look)
    const topGeo = new THREE.BoxGeometry(width, thickness, depth);
    const topMesh = new THREE.Mesh(topGeo, [
      darkWoodMat, // right
      darkWoodMat, // left
      topMat,      // top surface
      darkWoodMat, // bottom
      darkWoodMat, // front
      darkWoodMat, // back
    ]);
    topMesh.position.set(0, -thickness / 2, 0);
    topMesh.receiveShadow = !isSoftwareGl;
    topMesh.castShadow = !isSoftwareGl;
    group.add(topMesh);

    // 3. Wooden Rim Apron Underneath
    const apronHeight = 35;
    const apronWidth = width - 40;
    const apronDepth = depth - 40;

    const apronGeo = new THREE.BoxGeometry(apronWidth, apronHeight, apronDepth);
    const apronMesh = new THREE.Mesh(apronGeo, darkWoodMat);
    apronMesh.position.set(0, -thickness - apronHeight / 2, 0);
    apronMesh.castShadow = !isSoftwareGl;
    group.add(apronMesh);

    // 4. Desk Legs (Four tubular steel or wooden classroom legs)
    const legRadius = 8;
    const legHeight = 180;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      metalness: 0.7,
      roughness: 0.4,
    });

    const legOffsets = [
      [-width / 2 + 35, -depth / 2 + 35],
      [width / 2 - 35, -depth / 2 + 35],
      [-width / 2 + 35, depth / 2 - 35],
      [width / 2 - 35, depth / 2 - 35],
    ];

    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, -thickness - apronHeight - legHeight / 2 + 10, lz);
      leg.castShadow = !isSoftwareGl;
      group.add(leg);

      // Metal Joint Bolt on table top
      const boltGeo = new THREE.CylinderGeometry(4.5, 4.5, 2, 12);
      const bolt = new THREE.Mesh(boltGeo, metalBoltMat);
      bolt.position.set(lx, 0.5, lz);
      group.add(bolt);
    });

    // 5. Classroom Floor Plane (deep background to anchor shadows)
    const floorGeo = new THREE.PlaneGeometry(2400, 2000);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f0e11,
      roughness: 0.95,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -thickness - apronHeight - legHeight + 10;
    floorMesh.receiveShadow = !isSoftwareGl;
    group.add(floorMesh);

    return group;
  }
}
