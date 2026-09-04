import * as THREE from 'three';
import type { SemanticRelationship, SemanticExhibit, Confidence } from '../types';

export class GraphRenderer {
  public group = new THREE.Group();
  private relationships: SemanticRelationship[];
  private exhibitsMap: Map<string, SemanticExhibit>;
  private lineMeshes: THREE.Line[] = [];
  public isVisible = false;

  constructor(relationships: SemanticRelationship[], exhibits: SemanticExhibit[]) {
    this.relationships = relationships;
    this.exhibitsMap = new Map(exhibits.map(e => [e.id, e]));
    this.buildGraph();
    this.setVisibility(false);
  }

  public updateData(relationships: SemanticRelationship[], exhibits: SemanticExhibit[]) {
    this.relationships = relationships;
    this.exhibitsMap = new Map(exhibits.map(e => [e.id, e]));
    this.rebuild();
  }

  public rebuild() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.traverse((node) => {
        if ((node as any).geometry) {
          (node as any).geometry.dispose();
        }
        if ((node as any).material) {
          const mat = (node as any).material;
          if (Array.isArray(mat)) {
            mat.forEach((m: THREE.Material) => m.dispose());
          } else {
            (mat as THREE.Material).dispose();
          }
        }
      });
      this.group.remove(child);
    }
    this.lineMeshes = [];
    this.buildGraph();
    this.setVisibility(this.isVisible);
  }

  public dispose() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.traverse((node) => {
        if ((node as any).geometry) {
          (node as any).geometry.dispose();
        }
        if ((node as any).material) {
          const mat = (node as any).material;
          if (Array.isArray(mat)) {
            mat.forEach((m: THREE.Material) => m.dispose());
          } else {
            (mat as THREE.Material).dispose();
          }
        }
      });
      this.group.remove(child);
    }
    this.lineMeshes = [];
  }

  public setVisibility(visible: boolean) {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  private getConfidenceStyle(conf: Confidence, isMutated?: boolean) {
    if (isMutated) {
      return { color: 0xff3d00, width: 3, dashed: false }; // Flaming amber/red for emergent mutations
    }
    switch (conf) {
      case 'explicit':
        return { color: 0x00e5ff, width: 2.5, dashed: false }; // Cyan beam
      case 'strongly_derived':
        return { color: 0x76ff03, width: 1.8, dashed: false }; // Lime beam
      case 'inferred':
        return { color: 0xffd740, width: 1.0, dashed: true }; // Golden dashed trace
      case 'unknown':
      default:
        return { color: 0x90a4ae, width: 0.8, dashed: true };
    }
  }

  private buildGraph() {
    for (const rel of this.relationships) {
      const fromEx = this.exhibitsMap.get(rel.from);
      const toEx = this.exhibitsMap.get(rel.to);
      if (!fromEx || !toEx) continue;

      const p1 = new THREE.Vector3(fromEx.position[0], fromEx.position[1] + 12 * fromEx.scale, fromEx.position[2]);
      const p2 = new THREE.Vector3(toEx.position[0], toEx.position[1] + 12 * toEx.scale, toEx.position[2]);

      // Draw elegant catenary / parabolic arching arc across space
      const points: THREE.Vector3[] = [];
      const steps = 24;
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      mid.y += Math.min(45, Math.max(8, dist * 0.28)); // Arc apex proportional to distance

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      for (let i = 0; i <= steps; i++) {
        points.push(curve.getPoint(i / steps));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const style = this.getConfidenceStyle(rel.confidence, rel.isMutated);

      const mat = new THREE.LineBasicMaterial({
        color: style.color,
        transparent: true,
        opacity: rel.confidence === 'inferred' ? 0.6 : 0.9,
        linewidth: style.width
      });

      const line = new THREE.Line(geo, mat);
      line.userData = { relationship: rel, curve };

      // Traveling photon beacon along the arc attached to line
      const packetGeo = new THREE.SphereGeometry(0.55, 8, 8);
      const packetMat = new THREE.MeshBasicMaterial({ color: style.color });
      const packet = new THREE.Mesh(packetGeo, packetMat);
      packet.userData = { curve, speed: 0.15 + (dist % 5) * 0.04, offset: Math.random() };
      packet.name = 'graph_signal_packet';
      line.add(packet);

      this.group.add(line);
      this.lineMeshes.push(line);
    }
  }

  public pulse() {
    // Orbital animation pulse and traveling signal packets
    const time = performance.now() * 0.001;
    for (const line of this.lineMeshes) {
      const packet = line.getObjectByName('graph_signal_packet');
      if (packet && packet.userData.curve) {
        const u = ((time * packet.userData.speed + packet.userData.offset) % 1.0);
        const pt = (packet.userData.curve as THREE.QuadraticBezierCurve3).getPoint(u);
        packet.position.copy(pt);
      }

      const mat = line.material as THREE.LineBasicMaterial;
      const rel: SemanticRelationship = line.userData.relationship;
      if (rel && rel.isMutated) {
        mat.opacity = 0.6 + 0.4 * Math.sin(time * 6);
      }
    }
  }
}
