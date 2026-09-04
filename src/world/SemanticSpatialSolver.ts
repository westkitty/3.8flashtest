import type { SemanticExhibit, SemanticRelationship, MacroRegion, WingId } from '../types';

export interface SpatialSolverConfig {
  iterations: number;
  springLength: number;
  springStrength: number;
  repulsionStrength: number;
  damping: number;
}

export class SemanticSpatialSolver {
  public static solve(
    exhibits: SemanticExhibit[],
    relationships: SemanticRelationship[],
    regions: Record<WingId, MacroRegion>,
    config: Partial<SpatialSolverConfig> = {}
  ): Map<string, [number, number, number]> {
    const cfg: SpatialSolverConfig = {
      iterations: 35,
      springLength: 32,
      springStrength: 0.08,
      repulsionStrength: 650,
      damping: 0.85,
      ...config
    };

    // Initialize positions Map
    const positions = new Map<string, [number, number, number]>();
    const velocities = new Map<string, [number, number]>();

    for (const ex of exhibits) {
      positions.set(ex.id, [...ex.position]);
      velocities.set(ex.id, [0, 0]);
    }

    // Deterministic simulation loop
    for (let iter = 0; iter < cfg.iterations; iter++) {
      // 1. Regional Anchor Attraction (gravity towards home macro-region)
      for (const ex of exhibits) {
        const p = positions.get(ex.id)!;
        const vel = velocities.get(ex.id)!;
        const reg = regions[ex.wing] || regions.north;
        const dx = reg.center[0] - p[0];
        const dz = reg.center[2] - p[2];
        const dist = Math.hypot(dx, dz);

        if (dist > 1) {
          vel[0] += (dx / dist) * 0.45;
          vel[1] += (dz / dist) * 0.45;
        }
      }

      // 2. Mutual Repulsion between exhibits (prevent unnatural clumping)
      for (let i = 0; i < exhibits.length; i++) {
        const e1 = exhibits[i];
        const p1 = positions.get(e1.id)!;
        const vel1 = velocities.get(e1.id)!;

        for (let j = i + 1; j < exhibits.length; j++) {
          const e2 = exhibits[j];
          const p2 = positions.get(e2.id)!;
          const vel2 = velocities.get(e2.id)!;

          const dx = p1[0] - p2[0];
          const dz = p1[2] - p2[2];
          const distSq = dx * dx + dz * dz + 4.0;
          const dist = Math.sqrt(distSq);

          if (dist < 45) {
            const force = cfg.repulsionStrength / distSq;
            const fx = (dx / dist) * force;
            const fz = (dz / dist) * force;

            vel1[0] += fx;
            vel1[1] += fz;
            vel2[0] -= fx;
            vel2[1] -= fz;
          }
        }
      }

      // 3. Relational Springs (Attract semantically connected landmarks)
      for (const rel of relationships) {
        const p1 = positions.get(rel.from);
        const p2 = positions.get(rel.to);
        if (!p1 || !p2) continue;

        const vel1 = velocities.get(rel.from)!;
        const vel2 = velocities.get(rel.to)!;

        const dx = p2[0] - p1[0];
        const dz = p2[2] - p1[2];
        const dist = Math.hypot(dx, dz) + 0.1;
        const delta = dist - cfg.springLength;

        // Explicit links exert stronger tension than inferred links
        let weight = cfg.springStrength;
        if (rel.confidence === 'explicit') weight *= 1.8;
        else if (rel.confidence === 'strongly_derived') weight *= 1.2;
        else if (rel.confidence === 'inferred') weight *= 0.6;

        const force = delta * weight;
        const fx = (dx / dist) * force;
        const fz = (dz / dist) * force;

        vel1[0] += fx;
        vel1[1] += fz;
        vel2[0] -= fx;
        vel2[1] -= fz;
      }

      // 4. Position Integration & Damping
      for (const ex of exhibits) {
        // Archaeological ruins have high geological inertia
        if (ex.isArchaeological) continue;

        const p = positions.get(ex.id)!;
        const vel = velocities.get(ex.id)!;

        vel[0] *= cfg.damping;
        vel[1] *= cfg.damping;

        p[0] += vel[0];
        p[2] += vel[1];
      }
    }

    // Round for clean deterministic values
    for (const [id, p] of positions.entries()) {
      positions.set(id, [
        Math.round(p[0] * 10) / 10,
        p[1],
        Math.round(p[2] * 10) / 10
      ]);
    }

    return positions;
  }
}
