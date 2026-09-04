#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Parse --source argument or fallback to environment variable SOURCE_CORPUS_PATH
const args = process.argv.slice(2);
let sourcePath = process.env.SOURCE_CORPUS_PATH || '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source' && args[i + 1]) {
    sourcePath = args[i + 1];
    break;
  }
}

if (!sourcePath || !existsSync(sourcePath)) {
  console.error('Error: Source repository path not provided or not found.');
  console.error('Usage: npm run ingest:source -- --source <path-to-source-repo>');
  console.error('Or set SOURCE_CORPUS_PATH in your local environment.');
  process.exit(1);
}

console.log(`Ingesting source material from provided source (READ-ONLY)`);

// 1. Read exhibit mapping
const exhibitMap = JSON.parse(readFileSync(join(sourcePath, 'data/exhibit-mapping.json'), 'utf8'));

// 2. Read exhibit content
const exhibitContent = JSON.parse(readFileSync(join(sourcePath, 'data/exhibit-content.json'), 'utf8'));

// 3. Read project files
const projectsDir = join(sourcePath, 'data/projects');
const projectFiles = readdirSync(projectsDir).filter(f => f.endsWith('.json'));
const allProjects = [];

for (const pf of projectFiles) {
  const pData = JSON.parse(readFileSync(join(projectsDir, pf), 'utf8'));
  allProjects.push(...pData);
}
allProjects.sort((a, b) => a.id.localeCompare(b.id));

// 4. Macro Regions definition
const REGION_METADATA = {
  north: {
    id: 'north',
    name: 'Crystalline Badlands & Aether-Spire',
    domain: 'Cosmology & Programmable Reality',
    color: 0x3d5afe,
    accentColor: 0x82b1ff,
    groundColor: 0x0d1326,
    ambientMood: 'Star-metal spires, cosmic absence, programmable lattices',
    center: [0, 8, -90],
    elevation: 8,
    scale: [70, 15, 60]
  },
  south: {
    id: 'south',
    name: 'The Crucible & Kinetic Foundry',
    domain: 'Simulations, Ludology & Play Systems',
    color: 0xff6d00,
    accentColor: 0xffd180,
    groundColor: 0x24140b,
    ambientMood: 'Rust iron, kinetic gantries, orbital farm rings, sphere courses',
    center: [0, 4, 90],
    elevation: 4,
    scale: [70, 10, 60]
  },
  east: {
    id: 'east',
    name: 'The Obsidian Scriptorium & Local Silicon',
    domain: 'Local Tools, Privacy & Autonomous Agents',
    color: 0x00bfa5,
    accentColor: 0x64ffda,
    groundColor: 0x0a1f1a,
    ambientMood: 'Monolithic quartz blocks, data needles, private runtimes',
    center: [90, 6, 0],
    elevation: 6,
    scale: [60, 12, 70]
  },
  west: {
    id: 'west',
    name: 'The Strata of Memory & Fossilized Canon',
    domain: 'Canon Epistemology & Historical Strata',
    color: 0xab47bc,
    accentColor: 0xe1bee7,
    groundColor: 0x210c26,
    ambientMood: 'Parchment monoliths, excavation trenches, historical foundations',
    center: [-90, 5, 0],
    elevation: 5,
    scale: [60, 10, 70]
  },
  media: {
    id: 'media',
    name: 'The Resonant Mezzanine & Harmonic Loom',
    domain: 'Audio Systems, Songwriting & Generative Media',
    color: 0x00e5ff,
    accentColor: 0x84ffff,
    groundColor: 0x081f26,
    ambientMood: 'Vibrating strings, wave conduits, spectral light projection',
    center: [-65, 14, -65],
    elevation: 14,
    scale: [45, 8, 45]
  },
  infra: {
    id: 'infra',
    name: 'The Sub-Surface Substrate & Deep Core',
    domain: 'Hardware Backbone & Non-Exposable Compute',
    color: 0x76ff03,
    accentColor: 0xb2ff59,
    groundColor: 0x112108,
    ambientMood: 'Heavy bus-bars, cooling columns, server monolithic pylons',
    center: [65, 2, -65],
    elevation: 2,
    scale: [45, 6, 45]
  }
};

// 5. Build Exhibits
const exhibits = [];
const relationships = [];

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
}

const exhibitTokens = new Map();

for (const ex of exhibitMap.exhibits) {
  const copy = exhibitContent[ex.id] || {};
  const projs = allProjects.filter(p => ex.projects.includes(p.id));

  const textCorpus = [
    ex.title,
    copy.subtitle || '',
    copy.plaque || '',
    copy.problem || '',
    copy.made || '',
    ...projs.map(p => `${p.name} ${p.family} ${p.kind} ${p.summary} ${p.brief} ${(p.capabilities || []).join(' ')} ${p.lesson}`)
  ].join(' ');

  const tokens = new Set(tokenize(textCorpus));
  exhibitTokens.set(ex.id, tokens);

  const meta = REGION_METADATA[ex.wing] || REGION_METADATA.north;
  const wingExhibits = exhibitMap.exhibits.filter(e => e.wing === ex.wing);
  const indexInWing = wingExhibits.findIndex(e => e.id === ex.id);
  const totalInWing = wingExhibits.length;

  const angle = ((indexInWing - (totalInWing - 1) / 2) / Math.max(1, totalInWing)) * (Math.PI * 0.75);
  const rad = 25 + (indexInWing % 2) * 8;

  let posX = meta.center[0] + Math.sin(angle) * rad;
  let posZ = meta.center[2] + Math.cos(angle) * rad;
  let posY = meta.elevation;

  const isArchaeological = (ex.id === 'E09' || ex.id === 'E10' || ex.id === 'E16');
  if (isArchaeological) {
    posY = (ex.id === 'E09') ? -8 : 1.5;
  }

  // Author distinctive landmark archetypes for the major 12+ hero concepts
  let archetype = 'spire';
  if (ex.id === 'E01') archetype = 'starsilk_loom';
  else if (ex.id === 'E03') archetype = 'orbital_tomb_dismantler';
  else if (ex.id === 'E07') archetype = 'terraforming_vat';
  else if (ex.id === 'E08') archetype = 'heliocide_absence_lens';
  else if (ex.id === 'E09') archetype = 'excavated_ruin';
  else if (ex.id === 'E10') archetype = 'worldsvault_chasm_vault';
  else if (ex.id === 'E12') archetype = 'rhetorical_truth_scales';
  else if (ex.id === 'E13') archetype = 'suno_harmonic_resonator';
  else if (ex.id === 'E17') archetype = 'dex_vocal_acoustic_chamber';
  else if (ex.id === 'E19') archetype = 'dextilt_balance_tower';
  else if (ex.id === 'E24') archetype = 'invincible_magic_citadel';
  else if (ex.id === 'E29') archetype = 'arkship_void_hull';
  else if (ex.id === 'E32') archetype = 'smores_katamari_forge';
  else if (ex.id === 'E34') archetype = 'bigmac_server_monolith';
  else if (ex.wing === 'north') archetype = 'observatory_spire';
  else if (ex.wing === 'south') archetype = 'kinetic_foundry';
  else if (ex.wing === 'east') archetype = 'monolith_altar';
  else if (ex.wing === 'west') archetype = 'stratified_library';
  else if (ex.wing === 'media') archetype = 'harmonic_resonator';
  else if (ex.wing === 'infra') archetype = 'power_conduit';

  let minYear = 2026;
  let maxYear = 2026;
  for (const p of projs) {
    const period = p.period || '2026';
    const years = period.match(/\d{4}/g);
    if (years) {
      for (const y of years) {
        const num = parseInt(y, 10);
        if (num < minYear) minYear = num;
        if (num > maxYear) maxYear = num;
      }
    }
  }

  const record = {
    id: ex.id,
    slug: ex.slug,
    title: ex.title,
    wing: ex.wing,
    tier: ex.tier,
    archetype,
    isArchaeological,
    epoch: minYear <= 2025 ? 'archaic' : (ex.tier === 'A' ? 'monumental' : 'contemporary'),
    startYear: minYear,
    position: [Math.round(posX * 10) / 10, Math.round(posY * 10) / 10, Math.round(posZ * 10) / 10],
    scale: ex.tier === 'A' ? 1.6 : (ex.tier === 'B' ? 1.2 : 0.9),
    projectIds: ex.projects,
    projects: projs.map(p => ({
      id: p.id,
      name: p.name,
      family: p.family,
      kind: p.kind,
      status: p.status,
      period: p.period,
      summary: p.summary,
      brief: p.brief,
      lesson: p.lesson,
      capabilities: p.capabilities || [],
      repos: p.repos || []
    })),
    copy: {
      subtitle: copy.subtitle || '',
      plaque: copy.plaque || '',
      problem: copy.problem || '',
      made: copy.made || '',
      interaction: copy.interaction || '',
      explore: copy.explore || ''
    }
  };

  exhibits.push(record);
}

// Derived explicit & strongly derived relationships
const explicitLinks = [
  { from: 'E01', to: 'E02', type: 'cosmological_engine', confidence: 'explicit', reason: 'Drakken terraform the Starsilk cosmos' },
  { from: 'E01', to: 'E03', type: 'event_site', confidence: 'explicit', reason: 'Orbital Tomb dismantles station in Starsilk canon' },
  { from: 'E01', to: 'E04', type: 'governing_canon', confidence: 'explicit', reason: 'Possibility Cartographer verifies Starsilk canon space' },
  { from: 'E02', to: 'E06', type: 'taxonomic_basis', confidence: 'explicit', reason: 'Compendium defines anatomy of Drakken' },
  { from: 'E02', to: 'E07', type: 'operational_execution', confidence: 'explicit', reason: 'Terraforming Lab executes Compendium pipeline' },
  { from: 'E01', to: 'E08', type: 'cosmic_boundary', confidence: 'explicit', reason: 'Heliocide Observatory charts star death on Starsilk border' },
  { from: 'E09', to: 'E10', type: 'lineage_ancestry', confidence: 'explicit', reason: 'Museum evolution directly derives from WorldsVault lineage' },
  { from: 'E10', to: 'E11', type: 'systemic_inheritance', confidence: 'explicit', reason: 'WorldsVault feeds Continuity systems' },
  { from: 'E13', to: 'E14', type: 'creative_discipline', confidence: 'explicit', reason: 'Suno studio and Promptcraft share vibe coding doctrine' },
  { from: 'E14', to: 'E15', type: 'runtime_scaffold', confidence: 'explicit', reason: 'Promptcraft drives agent harness execution' },
  { from: 'E17', to: 'E18', type: 'vocal_presence', confidence: 'explicit', reason: 'Dex Voice Lab animates Dex Companion systems' },
  { from: 'E18', to: 'E19', type: 'agent_kinematics', confidence: 'explicit', reason: 'Dex Companion systems drive DexTilt physical robot' },
  { from: 'E20', to: 'E34', type: 'security_boundary', confidence: 'explicit', reason: 'Utility bench enforces BigMac privacy boundaries' },
  { from: 'E34', to: 'E35', type: 'infrastructure_host', confidence: 'explicit', reason: 'BigMac backbone hosts Local Specialist Systems' },
  { from: 'E24', to: 'E25', type: 'ludic_tradition', confidence: 'explicit', reason: 'Era of Invincible Magic inspires DnDex DM Hub' },
  { from: 'E28', to: 'E29', type: 'survival_horizon', confidence: 'explicit', reason: 'Against the Void directly connects to Arkship Civilization' },
  { from: 'E30', to: 'E32', type: 'rendering_pipeline', confidence: 'explicit', reason: 'AetherVFX shaders empower S\'mores Katamari world feel' },
  { from: 'E01', to: 'E29', type: 'deep_cosmology', confidence: 'strongly_derived', reason: 'Arkship civilization travels Starsilk deep void' },
  { from: 'E04', to: 'E12', type: 'epistemic_rigor', confidence: 'strongly_derived', reason: 'Cartographer and Rhetorical InDEX share strict truth validation' },
  { from: 'E18', to: 'E15', type: 'autonomous_lineage', confidence: 'strongly_derived', reason: 'Dex Agents share harness test infrastructure' },
  { from: 'E34', to: 'E07', type: 'compute_underpinning', confidence: 'strongly_derived', reason: 'Terraforming Lab simulations run on local BigMac silicon' },
  { from: 'E09', to: 'E34', type: 'self_hosting', confidence: 'strongly_derived', reason: 'Museum archive relies on local offline server hardware' }
];

for (const link of explicitLinks) {
  relationships.push(link);
}

// Inferred relationships
for (let i = 0; i < exhibits.length; i++) {
  for (let j = i + 1; j < exhibits.length; j++) {
    const e1 = exhibits[i];
    const e2 = exhibits[j];

    if (relationships.some(r => (r.from === e1.id && r.to === e2.id) || (r.from === e2.id && r.to === e1.id))) {
      continue;
    }

    const tokens1 = exhibitTokens.get(e1.id);
    const tokens2 = exhibitTokens.get(e2.id);

    let intersection = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) intersection++;
    }
    const union = tokens1.size + tokens2.size - intersection;
    const similarity = union > 0 ? intersection / union : 0;

    if (similarity > 0.16) {
      relationships.push({
        from: e1.id,
        to: e2.id,
        type: 'thematic_resonance',
        confidence: 'inferred',
        reason: `Lexical & thematic concordance score: ${(similarity * 100).toFixed(1)}%`
      });
    }
  }
}

// Dexter Sanctuary (Fixed Non-Project Anchor)
const DEXTER_SANCTUARY = {
  id: 'dexter-sanctuary',
  name: 'Dexter Sanctuary',
  ontologicalClass: 'NON_PROJECT_ANCHOR',
  domain: 'Constant Witness & Spatial Anchor',
  note: 'Deliberately outside project numbering, scoring, ranking, or semantic clustering.',
  position: [-38, 0.4, 38],
  radius: 12,
  description: 'A serene stone dais with a bronze lantern and a resting tricolor companion model, oriented towards the horizon. A fixed coordinate unaffected by semantic distortion.'
};

const WORLD_MODEL = {
  version: '0.1.0-experiment.0',
  regions: REGION_METADATA,
  sanctuary: DEXTER_SANCTUARY,
  exhibits,
  relationships
};

writeFileSync('src/generated/semantic-world.json', JSON.stringify(WORLD_MODEL, null, 2) + '\n');
console.log(`✓ Sanitized semantic world model generated: ${exhibits.length} exhibits, ${relationships.length} relationships.`);
