#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve('.');
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'dist-standalone', 'test-results', 'coverage']);

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

// Classify software systems with dedicated mechanical subsystem roles
function classifySystem(relPath) {
  if (relPath.startsWith('src/world')) return { system: 'world_generation', layer: 'geological_computation_drum', color: 0x4fc3f7, role: 'Terrain & Landmark Synthesizer' };
  if (relPath.startsWith('src/machine')) return { system: 'machine_city', layer: 'mechanical_substation', color: 0x00e676, role: 'Recursive Hardware Architecture' };
  if (relPath.startsWith('src/render')) return { system: 'optics_and_shaders', layer: 'photonic_manifold', color: 0xffb74d, role: 'Photonic & Atmosphere Furnace' };
  if (relPath.startsWith('src/player')) return { system: 'kinematics_and_input', layer: 'sensor_gyro_stabilizer', color: 0xe040fb, role: 'Kinematic Spatial Relay' };
  if (relPath.startsWith('src/mutation')) return { system: 'topological_mutation', layer: 'tectonic_compiler_forge', color: 0xff5252, role: 'Tectonic Knowledge Compiler' };
  if (relPath.startsWith('src/provenance')) return { system: 'provenance_truth', layer: 'epistemic_ledger_vault', color: 0xffd740, role: 'Causal Trace & Provenance Ledger' };
  if (relPath.startsWith('src/timeline')) return { system: 'chronology_engine', layer: 'temporal_gearing_cycler', color: 0x7c4dff, role: 'Chronological Epoch Gearing' };
  if (relPath.startsWith('src/search')) return { system: 'spatial_navigation', layer: 'vector_beacon_array', color: 0x18ffff, role: 'Resonance Vector Beacon' };
  if (relPath.startsWith('src/ui')) return { system: 'synthetic_interface', layer: 'holographic_loom', color: 0x69f0ae, role: 'Diegetic Interface Loom' };
  if (relPath.startsWith('src/content') || relPath.startsWith('src/generated')) return { system: 'semantic_memory', layer: 'mnemonic_strata_chambers', color: 0x40c4ff, role: 'Mnemonic Memory Vault' };
  if (relPath.startsWith('tests')) return { system: 'validation_stabilizers', layer: 'containment_diagnostic_matrix', color: 0xeeff41, role: 'Diagnostic Stabilizer Cage' };
  if (relPath.startsWith('scripts')) return { system: 'compiler_foundry', layer: 'fabrication_rig_gantry', color: 0x64ffda, role: 'Deterministic Pipeline Rig' };
  return { system: 'chassis_bootstrap', layer: 'structural_truss', color: 0xb0bec5, role: 'Chassis Core Bootstrap' };
}

const modules = [];
const edges = [];
const moduleMap = new Map();

for (const f of allFiles) {
  const rel = relative(ROOT, f);
  const stats = statSync(f);
  const content = readFileSync(f, 'utf8');
  const classification = classifySystem(rel);

  const rawImports = [];
  const rawExports = [];

  // Parse using TypeScript Compiler API AST
  if (rel.endsWith('.ts') || rel.endsWith('.js') || rel.endsWith('.mjs')) {
    const sourceFile = ts.createSourceFile(
      rel,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          rawImports.push(moduleSpecifier.text);
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          rawImports.push(node.moduleSpecifier.text);
        }
      } else if (ts.isExportAssignment(node)) {
        rawExports.push('default');
      } else if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isFunctionDeclaration(node) && node.name) {
          rawExports.push(node.name.text);
        } else if (ts.isClassDeclaration(node) && node.name) {
          rawExports.push(node.name.text);
        } else if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              rawExports.push(decl.name.text);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  const mod = {
    id: rel,
    name: rel.split('/').pop(),
    path: rel,
    sizeBytes: stats.size,
    lineCount: content.split('\n').length,
    system: classification.system,
    layer: classification.layer,
    role: classification.role,
    color: classification.color,
    rawImports,
    exports: rawExports
  };

  modules.push(mod);
  moduleMap.set(rel, mod);
}

// Resolve import edges
for (const mod of modules) {
  for (const imp of mod.rawImports) {
    if (imp.startsWith('.')) {
      const dir = join(ROOT, mod.path, '..');
      let target = relative(ROOT, resolve(dir, imp));

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

// Subterranean Machine Layer Coordinates (Y = -25 to -48)
const SYSTEM_HUBS = {
  chassis_bootstrap: [0, -28, 0],
  world_generation: [0, -34, -45],
  machine_city: [0, -42, 0],
  optics_and_shaders: [-38, -30, -28],
  kinematics_and_input: [38, -28, 28],
  topological_mutation: [-42, -36, 32],
  provenance_truth: [42, -32, -32],
  chronology_engine: [-42, -32, -32],
  spatial_navigation: [32, -30, -42],
  synthetic_interface: [28, -28, 38],
  semantic_memory: [0, -32, 48],
  validation_stabilizers: [-22, -44, 0],
  compiler_foundry: [22, -44, 0]
};

const systemCounts = {};
for (const mod of modules) {
  const hub = SYSTEM_HUBS[mod.system] || [0, -30, 0];
  const idx = systemCounts[mod.system] || 0;
  systemCounts[mod.system] = idx + 1;

  const angle = (idx * 1.25) + 0.3;
  const radius = 4.5 + (idx % 4) * 3.8;
  const x = hub[0] + Math.cos(angle) * radius;
  const y = hub[1] + ((idx % 3) - 1) * 2;
  const z = hub[2] + Math.sin(angle) * radius;

  mod.machineCoord = [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10];
  mod.powerWatts = Math.min(300, Math.max(20, Math.round(mod.lineCount * 1.6)));
}

// Deterministic JSON output
const SELF_MAP = {
  version: '0.1.0-experiment.0',
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

writeFileSync('src/generated/self-architecture.json', JSON.stringify(SELF_MAP, null, 2) + '\n');
console.log(`✓ Self-architecture AST mapped: ${modules.length} modules, ${edges.length} edges mapped to Subterranean Machine Layer.`);
