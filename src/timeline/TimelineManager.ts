import * as THREE from 'three';
import type { SemanticExhibit } from '../types';

export type Epoch = 'all' | 'archaic' | 'monumental' | 'contemporary' | 'emergent';

export class TimelineManager {
  public currentEpoch: Epoch = 'all';
  private landmarkMap: Map<string, THREE.Group>;
  private exhibits: SemanticExhibit[];

  constructor(exhibits: SemanticExhibit[], landmarkMap: Map<string, THREE.Group>) {
    this.exhibits = exhibits;
    this.landmarkMap = landmarkMap;
  }

  public updateExhibits(exhibits: SemanticExhibit[], landmarkMap: Map<string, THREE.Group>) {
    this.exhibits = exhibits;
    this.landmarkMap = landmarkMap;
  }

  public setEpoch(epoch: Epoch) {
    this.currentEpoch = epoch;
    this.applyEpochVisibility();
  }

  private applyEpochVisibility() {
    for (const ex of this.exhibits) {
      const landmark = this.landmarkMap.get(ex.id);
      if (!landmark) continue;

      if (this.currentEpoch === 'all') {
        landmark.visible = true;
        landmark.scale.setScalar(1);
      } else if (this.currentEpoch === 'archaic') {
        // Only archaic predecessors and archaeological ruins remain active; contemporary structures dissolve
        if (ex.isArchaeological || ex.startYear <= 2025) {
          landmark.visible = true;
          landmark.scale.setScalar(1.2); // Resurrected full glory
        } else {
          landmark.visible = false;
        }
      } else if (this.currentEpoch === 'monumental') {
        // Only tier A monumental exhibits visible
        if (ex.tier === 'A') {
          landmark.visible = true;
          landmark.scale.setScalar(1.1);
        } else {
          landmark.visible = false;
        }
      } else if (this.currentEpoch === 'contemporary') {
        // Modern 2026 builds
        if (!ex.isArchaeological) {
          landmark.visible = true;
          landmark.scale.setScalar(1.0);
        } else {
          landmark.visible = false;
        }
      } else if (this.currentEpoch === 'emergent') {
        // Highlight live mutations
        if (ex.isMutated) {
          landmark.visible = true;
          landmark.scale.setScalar(1.3);
        } else {
          landmark.visible = true;
          landmark.scale.setScalar(0.7); // Subdue background
        }
      }
    }
  }
}
