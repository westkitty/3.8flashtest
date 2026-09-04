import * as THREE from 'three';
import { RendererHost } from '../render/RendererHost';
import { PlayerController } from '../player/PlayerController';
import { Terrain } from './Terrain';
import { LandmarkBuilder } from './LandmarkBuilder';
import { GraphRenderer } from './GraphRenderer';
import { MachineCity } from '../machine/MachineCity';
import { MutationManager } from '../mutation/MutationManager';
import { TimelineManager, type Epoch } from '../timeline/TimelineManager';
import { SearchNavigation } from '../search/SearchNavigation';
import { UIOverlay } from '../ui/UIOverlay';
import { ProvenanceTracer } from '../provenance/ProvenanceTracer';
import { MnemonicWeather } from './MnemonicWeather';
import { MnemonicSoundscapes } from '../audio/MnemonicSoundscapes';
import type { SemanticWorldData, SelfArchitectureData, SemanticExhibit, RuntimeEvent } from '../types';

import rawSemanticData from '../generated/semantic-world.json';
import rawSelfArchData from '../generated/self-architecture.json';

export class MnemonicEngine {
  public rendererHost: RendererHost;
  public player: PlayerController;
  public terrain: Terrain;
  public graphRenderer: GraphRenderer;
  public machineCity: MachineCity;
  public mutationManager: MutationManager;
  public timelineManager: TimelineManager;
  public searchNav: SearchNavigation;
  public provenanceTracer: ProvenanceTracer;
  public weather: MnemonicWeather;
  public soundscapes: MnemonicSoundscapes;
  public ui: UIOverlay;

  private landmarks = new Map<string, THREE.Group>();
  private landmarksGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(0, 0);

  private dirLight!: THREE.DirectionalLight;
  private sunBaseOffset = new THREE.Vector3(65, 125, 75);

  private isRunning = false;
  private lastTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    const worldData = rawSemanticData as unknown as SemanticWorldData;
    const archData = rawSelfArchData as unknown as SelfArchitectureData;

    this.rendererHost = new RendererHost(canvas);
    this.player = new PlayerController(this.rendererHost.camera, canvas);
    this.mutationManager = new MutationManager(worldData);
    this.provenanceTracer = new ProvenanceTracer(archData);
    this.soundscapes = new MnemonicSoundscapes();

    // World & Atmosphere
    this.terrain = new Terrain(this.mutationManager.currentWorldData);
    this.rendererHost.scene.add(this.terrain.group);

    this.weather = new MnemonicWeather(this.mutationManager.currentWorldData);
    this.rendererHost.scene.add(this.weather.group);

    this.rendererHost.scene.add(this.landmarksGroup);
    this.buildLandmarks(this.mutationManager.currentWorldData.exhibits);

    this.graphRenderer = new GraphRenderer(
      this.mutationManager.currentWorldData.relationships,
      this.mutationManager.currentWorldData.exhibits
    );
    this.rendererHost.scene.add(this.graphRenderer.group);

    // Subterranean Machine Layer
    this.machineCity = new MachineCity(archData);
    this.rendererHost.scene.add(this.machineCity.group);

    // Timeline & Search
    this.timelineManager = new TimelineManager(this.mutationManager.currentWorldData.exhibits, this.landmarks);
    this.searchNav = new SearchNavigation(this.mutationManager.currentWorldData.exhibits);
    this.rendererHost.scene.add(this.searchNav.group);

    // UI
    this.ui = new UIOverlay();
    this.bindUI();

    // Ambient Lighting
    this.setupLighting();

    // Hook Runtime Events
    this.player.events.onMove = (vel) => this.dispatchRuntimeEvent({ type: 'MOVE', velocity: vel });
    this.player.events.onInteract = () => this.inspectLookTarget();

    // Spawn facing North across the grand trans-domain causeway
    this.player.teleport(new THREE.Vector3(0, 5, 28), new THREE.Vector3(0, 15, -90));
  }

  private setupLighting() {
    // 1. Atmospheric celestial hemisphere fill — luminous azure sky and slate ground
    const hemiLight = new THREE.HemisphereLight(0xd4e7ff, 0x1e293b, 1.45);
    this.rendererHost.scene.add(hemiLight);

    // 2. Soft ambient fill to illuminate shadow crevices and maintain visibility
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.45);
    this.rendererHost.scene.add(ambientLight);

    // 3. Primary directional celestial luminary (Sun) with soft shadow mapping
    this.dirLight = new THREE.DirectionalLight(0xfff8ee, 2.35);
    this.dirLight.position.copy(this.sunBaseOffset);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 380;
    this.dirLight.shadow.camera.left = -95;
    this.dirLight.shadow.camera.right = 95;
    this.dirLight.shadow.camera.top = 95;
    this.dirLight.shadow.camera.bottom = -95;
    this.rendererHost.scene.add(this.dirLight);
    this.rendererHost.scene.add(this.dirLight.target);

    // 4. Fill light from opposite side (North-West) for clean specular edge separation
    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.95);
    fillLight.position.set(-65, 95, -65);
    this.rendererHost.scene.add(fillLight);

    // 5. Ground bounce light to lift underside structures
    const groundBounce = new THREE.DirectionalLight(0x38bdf8, 0.5);
    groundBounce.position.set(-45, -20, -45);
    this.rendererHost.scene.add(groundBounce);

    // 6. Subterranean machine cavern illumination
    const machineAmbient = new THREE.PointLight(0x10b981, 3.8, 140);
    machineAmbient.position.set(0, -36, 0);
    this.rendererHost.scene.add(machineAmbient);

    const machineUnderFill = new THREE.PointLight(0x06b6d4, 2.4, 100);
    machineUnderFill.position.set(0, -18, 0);
    this.rendererHost.scene.add(machineUnderFill);
  }

  private buildLandmarks(exhibits: SemanticExhibit[]) {
    while (this.landmarksGroup.children.length > 0) {
      const child = this.landmarksGroup.children[0];
      child.traverse((node) => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
      this.landmarksGroup.remove(child);
    }
    this.landmarks.clear();

    for (const ex of exhibits) {
      const landmark = LandmarkBuilder.buildLandmark(ex);
      const groundY = this.terrain.getHeightAt(ex.position[0], ex.position[2]);
      landmark.position.set(ex.position[0], groundY, ex.position[2]);
      this.landmarksGroup.add(landmark);
      this.landmarks.set(ex.id, landmark);
    }
  }

  private bindUI() {
    this.ui.events.onAudioToggle = () => {
      return this.soundscapes.toggleMute();
    };

    this.ui.events.onShadowToggle = (mode) => {
      this.rendererHost.setShadowMode(mode);
      this.ui.showToast(`Shadows: ${mode === 'reactive' ? 'Reactive High' : (mode === 'static' ? 'Static Standard' : 'Disabled')}`, 'info');
    };

    this.ui.events.onSearch = (query) => {
      const match = this.searchNav.search(query);
      this.dispatchRuntimeEvent({ type: 'SEARCH', query, targetId: match?.id });
      this.soundscapes.playPulseTone(440, 0.25);
      if (match) {
        const targetPos = new THREE.Vector3(match.position[0], match.position[1] + 4, match.position[2]);
        const dir = new THREE.Vector3().subVectors(targetPos, this.player.position).normalize();
        this.player.yaw = Math.atan2(-dir.x, -dir.z);
      }
    };

    this.ui.events.onEpochChange = (epoch: Epoch) => {
      this.timelineManager.setEpoch(epoch);
      this.soundscapes.playPulseTone(330, 0.3);
      this.dispatchRuntimeEvent({ type: 'TIMELINE_SHIFT', epoch });
    };

    this.ui.events.onOrbitalToggle = (active: boolean) => {
      this.graphRenderer.setVisibility(active);
      this.player.isFreeFlight = active;
      this.player.isSubterranean = false;
      this.soundscapes.playPulseTone(550, 0.4);
      this.dispatchRuntimeEvent({ type: 'ORBITAL_TOGGLE', active });

      if (active) {
        this.player.teleport(new THREE.Vector3(0, 165, 145), new THREE.Vector3(0, 0, 0));
      } else {
        this.player.teleport(new THREE.Vector3(0, 5, 28), new THREE.Vector3(0, 10, -90));
      }
    };

    this.ui.events.onMachineDescent = () => {
      this.player.isFreeFlight = false;
      this.player.isSubterranean = true;
      this.player.teleport(new THREE.Vector3(0, -38, 14), new THREE.Vector3(0, -35, 0));
      this.soundscapes.playPulseTone(110, 0.5);
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 10 });
    };

    this.ui.events.onSurfaceAscent = () => {
      this.player.isFreeFlight = false;
      this.player.isSubterranean = false;
      this.player.teleport(new THREE.Vector3(0, 5, 28), new THREE.Vector3(0, 10, -90));
      this.soundscapes.playPulseTone(330, 0.3);
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 10 });
    };

    this.ui.events.onTeleportToSanctuary = () => {
      this.player.isSubterranean = false;
      this.player.isFreeFlight = false;
      const s = this.mutationManager.currentWorldData.sanctuary;
      const y = this.terrain.getHeightAt(s.position[0], s.position[2]) + 2;
      this.player.teleport(new THREE.Vector3(s.position[0], y, s.position[2] + 8), new THREE.Vector3(s.position[0], y, s.position[2]));
      this.ui.showSanctuaryInspect(s);
      this.soundscapes.playPulseTone(293.66, 0.4); // Quiet resonant D note
      this.dispatchRuntimeEvent({ type: 'INSPECT', id: s.id });
    };

    this.ui.events.onIngestPatch = (text: string, isJson: boolean) => {
      const res = this.mutationManager.ingestPatch(text, isJson);
      this.ui.showToast(res.message, res.success ? 'success' : 'warning');
      if (res.success && res.patchExhibit) {
        this.soundscapes.playPulseTone(180, 0.7); // Low tectonic rumble
        const pos = new THREE.Vector3(res.patchExhibit.position[0], res.patchExhibit.position[1], res.patchExhibit.position[2]);
        this.weather.triggerShockwave(pos);
        this.terrain.rebuildTopology(this.mutationManager.currentWorldData);
        this.buildLandmarks(this.mutationManager.currentWorldData.exhibits);
        this.graphRenderer.updateData(
          this.mutationManager.currentWorldData.relationships,
          this.mutationManager.currentWorldData.exhibits
        );
        this.timelineManager.updateExhibits(this.mutationManager.currentWorldData.exhibits, this.landmarks);
        this.searchNav.updateExhibits(this.mutationManager.currentWorldData.exhibits);

        this.dispatchRuntimeEvent({ type: 'MUTATION_INGEST', patchId: res.patchExhibit.id });

        this.player.teleport(new THREE.Vector3(pos.x, pos.y + 4, pos.z + 18), pos);
        this.ui.showInspect(res.patchExhibit);
      }
    };

    this.ui.events.onResetCanonical = () => {
      this.mutationManager.resetToCanonical();
      this.terrain.rebuildTopology(this.mutationManager.currentWorldData);
      this.buildLandmarks(this.mutationManager.currentWorldData.exhibits);
      this.graphRenderer.updateData(
        this.mutationManager.currentWorldData.relationships,
        this.mutationManager.currentWorldData.exhibits
      );
      this.timelineManager.updateExhibits(this.mutationManager.currentWorldData.exhibits, this.landmarks);
      this.searchNav.updateExhibits(this.mutationManager.currentWorldData.exhibits);
      this.searchNav.clear();
      this.soundscapes.playPulseTone(220, 0.4);
      this.dispatchRuntimeEvent({ type: 'CANONICAL_RESET' });
    };

    this.ui.events.onTraceToMachine = (exhibit: SemanticExhibit) => {
      const { chain, targetMachineModule } = this.provenanceTracer.traceLandmark(exhibit);
      this.ui.renderCausalTrace(chain);
      this.soundscapes.playPulseTone(150, 0.5);
      // Teleport player down to the responsible machine subsystem in the machine layer
      setTimeout(() => {
        const mc = targetMachineModule.machineCoord;
        this.player.isSubterranean = true;
        this.player.isFreeFlight = false;
        this.player.teleport(
          new THREE.Vector3(mc[0], mc[1] + 2, mc[2] + 7),
          new THREE.Vector3(mc[0], mc[1], mc[2])
        );
        this.dispatchRuntimeEvent({ type: 'INSPECT', id: targetMachineModule.id });
      }, 900);
    };
  }

  public inspectLookTarget() {
    this.raycaster.setFromCamera(this.mouse, this.rendererHost.camera);
    const intersects = this.raycaster.intersectObjects(this.landmarksGroup.children, true);

    if (intersects.length > 0) {
      let cur: THREE.Object3D | null = intersects[0].object;
      while (cur && !cur.userData?.exhibitId) {
        cur = cur.parent;
      }
      if (cur && cur.userData?.exhibit) {
        const ex: SemanticExhibit = cur.userData.exhibit;
        this.ui.showInspect(ex);
        this.dispatchRuntimeEvent({ type: 'INSPECT', id: ex.id });
        return;
      }
    }

    const s = this.mutationManager.currentWorldData.sanctuary;
    const distToSanctuary = this.player.position.distanceTo(new THREE.Vector3(s.position[0], this.player.position.y, s.position[2]));
    if (distToSanctuary < s.radius + 6) {
      this.ui.showSanctuaryInspect(s);
      this.dispatchRuntimeEvent({ type: 'INSPECT', id: s.id });
      return;
    }

    this.ui.hideInspect();
  }

  public dispatchRuntimeEvent(event: RuntimeEvent) {
    this.machineCity.handleRuntimeEvent(event);
  }

  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Fixed-step player update
    this.player.update(dt, (x, z) => this.terrain.getHeightAt(x, z));

    // Update weather & multi-tier parallax starfield
    this.weather.update(dt, this.rendererHost.camera.position);

    // Update kinetic landmark animations (respects quality reduced motion setting)
    const time = now * 0.001;
    if (!this.rendererHost.quality.reducedMotion) {
      for (const landmark of this.landmarks.values()) {
        const ring1 = landmark.getObjectByName('rotating_ring_1');
        if (ring1) ring1.rotation.z = time * 0.6;
        const ring2 = landmark.getObjectByName('rotating_ring_2');
        if (ring2) ring2.rotation.x = time * 0.4;
        const kineticCore = landmark.getObjectByName('kinetic_core');
        if (kineticCore) kineticCore.rotation.y = time * 0.8;
        const katamariSphere = landmark.getObjectByName('katamari_sphere');
        if (katamariSphere) katamariSphere.rotation.y = time * 1.2;
        const crown = landmark.getObjectByName('arcane_crown');
        if (crown) {
          crown.rotation.y = time * 0.9;
          crown.position.y = 17 + Math.sin(time * 2) * 0.5;
        }
        const scaleBeam = landmark.getObjectByName('scale_beam');
        if (scaleBeam) scaleBeam.rotation.z = Math.sin(time * 1.5) * 0.08;
        const gyro = landmark.getObjectByName('gyro_ring_1');
        if (gyro) gyro.rotation.x = time * 1.5;
      }

      // Animate world megastructures
      const celestialRing = this.terrain.group.getObjectByName('celestial_orbital_ring');
      if (celestialRing) {
        celestialRing.rotation.z = time * 0.25;
        celestialRing.rotation.y = time * 0.15;
      }

      const descentCollar = this.terrain.group.getObjectByName('descent_energy_collar');
      if (descentCollar) {
        descentCollar.rotation.y = -time * 0.4;
      }
    }

    // Diegetic Proximity Zone Triggers:
    // 1. Walking into Central Shaft (0, 0) physically descends player down into the Machine Underworld
    const dDescent = Math.hypot(this.player.position.x, this.player.position.z);
    if (!this.player.isFreeFlight && !this.player.isSubterranean && dDescent < 6 && this.player.position.y > -15) {
      this.soundscapes.playPulseTone(110, 0.5);
      this.player.isSubterranean = true;
      this.player.teleport(new THREE.Vector3(0, -38, 14), new THREE.Vector3(0, -35, 0));
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 10 });
    }

    // 2. Climbing the Celestial Spire apex (0, -105) lifts the player into Orbital Macrocosm mode
    const dSpire = Math.hypot(this.player.position.x - 0, this.player.position.z - (-105));
    if (!this.graphRenderer.isVisible && dSpire < 8 && this.player.position.y > 45) {
      this.ui.events.onOrbitalToggle?.(true);
    }

    // Update subterranean machine conduits
    this.machineCity.update(time);

    // Update orbital graph pulse
    if (this.graphRenderer.isVisible) {
      this.graphRenderer.pulse();
    }

    // Dynamic Reactive Shadow Rig: Sun position and target track visitor locomotion
    if (this.dirLight) {
      if (this.rendererHost.quality.shadowMode === 'reactive') {
        this.dirLight.target.position.set(this.player.position.x, this.player.position.y, this.player.position.z);
        this.dirLight.target.updateMatrixWorld();

        // Locomotion & velocity-responsive solar sway so shadows dynamically react to walking movement
        const swayX = Math.sin(time * 0.4) * 6 + this.player.velocity.x * 1.6;
        const swayZ = Math.cos(time * 0.4) * 6 + this.player.velocity.z * 1.6;
        this.dirLight.position.set(
          this.player.position.x + this.sunBaseOffset.x + swayX,
          this.sunBaseOffset.y,
          this.player.position.z + this.sunBaseOffset.z + swayZ
        );
      } else if (this.rendererHost.quality.shadowMode === 'static') {
        this.dirLight.target.position.set(0, 0, 0);
        this.dirLight.target.updateMatrixWorld();
        this.dirLight.position.copy(this.sunBaseOffset);
      }
    }

    // Render frame
    this.rendererHost.render();
  };

  public stop() {
    this.isRunning = false;
  }
}
