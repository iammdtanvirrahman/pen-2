import * as THREE from 'three';

export class AimGuide3D {
  group: THREE.Group;
  arrowLine: THREE.Mesh;
  arrowHead: THREE.Mesh;
  reticleRing: THREE.Mesh;
  assistLine: THREE.Line;

  arrowMat: THREE.MeshBasicMaterial;
  reticleMat: THREE.MeshBasicMaterial;
  assistMat: THREE.LineDashedMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'aim_guide_3d';
    this.group.visible = false;

    // Arrow Material
    this.arrowMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });

    // Arrow Shaft (Box geometry)
    const lineGeo = new THREE.BoxGeometry(1, 1.2, 5);
    this.arrowLine = new THREE.Mesh(lineGeo, this.arrowMat);
    this.arrowLine.renderOrder = 999;
    this.group.add(this.arrowLine);

    // Arrow Tip (Cone geometry)
    const coneGeo = new THREE.ConeGeometry(5, 14, 12);
    coneGeo.rotateX(Math.PI / 2);
    this.arrowHead = new THREE.Mesh(coneGeo, this.arrowMat);
    this.arrowHead.renderOrder = 999;
    this.group.add(this.arrowHead);

    // Reticle Ring
    const ringGeo = new THREE.RingGeometry(18, 21, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.reticleMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    this.reticleRing = new THREE.Mesh(ringGeo, this.reticleMat);
    this.reticleRing.renderOrder = 998;
    this.group.add(this.reticleRing);

    // Aim Assist Guide Line
    const assistGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 150),
    ]);
    this.assistMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 4,
      gapSize: 4,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
    });
    this.assistLine = new THREE.Line(assistGeo, this.assistMat);
    this.assistLine.computeLineDistances();
    this.assistLine.renderOrder = 997;
    this.group.add(this.assistLine);
  }

  update(
    originX: number,
    originZ: number,
    angle: number,
    power: number,
    playerColorHex: string,
    showAssist: boolean
  ) {
    if (power <= 0) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    const len = 30 + power * 130;
    const arrowY = 1.0; // slightly above table

    // Arrow color gradient from green to red based on power
    const hue = Math.max(0, 120 - 120 * power);
    const color = new THREE.Color(`hsl(${hue}, 85%, 55%)`);
    this.arrowMat.color = color;

    // Position reticle ring at origin
    this.reticleRing.position.set(originX, arrowY, originZ);
    this.reticleMat.color = new THREE.Color(playerColorHex);

    // Direction vector
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);

    // Update arrow shaft
    this.arrowLine.scale.set(4, 1, len);
    this.arrowLine.position.set(
      originX + (dirX * len) / 2,
      arrowY,
      originZ + (dirZ * len) / 2
    );
    this.arrowLine.rotation.y = -angle + Math.PI / 2;

    // Update arrow head
    this.arrowHead.position.set(
      originX + dirX * (len + 7),
      arrowY,
      originZ + dirZ * (len + 7)
    );
    this.arrowHead.rotation.y = -angle + Math.PI / 2;

    // Update aim assist line
    if (showAssist) {
      this.assistLine.visible = true;
      this.assistLine.position.set(
        originX + dirX * (len + 15),
        arrowY,
        originZ + dirZ * (len + 15)
      );
      this.assistLine.rotation.y = -angle + Math.PI / 2;
    } else {
      this.assistLine.visible = false;
    }
  }

  hide() {
    this.group.visible = false;
  }
}
