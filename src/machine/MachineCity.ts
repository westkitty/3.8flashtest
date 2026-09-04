import * as THREE from 'three';
import type { SelfArchitectureData, RuntimeEvent } from '../types';

export class MachineCity {
  public group = new THREE.Group();
  public data: SelfArchitectureData;
  private moduleMeshes = new Map<string, THREE.Mesh>();
  private conduitLines: THREE.Line[] = [];
  private pulseMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(data: SelfArchitectureData) {
    this.data = data;
    this.buildSubterraneanEnvironment();
    this.buildMachineModules();
    this.buildConduits();
  }

  private buildSubterraneanEnvironment() {
    // Machine cavern floor at Y = -45
    const cavernFloorGeo = new THREE.CylinderGeometry(80, 85, 2, 32);
    const cavernMat = new THREE.MeshStandardMaterial({
      color: 0x05080f,
      roughness: 0.9,
      metalness: 0.3
    });
    const floor = new THREE.Mesh(cavernFloorGeo, cavernMat);
    floor.position.set(0, -46, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Giant subterranean support pillars holding up the world above
    const pillarGeo = new THREE.BoxGeometry(4, 50, 4);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.8, metalness: 0.5 });
    const positions = [
      [-40, -20, -40], [40, -20, -40],
      [-40, -20, 40], [40, -20, 40],
      [0, -20, -55], [0, -20, 55],
      [-55, -20, 0], [55, -20, 0]
    ];
    for (const pos of positions) {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(pos[0], pos[1], pos[2]);
      this.group.add(p);
    }

    // Central elevator / descent shaft core
    const shaftGeo = new THREE.CylinderGeometry(5, 5, 45, 16, 1, true);
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x00e676, wireframe: true, transparent: true, opacity: 0.3 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, -22.5, 0);
    this.group.add(shaft);
  }

  private buildMachineModules() {
    for (const mod of this.data.modules) {
      // Create distinct mechanical server chamber / optical substation
      const sizeX = Math.max(1.8, Math.min(6, Math.sqrt(mod.lineCount) * 0.45));
      const sizeY = Math.max(2.5, Math.min(10, (mod.sizeBytes / 800)));
      const sizeZ = Math.max(1.8, Math.min(6, Math.sqrt(mod.lineCount) * 0.45));

      const geo = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
      const mat = new THREE.MeshStandardMaterial({
        color: mod.color,
        roughness: 0.3,
        metalness: 0.8,
        emissive: new THREE.Color(mod.color).multiplyScalar(0.15)
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(mod.machineCoord[0], mod.machineCoord[1], mod.machineCoord[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { module: mod };

      // Top indicator beacon
      const lightGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: mod.color });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(0, sizeY / 2 + 0.35, 0);
      mesh.add(light);

      this.group.add(mesh);
      this.moduleMeshes.set(mod.id, mesh);
      this.pulseMaterials.push(mat);
    }
  }

  private buildConduits() {
    for (const edge of this.data.edges) {
      const srcMod = this.moduleMeshes.get(edge.source);
      const tgtMod = this.moduleMeshes.get(edge.target);
      if (!srcMod || !tgtMod) continue;

      const p1 = srcMod.position.clone();
      const p2 = tgtMod.position.clone();

      // Bus conduit running along right angles (ortho-wiring)
      const mid = new THREE.Vector3(p2.x, p1.y, p1.z);
      const points = [p1, mid, p2];

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x00e676,
        transparent: true,
        opacity: 0.4
      });

      const line = new THREE.Line(geo, mat);
      this.group.add(line);
      this.conduitLines.push(line);
    }
  }

  // Instrument runtime events by visibly pulsing corresponding machine districts
  public handleRuntimeEvent(event: RuntimeEvent) {
    let targetSystem = '';
    switch (event.type) {
      case 'MOVE':
        targetSystem = 'kinematics_and_input';
        break;
      case 'INSPECT':
        targetSystem = 'provenance_truth';
        break;
      case 'SEARCH':
        targetSystem = 'spatial_navigation';
        break;
      case 'ORBITAL_TOGGLE':
        targetSystem = 'optics_and_shaders';
        break;
      case 'TIMELINE_SHIFT':
        targetSystem = 'chronology_engine';
        break;
      case 'MUTATION_INGEST':
        targetSystem = 'topological_mutation';
        break;
      case 'CANONICAL_RESET':
        targetSystem = 'semantic_memory';
        break;
    }

    for (const mod of this.data.modules) {
      if (mod.system === targetSystem) {
        const mesh = this.moduleMeshes.get(mod.id);
        if (mesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xffffff);
          // Scale pop
          mesh.scale.set(1.2, 1.2, 1.2);
          setTimeout(() => {
            mat.emissive.setHex(mod.color).multiplyScalar(0.15);
            mesh.scale.set(1, 1, 1);
          }, 450);
        }
      }
    }
  }

  public update(time: number) {
    // Ambient pulsation of underground conduits
    const pulse = 0.3 + 0.2 * Math.sin(time * 2);
    for (const line of this.conduitLines) {
      (line.material as THREE.LineBasicMaterial).opacity = pulse;
    }
  }
}
