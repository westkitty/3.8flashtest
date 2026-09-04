export class MnemonicSoundscapes {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public isMuted = true;

  constructor() {
    // Web Audio will initialize on user interaction
  }

  private initAudio() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.12;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public toggleMute(): boolean {
    this.initAudio();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.masterGain.gain.value = this.isMuted ? 0 : 0.12;
    }
    return this.isMuted;
  }

  // Play subtle synthesis cues
  public playPulseTone(freq = 220, duration = 0.3) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio synthesis interruption
    }
  }
}
