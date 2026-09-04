import * as THREE from 'three';
import type { SemanticWorldData } from '../types';

export class MnemonicWeather {
  public group = new THREE.Group();
  private particles!: THREE.Points;
  private particleGeo!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private velocities!: Float32Array;
  private count = 1200;

  constructor(_worldData: SemanticWorldData) {
    this.buildAtmosphericParticles();
  }

  private buildAtmosphericParticles() {
    this.particleGeo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      // Scatter particles across the 350m world volume
      this.positions[i * 3] = (Math.random() - 0.5) * 320;
      this.positions[i * 3 + 1] = Math.random() * 45 + 1;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 320;

      // Subtle directional drift flowing from South kinetic foundry to North aether-spire
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.4;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      this.velocities[i * 3 + 2] = -(Math.random() * 1.5 + 0.5); // Drift northward

      // Default calm aether blue
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

  public update(dt: number) {
    const pos = this.positions;
    const vel = this.velocities;
    for (let i = 0; i < this.count; i++) {
      pos[i * 3] += vel[i * 3] * dt * 5;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt * 5;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt * 5;

      // Natural drag decaying shockwave back to drift
      vel[i * 3] *= 0.95;
      vel[i * 3 + 1] *= 0.95;
      vel[i * 3 + 2] = vel[i * 3 + 2] * 0.95 - 0.05;

      // Gradually relax ignited particle color back to tranquil aether blue
      const colors = this.particleGeo.attributes.color.array as Float32Array;
      colors[i * 3] += (0.58 - colors[i * 3]) * 0.02;
      colors[i * 3 + 1] += (0.77 - colors[i * 3 + 1]) * 0.02;
      colors[i * 3 + 2] += (0.99 - colors[i * 3 + 2]) * 0.02;

      // Wrap around bounds
      if (pos[i * 3 + 2] < -160) pos[i * 3 + 2] = 160;
      if (pos[i * 3 + 1] < 1) pos[i * 3 + 1] = 45;
      if (pos[i * 3 + 1] > 45) pos[i * 3 + 1] = 1;
    }
    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;
  }
}
