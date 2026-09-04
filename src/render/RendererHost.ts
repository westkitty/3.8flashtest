import * as THREE from 'three';

export type ShadowMode = 'reactive' | 'static' | 'off';

export interface QualitySettings {
  shadows: boolean;
  shadowMode: ShadowMode;
  dpr: number;
  reducedMotion: boolean;
}

export class RendererHost {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public quality: QualitySettings;

  constructor(canvas: HTMLCanvasElement) {
    this.quality = {
      shadows: true,
      shadowMode: 'reactive',
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1128);
    // Soft, luminous celestial fog that preserves visibility across the entire landscape
    this.scene.fog = new THREE.FogExp2(0x0a1128, 0.0016);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
    this.camera.position.set(0, 3, 20);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.38;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', this.onResize);
    document.addEventListener('fullscreenchange', this.onResize);
    document.addEventListener('webkitfullscreenchange', this.onResize);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setReducedMotion(val: boolean) {
    this.quality.reducedMotion = val;
  }

  public setShadowMode(mode: ShadowMode) {
    this.quality.shadowMode = mode;
    this.quality.shadows = mode !== 'off';
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mat = (node as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.needsUpdate = true);
        } else if (mat) {
          mat.needsUpdate = true;
        }
      }
    });
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('fullscreenchange', this.onResize);
    document.removeEventListener('webkitfullscreenchange', this.onResize);
    this.renderer.dispose();
  }
}
