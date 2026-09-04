import * as THREE from 'three';
import type { SemanticExhibit } from '../types';

export class LandmarkBuilder {
  // Reusable materials cache
  private static materials = new Map<string, THREE.Material>();

  private static getMaterial(color: number, roughness = 0.5, metalness = 0.5, emissive = 0x000000, wireframe = false): THREE.Material {
    const key = `${color}_${roughness}_${metalness}_${emissive}_${wireframe}`;
    if (!this.materials.has(key)) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive,
        wireframe
      });
      this.materials.set(key, mat);
    }
    return this.materials.get(key)!;
  }

  public static buildLandmark(exhibit: SemanticExhibit): THREE.Group {
    const group = new THREE.Group();
    group.name = `landmark:${exhibit.id}`;
    group.userData = { exhibitId: exhibit.id, exhibit };

    const tierScale = exhibit.scale || 1.0;
    const isArchaic = exhibit.isArchaeological;

    switch (exhibit.archetype) {
      case 'observatory_spire':
        this.buildObservatorySpire(group, tierScale);
        break;
      case 'kinetic_foundry':
        this.buildKineticFoundry(group, tierScale);
        break;
      case 'monolith_altar':
        this.buildMonolithAltar(group, tierScale);
        break;
      case 'stratified_library':
        this.buildStratifiedLibrary(group, tierScale);
        break;
      case 'harmonic_resonator':
        this.buildHarmonicResonator(group, tierScale);
        break;
      case 'power_conduit':
        this.buildPowerConduit(group, tierScale);
        break;
      case 'excavated_ruin':
      default:
        if (isArchaic) {
          this.buildExcavatedRuin(group, tierScale);
        } else {
          this.buildGenericSpire(group, tierScale);
        }
        break;
    }

    // Add Beacon Light / Pulsing Halo for distant readability
    const beaconGeo = new THREE.SphereGeometry(0.5 * tierScale, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x64b5f6 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 14 * tierScale, 0);
    beacon.name = 'beacon';
    group.add(beacon);

    // Interactive Base Plate for Raycasting
    const basePlateGeo = new THREE.CylinderGeometry(3 * tierScale, 3.5 * tierScale, 0.4, 16);
    const baseMat = this.getMaterial(0x1a2332, 0.9, 0.2);
    const basePlate = new THREE.Mesh(basePlateGeo, baseMat);
    basePlate.position.set(0, 0.2, 0);
    basePlate.name = 'interaction-base';
    group.add(basePlate);

    return group;
  }

  // 1. Observatory Spire (North: Starsilk/Drakken)
  private static buildObservatorySpire(g: THREE.Group, s: number) {
    const obsidian = this.getMaterial(0x0a0f1d, 0.2, 0.8, 0x050c1e);
    const starMetal = this.getMaterial(0x3d5afe, 0.3, 0.9, 0x1a237e);

    // Main needle
    const needleGeo = new THREE.ConeGeometry(2 * s, 16 * s, 6);
    const needle = new THREE.Mesh(needleGeo, obsidian);
    needle.position.set(0, 8 * s, 0);
    g.add(needle);

    // Floating orbital rings (The Dismantling Clock / Heliocide rings)
    const ringGeo = new THREE.TorusGeometry(3.5 * s, 0.15 * s, 8, 32);
    const ring1 = new THREE.Mesh(ringGeo, starMetal);
    ring1.rotation.x = Math.PI / 3;
    ring1.position.set(0, 10 * s, 0);
    ring1.name = 'rotating_ring_1';
    g.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, starMetal);
    ring2.rotation.y = Math.PI / 4;
    ring2.position.set(0, 12 * s, 0);
    ring2.name = 'rotating_ring_2';
    g.add(ring2);
  }

  // 2. Kinetic Foundry (South: Games & Play / S'mores Katamari / 4X)
  private static buildKineticFoundry(g: THREE.Group, s: number) {
    const rust = this.getMaterial(0x4e2714, 0.8, 0.4);
    const bronze = this.getMaterial(0xff6d00, 0.4, 0.7, 0x3e1800);

    // Heavy gantry legs
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const legGeo = new THREE.BoxGeometry(0.8 * s, 8 * s, 0.8 * s);
      const leg = new THREE.Mesh(legGeo, rust);
      leg.position.set(Math.cos(angle) * 3 * s, 4 * s, Math.sin(angle) * 3 * s);
      leg.rotation.y = angle;
      g.add(leg);
    }

    // Rolling sphere core (Katamari reference) or kinetic gear
    const coreGeo = new THREE.DodecahedronGeometry(2.2 * s, 1);
    const core = new THREE.Mesh(coreGeo, bronze);
    core.position.set(0, 6 * s, 0);
    core.name = 'kinetic_core';
    g.add(core);
  }

  // 3. Monolith Altar (East: Dex Systems / Local Privacy)
  private static buildMonolithAltar(g: THREE.Group, s: number) {
    const marble = this.getMaterial(0x132e27, 0.2, 0.6);
    const teal = this.getMaterial(0x00bfa5, 0.1, 0.9, 0x004d40);

    // Twin monolithic slabs enclosing a private aperture
    const slabGeo = new THREE.BoxGeometry(1.2 * s, 10 * s, 3.5 * s);
    const slab1 = new THREE.Mesh(slabGeo, marble);
    slab1.position.set(-1.8 * s, 5 * s, 0);
    g.add(slab1);

    const slab2 = new THREE.Mesh(slabGeo, marble);
    slab2.position.set(1.8 * s, 5 * s, 0);
    g.add(slab2);

    // Inner floating crystal of local compute
    const crystalGeo = new THREE.OctahedronGeometry(1.4 * s, 0);
    const crystal = new THREE.Mesh(crystalGeo, teal);
    crystal.position.set(0, 5.5 * s, 0);
    crystal.name = 'floating_crystal';
    g.add(crystal);
  }

  // 4. Stratified Library (West: Archive & Canon)
  private static buildStratifiedLibrary(g: THREE.Group, s: number) {
    const slate = this.getMaterial(0x27192e, 0.6, 0.3);
    const violet = this.getMaterial(0xab47bc, 0.3, 0.7, 0x4a148c);

    // Layered historical tablets / steps
    for (let i = 0; i < 5; i++) {
      const stepWidth = (5 - i * 0.7) * s;
      const stepGeo = new THREE.BoxGeometry(stepWidth, 1.4 * s, stepWidth);
      const step = new THREE.Mesh(stepGeo, i % 2 === 0 ? slate : violet);
      step.position.set(0, (0.7 + i * 1.4) * s, 0);
      g.add(step);
    }
  }

  // 5. Harmonic Resonator (Media Mezzanine: Suno & Promptcraft)
  private static buildHarmonicResonator(g: THREE.Group, s: number) {
    const silver = this.getMaterial(0x152530, 0.2, 0.9);
    const cyan = this.getMaterial(0x00e5ff, 0.1, 0.9, 0x006064);

    // Tuning fork / wave resonator
    const forkGeo = new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 11 * s, 16);
    const fork1 = new THREE.Mesh(forkGeo, silver);
    fork1.position.set(-1.2 * s, 5.5 * s, 0);
    g.add(fork1);

    const fork2 = new THREE.Mesh(forkGeo, silver);
    fork2.position.set(1.2 * s, 5.5 * s, 0);
    g.add(fork2);

    // Wave ring between forks
    const waveGeo = new THREE.TorusGeometry(1.5 * s, 0.1 * s, 8, 24);
    const wave = new THREE.Mesh(waveGeo, cyan);
    wave.position.set(0, 7 * s, 0);
    wave.name = 'wave_ring';
    g.add(wave);
  }

  // 6. Power Conduit (Infra: BigMac Backbone)
  private static buildPowerConduit(g: THREE.Group, s: number) {
    const darkSteel = this.getMaterial(0x121b10, 0.7, 0.8);
    const limeBus = this.getMaterial(0x76ff03, 0.2, 0.9, 0x33691e);

    // Heavy industrial pylon with cooling vanes
    const pylonGeo = new THREE.CylinderGeometry(1.6 * s, 2.2 * s, 8 * s, 8);
    const pylon = new THREE.Mesh(pylonGeo, darkSteel);
    pylon.position.set(0, 4 * s, 0);
    g.add(pylon);

    const ringBusGeo = new THREE.TorusGeometry(2.4 * s, 0.25 * s, 8, 16);
    const bus = new THREE.Mesh(ringBusGeo, limeBus);
    bus.rotation.x = Math.PI / 2;
    bus.position.set(0, 6 * s, 0);
    bus.name = 'bus_bar';
    g.add(bus);
  }

  // 7. Excavated Ruin (Archaeological: E09 Reliquary of Iterative Becoming)
  private static buildExcavatedRuin(g: THREE.Group, s: number) {
    const ruinedStone = this.getMaterial(0x2a2430, 0.9, 0.1);
    const fossilGlow = this.getMaterial(0xe1bee7, 0.4, 0.6, 0x311b92);

    // Broken pillars and fractured foundation stones
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const height = (3 + (i % 3) * 2.5) * s;
      const colGeo = new THREE.CylinderGeometry(0.7 * s, 0.8 * s, height, 8);
      const col = new THREE.Mesh(colGeo, ruinedStone);
      col.position.set(Math.cos(a) * 4 * s, height / 2, Math.sin(a) * 4 * s);
      col.rotation.z = (i % 2 === 0 ? 0.08 : -0.08);
      g.add(col);
    }

    // Sunken foundation altar (The Single-file Reliquary Artifact)
    const altarGeo = new THREE.BoxGeometry(3 * s, 0.8 * s, 3 * s);
    const altar = new THREE.Mesh(altarGeo, fossilGlow);
    altar.position.set(0, 0.4 * s, 0);
    g.add(altar);
  }

  private static buildGenericSpire(g: THREE.Group, s: number) {
    const mat = this.getMaterial(0x253248, 0.4, 0.6);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 1.4 * s, 7 * s, 6), mat);
    col.position.set(0, 3.5 * s, 0);
    g.add(col);
  }
}
