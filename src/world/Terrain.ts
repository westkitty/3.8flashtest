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
    this.buildRegionBorders();
    this.buildSanctuaryOasis();
  }

  // Pure mathematical elevation field derived from the 6 macro-regions
  public getHeightAt(x: number, z: number): number {
    // Check if player is near Subterranean Machine layer descent shafts
    // Descent shaft to Machine Layer at (0, 0)
    const dCenter = Math.hypot(x, z);
    if (dCenter < 10) {
      if (dCenter < 6) return -30; // Deep core floor
      return 1.5 - (1 - dCenter / 10) * 15;
    }

    // Check Archaeological ruin pit (West wing, E09 area: ~[-90, 0])
    const dArchaeo = Math.hypot(x - (-90), z - 0);
    if (dArchaeo < 25) {
      const pitDepth = Math.cos((dArchaeo / 25) * Math.PI * 0.5);
      return 5 - pitDepth * 13; // Drops to -8m into excavated strata
    }

    // Weighted influence of the 6 Macro-Regions
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

    // Base procedural terrain rolling harmonics
    const ripple = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 2.5 +
                   Math.sin(x * 0.08 + z * 0.04) * 1.2;

    const baseHeight = totalWeight > 0 ? (elevationSum / totalWeight) : 0;
    return baseHeight + ripple;
  }

  private buildTerrain() {
    const size = 360;
    const segments = 180;
    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    const pos = this.geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cDefault = new THREE.Color(0x0e1422);
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
          bSum += cTemp.g * w;
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
      roughness: 0.88,
      metalness: 0.15,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(this.geometry, mat);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
  }

  private buildRegionBorders() {
    // Geological fault lines & glowing energy conduits demarcating regional boundaries
    const faultMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.25 });
    const ringGeo = new THREE.RingGeometry(18, 22, 32);
    ringGeo.rotateX(-Math.PI / 2);

    for (const key of Object.keys(this.worldData.regions) as WingId[]) {
      const region = this.worldData.regions[key];
      const marker = new THREE.Mesh(ringGeo, faultMat);
      marker.position.set(region.center[0], this.getHeightAt(region.center[0], region.center[2]) + 0.1, region.center[2]);
      this.group.add(marker);
    }
  }

  private buildSanctuaryOasis() {
    // Dexter Sanctuary is an ontologically separate quiet stone oasis at [-38, y, 38]
    const s = this.worldData.sanctuary;
    const y = this.getHeightAt(s.position[0], s.position[2]);

    const daisGeo = new THREE.CylinderGeometry(s.radius, s.radius + 1.5, 0.8, 32);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x3a342d,
      roughness: 0.75,
      metalness: 0.1
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.set(s.position[0], y + 0.4, s.position[2]);
    dais.receiveShadow = true;
    this.group.add(dais);

    // Inner bronze lantern ring
    const ringGeo = new THREE.TorusGeometry(s.radius * 0.7, 0.1, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xd9c69a, roughness: 0.3, metalness: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(s.position[0], y + 0.85, s.position[2]);
    this.group.add(ring);

    // Companionship monument (Tricolor canine silhouette)
    const dogGroup = new THREE.Group();
    dogGroup.position.set(s.position[0], y + 1.2, s.position[2]);

    const black = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.7 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 });
    const tan = new THREE.MeshStandardMaterial({ color: 0xa86538, roughness: 0.8 });

    // Torso
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), black);
    body.scale.set(1.4, 0.7, 0.7);
    body.position.set(0, 0.5, 0);
    dogGroup.add(body);

    // Chest ruff
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), white);
    chest.position.set(0.4, 0.6, 0);
    dogGroup.add(chest);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), black);
    head.position.set(0.7, 1.1, 0);
    dogGroup.add(head);

    // Blaze
    const blaze = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), white);
    blaze.position.set(0.85, 1.15, 0);
    blaze.scale.set(0.5, 1.4, 0.6);
    dogGroup.add(blaze);

    // Feathered ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), tan);
      ear.scale.set(0.5, 1.2, 0.4);
      ear.position.set(0.65, 0.95, side * 0.38);
      dogGroup.add(ear);
    }

    this.group.add(dogGroup);
  }
}
