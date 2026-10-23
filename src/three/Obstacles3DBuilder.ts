import * as THREE from 'three';
import { Obstacle } from '../types';

export class Obstacles3DBuilder {
  static createObstacleModel(obs: Obstacle, isSoftwareGl = false): THREE.Group {
    const group = new THREE.Group();
    group.name = `obs_${obs.k}`;

    if (obs.k === 'eraser') {
      const w = obs.w; // ~58
      const h = obs.h; // ~26
      const depth = 16;

      // Pink eraser rubber core
      const eraserGeo = new THREE.BoxGeometry(w, depth, h);
      const rubberMat = new THREE.MeshStandardMaterial({
        color: 0xefa7b0,
        roughness: 0.9,
        metalness: 0.05,
      });
      const eraserMesh = new THREE.Mesh(eraserGeo, rubberMat);
      eraserMesh.castShadow = !isSoftwareGl;
      eraserMesh.receiveShadow = !isSoftwareGl;
      group.add(eraserMesh);

      // Blue paper protective sleeve
      const sleeveWidth = w - 24;
      const sleeveGeo = new THREE.BoxGeometry(sleeveWidth, depth + 0.5, h + 0.5);
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        roughness: 0.6,
        metalness: 0.1,
      });
      const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeveMesh.castShadow = !isSoftwareGl;
      group.add(sleeveMesh);

      group.position.y = depth / 2;
    } else if (obs.k === 'sharpener') {
      const w = obs.w; // ~36
      const h = obs.h; // ~24
      const depth = 14;

      // Metal body
      const bodyGeo = new THREE.BoxGeometry(w, depth, h);
      const metalMat = new THREE.MeshStandardMaterial({
        color: 0xbac0ca,
        metalness: 0.9,
        roughness: 0.25,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, metalMat);
      bodyMesh.castShadow = !isSoftwareGl;
      group.add(bodyMesh);

      // Steel blade strip
      const bladeGeo = new THREE.BoxGeometry(w - 6, 0.6, 7);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x24262b,
        metalness: 0.95,
        roughness: 0.1,
      });
      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      bladeMesh.position.set(2, depth / 2 + 0.3, 0);
      group.add(bladeMesh);

      // Tiny center screw
      const screwGeo = new THREE.CylinderGeometry(1.6, 1.6, 1, 10);
      const screwMesh = new THREE.Mesh(screwGeo, metalMat);
      screwMesh.position.set(4, depth / 2 + 0.6, 0);
      group.add(screwMesh);

      // Hole for pencil
      const holeGeo = new THREE.CylinderGeometry(4.5, 4.5, 2, 16);
      holeGeo.rotateZ(Math.PI / 2);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 1 });
      const holeMesh = new THREE.Mesh(holeGeo, holeMat);
      holeMesh.position.set(-w / 2 + 0.8, 0, 0);
      group.add(holeMesh);

      group.position.y = depth / 2;
    } else {
      // Glue Stick
      const r = obs.r; // ~17
      const height = 48;

      // Glue container tube (purple)
      const tubeGeo = new THREE.CylinderGeometry(r, r, height * 0.7, 24);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        roughness: 0.4,
        metalness: 0.1,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.position.set(0, (height * 0.7) / 2, 0);
      tubeMesh.castShadow = !isSoftwareGl;
      group.add(tubeMesh);

      // Yellow top cap
      const capGeo = new THREE.CylinderGeometry(r + 0.4, r + 0.4, height * 0.3, 24);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.35,
        metalness: 0.1,
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.set(0, height * 0.7 + (height * 0.3) / 2, 0);
      capMesh.castShadow = !isSoftwareGl;
      group.add(capMesh);

      group.position.y = 0;
    }

    return group;
  }
}
