export type UpdateFrequency = 'realtime' | 'medium' | 'low';

export class FrameScheduler {
  private frameCount = 0;
  private mediumAccumDt = 0;
  private lowAccumDt = 0;

  // Modulos
  private mediumInterval = 2; // Every 2 frames (~30 FPS on 60 Hz)
  private lowInterval = 6;    // Every 6 frames (~10 FPS on 60 Hz)

  public tick(dt: number): {
    isRealtime: boolean;
    isMedium: boolean;
    mediumDt: number;
    isLow: boolean;
    lowDt: number;
    frameIndex: number;
  } {
    this.frameCount++;
    this.mediumAccumDt += dt;
    this.lowAccumDt += dt;

    const isMedium = this.frameCount % this.mediumInterval === 0;
    const isLow = this.frameCount % this.lowInterval === 0;

    const mediumDt = isMedium ? this.mediumAccumDt : 0;
    const lowDt = isLow ? this.lowAccumDt : 0;

    if (isMedium) this.mediumAccumDt = 0;
    if (isLow) this.lowAccumDt = 0;

    return {
      isRealtime: true,
      isMedium,
      mediumDt,
      isLow,
      lowDt,
      frameIndex: this.frameCount
    };
  }

  public reset(): void {
    this.frameCount = 0;
    this.mediumAccumDt = 0;
    this.lowAccumDt = 0;
  }
}
