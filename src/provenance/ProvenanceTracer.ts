import type { SemanticExhibit, SelfArchitectureData, MachineModule } from '../types';

export interface CausalTraceStep {
  stage: 'SOURCE' | 'SEMANTIC_ENTITY' | 'SPATIAL_SOLVER' | 'WORLD_SYSTEM' | 'RENDERED_LANDMARK' | 'MACHINE_SUBSYSTEM';
  title: string;
  description: string;
  evidence: string;
  targetCoord?: [number, number, number];
}

export class ProvenanceTracer {
  private selfArch: SelfArchitectureData;

  constructor(selfArch: SelfArchitectureData) {
    this.selfArch = selfArch;
  }

  // Derive complete causal chain from source data down to physical code module in machine layer
  public traceLandmark(exhibit: SemanticExhibit): { chain: CausalTraceStep[]; targetMachineModule: MachineModule } {
    // Determine owning software module in self-architecture
    let targetSystem = 'world_generation';
    if (exhibit.archetype.includes('loom') || exhibit.wing === 'north') targetSystem = 'world_generation';
    else if (exhibit.archetype.includes('katamari') || exhibit.wing === 'south') targetSystem = 'kinematics_and_input';
    else if (exhibit.archetype.includes('server') || exhibit.wing === 'infra') targetSystem = 'machine_city';
    else if (exhibit.archetype.includes('scales') || exhibit.wing === 'west') targetSystem = 'provenance_truth';
    else if (exhibit.archetype.includes('harp') || exhibit.wing === 'media') targetSystem = 'optics_and_shaders';
    else if (exhibit.wing === 'east') targetSystem = 'semantic_memory';

    let machineMod = this.selfArch.modules.find(m => m.system === targetSystem) || this.selfArch.modules[0];

    const isMutated = !!exhibit.isMutated;
    const isLocalInferred = exhibit.projects?.[0]?.status === 'Inferred Mutation';

    const sourceEvidence = isMutated
      ? 'Synthesized in-world knowledge mutation record.'
      : `Source exhibit record with ${(exhibit.projectIds || []).length} canonical project identity.`;

    const epistemicEvidence = isMutated
      ? (isLocalInferred
          ? 'Epistemic confidence: LOCALLY INFERRED MUTATION (LOW CONFIDENCE).'
          : 'Epistemic confidence: SYNTHESIZED KNOWLEDGE PATCH.')
      : `Epistemic confidence: SOURCE-GROUNDED CANON. Tier ${exhibit.tier} allocation.`;

    const chain: CausalTraceStep[] = [
      {
        stage: 'SOURCE',
        title: `Public Exhibit ID: ${exhibit.id}`,
        description: `Representing ${(exhibit.projects || []).map(p => p.name).join(', ')}`,
        evidence: sourceEvidence
      },
      {
        stage: 'SEMANTIC_ENTITY',
        title: exhibit.title,
        description: exhibit.copy?.subtitle || exhibit.title,
        evidence: epistemicEvidence
      },
      {
        stage: 'SPATIAL_SOLVER',
        title: 'Deterministic Spatial Layout Equilibrium',
        description: `Position [${exhibit.position.join(', ')}] in ${exhibit.wing.toUpperCase()} Macro-Region`,
        evidence: 'Calculated via SemanticSpatialSolver spring-repulsion relaxation.',
        targetCoord: exhibit.position
      },
      {
        stage: 'WORLD_SYSTEM',
        title: `Archetype: ${exhibit.archetype}`,
        description: 'Procedural composite geometry rendered via LandmarkBuilder',
        evidence: 'Architectural silhouette mapped specifically to exhibit problem statement.'
      },
      {
        stage: 'MACHINE_SUBSYSTEM',
        title: `Subterranean Unit: ${machineMod.name}`,
        description: `System: ${machineMod.system} (${machineMod.role})`,
        evidence: `File ${machineMod.path} (${machineMod.lineCount} lines, ${machineMod.powerWatts}W power allocation).`,
        targetCoord: machineMod.machineCoord
      }
    ];

    return { chain, targetMachineModule: machineMod };
  }
}
