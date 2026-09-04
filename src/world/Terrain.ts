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

    // 5. Semantic Gravitational Wells & Uplifts:
    // Exhibits exert localized gravitational elevation or depression depending on their epoch & relationship density
    let semanticUplift = 0;
    for (const ex of this.worldData.exhibits) {
      const dx = x - ex.position[0];
      const dz = z - ex.position[2];
      const dEx = Math.hypot(dx, dz);
      if (dEx < 20) {
        const weight = Math.cos((dEx / 20) * Math.PI * 0.5);
        // Archaic foundational knowledge creates deeply carved foundation plinths; emergent creates rising ridges
        const epochFactor = ex.epoch === 'archaic' ? -1.8 : (ex.epoch === 'emergent' ? 3.5 : 1.2);
        semanticUplift += weight * epochFactor * (ex.scale || 1.0);
      }
    }

    // Procedural terrain harmonics (terracing & geological ridges)
    const ridge = Math.sin(x * 0.025) * Math.cos(z * 0.025) * 3.5 +
                  Math.sin(x * 0.06 + z * 0.05) * 1.6;

    const baseHeight = totalWeight > 0 ? (elevationSum / totalWeight) : 0;
    return baseHeight + ridge + semanticUplift;
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

  public rebuildTopology(worldData: SemanticWorldData) {
    this.worldData = worldData;
    const pos = this.geometry.attributes.position;
    const colorAttr = this.geometry.attributes.color;
    const colors = colorAttr.array as Float32Array;
    const cDefault = new THREE.Color(0x0a0f1d);
    const cTemp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getHeightAt(x, z));

      // Dynamically recompute color blending by updated region & exhibit affinities
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
    pos.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  // 3 World-Class Megastructures with Architectural Depth & Skyline
  private buildMegastructures() {
    // 0. Celestial Horizon Sphere & Distant Mountain Silhouettes (Deep astronomical gradient)
    const skyGeo = new THREE.SphereGeometry(380, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x060a17,
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(skyDome);

    // Distant Star Constellation Points across the dome
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 370;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15; // Above horizon
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 1.4, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starGeo, starMat);
    this.group.add(starField);

    // Distant Mountain Ranges girding the outer perimeter (220m radius)
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x050914, roughness: 0.9, metalness: 0.2 });
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const dist = 210 + (i % 3) * 15;
      const peakH = 45 + (i % 4) * 20;
      const peakR = 25 + (i % 3) * 12;
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(peakR, peakH, 5), mountainMat);
      mountain.position.set(Math.cos(angle) * dist, peakH / 2 - 10, Math.sin(angle) * dist);
      this.group.add(mountain);
    }

    // Distant Celestial Horizon Ring (Tilted orbital ring girding the world)
    const horizonRingMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true, transparent: true, opacity: 0.4 });
    const horizonRing = new THREE.Mesh(new THREE.TorusGeometry(320, 2.5, 6, 64), horizonRingMat);
    horizonRing.rotation.x = Math.PI / 4;
    horizonRing.rotation.y = Math.PI / 6;
    this.group.add(horizonRing);

    // Orbital Macrocosm Celestial Coordinate Plane & Rings (Visible from high altitude/orbit)
    const orbitalCoordPlane = new THREE.GridHelper(300, 30, 0x1e3a8a, 0x0f172a);
    orbitalCoordPlane.position.set(0, 0.2, 0);
    orbitalCoordPlane.name = 'orbital_coord_plane';
    (orbitalCoordPlane.material as THREE.Material).transparent = true;
    (orbitalCoordPlane.material as THREE.Material).opacity = 0.35;
    this.group.add(orbitalCoordPlane);

    // Concentric Macrocosm Horizon Boundary Rings
    for (const radius of [75, 120, 160]) {
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.6, 64),
        new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, 0.25, 0);
      this.group.add(ringMesh);
    }

    // 1. The Trans-Domain Causeway (Colossal Viaduct spanning the central chasm between South & North)
    const causewayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.7 });
    const causewayRoad = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 76), causewayMat);
    causewayRoad.position.set(0, 4, 0);
    causewayRoad.receiveShadow = true;
    this.group.add(causewayRoad);

    // Viaduct support pylons plunging down into the chasm
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.8 });
    for (const pz of [-24, 0, 24]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(11, 14, 3), pylonMat);
      pylon.position.set(0, -3, pz);
      this.group.add(pylon);
    }

    // Causeway suspension arches & glowing anchor cables
    const archMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.9, emissive: 0x0284c7, emissiveIntensity: 0.4 });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(36, 1.2, 8, 48, Math.PI), archMat);
    arch.position.set(0, 4, 0);
    this.group.add(arch);

    // Causeway side guardrails with embedded optic runway lights
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (const rx of [-4.8, 4.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 76), railMat);
      rail.position.set(rx, 5.2, 0);
      this.group.add(rail);

      for (let rz = -35; rz <= 35; rz += 7) {
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 8), lightMat);
        beacon.position.set(rx, 5.2, rz);
        this.group.add(beacon);
      }
    }

    // 2. The Celestial Loom Spire (Reaches 95 meters into the north sky)
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x090e1f,
      roughness: 0.15,
      metalness: 0.95,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.3
    });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(9, 105, 12), spireMat);
    spire.position.set(0, 56, -105);
    this.group.add(spire);

    // Spire concentric energy lattices
    const latticeMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true, transparent: true, opacity: 0.65 });
    for (let h = 25; h <= 85; h += 20) {
      const radius = (1 - (h - 10) / 105) * 16;
      const latticeRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.4, 6, 32), latticeMat);
      latticeRing.position.set(0, h, -105);
      latticeRing.rotation.x = Math.PI / 2;
      this.group.add(latticeRing);
    }

    // Floating orbital torus rings hanging around the celestial spire
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true });
    const celestialRing = new THREE.Mesh(new THREE.TorusGeometry(22, 0.8, 8, 36), ringMat);
    celestialRing.rotation.x = Math.PI / 3;
    celestialRing.rotation.y = Math.PI / 5;
    celestialRing.position.set(0, 80, -105);
    celestialRing.name = 'celestial_orbital_ring';
    this.group.add(celestialRing);

    // 3. The Grand Descent Shaft Aperture (Colossal chasm ring at (0, 0) descending to Machine Layer)
    const shaftRingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.9 });
    const shaftRing = new THREE.Mesh(new THREE.TorusGeometry(12, 2.2, 8, 36), shaftRingMat);
    shaftRing.rotation.x = Math.PI / 2;
    shaftRing.position.set(0, 1.5, 0);
    this.group.add(shaftRing);

    // Protective energy collar framing the descent
    const collarMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.5 });
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(11.8, 11.8, 4, 24, 1, true), collarMat);
    collar.position.set(0, 0, 0);
    collar.name = 'descent_energy_collar';
    this.group.add(collar);

    // Spiral descent staircase stepping down into the machine city
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.8, emissive: 0x064e3b, emissiveIntensity: 0.6 });
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 4;
      const r = 9.2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 1.0 - (i / 30) * 38;
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 1.6), stepMat);
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

    // Diegetic Physical Footpath linking Trans-Domain Causeway (0, 4, 15) to Sanctuary dais ([-38, y, 38])
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x242733, roughness: 0.8, metalness: 0.2 });
    const stepCount = 18;
    const startX = 0, startZ = 15;
    const endX = s.position[0], endZ = s.position[2];

    for (let i = 1; i < stepCount; i++) {
      const t = i / stepCount;
      const px = startX + (endX - startX) * t;
      const pz = startZ + (endZ - startZ) * t;
      const py = this.getHeightAt(px, pz) + 0.15;
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), pathMat);
      step.position.set(px, py, pz);
      step.rotation.y = Math.atan2(endX - startX, endZ - startZ);
      this.group.add(step);
    }
  }
}
