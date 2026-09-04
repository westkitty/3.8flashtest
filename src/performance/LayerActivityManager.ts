import type { AppMode } from '../types';

export class LayerActivityManager {
  private currentMode: AppMode = 'surface';
  private playerIsSubterranean = false;

  public updateMode(mode: AppMode, isSubterranean: boolean): void {
    this.currentMode = mode;
    this.playerIsSubterranean = isSubterranean;
  }

  public get shouldUpdateSurfaceAtmosphere(): boolean {
    // When deep in machine layer, stop updating surface starfield/weather
    if (this.currentMode === 'machine' || this.playerIsSubterranean) {
      return false;
    }
    return true;
  }

  public get shouldUpdateMachineCavern(): boolean {
    // Machine simulation is active when in machine mode or physically underground
    return this.currentMode === 'machine' || this.playerIsSubterranean;
  }

  public get shouldUpdateRelationalGraph(): boolean {
    // Graph arcs only update/pulse when connections mode is active
    return this.currentMode === 'connections';
  }

  public get shouldUpdateTourDirector(): boolean {
    return this.currentMode === 'tour';
  }

  public get shouldUpdateLabMechanics(): boolean {
    return this.currentMode === 'lab';
  }
}
