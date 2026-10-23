import * as THREE from 'three';
import { PenDef } from '../types';
import { PC } from '../constants';

export class Pen3DBuilder {
  static createPenModel(
    penDef: PenDef,
    playerIndex: number,
    isSoftwareGl = false
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `pen_${playerIndex}`;

    const playerColorHex = PC[playerIndex % PC.length];
    const playerColor = new THREE.Color(playerColorHex);
    const barrelColor = new THREE.Color(penDef.c || '#1e40af');
    const inkColor = new THREE.Color(penDef.ink || penDef.c || '#1e40af');
    const gripColor = new THREE.Color(penDef.g || '#14171d');

    const isStickPen = penDef.k === 'stick';

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xd9dde3,
      metalness: 0.9,
      roughness: 0.2,
    });

    const brassTipMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25,
    });

    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.95,
      roughness: 0.1,
    });

    const gripMat = new THREE.MeshStandardMaterial({
      color: gripColor,
      roughness: 0.85,
      metalness: 0.05,
    });

    const playerStripeMat = new THREE.MeshStandardMaterial({
      color: playerColor,
      roughness: 0.3,
      metalness: 0.2,
      emissive: playerColor,
      emissiveIntensity: 0.15,
    });

    // 1. Barrel Body
    // Matter.js pen is 84px * 1.3 ≈ 109.2 in physics. In 3D world, length is 100, radius is 5.5.
    const barrelLength = 60;
    const barrelRadius = 5.2;

    const barrelMat = penDef.c?.includes('rgba')
      ? new THREE.MeshPhysicalMaterial({
          color: barrelColor,
          roughness: 0.15,
          transmission: isSoftwareGl ? 0 : 0.85,
          transparent: true,
          opacity: isSoftwareGl ? 0.45 : 0.9,
          ior: 1.48,
          thickness: 1.2,
        })
      : new THREE.MeshStandardMaterial({
          color: barrelColor,
          roughness: 0.35,
          metalness: 0.15,
        });

    const barrelGeo = isStickPen
      ? new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 6)
      : new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 20);
    barrelGeo.rotateZ(Math.PI / 2);

    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.position.set(-10, 0, 0);
    barrelMesh.castShadow = !isSoftwareGl;
    barrelMesh.receiveShadow = !isSoftwareGl;
    group.add(barrelMesh);

    // 2. Inner Ink Cartridge Tube (visible inside clear barrels)
    const inkTubeRadius = 1.6;
    const inkTubeLength = barrelLength + 10;
    const inkGeo = new THREE.CylinderGeometry(inkTubeRadius, inkTubeRadius, inkTubeLength, 12);
    inkGeo.rotateZ(Math.PI / 2);
    const inkMat = new THREE.MeshStandardMaterial({
      color: inkColor,
      roughness: 0.5,
      metalness: 0.1,
    });
    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    inkMesh.position.set(-8, 0, 0);
    group.add(inkMesh);

    // 3. Player Identity Color Band (stripe around barrel)
    const bandLength = 3.5;
    const bandGeo = new THREE.CylinderGeometry(barrelRadius + 0.1, barrelRadius + 0.1, bandLength, 20);
    bandGeo.rotateZ(Math.PI / 2);
    const bandMesh = new THREE.Mesh(bandGeo, playerStripeMat);
    bandMesh.position.set(-10, 0, 0);
    group.add(bandMesh);

    // 4. Rubber Grip Section with Ribbed Rings
    const gripLength = 22;
    const gripRadius = barrelRadius + 0.2;
    const gripGeo = new THREE.CylinderGeometry(gripRadius, gripRadius, gripLength, 20);
    gripGeo.rotateZ(Math.PI / 2);
    const gripMesh = new THREE.Mesh(gripGeo, gripMat);
    gripMesh.position.set(16, 0, 0);
    gripMesh.castShadow = !isSoftwareGl;
    group.add(gripMesh);

    // Ribbed rings along the grip
    const ringGeo = new THREE.TorusGeometry(gripRadius + 0.1, 0.4, 6, 16);
    ringGeo.rotateY(Math.PI / 2);
    for (let x = 8; x <= 24; x += 3.2) {
      const ring = new THREE.Mesh(ringGeo, gripMat);
      ring.position.set(x, 0, 0);
      group.add(ring);
    }

    // 5. Metal Cone Nozzle & Tip
    const coneLength = 14;
    const coneGeo = new THREE.ConeGeometry(gripRadius, coneLength, 20);
    coneGeo.rotateZ(-Math.PI / 2);
    const coneMesh = new THREE.Mesh(coneGeo, isStickPen ? brassTipMat : metalMat);
    coneMesh.position.set(27 + coneLength / 2, 0, 0);
    coneMesh.castShadow = !isSoftwareGl;
    group.add(coneMesh);

    // 6. Tungsten Steel Writing Ballpoint
    const ballRadius = 1.0;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 10, 10);
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(41.5, 0, 0);
    group.add(ballMesh);

    // 7. Clicker Plunger or Back End Cap
    const backCapLength = 6;
    const backCapRadius = isStickPen ? barrelRadius - 0.5 : 3.6;
    const backCapGeo = new THREE.CylinderGeometry(backCapRadius, backCapRadius, backCapLength, 16);
    backCapGeo.rotateZ(Math.PI / 2);
    const backCapMesh = new THREE.Mesh(backCapGeo, isStickPen ? barrelMat : metalMat);
    backCapMesh.position.set(-40 - backCapLength / 2, 0, 0);
    group.add(backCapMesh);

    // 8. Metal Pocket Clip
    const clipWidth = 2.4;
    const clipHeight = 1.8;
    const clipLength = 24;
    const clipGeo = new THREE.BoxGeometry(clipLength, clipHeight, clipWidth);
    const clipMesh = new THREE.Mesh(clipGeo, metalMat);
    clipMesh.position.set(-28, barrelRadius + 0.8, 0);
    clipMesh.castShadow = !isSoftwareGl;
    group.add(clipMesh);

    // Clip base connector
    const clipBaseGeo = new THREE.BoxGeometry(3, barrelRadius * 0.4, clipWidth);
    const clipBaseMesh = new THREE.Mesh(clipBaseGeo, metalMat);
    clipBaseMesh.position.set(-39, barrelRadius + 0.3, 0);
    group.add(clipBaseMesh);

    // Elevation pivot adjustment so pen body sits flush on desk surface
    group.position.y = barrelRadius;

    return group;
  }
}
