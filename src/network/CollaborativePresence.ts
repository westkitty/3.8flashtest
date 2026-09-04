import * as THREE from 'three';
import { ResourceDisposer } from '../utils/ResourceDisposer';

export interface RemoteVisitor {
  id: string;
  position: THREE.Vector3;
  targetPos: THREE.Vector3;
  mesh: THREE.Group;
  laserBeam: THREE.Line;
}

export class CollaborativePresence {
  public group = new THREE.Group();
  private peerHolograms = new Map<string, RemoteVisitor>();
  private channel: BroadcastChannel | null = null;
  private localId = `visitor_${Math.floor(Math.random() * 10000)}`;

  // Throttle state
  private lastBroadcastTime = 0;
  private lastBroadcastPos = new THREE.Vector3(-9999, -9999, -9999);

  // Phosphor Footstep Trail
  private trailPositions!: Float32Array;
  private trailColors!: Float32Array;
  private trailPointsMesh!: THREE.Points;
  private maxTrailPoints = 400;
  private trailIndex = 0;
  private lastTrailDrop = new THREE.Vector3(-9999, -9999, -9999);

  // Architectural Construction Sequencer
  public constructionGroup = new THREE.Group();
  private isConstructing = false;
  private constructionProgress = 0.0;
  private constructionCenter = new THREE.Vector3();
  private scaffoldingMesh!: THREE.LineSegments;
  private assemblyLaserMesh!: THREE.Line;

  constructor() {
    this.initPhosphorTrail();
    this.initConstructionSequencer();
    this.initPeerChannel();
    // Honest Local Presence: No fake demo peers spawned by default!
    // Actual peers appear when another local browser tab or window connects.
  }

  private initPeerChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('mnemonic_local_presence_channel');
        this.channel.onmessage = (e) => {
          if (e.data && e.data.id && e.data.id !== this.localId) {
            this.handleRemotePeerUpdate(e.data);
          }
        };
      } catch {
        // Channel unavailable
      }
    }
  }

  private initPhosphorTrail(): void {
    const geo = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(this.maxTrailPoints * 3);
    this.trailColors = new Float32Array(this.maxTrailPoints * 3);

    for (let i = 0; i < this.maxTrailPoints; i++) {
      this.trailPositions[i * 3 + 1] = -9999;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trailPointsMesh = new THREE.Points(geo, mat);
    this.group.add(this.trailPointsMesh);
  }

  private initConstructionSequencer(): void {
    this.constructionGroup.visible = false;

    // Scaffolding wireframe box
    const scaffoldGeo = new THREE.WireframeGeometry(new THREE.BoxGeometry(12, 18, 12));
    const scaffoldMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    this.scaffoldingMesh = new THREE.LineSegments(scaffoldGeo, scaffoldMat);
    this.constructionGroup.add(this.scaffoldingMesh);

    // Assembly laser beam
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 180, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const laserMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 4 });
    this.assemblyLaserMesh = new THREE.Line(laserGeo, laserMat);
    this.constructionGroup.add(this.assemblyLaserMesh);

    this.group.add(this.constructionGroup);
  }

  public spawnDemoPeers(): void {
    if (this.peerHolograms.size > 0) return;
    const peerPositions = [
      new THREE.Vector3(25, 4, -40),
      new THREE.Vector3(-30, 4, 30)
    ];

    peerPositions.forEach((pos, idx) => {
      const peer = this.createPeerHologram(`demo_peer_${idx + 1}`);
      peer.position.copy(pos);
      peer.targetPos.copy(pos);
      this.peerHolograms.set(`demo_peer_${idx + 1}`, peer);
      this.group.add(peer.mesh);
    });
  }

  public removeDemoPeers(): void {
    for (const [id, peer] of this.peerHolograms.entries()) {
      if (id.startsWith('demo_peer_')) {
        this.group.remove(peer.mesh);
        ResourceDisposer.disposeTree(peer.mesh);
        this.peerHolograms.delete(id);
      }
    }
  }

  private createPeerHologram(id: string): RemoteVisitor {
    const group = new THREE.Group();
    group.name = `local_visitor_hologram_${id}`;

    // Holographic diamond avatar body
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), bodyMat);
    body.position.y = 1.6;
    group.add(body);

    // Glowing core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), coreMat);
    core.position.y = 1.6;
    group.add(core);

    // Pointer laser
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.6, 0),
      new THREE.Vector3(0, 0, 12)
    ]);
    const laserMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
    const laser = new THREE.Line(laserGeo, laserMat);
    group.add(laser);

    const targetPos = new THREE.Vector3();
    const position = new THREE.Vector3();

    return { id, position, targetPos, mesh: group, laserBeam: laser };
  }

  private handleRemotePeerUpdate(data: { id: string; x: number; y: number; z: number }): void {
    let peer = this.peerHolograms.get(data.id);
    if (!peer) {
      peer = this.createPeerHologram(data.id);
      this.peerHolograms.set(data.id, peer);
      this.group.add(peer.mesh);
    }
    peer.targetPos.set(data.x, data.y, data.z);
  }

  public triggerConstruction(center: THREE.Vector3): void {
    this.isConstructing = true;
    this.constructionProgress = 0.0;
    this.constructionCenter.copy(center);
    this.constructionGroup.position.copy(center);
    this.constructionGroup.visible = true;
  }

  /**
   * Throttled position broadcast: only transmits over BroadcastChannel
   * at maximum 10 Hz AND only if player has moved at least 0.4 meters.
   */
  public broadcastPosition(pos: THREE.Vector3): void {
    const now = performance.now();

    if (now - this.lastBroadcastTime > 100 && pos.distanceTo(this.lastBroadcastPos) > 0.4) {
      this.lastBroadcastTime = now;
      this.lastBroadcastPos.copy(pos);

      if (this.channel) {
        try {
          this.channel.postMessage({ id: this.localId, x: pos.x, y: pos.y, z: pos.z });
        } catch {
          // Channel post failed
        }
      }
    }

    // Drop phosphor trail particle if moved > 1.8m
    if (pos.distanceTo(this.lastTrailDrop) > 1.8) {
      this.lastTrailDrop.copy(pos);
      const posArr = this.trailPositions;
      const colArr = this.trailColors;
      const idx = this.trailIndex;

      posArr[idx * 3] = pos.x;
      posArr[idx * 3 + 1] = pos.y + 0.15;
      posArr[idx * 3 + 2] = pos.z;

      colArr[idx * 3] = 0.22;
      colArr[idx * 3 + 1] = 0.74;
      colArr[idx * 3 + 2] = 0.97;

      this.trailIndex = (this.trailIndex + 1) % this.maxTrailPoints;
      (this.trailPointsMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.trailPointsMesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public update(delta: number, time: number): void {
    // Interpolate peer positions
    this.peerHolograms.forEach((peer) => {
      peer.mesh.position.lerp(peer.targetPos, delta * 4.0);
      peer.mesh.position.y += Math.sin(time * 2.5) * 0.01;
      peer.mesh.rotation.y += delta * 0.5;
    });

    // Animate construction sequence
    if (this.isConstructing) {
      this.constructionProgress += delta * 0.35;
      const s = Math.min(1.0, this.constructionProgress);
      this.scaffoldingMesh.rotation.y += delta * 1.5;
      this.scaffoldingMesh.scale.set(s, s, s);

      if (this.constructionProgress >= 1.0) {
        this.isConstructing = false;
        this.constructionGroup.visible = false;
      }
    }
  }

  public dispose(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    ResourceDisposer.disposeTree(this.group);
  }
}
