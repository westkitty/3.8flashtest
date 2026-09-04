import * as THREE from 'three';
import type { SemanticExhibit } from '../types';

export class LandmarkBuilder {
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

    const s = exhibit.scale || 1.0;

    switch (exhibit.archetype) {
      // 1. Starsilk Loom (E01) — Hero celestial weaving loom
      case 'starsilk_loom':
        this.buildStarsilkLoom(group, s);
        break;

      // 2. Orbital Tomb Dismantler (E03) — Shard-God Tiger dismantling Meridian station
      case 'orbital_tomb_dismantler':
        this.buildOrbitalTomb(group, s);
        break;

      // 3. Drakken Terraforming Vat (E07) — Industrial bio-reactor with Ringthroat SKY converters
      case 'terraforming_vat':
        this.buildTerraformingVat(group, s);
        break;

      // 4. Heliocide Absence Lens (E08) — Monolithic optical observatory framing stellar extinction
      case 'heliocide_absence_lens':
        this.buildHeliocideLens(group, s);
        break;

      // 5. Excavated Ruin (E09) — Sunken foundations of the single-file museum predecessor
      case 'excavated_ruin':
        this.buildExcavatedRuin(group, s);
        break;

      // 6. WorldsVault Chasm Vault (E10) — Deep fissure storage with strata archives
      case 'worldsvault_chasm_vault':
        this.buildWorldsVault(group, s);
        break;

      // 7. Rhetorical Truth Scales (E12) — Epistemic balance measuring statement veracity
      case 'rhetorical_truth_scales':
        this.buildRhetoricalScales(group, s);
        break;

      // 8. Suno Harmonic Resonator (E13) — Acoustic string harp with live wave modulation
      case 'suno_harmonic_resonator':
        this.buildSunoHarp(group, s);
        break;

      // 9. Dex Vocal Acoustic Chamber (E17) — Cylindrical anechoic chamber with acoustic reeds
      case 'dex_vocal_acoustic_chamber':
        this.buildDexVoiceChamber(group, s);
        break;

      // 10. DexTilt Balance Tower (E19) — Gyroscopic balance armature
      case 'dextilt_balance_tower':
        this.buildDexTiltTower(group, s);
        break;

      // 11. Era of Invincible Magic (E24) — Floating arcane citadel above tectonic rift
      case 'invincible_magic_citadel':
        this.buildInvincibleCitadel(group, s);
        break;

      // 12. Arkship Void Hull (E29) — Interstellar generational vessel prow
      case 'arkship_void_hull':
        this.buildArkshipHull(group, s);
        break;

      // 13. S'mores Katamari Rolling Yard (E32) — Giant spherical collection sphere & diorama
      case 'smores_katamari_forge':
        this.buildSmoresKatamari(group, s);
        break;

      // 14. BigMac Server Monolith (E34) — Megastructure server tower with cooling towers
      case 'bigmac_server_monolith':
        this.buildBigMacMonolith(group, s);
        break;

      // Regional biomes fallbacks
      case 'observatory_spire':
        this.buildObservatorySpire(group, s);
        break;
      case 'kinetic_foundry':
        this.buildKineticFoundry(group, s);
        break;
      case 'monolith_altar':
        this.buildMonolithAltar(group, s);
        break;
      case 'stratified_library':
        this.buildStratifiedLibrary(group, s);
        break;
      case 'harmonic_resonator':
        this.buildHarmonicResonator(group, s);
        break;
      case 'power_conduit':
        this.buildPowerConduit(group, s);
        break;
      default:
        this.buildGenericSpire(group, s);
        break;
    }

    // Interactive Base Plate for Raycasting
    const basePlateGeo = new THREE.CylinderGeometry(3.5 * s, 4.2 * s, 0.5, 16);
    const baseMat = this.getMaterial(0x1a2332, 0.9, 0.2);
    const basePlate = new THREE.Mesh(basePlateGeo, baseMat);
    basePlate.position.set(0, 0.25, 0);
    basePlate.name = 'interaction-base';
    group.add(basePlate);

    return group;
  }

  // 1. E01: Starsilk Loom
  private static buildStarsilkLoom(g: THREE.Group, s: number) {
    const obsidian = this.getMaterial(0x0a0f1d, 0.2, 0.8);
    const starMetal = this.getMaterial(0x3d5afe, 0.3, 0.9, 0x1a237e);

    // Twin arching celestial warp towers
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 1.6 * s, 22 * s, 8), obsidian);
      tower.position.set(side * 5 * s, 11 * s, 0);
      tower.rotation.z = -side * 0.1;
      g.add(tower);
    }

    // Weaving beam across the top
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12 * s, 1.2 * s, 2 * s), starMetal);
    beam.position.set(0, 20 * s, 0);
    g.add(beam);

    // Dynamic hanging Starsilk warp threads
    const threadMat = new THREE.MeshBasicMaterial({ color: 0x82b1ff, wireframe: true });
    const threads = new THREE.Mesh(new THREE.PlaneGeometry(8 * s, 16 * s, 12, 1), threadMat);
    threads.position.set(0, 11 * s, 0);
    threads.name = 'starsilk_threads';
    g.add(threads);
  }

  // 2. E03: Orbital Tomb Dismantler
  private static buildOrbitalTomb(g: THREE.Group, s: number) {
    const stationMat = this.getMaterial(0x2d3748, 0.6, 0.6);
    const energyBlade = this.getMaterial(0x00e5ff, 0.1, 0.9, 0x00bcd4);

    // Meridian Station central torus being halved
    const torus = new THREE.Mesh(new THREE.TorusGeometry(4.5 * s, 0.9 * s, 8, 24, Math.PI * 1.5), stationMat);
    torus.position.set(0, 12 * s, 0);
    torus.rotation.x = Math.PI / 4;
    g.add(torus);

    // Shard-God Tiger surgical dismantling arc
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 14 * s, 4), energyBlade);
    blade.position.set(1.5 * s, 11 * s, 0);
    blade.rotation.z = -Math.PI / 5;
    blade.name = 'dismantling_blade';
    g.add(blade);
  }

  // 3. E07: Terraforming Vat
  private static buildTerraformingVat(g: THREE.Group, s: number) {
    const vatMat = this.getMaterial(0x1a202c, 0.4, 0.8);
    const brothMat = this.getMaterial(0x00e676, 0.2, 0.5, 0x00a854);

    const vat = new THREE.Mesh(new THREE.CylinderGeometry(4 * s, 3.5 * s, 12 * s, 16, 1, true), vatMat);
    vat.position.set(0, 6 * s, 0);
    g.add(vat);

    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(3.6 * s, 3.6 * s, 10 * s, 16), brothMat);
    liquid.position.set(0, 5.5 * s, 0);
    liquid.name = 'terraforming_broth';
    g.add(liquid);

    // Feeder ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.8 * s, 0.3 * s, 8, 24), vatMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 11 * s, 0);
    g.add(ring);
  }

  // 4. E08: Heliocide Absence Lens
  private static buildHeliocideLens(g: THREE.Group, s: number) {
    const darkObsidian = this.getMaterial(0x020408, 0.1, 0.9);
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // Enormous vertical aperture framing void of stars
    const frame = new THREE.Mesh(new THREE.TorusGeometry(6 * s, 1.2 * s, 8, 32), darkObsidian);
    frame.position.set(0, 12 * s, 0);
    g.add(frame);

    const absenceCore = new THREE.Mesh(new THREE.CircleGeometry(5.2 * s, 32), voidMat);
    absenceCore.position.set(0, 12 * s, 0.1);
    g.add(absenceCore);
  }

  // 5. E09: Excavated Ruin
  private static buildExcavatedRuin(g: THREE.Group, s: number) {
    const stone = this.getMaterial(0x2a2430, 0.9, 0.1);
    const relicGlow = this.getMaterial(0xe1bee7, 0.4, 0.6, 0x311b92);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const height = (4 + (i % 3) * 3) * s;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 0.9 * s, height, 8), stone);
      col.position.set(Math.cos(a) * 5 * s, height / 2, Math.sin(a) * 5 * s);
      col.rotation.z = (i % 2 === 0 ? 0.08 : -0.08);
      g.add(col);
    }

    const artifactAltar = new THREE.Mesh(new THREE.BoxGeometry(4 * s, 1 * s, 4 * s), relicGlow);
    artifactAltar.position.set(0, 0.5 * s, 0);
    g.add(artifactAltar);
  }

  // 6. E10: WorldsVault Chasm Vault
  private static buildWorldsVault(g: THREE.Group, s: number) {
    const basalt = this.getMaterial(0x181824, 0.7, 0.3);
    const brass = this.getMaterial(0xd4af37, 0.3, 0.8, 0x5a4810);

    const vaultBox = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 10 * s, 6 * s), basalt);
    vaultBox.position.set(0, 5 * s, 0);
    g.add(vaultBox);

    // Chasm archive strata plates
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(7 * s, 0.4 * s, 6.5 * s), brass);
      plate.position.set(0, (2 + i * 2.2) * s, 0);
      g.add(plate);
    }
  }

  // 7. E12: Rhetorical Truth Scales
  private static buildRhetoricalScales(g: THREE.Group, s: number) {
    const bronze = this.getMaterial(0xa0aec0, 0.3, 0.8);
    const balanceMat = this.getMaterial(0x4a5568, 0.5, 0.5);

    // Central pillar
    const fulcrum = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * s, 1.2 * s, 14 * s, 8), bronze);
    fulcrum.position.set(0, 7 * s, 0);
    g.add(fulcrum);

    // Cross-beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(10 * s, 0.5 * s, 0.8 * s), bronze);
    beam.position.set(0, 13 * s, 0);
    beam.name = 'scale_beam';
    g.add(beam);

    // Twin hanging pans
    for (const side of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * s, 0.2 * s, 0.6 * s, 16), balanceMat);
      pan.position.set(side * 4.5 * s, 8 * s, 0);
      g.add(pan);
    }
  }

  // 8. E13: Suno Harp
  private static buildSunoHarp(g: THREE.Group, s: number) {
    const frameMat = this.getMaterial(0x1a365d, 0.2, 0.9);
    const harp = new THREE.Mesh(new THREE.TorusGeometry(5 * s, 0.6 * s, 8, 24, Math.PI), frameMat);
    harp.position.set(0, 6 * s, 0);
    harp.rotation.z = Math.PI;
    g.add(harp);

    const stringMat = new THREE.MeshBasicMaterial({ color: 0x63b3ed, wireframe: true });
    const strings = new THREE.Mesh(new THREE.PlaneGeometry(6 * s, 8 * s, 8, 1), stringMat);
    strings.position.set(0, 6 * s, 0);
    strings.name = 'harp_strings';
    g.add(strings);
  }

  // 9. E17: Dex Voice Chamber
  private static buildDexVoiceChamber(g: THREE.Group, s: number) {
    const teal = this.getMaterial(0x004d40, 0.2, 0.8);
    const acousticCone = this.getMaterial(0x00bfa5, 0.3, 0.7, 0x00332c);

    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(3.5 * s, 3.5 * s, 10 * s, 16), teal);
    chamber.position.set(0, 5 * s, 0);
    g.add(chamber);

    // Outward horn
    const horn = new THREE.Mesh(new THREE.ConeGeometry(3 * s, 6 * s, 16, 1, true), acousticCone);
    horn.rotation.x = Math.PI / 2;
    horn.position.set(0, 6 * s, 3 * s);
    g.add(horn);
  }

  // 10. E19: DexTilt Tower
  private static buildDexTiltTower(g: THREE.Group, s: number) {
    const steel = this.getMaterial(0x4a5568, 0.3, 0.8);
    const gyroRing = this.getMaterial(0x38bdf8, 0.2, 0.9, 0x0369a1);

    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 1.6 * s, 14 * s, 6), steel);
    pylon.position.set(0, 7 * s, 0);
    g.add(pylon);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3 * s, 0.25 * s, 8, 24), gyroRing);
    ring1.position.set(0, 12 * s, 0);
    ring1.name = 'gyro_ring_1';
    g.add(ring1);
  }

  // 11. E24: Invincible Magic Citadel
  private static buildInvincibleCitadel(g: THREE.Group, s: number) {
    const castleMat = this.getMaterial(0x2c1b18, 0.7, 0.3);
    const magicGlow = this.getMaterial(0xff7043, 0.2, 0.8, 0xbf360c);

    const keep = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 14 * s, 6 * s), castleMat);
    keep.position.set(0, 7 * s, 0);
    g.add(keep);

    // Floating floating arcane crown
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(2 * s), magicGlow);
    crown.position.set(0, 17 * s, 0);
    crown.name = 'arcane_crown';
    g.add(crown);
  }

  // 12. E29: Arkship Hull
  private static buildArkshipHull(g: THREE.Group, s: number) {
    const hullMat = this.getMaterial(0x1a202c, 0.3, 0.9);
    const thrusterMat = this.getMaterial(0x38bdf8, 0.1, 0.9, 0x0284c7);

    // Swept prow of generational ship
    const prow = new THREE.Mesh(new THREE.ConeGeometry(4 * s, 18 * s, 4), hullMat);
    prow.rotation.z = Math.PI / 2.3;
    prow.position.set(0, 8 * s, 0);
    g.add(prow);

    const drive = new THREE.Mesh(new THREE.CylinderGeometry(1.8 * s, 2.4 * s, 3 * s, 12), thrusterMat);
    drive.position.set(-6 * s, 5 * s, 0);
    drive.rotation.z = Math.PI / 2;
    g.add(drive);
  }

  // 13. E32: S'mores Katamari Forge
  private static buildSmoresKatamari(g: THREE.Group, s: number) {
    const bronze = this.getMaterial(0xff6d00, 0.4, 0.7, 0x3e1800);
    const rust = this.getMaterial(0x3d271d, 0.8, 0.2);

    // Rolling track / gantry
    const track = new THREE.Mesh(new THREE.TorusGeometry(6 * s, 0.4 * s, 8, 32), rust);
    track.rotation.x = Math.PI / 2.2;
    track.position.set(0, 5 * s, 0);
    g.add(track);

    // Giant rolling collection sphere
    const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2 * s, 1), bronze);
    sphere.position.set(0, 7 * s, 0);
    sphere.name = 'katamari_sphere';
    g.add(sphere);
  }

  // 14. E34: BigMac Server Monolith (Megastructure)
  private static buildBigMacMonolith(g: THREE.Group, s: number) {
    const darkServerSteel = this.getMaterial(0x0d140e, 0.4, 0.9);
    const busLime = this.getMaterial(0x76ff03, 0.2, 0.9, 0x33691e);

    // Towering monolithic server rack rising 32 meters
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7 * s, 32 * s, 7 * s), darkServerSteel);
    tower.position.set(0, 16 * s, 0);
    g.add(tower);

    // Heavy glowing cooling bus rings
    for (let i = 0; i < 4; i++) {
      const bus = new THREE.Mesh(new THREE.BoxGeometry(7.6 * s, 0.6 * s, 7.6 * s), busLime);
      bus.position.set(0, (6 + i * 7) * s, 0);
      g.add(bus);
    }
  }

  // Regional default builders
  private static buildObservatorySpire(g: THREE.Group, s: number) {
    const obsidian = this.getMaterial(0x0a0f1d, 0.2, 0.8);
    const needle = new THREE.Mesh(new THREE.ConeGeometry(2 * s, 16 * s, 6), obsidian);
    needle.position.set(0, 8 * s, 0);
    g.add(needle);
  }

  private static buildKineticFoundry(g: THREE.Group, s: number) {
    const rust = this.getMaterial(0x4e2714, 0.8, 0.4);
    const block = new THREE.Mesh(new THREE.BoxGeometry(4 * s, 8 * s, 4 * s), rust);
    block.position.set(0, 4 * s, 0);
    g.add(block);
  }

  private static buildMonolithAltar(g: THREE.Group, s: number) {
    const marble = this.getMaterial(0x132e27, 0.2, 0.6);
    const altar = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 10 * s, 3 * s), marble);
    altar.position.set(0, 5 * s, 0);
    g.add(altar);
  }

  private static buildStratifiedLibrary(g: THREE.Group, s: number) {
    const slate = this.getMaterial(0x27192e, 0.6, 0.3);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(2 * s, 3.5 * s, 8 * s, 8), slate);
    stack.position.set(0, 4 * s, 0);
    g.add(stack);
  }

  private static buildHarmonicResonator(g: THREE.Group, s: number) {
    const silver = this.getMaterial(0x152530, 0.2, 0.9);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 10 * s, 12), silver);
    fork.position.set(0, 5 * s, 0);
    g.add(fork);
  }

  private static buildPowerConduit(g: THREE.Group, s: number) {
    const darkSteel = this.getMaterial(0x121b10, 0.7, 0.8);
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * s, 2.2 * s, 8 * s, 8), darkSteel);
    pylon.position.set(0, 4 * s, 0);
    g.add(pylon);
  }

  private static buildGenericSpire(g: THREE.Group, s: number) {
    const mat = this.getMaterial(0x253248, 0.4, 0.6);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 1.4 * s, 7 * s, 6), mat);
    col.position.set(0, 3.5 * s, 0);
    g.add(col);
  }
}
