import * as THREE from 'three';

export class MemoryHeapTopography {
  public group = new THREE.Group();
  private monoliths: THREE.Mesh[] = [];
  private baseHeights: number[] = [];
  private shockwaveRing!: THREE.Mesh;
  private shockwaveProgress = 1.0;
  private lastHeapMB = 85;

  constructor() {
    this.buildDistrict();
  }

  private buildDistrict() {
    this.group.position.set(55, -38, -50);

    const geo = new THREE.BoxGeometry(4, 1, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.5
    });

    // 4x4 grid of dynamic memory blocks
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x * 7, 0, z * 7);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const h = 6 + Math.random() * 18;
        this.baseHeights.push(h);
        mesh.scale.set(1, h, 1);
        mesh.position.y = h * 0.5;

        this.monoliths.push(mesh);
        this.group.add(mesh);
      }
    }

    // GC Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.1, 1.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    this.shockwaveRing = new THREE.Mesh(ringGeo, ringMat);
    this.shockwaveRing.rotation.x = -Math.PI / 2;
    this.shockwaveRing.position.set(0, 0.5, 0);
    this.group.add(this.shockwaveRing);
  }

  public triggerGCShockwave() {
    this.shockwaveProgress = 0.0;
  }

  public update(delta: number, time: number) {
    // Read performance.memory if available in Chromium, or simulate harmonic allocation
    let currentHeap = 85 + Math.sin(time * 0.8) * 15 + Math.cos(time * 0.3) * 10;
    if (typeof window !== 'undefined' && (window.performance as any)?.memory?.usedJSHeapSize) {
      currentHeap = (window.performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }

    // Detect sudden GC drop
    if (this.lastHeapMB - currentHeap > 4) {
      this.triggerGCShockwave();
    }
    this.lastHeapMB = currentHeap;

    // Modulate monolith scales with heap pressure
    const heapFactor = Math.min(2.5, Math.max(0.6, currentHeap / 90));
    for (let i = 0; i < this.monoliths.length; i++) {
      const m = this.monoliths[i];
      const targetH = this.baseHeights[i] * heapFactor + Math.sin(time * 2.0 + i) * 1.5;
      m.scale.y = THREE.MathUtils.lerp(m.scale.y, targetH, 0.05);
      m.position.y = m.scale.y * 0.5;
    }

    // Animate shockwave ring
    if (this.shockwaveProgress < 1.0) {
      this.shockwaveProgress += delta * 1.2;
      const radius = this.shockwaveProgress * 36;
      this.shockwaveRing.scale.set(radius, radius, 1);
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = (1.0 - this.shockwaveProgress) * 0.9;
    } else {
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  }
}
