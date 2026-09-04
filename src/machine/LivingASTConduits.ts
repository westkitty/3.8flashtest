import * as THREE from 'three';
import type { SelfArchitectureData } from '../types';

interface ConduitPulse {
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  color: THREE.Color;
}

export class LivingASTConduits {
  public group = new THREE.Group();
  private pulses: ConduitPulse[] = [];
  private pulsePointsMesh!: THREE.Points;
  private pulsePositions!: Float32Array;
  private pulseColors!: Float32Array;
  private maxPulses = 128;
  private curves: THREE.CatmullRomCurve3[] = [];

  constructor(archData: SelfArchitectureData, modulePositions: Map<string, THREE.Vector3>) {
    this.buildConduitsAndCurves(archData, modulePositions);
    this.initPulseParticles();
  }

  private buildConduitsAndCurves(archData: SelfArchitectureData, modulePositions: Map<string, THREE.Vector3>) {
    // Generate curved Bézier splines for each dependency edge in the AST
    for (const edge of archData.edges) {
      const fromPos = modulePositions.get(edge.source);
      const toPos = modulePositions.get(edge.target);
      if (!fromPos || !toPos) continue;

      const mid = new THREE.Vector3()
        .addVectors(fromPos, toPos)
        .multiplyScalar(0.5);
      // Lift midpoint to form an energetic overhead arc
      mid.y += Math.min(18, fromPos.distanceTo(toPos) * 0.35);

      const curve = new THREE.CatmullRomCurve3([
        fromPos.clone().add(new THREE.Vector3(0, 2, 0)),
        mid,
        toPos.clone().add(new THREE.Vector3(0, 2, 0))
      ]);
      this.curves.push(curve);
    }
  }

  private initPulseParticles() {
    const geo = new THREE.BufferGeometry();
    this.pulsePositions = new Float32Array(this.maxPulses * 3);
    this.pulseColors = new Float32Array(this.maxPulses * 3);

    // Park inactive particles off-screen
    for (let i = 0; i < this.maxPulses; i++) {
      this.pulsePositions[i * 3 + 1] = -9999;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.pulsePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pulseColors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pulsePointsMesh = new THREE.Points(geo, mat);
    this.group.add(this.pulsePointsMesh);
  }

  public triggerExecutionBurst(count = 6) {
    if (this.curves.length === 0) return;

    for (let i = 0; i < count; i++) {
      if (this.pulses.length >= this.maxPulses) {
        this.pulses.shift();
      }
      const randomCurve = this.curves[Math.floor(Math.random() * this.curves.length)];
      const color = new THREE.Color().setHSL(0.52 + Math.random() * 0.15, 0.9, 0.6);

      this.pulses.push({
        curve: randomCurve,
        progress: 0.0,
        speed: 0.8 + Math.random() * 0.8,
        color
      });
    }
  }

  public update(delta: number) {
    // Ambient occasional pulse
    if (Math.random() < 0.15 && this.curves.length > 0) {
      this.triggerExecutionBurst(2);
    }

    const posAttr = this.pulsePointsMesh.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.pulsePointsMesh.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const remaining: ConduitPulse[] = [];
    const pt = new THREE.Vector3();

    for (let i = 0; i < this.pulses.length; i++) {
      const pulse = this.pulses[i];
      pulse.progress += delta * pulse.speed;

      if (pulse.progress <= 1.0) {
        pulse.curve.getPoint(pulse.progress, pt);
        posArr[i * 3] = pt.x;
        posArr[i * 3 + 1] = pt.y;
        posArr[i * 3 + 2] = pt.z;

        colArr[i * 3] = pulse.color.r;
        colArr[i * 3 + 1] = pulse.color.g;
        colArr[i * 3 + 2] = pulse.color.b;
        remaining.push(pulse);
      } else {
        posArr[i * 3 + 1] = -9999;
      }
    }

    // Clear unused slots
    for (let i = remaining.length; i < this.maxPulses; i++) {
      posArr[i * 3 + 1] = -9999;
    }

    this.pulses = remaining;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }
}
