#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve('.');
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'dist-standalone', 'test-results']);

function walk(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.mjs') || entry.name.endsWith('.json') || entry.name.endsWith('.html'))) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(ROOT);

// System classifier
function classifySystem(relPath) {
  if (relPath.startsWith('src/world')) return { system: 'world_generation', layer: 'geological_core', color: 0x4fc3f7 };
  if (relPath.startsWith('src/machine')) return { system: 'machine_city', layer: 'mechanical_substation', color: 0x00e676 };
  if (relPath.startsWith('src/render')) return { system: 'optics_and_shaders', layer: 'photonic_manifold', color: 0xffb74d };
  if (relPath.startsWith('src/player')) return { system: 'kinematics_and_input', layer: 'sensor_relay', color: 0xe040fb };
  if (relPath.startsWith('src/mutation')) return { system: 'topological_mutation', layer: 'tectonic_actuator', color: 0xff5252 };
  if (relPath.startsWith('src/provenance')) return { system: 'provenance_truth', layer: 'epistemic_ledger', color: 0xffd740 };
  if (relPath.startsWith('src/timeline')) return { system: 'chronology_engine', layer: 'temporal_cycler', color: 0x7c4dff };
  if (relPath.startsWith('src/search')) return { system: 'spatial_navigation', layer: 'vector_beacon', color: 0x18ffff };
  if (relPath.startsWith('src/ui')) return { system: 'synthetic_interface', layer: 'holographic_loom', color: 0x69f0ae };
  if (relPath.startsWith('src/content') || relPath.startsWith('src/generated')) return { system: 'semantic_memory', layer: 'mnemonic_strata', color: 0x40c4ff };
  if (relPath.startsWith('tests')) return { system: 'validation_stabilizers', layer: 'containment_matrix', color: 0xeeff41 };
  if (relPath.startsWith('scripts')) return { system: 'compiler_foundry', layer: 'fabrication_rig', color: 0x64ffda };
  return { system: 'chassis_bootstrap', layer: 'structural_truss', color: 0xb0bec5 };
}

const modules = [];
const edges = [];
const moduleMap = new Map();

for (const f of allFiles) {
  const rel = relative(ROOT, f);
  const stats = statSync(f);
  const content = readFileSync(f, 'utf8');
  const classification = classifySystem(rel);

  // Extract static imports
  const importLines = content.match(/import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g) || [];
  const rawImports = importLines.map(line => {
    const match = line.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }).filter(Boolean);

  const mod = {
    id: rel,
    name: rel.split('/').pop(),
    path: rel,
    sizeBytes: stats.size,
    lineCount: content.split('\n').length,
    system: classification.system,
    layer: classification.layer,
    color: classification.color,
    rawImports
  };

  modules.push(mod);
  moduleMap.set(rel, mod);
}

// Resolve import edges
for (const mod of modules) {
  for (const imp of mod.rawImports) {
    // Relative imports
    if (imp.startsWith('.')) {
      const dir = join(ROOT, mod.path, '..');
      let target = relative(ROOT, resolve(dir, imp));

      // Try resolving extensions
      let resolvedTarget = null;
      const candidates = [target, `${target}.ts`, `${target}.mjs`, `${target}.json`, join(target, 'index.ts')];
      for (const cand of candidates) {
        if (moduleMap.has(cand)) {
          resolvedTarget = cand;
          break;
        }
      }

      if (resolvedTarget) {
        edges.push({
          source: mod.id,
          target: resolvedTarget,
          type: 'static_import'
        });
      }
    }
  }
}

// Derive layout coordinates in the subterranean Machine Layer
// Machine Layer sits beneath the world at Y = -25 to -45
// Clusters grouped by system
const SYSTEM_HUBS = {
  chassis_bootstrap: [0, -25, 0],
  world_generation: [0, -32, -45],
  machine_city: [0, -40, 0],
  optics_and_shaders: [-35, -28, -25],
  kinematics_and_input: [35, -26, 25],
  topological_mutation: [-40, -35, 30],
  provenance_truth: [40, -30, -30],
  chronology_engine: [-40, -30, -30],
  spatial_navigation: [30, -28, -40],
  synthetic_interface: [25, -25, 35],
  semantic_memory: [0, -30, 45],
  validation_stabilizers: [-20, -42, 0],
  compiler_foundry: [20, -42, 0]
};

const systemCounts = {};
for (const mod of modules) {
  const hub = SYSTEM_HUBS[mod.system] || [0, -30, 0];
  const idx = systemCounts[mod.system] || 0;
  systemCounts[mod.system] = idx + 1;

  const angle = (idx * 1.25) + 0.3;
  const radius = 4 + (idx % 4) * 3.5;
  const x = hub[0] + Math.cos(angle) * radius;
  const y = hub[1] + ((idx % 3) - 1) * 2;
  const z = hub[2] + Math.sin(angle) * radius;

  mod.machineCoord = [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10];
  mod.powerWatts = Math.min(250, Math.max(15, Math.round(mod.lineCount * 1.5)));
}

const SELF_MAP = {
  version: '0.1.0-experiment.0',
  generatedAt: new Date().toISOString(),
  targetRepo: 'westkitty/3.8flashtest',
  stats: {
    totalModules: modules.length,
    totalEdges: edges.length,
    totalLines: modules.reduce((sum, m) => sum + m.lineCount, 0),
    totalBytes: modules.reduce((sum, m) => sum + m.sizeBytes, 0)
  },
  modules,
  edges
};

writeFileSync('src/generated/self-architecture.json', JSON.stringify(SELF_MAP, null, 2));
console.log(`✓ Self-architecture mapped: ${modules.length} modules, ${edges.length} edges mapped to Subterranean Machine Layer.`);
