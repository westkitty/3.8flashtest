import * as THREE from 'three';

export class GenerativeSpatialSynth {
  private ctx: AudioContext | null = null;
  private isMuted = true;
  private masterGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lastNoteTime = 0;
  private tempo = 0.28; // seconds per arpeggiated step

  // Cymatics Shockwave
  public cymaticRipples: { center: THREE.Vector2; radius: number; maxRadius: number; strength: number }[] = [];

  constructor() {}

  public initAudio() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1800, this.ctx.currentTime);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.masterGain.connect(this.filterNode);
      this.filterNode.connect(this.ctx.destination);
    } catch {
      // AudioContext unavailable or restricted
    }
  }

  public toggleMute(): boolean {
    this.initAudio();
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const targetGain = this.isMuted ? 0.0 : 0.18;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public triggerCymaticBlast(pos: THREE.Vector3) {
    this.cymaticRipples.push({
      center: new THREE.Vector2(pos.x, pos.z),
      radius: 0.5,
      maxRadius: 35.0,
      strength: 1.0
    });

    // Play bass resonator drop
    if (this.ctx && !this.isMuted && this.masterGain) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    }
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    // Update cymatics waves
    for (let i = this.cymaticRipples.length - 1; i >= 0; i--) {
      const r = this.cymaticRipples[i];
      r.radius += delta * 18.0;
      r.strength = Math.max(0, 1.0 - r.radius / r.maxRadius);
      if (r.strength <= 0) {
        this.cymaticRipples.splice(i, 1);
      }
    }

    if (!this.ctx || this.isMuted || !this.masterGain) return;

    // Environmental Acoustic Raytracing Reverb filter
    // If subterranean, darken and echo; if open air, open filter
    if (this.filterNode) {
      const targetFreq = playerPos.y < -15 ? 900 : 2800;
      this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    }

    // Algorithmic wing arpeggios
    const now = this.ctx.currentTime;
    if (now - this.lastNoteTime > this.tempo) {
      this.lastNoteTime = now;
      this.playSpatialNote(playerPos);
    }
  }

  private playSpatialNote(playerPos: THREE.Vector3) {
    if (!this.ctx || !this.masterGain) return;

    // Determine scale based on nearest wing
    let frequencies = [261.63, 293.66, 329.63, 392.00, 440.00]; // Pentatonic default (Nexus / East)
    let oscType: OscillatorType = 'sine';

    if (playerPos.z < -25) {
      // North Wing: Dorian mode crystalline bells
      frequencies = [220, 246.94, 261.63, 293.66, 329.63, 369.99, 440];
      oscType = 'triangle';
    } else if (playerPos.z > 25) {
      // South Wing: Moog sub-bass
      frequencies = [55, 82.41, 110, 146.83, 164.81];
      oscType = 'sawtooth';
    } else if (playerPos.x < -25) {
      // West Wing: FM Chiptune
      frequencies = [330, 392, 493.88, 587.33, 659.25];
      oscType = 'square';
    }

    const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    noteGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
}
