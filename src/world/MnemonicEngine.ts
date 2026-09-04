import * as THREE from 'three';
import { RendererHost } from '../render/RendererHost';
import { PostProcessingPipeline } from '../render/PostProcessingPipeline';
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
import { CelestialCosmos } from './CelestialCosmos';
import { LivingASTConduits } from '../machine/LivingASTConduits';
import { MemoryHeapTopography } from '../machine/MemoryHeapTopography';
import { GitTimelineScrubber } from '../timeline/GitTimelineScrubber';
import { SubterraneanMaglevTransit } from '../machine/SubterraneanMaglevTransit';
import { PlayerMobility } from '../player/PlayerMobility';
import { AutonomousEcosystem } from '../ecosystem/AutonomousEcosystem';
import { GenerativeSpatialSynth } from '../audio/GenerativeSpatialSynth';
import { CollaborativePresence } from '../network/CollaborativePresence';
import type { SemanticWorldData, SelfArchitectureData, SemanticExhibit, RuntimeEvent } from '../types';

import rawSemanticData from '../generated/semantic-world.json';
import rawSelfArchData from '../generated/self-architecture.json';

export class MnemonicEngine {
  public rendererHost: RendererHost;
  public postProcessing: PostProcessingPipeline;
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

  // Next-Gen Subsystems (Features 1-25)
  public celestialCosmos: CelestialCosmos;
  public livingAST: LivingASTConduits;
  public heapTopography: MemoryHeapTopography;
  public gitScrubber: GitTimelineScrubber;
  public maglevTransit: SubterraneanMaglevTransit;
  public mobility: PlayerMobility;
  public ecosystem: AutonomousEcosystem;
  public spatialSynth: GenerativeSpatialSynth;
  public collaborativePresence: CollaborativePresence;

  public landmarks = new Map<string, THREE.Group>();
  private landmarksGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(0, 0);

  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private sunBaseOffset = new THREE.Vector3(65, 125, 75);

  private isRunning = false;
  private lastTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    const worldData = rawSemanticData as unknown as SemanticWorldData;
    const archData = rawSelfArchData as unknown as SelfArchitectureData;

    this.rendererHost = new RendererHost(canvas);
    this.postProcessing = new PostProcessingPipeline(
      this.rendererHost.renderer,
      this.rendererHost.scene,
      this.rendererHost.camera
    );
    this.rendererHost.postProcessing = this.postProcessing;

    this.player = new PlayerController(this.rendererHost.camera, canvas);
    this.mutationManager = new MutationManager(worldData);
    this.provenanceTracer = new ProvenanceTracer(archData);
    this.soundscapes = new MnemonicSoundscapes();

    // World & Atmosphere
    this.terrain = new Terrain(this.mutationManager.currentWorldData);
    this.rendererHost.scene.add(this.terrain.group);

    this.celestialCosmos = new CelestialCosmos();
    this.rendererHost.scene.add(this.celestialCosmos.group);

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

    const modulePositions = new Map<string, THREE.Vector3>();
    for (const mod of archData.modules) {
      modulePositions.set(mod.id, new THREE.Vector3(mod.machineCoord[0], mod.machineCoord[1], mod.machineCoord[2]));
    }
    this.livingAST = new LivingASTConduits(archData, modulePositions);
    this.rendererHost.scene.add(this.livingAST.group);

    this.heapTopography = new MemoryHeapTopography();
    this.rendererHost.scene.add(this.heapTopography.group);

    this.maglevTransit = new SubterraneanMaglevTransit();
    this.rendererHost.scene.add(this.maglevTransit.group);

    // Traversal & Ecosystem
    this.mobility = new PlayerMobility();
    this.rendererHost.scene.add(this.mobility.group);

    this.ecosystem = new AutonomousEcosystem(this.mutationManager.currentWorldData.exhibits);
    this.rendererHost.scene.add(this.ecosystem.group);

    this.spatialSynth = new GenerativeSpatialSynth();
    this.gitScrubber = new GitTimelineScrubber();

    this.collaborativePresence = new CollaborativePresence();
    this.rendererHost.scene.add(this.collaborativePresence.group);

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
    this.hemiLight = new THREE.HemisphereLight(0xd4e7ff, 0x1e293b, 1.45);
    this.rendererHost.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x38bdf8, 0.45);
    this.rendererHost.scene.add(this.ambientLight);

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

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.95);
    fillLight.position.set(-65, 95, -65);
    this.rendererHost.scene.add(fillLight);

    const groundBounce = new THREE.DirectionalLight(0x38bdf8, 0.5);
    groundBounce.position.set(-45, -20, -45);
    this.rendererHost.scene.add(groundBounce);

    const machineAmbient = new THREE.PointLight(0x10b981, 3.8, 140);
    machineAmbient.position.set(0, -36, 0);
    this.rendererHost.scene.add(machineAmbient);
  }

  private buildLandmarks(exhibits: SemanticExhibit[]) {
    this.landmarks.forEach(group => {
      this.landmarksGroup.remove(group);
      group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry?.dispose();
        }
      });
    });
    this.landmarks.clear();

    for (const exhibit of exhibits) {
      const group = LandmarkBuilder.buildLandmark(exhibit);
      group.userData = { exhibitId: exhibit.id, exhibit };
      this.landmarks.set(exhibit.id, group);
      this.landmarksGroup.add(group);
    }
  }

  private bindUI() {
    this.ui.events.onSearch = (q) => {
      this.searchNav.search(q);
      this.livingAST.triggerExecutionBurst(5);
    };

    this.ui.events.onEpochChange = (epoch: Epoch) => {
      this.timelineManager.setEpoch(epoch);
      this.soundscapes.playPulseTone(epoch === 'archaic' ? 140 : (epoch === 'emergent' ? 380 : 260), 0.25);
    };

    this.ui.events.onOrbitalToggle = (active) => {
      this.graphRenderer.setVisibility(active);
      if (active) {
        this.player.isFreeFlight = true;
        this.player.teleport(new THREE.Vector3(0, 115, 130), new THREE.Vector3(0, 0, 0));
        this.soundscapes.playPulseTone(480, 0.35);
        this.dispatchRuntimeEvent({ type: 'ORBITAL_TOGGLE', active: true });
      } else {
        this.player.isFreeFlight = false;
        this.player.teleport(new THREE.Vector3(0, 5, 28), new THREE.Vector3(0, 5, 0));
        this.soundscapes.playPulseTone(240, 0.35);
        this.dispatchRuntimeEvent({ type: 'ORBITAL_TOGGLE', active: false });
      }
    };

    this.ui.events.onMachineDescent = () => {
      this.player.isSubterranean = true;
      this.player.isFreeFlight = false;
      this.player.teleport(new THREE.Vector3(0, -38, 20), new THREE.Vector3(0, -38, 0));
      this.soundscapes.playPulseTone(110, 0.5);
      this.livingAST.triggerExecutionBurst(8);
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 15 });
    };

    this.ui.events.onSurfaceAscent = () => {
      this.player.isSubterranean = false;
      this.player.isFreeFlight = false;
      this.player.teleport(new THREE.Vector3(0, 5, 28), new THREE.Vector3(0, 15, -90));
      this.soundscapes.playPulseTone(360, 0.3);
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 5 });
    };

    this.ui.events.onTeleportToSanctuary = () => {
      const s = this.mutationManager.currentWorldData.sanctuary;
      this.player.isSubterranean = false;
      this.player.isFreeFlight = false;
      this.player.teleport(
        new THREE.Vector3(s.position[0], s.position[1] + 3, s.position[2] + 24),
        new THREE.Vector3(s.position[0], s.position[1] + 4, s.position[2])
      );
      this.ui.showSanctuaryInspect(s);
      this.soundscapes.playPulseTone(432, 0.6);
      this.dispatchRuntimeEvent({ type: 'INSPECT', id: s.id });
    };

    this.ui.events.onAudioToggle = () => {
      this.soundscapes.toggleMute();
      return this.spatialSynth.toggleMute();
    };

    this.ui.events.onShadowToggle = (mode) => {
      this.rendererHost.setShadowMode(mode);
    };

    // Advanced Traversal & Subsystems
    this.ui.events.onToggleGlider = () => {
      return this.mobility.toggleGlider();
    };

    this.ui.events.onToggleGrapple = () => {
      if (this.mobility.isGrappling) {
        this.mobility.releaseGrapple();
      } else {
        const lookDir = new THREE.Vector3();
        this.rendererHost.camera.getWorldDirection(lookDir);
        const target = this.player.position.clone().addScaledVector(lookDir, 40);
        this.mobility.shootGrapple(this.player.position, target);
        this.soundscapes.playPulseTone(520, 0.15);
      }
    };

    this.ui.events.onToggleKatamari = () => {
      return this.mobility.toggleKatamari();
    };

    this.ui.events.onToggleDirector = () => {
      return this.ecosystem.toggleDirectorMode();
    };

    this.ui.events.onTriggerCymatics = () => {
      this.spatialSynth.triggerCymaticBlast(this.player.position);
      this.livingAST.triggerExecutionBurst(12);
    };

    this.ui.events.onToggleTrain = () => {
      return this.maglevTransit.toggleBoarding();
    };

    this.ui.events.onToggleGravity = () => {
      return this.mobility.toggleGravityInversion();
    };

    this.ui.events.onGitScrub = (idx: number) => {
      const snap = this.gitScrubber.scrubToCommit(idx);
      const label = document.getElementById('git-hash-label');
      if (label) {
        label.textContent = `4D GIT: ${snap.hash} (${snap.activeExhibitCount} exhibits)`;
      }
      let i = 0;
      this.landmarks.forEach((mesh) => {
        mesh.visible = i < snap.activeExhibitCount;
        i++;
      });
      this.livingAST.triggerExecutionBurst(8);
    };

    this.ui.events.onSpeakLore = (title: string, summary: string) => {
      this.ecosystem.speakMonumentLore(title, summary);
    };

    this.ui.events.onIngestPatch = (text: string, isJson: boolean) => {
      const res = this.mutationManager.ingestPatch(text, isJson);
      this.ui.showToast(res.message, res.success ? 'success' : 'warning');
      if (res.success && res.patchExhibit) {
        const pos = new THREE.Vector3(res.patchExhibit.position[0], res.patchExhibit.position[1], res.patchExhibit.position[2]);

        this.terrain.rebuildTopology(this.mutationManager.currentWorldData);
        this.buildLandmarks(this.mutationManager.currentWorldData.exhibits);
        this.graphRenderer.updateData(
          this.mutationManager.currentWorldData.relationships,
          this.mutationManager.currentWorldData.exhibits
        );
        this.timelineManager.updateExhibits(this.mutationManager.currentWorldData.exhibits, this.landmarks);
        this.searchNav.updateExhibits(this.mutationManager.currentWorldData.exhibits);

        this.collaborativePresence.triggerConstruction(pos);
        this.livingAST.triggerExecutionBurst(20);
        this.heapTopography.triggerGCShockwave();

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
      this.livingAST.triggerExecutionBurst(15);
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
    if (event.type === 'MOVE' && !this.player.isFreeFlight && Math.random() < 0.12) {
      this.soundscapes.playPulseTone(180, 0.05);
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    const time = now * 0.001;
    this.lastTime = now;

    // 1. Update Celestial Cosmos (Day/Night & Aurora Borealis)
    const lighting = this.celestialCosmos.update(dt);
    if (this.dirLight) {
      this.dirLight.color.copy(lighting.sunColor);
      this.dirLight.intensity = lighting.sunIntensity;
    }
    if (this.hemiLight) {
      this.hemiLight.color.copy(lighting.hemiSkyColor);
      this.hemiLight.groundColor.copy(lighting.hemiGroundColor);
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = lighting.ambientIntensity;
    }
    if (this.rendererHost.scene.fog) {
      (this.rendererHost.scene.fog as THREE.FogExp2).color.copy(lighting.fogColor);
      this.rendererHost.scene.background = lighting.fogColor;
    }

    // 2. Traversal & Mobility Systems
    if (this.mobility.isGrappling && this.mobility.grappleAnchor) {
      const dir = new THREE.Vector3().subVectors(this.mobility.grappleAnchor, this.player.position);
      if (dir.length() > 3.0) {
        dir.normalize();
        this.player.position.addScaledVector(dir, dt * 38.0);
        this.mobility.updateGrappleLine(this.player.position, this.mobility.grappleAnchor);
      } else {
        this.mobility.releaseGrapple();
      }
    }

    const portalDest = this.mobility.checkPortalTeleport(this.player.position);
    if (portalDest) {
      this.player.teleport(portalDest);
      this.soundscapes.playPulseTone(440, 0.35);
    }

    if (this.mobility.isGliderActive) {
      this.mobility.gliderMesh.position.copy(this.player.position);
      this.mobility.gliderMesh.rotation.copy(this.rendererHost.camera.rotation);
      // Glider forward thrust
      const forward = new THREE.Vector3();
      this.rendererHost.camera.getWorldDirection(forward);
      this.player.position.addScaledVector(forward, dt * this.mobility.gliderSpeed);
    }

    if (this.mobility.isKatamariActive) {
      this.mobility.katamariMesh.position.copy(this.player.position);
      this.mobility.katamariMesh.position.y += 1.2;
      this.mobility.katamariMesh.rotation.x += dt * 3.0;
      this.mobility.katamariMesh.rotation.z -= dt * 2.5;
      if (Math.random() < 0.04) {
        this.mobility.accreteConcept();
      }
    }

    // 3. Subterranean Maglev Transit
    this.maglevTransit.update(dt);
    if (this.maglevTransit.isBoarded) {
      this.player.teleport(this.maglevTransit.getPassengerCameraPosition());
    }

    // 4. Autonomous Ecosystem & Drone Director
    this.ecosystem.update(dt, time);
    if (this.ecosystem.isDirectorActive) {
      const pose = this.ecosystem.getDirectorCameraPose();
      this.rendererHost.camera.position.copy(pose.pos);
      this.rendererHost.camera.lookAt(pose.lookAt);
    } else if (!this.maglevTransit.isBoarded) {
      // Standard player movement update
      this.player.update(dt, (x, z) => this.terrain.getHeightAt(x, z));
    }

    // 5. Living AST Conduits & Heap
    this.livingAST.update(dt);
    this.heapTopography.update(dt, time);

    // 6. Generative Spatial Synthesizer & Cymatics
    this.spatialSynth.update(dt, this.player.position);

    // 7. Collaborative Metaverse Presence & Phosphor Trail
    this.collaborativePresence.broadcastPosition(this.player.position);
    this.collaborativePresence.update(dt, time);

    // 8. Update weather & multi-tier parallax starfield
    this.weather.update(dt, this.rendererHost.camera.position);

    // 9. Update kinetic landmark animations
    if (!this.rendererHost.quality.reducedMotion) {
      for (const landmark of this.landmarks.values()) {
        const ring1 = landmark.getObjectByName('rotating_ring_1');
        if (ring1) ring1.rotation.z = time * 0.6;
        const ring2 = landmark.getObjectByName('rotating_ring_2');
        if (ring2) ring2.rotation.x = time * 0.4;
        const kineticCore = landmark.getObjectByName('kinetic_core');
        if (kineticCore) kineticCore.rotation.y = time * 0.8;
      }

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

    this.machineCity.update(time);

    if (this.graphRenderer.isVisible) {
      this.graphRenderer.pulse();
    }

    // Dynamic Reactive Shadow Rig
    if (this.dirLight) {
      if (this.rendererHost.quality.shadowMode === 'reactive') {
        this.dirLight.target.position.set(this.player.position.x, this.player.position.y, this.player.position.z);
        this.dirLight.target.updateMatrixWorld();

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

    // PostProcessing Pipeline (God Rays, Bloom, Lens, Singularity)
    if (this.postProcessing) {
      this.postProcessing.setSunWorldPosition(this.dirLight.position);
      this.postProcessing.update(dt, time);
    }

    // Render frame
    this.rendererHost.render();
  };

  public stop() {
    this.isRunning = false;
  }
}
