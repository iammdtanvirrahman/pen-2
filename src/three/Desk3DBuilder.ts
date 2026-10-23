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

    // 1. Crop the procedural canvas to the actual tabletop.
    // The source canvas also contains the dark background; using it uncropped
    // would project that background onto the desk surface as a visible inset.
    const surfaceCanvas = document.createElement('canvas');
    surfaceCanvas.width = Math.max(1, Math.round(width));
    surfaceCanvas.height = Math.max(1, Math.round(depth));
    const surfaceContext = surfaceCanvas.getContext('2d');
    if (surfaceContext) {
      surfaceContext.drawImage(
        woodCanvas,
        bounds.x, bounds.y, bounds.w, bounds.h,
        0, 0, surfaceCanvas.width, surfaceCanvas.height
      );
    }
    const woodTexture = new THREE.CanvasTexture(surfaceCanvas);
    woodTexture.colorSpace = THREE.SRGBColorSpace;
    woodTexture.wrapS = THREE.ClampToEdgeWrapping;
    woodTexture.wrapT = THREE.ClampToEdgeWrapping;
    if (renderer && renderer.capabilities) {
      woodTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
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

    // 2b. Rounded-looking edge band: a thin warm timber lip and darker
    // underside reveal make the desktop read as a solid school desk.
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x8b572d,
      roughness: 0.58,
      metalness: 0.02,
    });
    const edgeDepth = 4;
    const frontEdge = new THREE.Mesh(
      new THREE.BoxGeometry(width - 10, edgeDepth, 5),
      edgeMat
    );
    frontEdge.position.set(0, -2, depth / 2 - 2.5);
    frontEdge.castShadow = !isSoftwareGl;
    group.add(frontEdge);

    const backEdge = frontEdge.clone();
    backEdge.position.z = -depth / 2 + 2.5;
    group.add(backEdge);

    const sideEdge = new THREE.Mesh(
      new THREE.BoxGeometry(5, edgeDepth, depth - 10),
      edgeMat
    );
    sideEdge.position.set(width / 2 - 2.5, -2, 0);
    sideEdge.castShadow = !isSoftwareGl;
    group.add(sideEdge);

    const leftEdge = sideEdge.clone();
    leftEdge.position.x = -width / 2 + 2.5;
    group.add(leftEdge);

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
