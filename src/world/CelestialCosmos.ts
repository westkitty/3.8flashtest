import * as THREE from 'three';

export type CosmicPhase = 'dawn' | 'noon' | 'twilight' | 'void';

export interface CosmicLightingState {
  phase: CosmicPhase;
  progress: number; // 0..1 within phase
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  ambientIntensity: number;
  fogColor: THREE.Color;
  auroraIntensity: number;
}

export class CelestialCosmos {
  public group = new THREE.Group();
  public currentPhase: CosmicPhase = 'noon';
  public auroraIntensity = 0.0;

  private auroraMesh!: THREE.Mesh;
  private auroraMaterial!: THREE.ShaderMaterial;

  // 24-minute full cycle = 1440 seconds (can be accelerated for demo)
  public cycleDuration = 144.0; // 2.4 minutes demo speed for vivid gameplay transitions
  public cycleTime = 40.0; // Start at near noon

  constructor() {
    this.buildAuroraBorealis();
  }

  private buildAuroraBorealis() {
    // Upper hemisphere curved ribbon curtain for Aurora Borealis
    const geo = new THREE.CylinderGeometry(180, 160, 48, 64, 16, true, 0, Math.PI * 2);
    this.auroraMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        intensity: { value: 0.0 }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vHeight;

        void main() {
          vUv = uv;
          vHeight = position.y;
          vec3 pos = position;

          // Undulating ribbon displacement
          float wave1 = sin(pos.x * 0.04 + time * 1.2) * 8.0;
          float wave2 = cos(pos.z * 0.05 + time * 0.8) * 6.0;
          pos.x += wave1;
          pos.z += wave2;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        varying float vHeight;

        void main() {
          if (intensity <= 0.001) discard;

          // Vertical curtain streaks
          float streaks = sin(vUv.x * 64.0 + time * 2.0) * 0.5 + 0.5;
          float verticalFade = smoothstep(-24.0, -5.0, vHeight) * (1.0 - smoothstep(10.0, 24.0, vHeight));

          // Ethereal emerald / electric cyan / magenta aurora color ramp
          vec3 col1 = vec3(0.1, 0.95, 0.6);  // Green-cyan
          vec3 col2 = vec3(0.4, 0.2, 0.9);   // Violet
          vec3 col3 = vec3(0.0, 0.8, 1.0);   // Electric blue
          vec3 color = mix(col1, col2, sin(vUv.x * 8.0 + time) * 0.5 + 0.5);
          color = mix(color, col3, streaks * 0.4);

          float alpha = verticalFade * (streaks * 0.6 + 0.4) * intensity * 0.85;
          gl_FragColor = vec4(color * 1.5, alpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.auroraMesh = new THREE.Mesh(geo, this.auroraMaterial);
    this.auroraMesh.position.set(0, 110, 0);
    this.group.add(this.auroraMesh);
  }

  public update(delta: number): CosmicLightingState {
    this.cycleTime = (this.cycleTime + delta) % this.cycleDuration;
    const progress = this.cycleTime / this.cycleDuration; // 0..1

    // 4 phases: [0..0.25) Dawn, [0.25..0.5) Noon, [0.5..0.75) Twilight, [0.75..1.0) Void
    let phase: CosmicPhase = 'dawn';
    let phaseProgress = 0;

    if (progress < 0.25) {
      phase = 'dawn';
      phaseProgress = progress / 0.25;
    } else if (progress < 0.5) {
      phase = 'noon';
      phaseProgress = (progress - 0.25) / 0.25;
    } else if (progress < 0.75) {
      phase = 'twilight';
      phaseProgress = (progress - 0.5) / 0.25;
    } else {
      phase = 'void';
      phaseProgress = (progress - 0.75) / 0.25;
    }
    this.currentPhase = phase;

    // Calculate dynamic lighting targets
    const sunColor = new THREE.Color();
    const hemiSky = new THREE.Color();
    const hemiGround = new THREE.Color();
    const fogCol = new THREE.Color();
    let sunIntensity = 2.35;
    let ambientIntensity = 0.45;

    if (phase === 'dawn') {
      sunColor.lerpColors(new THREE.Color(0x38bdf8), new THREE.Color(0xfbbf24), phaseProgress);
      hemiSky.setHex(0x7dd3fc);
      hemiGround.setHex(0x1e293b);
      fogCol.setHex(0x0c1e3d);
      sunIntensity = THREE.MathUtils.lerp(1.2, 2.35, phaseProgress);
      this.auroraIntensity = THREE.MathUtils.lerp(0.7, 0.0, phaseProgress);
    } else if (phase === 'noon') {
      sunColor.setHex(0xfff8ee);
      hemiSky.setHex(0xd4e7ff);
      hemiGround.setHex(0x1e293b);
      fogCol.setHex(0x0a1128);
      sunIntensity = 2.35;
      this.auroraIntensity = 0.0;
    } else if (phase === 'twilight') {
      sunColor.lerpColors(new THREE.Color(0xfff8ee), new THREE.Color(0xf43f5e), phaseProgress);
      hemiSky.lerpColors(new THREE.Color(0xd4e7ff), new THREE.Color(0x4c1d95), phaseProgress);
      hemiGround.setHex(0x0f172a);
      fogCol.lerpColors(new THREE.Color(0x0a1128), new THREE.Color(0x1e1035), phaseProgress);
      sunIntensity = THREE.MathUtils.lerp(2.35, 0.9, phaseProgress);
      this.auroraIntensity = THREE.MathUtils.lerp(0.0, 0.6, phaseProgress);
    } else {
      // Void (Night)
      sunColor.setHex(0x818cf8);
      hemiSky.setHex(0x1e1b4b);
      hemiGround.setHex(0x020617);
      fogCol.setHex(0x030712);
      sunIntensity = 0.55;
      ambientIntensity = 0.35;
      this.auroraIntensity = 1.0;
    }

    if (this.auroraMaterial) {
      this.auroraMaterial.uniforms.time.value += delta;
      this.auroraMaterial.uniforms.intensity.value = this.auroraIntensity;
    }

    return {
      phase,
      progress: phaseProgress,
      sunColor,
      sunIntensity,
      hemiSkyColor: hemiSky,
      hemiGroundColor: hemiGround,
      ambientIntensity,
      fogColor: fogCol,
      auroraIntensity: this.auroraIntensity
    };
  }
}
