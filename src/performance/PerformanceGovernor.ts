export type QualityTier = 'high' | 'balanced' | 'low';

export interface PerformanceGovernorOptions {
  onTierChange?: (newTier: QualityTier, prevTier: QualityTier) => void;
  sampleSize?: number;
}

export class PerformanceGovernor {
  private samples: number[] = [];
  private sampleSize = 60;
  private currentTier: QualityTier = 'high';
  private manualOverride: QualityTier | null = null;
  private onTierChange?: (newTier: QualityTier, prevTier: QualityTier) => void;

  // Hysteresis counters
  private lowFramesCount = 0;
  private highFramesCount = 0;

  // Rolling stats
  public rollingFps = 60;
  public rollingFrameMs = 16.6;

  constructor(options?: PerformanceGovernorOptions) {
    if (options?.sampleSize) this.sampleSize = options.sampleSize;
    if (options?.onTierChange) this.onTierChange = options.onTierChange;
  }

  public get tier(): QualityTier {
    return this.manualOverride || this.currentTier;
  }

  public setTierOverride(tier: QualityTier | null): void {
    const prev = this.tier;
    this.manualOverride = tier;
    if (this.tier !== prev) {
      this.onTierChange?.(this.tier, prev);
    }
  }

  public recordFrame(dtSeconds: number): void {
    const dtMs = dtSeconds * 1000;
    this.samples.push(dtMs);
    if (this.samples.length > this.sampleSize) {
      this.samples.shift();
    }

    // Update rolling metrics
    const sum = this.samples.reduce((a, b) => a + b, 0);
    this.rollingFrameMs = sum / this.samples.length;
    this.rollingFps = this.rollingFrameMs > 0 ? Math.round(1000 / this.rollingFrameMs) : 60;

    if (this.manualOverride) return;

    // Hysteresis step evaluation
    if (this.currentTier === 'high') {
      if (this.rollingFrameMs > 30) {
        this.lowFramesCount++;
        if (this.lowFramesCount > 60) {
          this.setTier('balanced');
          this.lowFramesCount = 0;
        }
      } else {
        this.lowFramesCount = 0;
      }
    } else if (this.currentTier === 'balanced') {
      if (this.rollingFrameMs > 45) {
        this.lowFramesCount++;
        if (this.lowFramesCount > 60) {
          this.setTier('low');
          this.lowFramesCount = 0;
        }
      } else if (this.rollingFrameMs < 14) {
        this.highFramesCount++;
        if (this.highFramesCount > 120) {
          this.setTier('high');
          this.highFramesCount = 0;
        }
      } else {
        this.lowFramesCount = 0;
        this.highFramesCount = 0;
      }
    } else if (this.currentTier === 'low') {
      if (this.rollingFrameMs < 18) {
        this.highFramesCount++;
        if (this.highFramesCount > 120) {
          this.setTier('balanced');
          this.highFramesCount = 0;
        }
      } else {
        this.highFramesCount = 0;
      }
    }
  }

  private setTier(newTier: QualityTier): void {
    if (this.currentTier === newTier) return;
    const prev = this.currentTier;
    this.currentTier = newTier;
    this.onTierChange?.(newTier, prev);
  }
}
