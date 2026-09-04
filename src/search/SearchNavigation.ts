import * as THREE from 'three';
import type { SemanticExhibit, SearchResult } from '../types';

export class SearchNavigation {
  private exhibits: SemanticExhibit[];
  private beaconLine!: THREE.Line;
  public group = new THREE.Group();
  public activeTarget: SemanticExhibit | null = null;

  constructor(exhibits: SemanticExhibit[]) {
    this.exhibits = exhibits;
    this.buildBeaconLine();
  }

  public updateExhibits(exhibits: SemanticExhibit[]): void {
    this.exhibits = exhibits;
  }

  private buildBeaconLine(): void {
    // Radiant vertical sky-pillar pointing toward searched landmark
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 90, 0)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.85
    });
    this.beaconLine = new THREE.Line(geo, mat);
    this.beaconLine.visible = false;
    this.group.add(this.beaconLine);
  }

  /**
   * Ranked multi-result search across titles, exhibit IDs, project IDs,
   * project names, and exhibit descriptive text.
   */
  public searchRanked(query: string, maxResults = 8): SearchResult[] {
    if (!query || query.trim().length === 0) {
      this.clear();
      return [];
    }

    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    for (const ex of this.exhibits) {
      let score = 0;
      let matchField: SearchResult['matchField'] = 'title';
      let matchedSnippet = '';

      const idLower = ex.id.toLowerCase();
      const titleLower = ex.title.toLowerCase();

      // 1. Exact or prefix Exhibit ID match (e.g. "E01", "E32")
      if (idLower === q) {
        score = 120;
        matchField = 'id';
        matchedSnippet = `ID: ${ex.id}`;
      } else if (idLower.startsWith(q)) {
        score = 100;
        matchField = 'id';
        matchedSnippet = `ID: ${ex.id}`;
      }
      // 2. Title match
      else if (titleLower === q) {
        score = 95;
        matchField = 'title';
        matchedSnippet = ex.title;
      } else if (titleLower.includes(q)) {
        score = 80;
        matchField = 'title';
        matchedSnippet = ex.title;
      }
      // 3. Project ID or Project Name match
      else if (ex.projects && ex.projects.length > 0) {
        const matchedProj = ex.projects.find(p =>
          p.id?.toLowerCase() === q ||
          p.id?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q)
        );
        if (matchedProj) {
          if (matchedProj.id?.toLowerCase() === q || matchedProj.name?.toLowerCase() === q) {
            score = 75;
          } else {
            score = 65;
          }
          matchField = matchedProj.id?.toLowerCase().includes(q) ? 'projectId' : 'projectName';
          matchedSnippet = `${matchedProj.name} (${matchedProj.id})`;
        }
      }

      // 4. Content / Plaque match
      if (score === 0) {
        const plaque = ex.copy?.plaque || '';
        const problem = ex.copy?.problem || '';
        const made = ex.copy?.made || '';
        const combined = `${plaque} ${problem} ${made}`.toLowerCase();

        const matchIdx = combined.indexOf(q);
        if (matchIdx !== -1) {
          score = 45;
          matchField = 'content';
          const start = Math.max(0, matchIdx - 20);
          const end = Math.min(combined.length, matchIdx + q.length + 40);
          matchedSnippet = '...' + combined.slice(start, end).trim() + '...';
        }
      }

      if (score > 0) {
        results.push({
          exhibit: ex,
          score,
          matchField,
          matchedSnippet
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const capped = results.slice(0, maxResults);
    if (capped.length > 0) {
      this.setBeaconTarget(capped[0].exhibit);
    } else {
      this.clear();
    }

    return capped;
  }

  public search(query: string): SemanticExhibit | null {
    const ranked = this.searchRanked(query, 1);
    return ranked.length > 0 ? ranked[0].exhibit : null;
  }

  public setBeaconTarget(exhibit: SemanticExhibit): void {
    this.activeTarget = exhibit;
    this.beaconLine.position.set(exhibit.position[0], exhibit.position[1], exhibit.position[2]);
    this.beaconLine.visible = true;
  }

  public clear(): void {
    this.activeTarget = null;
    this.beaconLine.visible = false;
  }

  public dispose(): void {
    this.beaconLine.geometry.dispose();
    if (Array.isArray(this.beaconLine.material)) {
      this.beaconLine.material.forEach(m => m.dispose());
    } else {
      this.beaconLine.material.dispose();
    }
  }
}
