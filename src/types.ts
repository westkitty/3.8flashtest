export type WingId = 'north' | 'south' | 'east' | 'west' | 'media' | 'infra';

export type Confidence = 'explicit' | 'strongly_derived' | 'inferred' | 'unknown';

export type Epoch = 'all' | 'archaic' | 'monumental' | 'contemporary' | 'emergent';

export interface ProjectSummary {
  id: string;
  name: string;
  family: string;
  kind: string;
  status: string;
  period: string;
  summary: string;
  brief: string;
  lesson: string;
  capabilities: string[];
  repos: string[];
}

export interface ExhibitCopy {
  subtitle: string;
  plaque: string;
  problem: string;
  made: string;
  interaction: string;
  explore: string;
}

export interface SemanticExhibit {
  id: string;
  slug: string;
  title: string;
  wing: WingId;
  tier: 'A' | 'B' | 'C';
  archetype: string;
  isArchaeological: boolean;
  epoch: 'archaic' | 'monumental' | 'contemporary' | 'emergent';
  startYear: number;
  position: [number, number, number];
  scale: number;
  projectIds: string[];
  projects: ProjectSummary[];
  copy: ExhibitCopy;
  // Dynamic runtime properties
  isMutated?: boolean;
}

export interface SemanticRelationship {
  from: string;
  to: string;
  type: string;
  confidence: Confidence;
  reason: string;
  isMutated?: boolean;
}

export interface MacroRegion {
  id: WingId;
  name: string;
  domain: string;
  color: number;
  accentColor: number;
  groundColor: number;
  ambientMood: string;
  center: [number, number, number];
  elevation: number;
  scale: [number, number, number];
}

export interface DexterSanctuaryData {
  id: string;
  name: string;
  ontologicalClass: 'NON_PROJECT_ANCHOR';
  domain: string;
  note: string;
  position: [number, number, number];
  radius: number;
  description: string;
}

export interface SemanticWorldData {
  version: string;
  generatedAt: string;
  regions: Record<WingId, MacroRegion>;
  sanctuary: DexterSanctuaryData;
  exhibits: SemanticExhibit[];
  relationships: SemanticRelationship[];
}

// Machine Layer Self-Architecture types
export interface MachineModule {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  lineCount: number;
  system: string;
  layer: string;
  color: number;
  rawImports: string[];
  machineCoord: [number, number, number];
  powerWatts: number;
}

export interface MachineEdge {
  source: string;
  target: string;
  type: string;
}

export interface SelfArchitectureData {
  version: string;
  generatedAt: string;
  targetRepo: string;
  stats: {
    totalModules: number;
    totalEdges: number;
    totalLines: number;
    totalBytes: number;
  };
  modules: MachineModule[];
  edges: MachineEdge[];
}

// Runtime Events for Subterranean Machine pulsing
export type RuntimeEvent =
  | { type: 'MOVE'; velocity: number }
  | { type: 'INSPECT'; id: string }
  | { type: 'SEARCH'; query: string; targetId?: string }
  | { type: 'ORBITAL_TOGGLE'; active: boolean }
  | { type: 'TIMELINE_SHIFT'; epoch: string }
  | { type: 'MUTATION_INGEST'; patchId: string }
  | { type: 'CANONICAL_RESET' };
