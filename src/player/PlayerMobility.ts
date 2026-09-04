import * as THREE from 'three';

export type MobilityMode = 'standard' | 'grapple' | 'glider' | 'katamari' | 'inverted_gravity';

export class PlayerMobility {
  public mode: MobilityMode = 'standard';
  public group = new THREE.Group();

  // 1. Grappling Hook
  public isGrappling = false;
  public grappleAnchor: THREE.Vector3 | null = null;
  private grappleLineMesh!: THREE.Line;
  private grappleLinePositions!: Float32Array;

  // 2. 6-DOF Orbital Glider
  public isGliderActive = false;
  public gliderMesh!: THREE.Group;
  public gliderVelocity = new THREE.Vector3();
  public gliderSpeed = 28.0; // Fast atmospheric cruising

  // 3. Katamari Accretion Mode
  public isKatamariActive = false;
  public katamariMesh!: THREE.Group;
  public katamariRadius = 2.0;
  public katamariItemsCount = 0;
  private attachedProps: THREE.Object3D[] = [];

  // 4. Non-Euclidean Spatial Portals
  public portalA!: THREE.Group;
  public portalB!: THREE.Group;

  // 5. Gravity Inversion
  public gravityDirection = new THREE.Vector3(0, -1, 0); // Default down

  constructor() {
    this.buildGrappleVisuals();
    this.buildGliderVisuals();
    this.buildKatamariVisuals();
    this.buildSpatialPortals();
  }

  private buildGrappleVisuals() {
    const geo = new THREE.BufferGeometry();
    this.grappleLinePositions = new Float32Array(6); // 2 points (x,y,z)
    geo.setAttribute('position', new THREE.BufferAttribute(this.grappleLinePositions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });
    this.grappleLineMesh = new THREE.Line(geo, mat);
    this.grappleLineMesh.visible = false;
    this.group.add(this.grappleLineMesh);
  }

  private buildGliderVisuals() {
    this.gliderMesh = new THREE.Group();
    this.gliderMesh.name = 'orbital_glider';
    this.gliderMesh.visible = false;

    // Swept delta wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-4.5, -2.5);
    wingShape.lineTo(-1.0, -1.8);
    wingShape.lineTo(0, -3.0);
    wingShape.lineTo(1.0, -1.8);
    wingShape.lineTo(4.5, -2.5);
    wingShape.closePath();

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.rotation.x = Math.PI / 2;
    this.gliderMesh.add(wingMesh);

    // Fuselage cockpit
    const fuseGeo = new THREE.ConeGeometry(0.8, 4.0, 8);
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    fuse.rotation.x = -Math.PI / 2;
    fuse.position.set(0, 0, -0.5);
    this.gliderMesh.add(fuse);

    this.group.add(this.gliderMesh);
  }

  private buildKatamariVisuals() {
    this.katamariMesh = new THREE.Group();
    this.katamariMesh.name = 'katamari_orb';
    this.katamariMesh.visible = false;

    // Core textured bumpy sphere
    const coreGeo = new THREE.DodecahedronGeometry(this.katamariRadius, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0xbe185d,
      emissiveIntensity: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.katamariMesh.add(coreMesh);

    // Bumpy studs
    const studGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const studMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    for (let i = 0; i < 20; i++) {
      const stud = new THREE.Mesh(studGeo, studMat);
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      stud.position.copy(dir).multiplyScalar(this.katamariRadius * 0.95);
      stud.lookAt(stud.position.clone().multiplyScalar(2));
      this.katamariMesh.add(stud);
    }

    this.group.add(this.katamariMesh);
  }

  private buildSpatialPortals() {
    // Portal A: Surface North Wing
    this.portalA = this.createPortalGate(new THREE.Vector3(0, 5, -55), 0x38bdf8);
    // Portal B: Subterranean Core
    this.portalB = this.createPortalGate(new THREE.Vector3(0, -36, 0), 0xa855f7);

    this.group.add(this.portalA);
    this.group.add(this.portalB);
  }

  private createPortalGate(position: THREE.Vector3, glowColor: number): THREE.Group {
    const gate = new THREE.Group();
    gate.position.copy(position);

    // Monolithic arch frame
    const archMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8), archMat);
    pillarLeft.position.set(-2, 3, 0);
    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8), archMat);
    pillarRight.position.set(2, 3, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.8), archMat);
    lintel.position.set(0, 6, 0);

    gate.add(pillarLeft);
    gate.add(pillarRight);
    gate.add(lintel);

    // Shimmering event horizon plane
    const eventGeo = new THREE.PlaneGeometry(3.6, 5.6);
    const eventMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const eventMesh = new THREE.Mesh(eventGeo, eventMat);
    eventMesh.position.set(0, 3, 0);
    gate.add(eventMesh);

    return gate;
  }

  // Traversal Actions
  public shootGrapple(fromPos: THREE.Vector3, targetPos: THREE.Vector3) {
    this.isGrappling = true;
    this.grappleAnchor = targetPos.clone();
    this.grappleLineMesh.visible = true;
    this.updateGrappleLine(fromPos, targetPos);
  }

  public releaseGrapple() {
    this.isGrappling = false;
    this.grappleAnchor = null;
    this.grappleLineMesh.visible = false;
  }

  public updateGrappleLine(fromPos: THREE.Vector3, toPos: THREE.Vector3) {
    const posArr = this.grappleLinePositions;
    posArr[0] = fromPos.x;
    posArr[1] = fromPos.y;
    posArr[2] = fromPos.z;
    posArr[3] = toPos.x;
    posArr[4] = toPos.y;
    posArr[5] = toPos.z;
    (this.grappleLineMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public toggleGlider(): boolean {
    this.isGliderActive = !this.isGliderActive;
    this.gliderMesh.visible = this.isGliderActive;
    this.mode = this.isGliderActive ? 'glider' : 'standard';
    return this.isGliderActive;
  }

  public toggleKatamari(): boolean {
    this.isKatamariActive = !this.isKatamariActive;
    this.katamariMesh.visible = this.isKatamariActive;
    this.mode = this.isKatamariActive ? 'katamari' : 'standard';
    return this.isKatamariActive;
  }

  public accreteConcept() {
    if (!this.isKatamariActive) return;
    this.katamariItemsCount++;
    this.katamariRadius += 0.15;
    this.katamariMesh.scale.setScalar(this.katamariRadius / 2.0);

    // Spawn accreted decorative facet
    const propGeo = new THREE.DodecahedronGeometry(0.4, 0);
    const propMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      roughness: 0.3
    });
    const prop = new THREE.Mesh(propGeo, propMat);
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    prop.position.copy(dir).multiplyScalar(this.katamariRadius);
    this.katamariMesh.add(prop);
    this.attachedProps.push(prop);
  }

  public toggleGravityInversion(): boolean {
    if (this.gravityDirection.y < 0) {
      this.gravityDirection.set(0, 1, 0); // Invert upward
      this.mode = 'inverted_gravity';
      return true;
    } else {
      this.gravityDirection.set(0, -1, 0); // Normal downward
      this.mode = 'standard';
      return false;
    }
  }

  public checkPortalTeleport(playerPos: THREE.Vector3): THREE.Vector3 | null {
    // Portal A to B
    if (playerPos.distanceTo(this.portalA.position) < 3.2) {
      return this.portalB.position.clone().add(new THREE.Vector3(0, 1, 4));
    }
    // Portal B to A
    if (playerPos.distanceTo(this.portalB.position) < 3.2) {
      return this.portalA.position.clone().add(new THREE.Vector3(0, 1, 4));
    }
    return null;
  }
}
