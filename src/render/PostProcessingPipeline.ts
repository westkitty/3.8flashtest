import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Custom God Rays (Crepuscular Rays) & Cinematic Lens Shader
const GodRaysAndLensShader = {
  uniforms: {
    tDiffuse: { value: null },
    sunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    sunVisible: { value: 1.0 },
    rayIntensity: { value: 0.45 },
    rayDecay: { value: 0.94 },
    chromaticAberration: { value: 0.0025 },
    vignetteDarkness: { value: 1.15 },
    vignetteOffset: { value: 0.85 },
    time: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 sunScreenPos;
    uniform float sunVisible;
    uniform float rayIntensity;
    uniform float rayDecay;
    uniform float chromaticAberration;
    uniform float vignetteDarkness;
    uniform float vignetteOffset;
    uniform float time;
    varying vec2 vUv;

    float random(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // 1. Chromatic aberration sampling
      vec2 dirToCenter = vUv - vec2(0.5);
      float distToCenter = length(dirToCenter);
      vec2 caOffset = dirToCenter * chromaticAberration * distToCenter;

      float r = texture2D(tDiffuse, vUv + caOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - caOffset).b;
      vec4 baseColor = vec4(r, g, b, 1.0);

      // 2. Crepuscular Volumetric God Rays (Radial Blur Sampling)
      vec4 rays = vec4(0.0);
      if (sunVisible > 0.01) {
        vec2 rayDir = (sunScreenPos - vUv) * 0.035;
        vec2 sampleCoord = vUv;
        float illuminationDecay = 1.0;

        for (int i = 0; i < 8; i++) {
          sampleCoord += rayDir;
          vec4 sampleCol = texture2D(tDiffuse, sampleCoord);
          float brightness = max(sampleCol.r, max(sampleCol.g, sampleCol.b));
          if (brightness > 0.72) {
            rays += sampleCol * illuminationDecay * rayIntensity;
          }
          illuminationDecay *= rayDecay;
        }
      }

      vec4 color = baseColor + rays;

      // 3. Subtle film grain
      float grain = (random(vUv * 100.0 + time) - 0.5) * 0.022;
      color.rgb += grain;

      // 4. Smooth Cinematic Vignette
      vec2 uvVignette = (vUv - vec2(0.5)) * vec2(vignetteOffset);
      float vignette = clamp(1.0 - dot(uvVignette, uvVignette) * vignetteDarkness, 0.0, 1.0);
      color.rgb *= vignette;

      gl_FragColor = color;
    }
  `
};

export class PostProcessingPipeline {
  public composer: EffectComposer;
  public renderPass: RenderPass;
  public bloomPass: UnrealBloomPass;
  public lensPass: ShaderPass;
  public outputPass: OutputPass;
  public enabled = true;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunWorldPos = new THREE.Vector3(65, 125, 75);
  private tempVec = new THREE.Vector3();

  // Singularity (Black Hole) 3D Object
  public singularityGroup = new THREE.Group();
  private accretionDisk!: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Unreal Bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.45,
      0.35,
      0.75
    );
    this.composer.addPass(this.bloomPass);

    // God Rays & Cinematic Lens Pass
    this.lensPass = new ShaderPass(GodRaysAndLensShader);
    this.composer.addPass(this.lensPass);

    // Final Output Pass (Tone Mapping & Color Space)
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    // Build Black Hole Singularity in deep cosmos
    this.buildBlackHoleSingularity();
    this.scene.add(this.singularityGroup);

    // Auto-detect software WebGL rasterizers (SwiftShader/LLVMpipe in headless test environments)
    try {
      const gl = renderer.getContext();
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      if (/swiftshader|llvmpipe|software/i.test(rendererStr)) {
        this.enabled = false;
      }
    } catch {
      // Ignore detection errors
    }
  }

  private buildBlackHoleSingularity() {
    this.singularityGroup.position.set(-680, 110, -820);

    // Event Horizon Sphere (Pure light absorber)
    const horizonGeo = new THREE.SphereGeometry(32, 32, 32);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    this.singularityGroup.add(horizon);

    // Photon Sphere Glow Ring
    const photonGeo = new THREE.RingGeometry(32.5, 36.5, 64);
    const photonMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const photonRing = new THREE.Mesh(photonGeo, photonMat);
    photonRing.rotation.x = Math.PI / 2.5;
    this.singularityGroup.add(photonRing);

    // Swirling Incandescent Accretion Disk
    const accretionGeo = new THREE.RingGeometry(38, 92, 64);
    const accretionMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float angle = atan(p.y, p.x);
          float swirl = sin(angle * 5.0 - time * 2.0 + r * 10.0);
          float falloff = smoothstep(0.4, 0.65, r) * (1.0 - smoothstep(0.85, 1.0, r));

          vec3 innerColor = vec3(0.95, 0.7, 0.3);
          vec3 outerColor = vec3(0.2, 0.6, 1.0);
          vec3 col = mix(innerColor, outerColor, (r - 0.4) / 0.6);
          col += swirl * 0.25;

          gl_FragColor = vec4(col, falloff * 0.9);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.accretionDisk = new THREE.Mesh(accretionGeo, accretionMat);
    this.accretionDisk.rotation.x = Math.PI / 2.5;
    this.singularityGroup.add(this.accretionDisk);
  }

  public setSunWorldPosition(pos: THREE.Vector3) {
    this.sunWorldPos.copy(pos);
  }

  public update(_delta: number, time: number) {
    // Spin accretion disk
    if (this.accretionDisk && this.accretionDisk.material instanceof THREE.ShaderMaterial) {
      this.accretionDisk.material.uniforms.time.value = time;
      this.accretionDisk.rotation.z = time * 0.25;
    }

    // Update screen-space sun position for God Rays
    this.tempVec.copy(this.sunWorldPos);
    this.tempVec.project(this.camera);

    const isBehind = this.tempVec.z > 1.0;
    const sunScreenX = (this.tempVec.x + 1.0) * 0.5;
    const sunScreenY = (this.tempVec.y + 1.0) * 0.5;

    const sunScreenPosUniform = this.lensPass.uniforms.sunScreenPos;
    if (sunScreenPosUniform) {
      sunScreenPosUniform.value.set(sunScreenX, sunScreenY);
    }
    const sunVisibleUniform = this.lensPass.uniforms.sunVisible;
    if (sunVisibleUniform) {
      sunVisibleUniform.value = isBehind ? 0.0 : 1.0;
    }
    const timeUniform = this.lensPass.uniforms.time;
    if (timeUniform) {
      timeUniform.value = time;
    }
  }

  public resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  public render() {
    if (this.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose() {
    this.composer.dispose();
  }
}
