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
  public ui: UIOverlay;

  private landmarks = new Map<string, THREE.Group>();
  private landmarksGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(0, 0); // Center reticle

  private isRunning = false;
  private lastTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    const worldData = rawSemanticData as unknown as SemanticWorldData;
    const archData = rawSelfArchData as unknown as SelfArchitectureData;

    this.rendererHost = new RendererHost(canvas);
    this.player = new PlayerController(this.rendererHost.camera, canvas);
    this.mutationManager = new MutationManager(worldData);

    // Build World Systems
    this.terrain = new Terrain(this.mutationManager.currentWorldData);
    this.rendererHost.scene.add(this.terrain.group);

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

    // Start Spawn Position (Facing North across the central plaza)
    this.player.teleport(new THREE.Vector3(0, 4, 30), new THREE.Vector3(0, 10, -90));
  }

  private setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0x7090b0, 0x101525, 0.65);
    this.rendererHost.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(40, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    this.rendererHost.scene.add(dirLight);

    // Machine Layer Subterranean illumination
    const machineAmbient = new THREE.PointLight(0x00e676, 2.5, 90);
    machineAmbient.position.set(0, -35, 0);
    this.rendererHost.scene.add(machineAmbient);
  }

  private buildLandmarks(exhibits: SemanticExhibit[]) {
    // Clear existing
    while (this.landmarksGroup.children.length > 0) {
      this.landmarksGroup.remove(this.landmarksGroup.children[0]);
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
    this.ui.events.onSearch = (query) => {
      const match = this.searchNav.search(query);
      this.dispatchRuntimeEvent({ type: 'SEARCH', query, targetId: match?.id });
      if (match) {
        // Subtle directional cue: turn player camera slightly toward match
        const targetPos = new THREE.Vector3(match.position[0], match.position[1] + 4, match.position[2]);
        const dir = new THREE.Vector3().subVectors(targetPos, this.player.position).normalize();
        this.player.yaw = Math.atan2(-dir.x, -dir.z);
      }
    };

    this.ui.events.onEpochChange = (epoch: Epoch) => {
      this.timelineManager.setEpoch(epoch);
      this.dispatchRuntimeEvent({ type: 'TIMELINE_SHIFT', epoch });
    };

    this.ui.events.onOrbitalToggle = (active: boolean) => {
      this.graphRenderer.setVisibility(active);
      this.player.isFreeFlight = active;
      this.dispatchRuntimeEvent({ type: 'ORBITAL_TOGGLE', active });

      if (active) {
        // Ascend to grand orbital vantage overlooking all 6 macro-regions
        this.player.teleport(new THREE.Vector3(0, 160, 140), new THREE.Vector3(0, 0, 0));
      } else {
        // Return smoothly to ground walking level
        this.player.teleport(new THREE.Vector3(0, 4, 30), new THREE.Vector3(0, 8, -90));
      }
    };

    this.ui.events.onMachineDescent = () => {
      // Descend into Machine Layer beneath the world
      this.player.isFreeFlight = false;
      this.player.teleport(new THREE.Vector3(0, -38, 15), new THREE.Vector3(0, -35, 0));
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 10 });
    };

    this.ui.events.onSurfaceAscent = () => {
      this.player.teleport(new THREE.Vector3(0, 4, 30), new THREE.Vector3(0, 8, -90));
      this.dispatchRuntimeEvent({ type: 'MOVE', velocity: 10 });
    };

    this.ui.events.onTeleportToSanctuary = () => {
      const s = this.mutationManager.currentWorldData.sanctuary;
      const y = this.terrain.getHeightAt(s.position[0], s.position[2]) + 2;
      this.player.teleport(new THREE.Vector3(s.position[0], y, s.position[2] + 8), new THREE.Vector3(s.position[0], y, s.position[2]));
      this.ui.showSanctuaryInspect(s);
      this.dispatchRuntimeEvent({ type: 'INSPECT', id: s.id });
    };

    this.ui.events.onIngestPatch = (text: string, isJson: boolean) => {
      const res = this.mutationManager.ingestPatch(text, isJson);
      alert(res.message);
      if (res.success && res.patchExhibit) {
        // Rebuild landmarks, graph and search index
        this.buildLandmarks(this.mutationManager.currentWorldData.exhibits);
        this.graphRenderer.updateData(
          this.mutationManager.currentWorldData.relationships,
          this.mutationManager.currentWorldData.exhibits
        );
        this.timelineManager.updateExhibits(this.mutationManager.currentWorldData.exhibits, this.landmarks);
        this.searchNav.updateExhibits(this.mutationManager.currentWorldData.exhibits);

        this.dispatchRuntimeEvent({ type: 'MUTATION_INGEST', patchId: res.patchExhibit.id });

        // Turn player towards the new emergent landmark
        const pos = new THREE.Vector3(res.patchExhibit.position[0], res.patchExhibit.position[1], res.patchExhibit.position[2]);
        this.player.teleport(new THREE.Vector3(pos.x, pos.y + 4, pos.z + 18), pos);
        this.ui.showInspect(res.patchExhibit);
      }
    };

    this.ui.events.onResetCanonical = () => {
      this.mutationManager.resetToCanonical();
      this.buildLandmarks(this.mutationManager.currentWorldData.exhibits);
      this.graphRenderer.updateData(
        this.mutationManager.currentWorldData.relationships,
        this.mutationManager.currentWorldData.exhibits
      );
      this.timelineManager.updateExhibits(this.mutationManager.currentWorldData.exhibits, this.landmarks);
      this.searchNav.updateExhibits(this.mutationManager.currentWorldData.exhibits);
      this.searchNav.clear();
      this.dispatchRuntimeEvent({ type: 'CANONICAL_RESET' });
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

    // Check if looking at Sanctuary
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

    // Update kinetic landmark components
    const time = now * 0.001;
    for (const landmark of this.landmarks.values()) {
      const ring1 = landmark.getObjectByName('rotating_ring_1');
      if (ring1) ring1.rotation.z = time * 0.6;
      const ring2 = landmark.getObjectByName('rotating_ring_2');
      if (ring2) ring2.rotation.x = time * 0.4;
      const kineticCore = landmark.getObjectByName('kinetic_core');
      if (kineticCore) kineticCore.rotation.y = time * 0.8;
      const crystal = landmark.getObjectByName('floating_crystal');
      if (crystal) {
        crystal.rotation.y = time * 0.7;
        crystal.position.y = 5.5 + Math.sin(time * 2) * 0.3;
      }
      const wave = landmark.getObjectByName('wave_ring');
      if (wave) {
        wave.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
      }
      const beacon = landmark.getObjectByName('beacon') as THREE.Mesh | undefined;
      if (beacon && beacon.material) {
        (beacon.material as THREE.MeshBasicMaterial).color.setHSL(0.55 + Math.sin(time) * 0.05, 0.8, 0.6);
      }
    }

    // Update subterranean machine conduits
    this.machineCity.update(time);

    // Update orbital graph pulse
    if (this.graphRenderer.isVisible) {
      this.graphRenderer.pulse();
    }

    // Render frame
    this.rendererHost.render();
  };

  public stop() {
    this.isRunning = false;
  }
}
