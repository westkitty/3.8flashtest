import * as THREE from 'three';
import type { SemanticExhibit } from '../types';

export class SearchNavigation {
  private exhibits: SemanticExhibit[];
  private beaconLine!: THREE.Line;
  public group = new THREE.Group();
  public activeTarget: SemanticExhibit | null = null;

  constructor(exhibits: SemanticExhibit[]) {
    this.exhibits = exhibits;
    this.buildBeaconLine();
  }

  public updateExhibits(exhibits: SemanticExhibit[]) {
    this.exhibits = exhibits;
  }

  private buildBeaconLine() {
    // A radiant vertical sky-pillar and guiding trail pointing towards the searched landmark
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 80, 0)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    this.beaconLine = new THREE.Line(geo, mat);
    this.beaconLine.visible = false;
    this.group.add(this.beaconLine);
  }

  public search(query: string): SemanticExhibit | null {
    if (!query || query.trim().length === 0) {
      this.clear();
      return null;
    }

    const q = query.toLowerCase().trim();

    // Exact matches first (slug, title, id, project name)
    let found = this.exhibits.find(e =>
      e.id.toLowerCase() === q ||
      e.title.toLowerCase().includes(q) ||
      e.slug.toLowerCase().includes(q) ||
      e.projects.some(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase() === q)
    );

    if (!found) {
      // Keyword fuzzy match in plaque / copy
      found = this.exhibits.find(e =>
        e.copy.plaque.toLowerCase().includes(q) ||
        e.copy.problem.toLowerCase().includes(q) ||
        e.copy.made.toLowerCase().includes(q)
      );
    }

    if (found) {
      this.activeTarget = found;
      this.beaconLine.position.set(found.position[0], found.position[1], found.position[2]);
      this.beaconLine.visible = true;
      return found;
    }

    this.clear();
    return null;
  }

  public clear() {
    this.activeTarget = null;
    this.beaconLine.visible = false;
  }
}
