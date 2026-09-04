import * as THREE from 'three';
import type { SemanticWorldData, MacroRegion, WingId } from '../types';

export class Terrain {
  public group = new THREE.Group();
  public worldData: SemanticWorldData;
  private mesh!: THREE.Mesh;
  private geometry!: THREE.PlaneGeometry;

  constructor(worldData: SemanticWorldData) {
    this.worldData = worldData;
    this.buildTerrain();
    this.buildMegastructures();
    this.buildRegionBorders();
    this.buildSanctuaryOasis();
  }

  public getHeightAt(x: number, z: number): number {
    // 1. Central Machine Cavern Descent Shaft at (0, 0)
    const dCenter = Math.hypot(x, z);
    if (dCenter < 12) {
      if (dCenter < 7) return -38; // Deep Machine floor
      return 2.0 - (1 - (dCenter - 7) / 5) * 40;
    }

    // 2. Archaeological Sunken Trench (West Wing: E09 Reliquary / E10 WorldsVault ~ [-85, 0])
    const dArchaeo = Math.hypot(x - (-85), z - 0);
    if (dArchaeo < 28) {
      const pitDepth = Math.cos((dArchaeo / 28) * Math.PI * 0.5);
      return 5 - pitDepth * 14; // Deep excavation dipping to -9m
    }

    // 3. The Conceptual Chasm between South Foundry and North Spire
    if (Math.abs(x) < 45 && Math.abs(z) < 14) {
      const chasmDepth = (1 - Math.abs(z) / 14) * 8;
      return -chasmDepth;
    }

    // 4. Macro-Regions topological elevation
    let totalWeight = 0;
    let elevationSum = 0;

    for (const key of Object.keys(this.worldData.regions) as WingId[]) {
      const region: MacroRegion = this.worldData.regions[key];
      const rx = region.center[0];
      const rz = region.center[2];
      const dist = Math.hypot(x - rx, z - rz);
      const radius = region.scale[0];

      if (dist < radius * 2.2) {
        const factor = Math.max(0, 1 - dist / (radius * 1.8));
        const smooth = factor * factor * (3 - 2 * factor);
        elevationSum += region.elevation * smooth;
        totalWeight += smooth;
      }
    }

    // Procedural terrain harmonics (terracing & geological ridges)
    const ridge = Math.sin(x * 0.025) * Math.cos(z * 0.025) * 3.5 +
                  Math.sin(x * 0.06 + z * 0.05) * 1.6;

    const baseHeight = totalWeight > 0 ? (elevationSum / totalWeight) : 0;
    return baseHeight + ridge;
  }

  private buildTerrain() {
    const size = 420;
    const segments = 200;
    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    const pos = this.geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cDefault = new THREE.Color(0x0a0f1d);
    const cTemp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getHeightAt(x, z);
      pos.setY(i, y);

      // Color blending by region affinity
      let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
      for (const key of Object.keys(this.worldData.regions) as WingId[]) {
        const region = this.worldData.regions[key];
        const dist = Math.hypot(x - region.center[0], z - region.center[2]);
        const radius = region.scale[0];
        if (dist < radius * 1.6) {
          const w = Math.pow(Math.max(0, 1 - dist / (radius * 1.6)), 2);
          cTemp.setHex(region.groundColor);
          rSum += cTemp.r * w;
          gSum += cTemp.g * w;
          bSum += cTemp.b * w;
          wSum += w;
        }
      }

      if (wSum > 0) {
        colors[i * 3] = rSum / wSum;
        colors[i * 3 + 1] = gSum / wSum;
        colors[i * 3 + 2] = bSum / wSum;
      } else {
        colors[i * 3] = cDefault.r;
        colors[i * 3 + 1] = cDefault.g;
        colors[i * 3 + 2] = cDefault.b;
      }
    }

    this.geometry.computeVertexNormals();
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(this.geometry, mat);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
  }

  // 3 World-Class Megastructures
  private buildMegastructures() {
    // 1. The Trans-Domain Causeway (Colossal Viaduct spanning the central chasm between South & North)
    const causewayMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.6 });
    const causewayRoad = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 70), causewayMat);
    causewayRoad.position.set(0, 4, 0);
    causewayRoad.receiveShadow = true;
    this.group.add(causewayRoad);

    // Causeway suspension arches
    const archMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.8 });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(32, 1, 8, 32, Math.PI), archMat);
    arch.position.set(0, 4, 0);
    this.group.add(arch);

    // 2. The Celestial Loom Spire (Reaches 95 meters into the north sky)
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x0a1026, roughness: 0.2, metalness: 0.9 });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(8, 95, 8), spireMat);
    spire.position.set(0, 52, -105);
    this.group.add(spire);

    // Floating orbital torus ring hanging around the celestial spire
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true });
    const celestialRing = new THREE.Mesh(new THREE.TorusGeometry(18, 0.6, 8, 32), ringMat);
    celestialRing.rotation.x = Math.PI / 3;
    celestialRing.position.set(0, 75, -105);
    this.group.add(celestialRing);

    // 3. The Grand Descent Shaft Aperture (Massive ring structure at (0, 0) descending to Machine Layer)
    const shaftRingMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.8 });
    const shaftRing = new THREE.Mesh(new THREE.TorusGeometry(12, 1.8, 8, 32), shaftRingMat);
    shaftRing.rotation.x = Math.PI / 2;
    shaftRing.position.set(0, 1.5, 0);
    this.group.add(shaftRing);

    // Spiral descent staircase stepping down into the machine city
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x00e676, roughness: 0.4, metalness: 0.7 });
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 4;
      const r = 9;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 1.0 - (i / 30) * 38;
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 1.5), stepMat);
      step.position.set(x, y, z);
      step.rotation.y = -angle;
      this.group.add(step);
    }
  }

  private buildRegionBorders() {
    const faultMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.3 });
    const ringGeo = new THREE.RingGeometry(22, 26, 32);
    ringGeo.rotateX(-Math.PI / 2);

    for (const key of Object.keys(this.worldData.regions) as WingId[]) {
      const region = this.worldData.regions[key];
      const marker = new THREE.Mesh(ringGeo, faultMat);
      marker.position.set(region.center[0], this.getHeightAt(region.center[0], region.center[2]) + 0.15, region.center[2]);
      this.group.add(marker);
    }
  }

  private buildSanctuaryOasis() {
    const s = this.worldData.sanctuary;
    const y = this.getHeightAt(s.position[0], s.position[2]);

    const daisGeo = new THREE.CylinderGeometry(s.radius, s.radius + 2, 0.9, 32);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x3a342d,
      roughness: 0.75,
      metalness: 0.1
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.set(s.position[0], y + 0.45, s.position[2]);
    dais.receiveShadow = true;
    this.group.add(dais);

    const ringGeo = new THREE.TorusGeometry(s.radius * 0.7, 0.12, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xd9c69a, roughness: 0.3, metalness: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(s.position[0], y + 0.92, s.position[2]);
    this.group.add(ring);

    // Companion Statue (Dexter)
    const dogGroup = new THREE.Group();
    dogGroup.position.set(s.position[0], y + 1.25, s.position[2]);

    const black = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.7 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 });
    const tan = new THREE.MeshStandardMaterial({ color: 0xa86538, roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 12), black);
    body.scale.set(1.4, 0.7, 0.7);
    body.position.set(0, 0.5, 0);
    dogGroup.add(body);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), white);
    chest.position.set(0.4, 0.6, 0);
    dogGroup.add(chest);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), black);
    head.position.set(0.7, 1.1, 0);
    dogGroup.add(head);

    const blaze = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), white);
    blaze.position.set(0.86, 1.15, 0);
    blaze.scale.set(0.5, 1.4, 0.6);
    dogGroup.add(blaze);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), tan);
      ear.scale.set(0.5, 1.2, 0.4);
      ear.position.set(0.66, 0.95, side * 0.38);
      dogGroup.add(ear);
    }

    this.group.add(dogGroup);
  }
}
