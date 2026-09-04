import { MnemonicEngine } from './world/MnemonicEngine';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Failed to locate #webgl-canvas element');
    return;
  }

  const engine = new MnemonicEngine(canvas);
  engine.start();

  // Expose on window for testing / automated verification
  (window as any).__mnemonicEngine = engine;
});
