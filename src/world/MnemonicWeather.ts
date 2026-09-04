import * as THREE from 'three';
import type { SemanticWorldData } from '../types';

function createStarTexture(): THREE.Texture | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(220, 240, 255, 0.9)');
    gradient.addColorStop(0.6, 'rgba(100, 180, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  } catch {
    return undefined;
  }
}

export class MnemonicWeather {
  public group = new THREE.Group();

  // 1. Inner Atmospheric Particles (Drifting motes within the world)
  private particles!: THREE.Points;
  private particleGeo!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private velocities!: Float32Array;
  private count = 1200;

  // 2. Multi-Tier Parallax Starfield Groups
  public tier1Group = new THREE.Group(); // Near stellar motes (R = 280-440m)
  public tier2Group = new THREE.Group(); // Mid celestial constellations (R = 520-780m)
  public tier3Group = new THREE.Group(); // Deep galactic background (R = 920-1450m)

  private tier2Material!: THREE.PointsMaterial;

  constructor(_worldData: SemanticWorldData) {
    this.buildAtmosphericParticles();
    this.buildParallaxStarfield();
  }

  private buildAtmosphericParticles() {
    this.particleGeo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * 320;
      this.positions[i * 3 + 1] = Math.random() * 45 + 1;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 320;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.4;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      this.velocities[i * 3 + 2] = -(Math.random() * 1.5 + 0.5);

      colors[i * 3] = 0.58;
      colors[i * 3 + 1] = 0.77;
      colors[i * 3 + 2] = 0.99;
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.0,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.particleGeo, mat);
    this.group.add(this.particles);
  }

  private buildParallaxStarfield() {
    const starTex = createStarTexture();

    // --- TIER 1: Near Stellar Motes & Aether Dust (R = 280 to 440m) ---
    const t1Count = 800;
    const t1Geo = new THREE.BufferGeometry();
    const t1Pos = new Float32Array(t1Count * 3);
    const t1Col = new Float32Array(t1Count * 3);

    for (let i = 0; i < t1Count; i++) {
      const r = 280 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.8 - 0.9);
      t1Pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      t1Pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15;
      t1Pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      t1Col[i * 3] = 0.6 + Math.random() * 0.35;
      t1Col[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      t1Col[i * 3 + 2] = 1.0;
    }
    t1Geo.setAttribute('position', new THREE.BufferAttribute(t1Pos, 3));
    t1Geo.setAttribute('color', new THREE.BufferAttribute(t1Col, 3));

    const t1Mat = new THREE.PointsMaterial({
      map: starTex,
      vertexColors: true,
      size: 2.2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.tier1Group.add(new THREE.Points(t1Geo, t1Mat));
    this.group.add(this.tier1Group);

    // --- TIER 2: Mid Celestial Constellations (R = 520 to 780m) ---
    const t2Count = 1600;
    const t2Geo = new THREE.BufferGeometry();
    const t2Pos = new Float32Array(t2Count * 3);
    const t2Col = new Float32Array(t2Count * 3);

    for (let i = 0; i < t2Count; i++) {
      const r = 520 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.7 - 0.85);
      t2Pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      t2Pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10;
      t2Pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const dice = Math.random();
      if (dice < 0.5) {
        t2Col[i * 3] = 0.98; t2Col[i * 3 + 1] = 0.98; t2Col[i * 3 + 2] = 1.0;
      } else if (dice < 0.75) {
        t2Col[i * 3] = 0.35; t2Col[i * 3 + 1] = 0.75; t2Col[i * 3 + 2] = 1.0;
      } else if (dice < 0.9) {
        t2Col[i * 3] = 1.0; t2Col[i * 3 + 1] = 0.82; t2Col[i * 3 + 2] = 0.35;
      } else {
        t2Col[i * 3] = 0.82; t2Col[i * 3 + 1] = 0.55; t2Col[i * 3 + 2] = 1.0;
      }
    }
    t2Geo.setAttribute('position', new THREE.BufferAttribute(t2Pos, 3));
    t2Geo.setAttribute('color', new THREE.BufferAttribute(t2Col, 3));

    this.tier2Material = new THREE.PointsMaterial({
      map: starTex,
      vertexColors: true,
      size: 2.8,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.tier2Group.add(new THREE.Points(t2Geo, this.tier2Material));
    this.group.add(this.tier2Group);

    // --- TIER 3: Deep Galactic Background (R = 920 to 1450m) ---
    const t3Count = 2400;
    const t3Geo = new THREE.BufferGeometry();
    const t3Pos = new Float32Array(t3Count * 3);
    const t3Col = new Float32Array(t3Count * 3);

    for (let i = 0; i < t3Count; i++) {
      const r = 920 + Math.random() * 530;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.8 - 0.9);

      const galacticBias = Math.sin(theta * 2 + phi) * 45;
      t3Pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      t3Pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + galacticBias;
      t3Pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      t3Col[i * 3] = 0.75 + Math.random() * 0.25;
      t3Col[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      t3Col[i * 3 + 2] = 1.0;
    }
    t3Geo.setAttribute('position', new THREE.BufferAttribute(t3Pos, 3));
    t3Geo.setAttribute('color', new THREE.BufferAttribute(t3Col, 3));

    const t3Mat = new THREE.PointsMaterial({
      map: starTex,
      vertexColors: true,
      size: 1.6,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.tier3Group.add(new THREE.Points(t3Geo, t3Mat));
    this.group.add(this.tier3Group);
  }

  public triggerShockwave(origin: THREE.Vector3) {
    const pos = this.positions;
    const vel = this.velocities;
    const colors = this.particleGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      const dx = pos[i * 3] - origin.x;
      const dy = pos[i * 3 + 1] - origin.y;
      const dz = pos[i * 3 + 2] - origin.z;
      const dist = Math.hypot(dx, dy, dz) + 0.1;
      if (dist < 80) {
        const force = (1 - dist / 80) * 18;
        vel[i * 3] += (dx / dist) * force;
        vel[i * 3 + 1] += (dy / dist) * force * 0.5 + 4;
        vel[i * 3 + 2] += (dz / dist) * force;

        // Ignite particle color into fiery gold/amber shockwave
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.45;
        colors[i * 3 + 2] = 0.1;
      }
    }
    this.particleGeo.attributes.color.needsUpdate = true;
  }

  public update(dt: number, cameraPosition?: THREE.Vector3) {
    // 1. Update inner atmospheric motes
    const pos = this.positions;
    const vel = this.velocities;
    for (let i = 0; i < this.count; i++) {
      pos[i * 3] += vel[i * 3] * dt * 5;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt * 5;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt * 5;

      vel[i * 3] *= 0.95;
      vel[i * 3 + 1] *= 0.95;
      vel[i * 3 + 2] = vel[i * 3 + 2] * 0.95 - 0.05;

      const colors = this.particleGeo.attributes.color.array as Float32Array;
      colors[i * 3] += (0.58 - colors[i * 3]) * 0.02;
      colors[i * 3 + 1] += (0.77 - colors[i * 3 + 1]) * 0.02;
      colors[i * 3 + 2] += (0.99 - colors[i * 3 + 2]) * 0.02;

      if (pos[i * 3 + 2] < -160) pos[i * 3 + 2] = 160;
      if (pos[i * 3 + 1] < 1) pos[i * 3 + 1] = 45;
      if (pos[i * 3 + 1] > 45) pos[i * 3 + 1] = 1;
    }
    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;

    // 2. Slow celestial drift on starfield tiers
    this.tier1Group.rotation.y += dt * 0.012;
    this.tier2Group.rotation.y += dt * 0.005;

    // 3. Subtle star twinkling pulsation
    if (this.tier2Material) {
      this.tier2Material.opacity = 0.82 + Math.sin(performance.now() * 0.002) * 0.12;
    }

    // 4. Parallax Depth Displacement: Stars shift differentially relative to camera translation
    if (cameraPosition) {
      this.tier1Group.position.set(
        cameraPosition.x * 0.65,
        cameraPosition.y * 0.65,
        cameraPosition.z * 0.65
      );
      this.tier2Group.position.set(
        cameraPosition.x * 0.85,
        cameraPosition.y * 0.85,
        cameraPosition.z * 0.85
      );
      this.tier3Group.position.set(
        cameraPosition.x * 0.98,
        cameraPosition.y * 0.98,
        cameraPosition.z * 0.98
      );
    }
  }
}
