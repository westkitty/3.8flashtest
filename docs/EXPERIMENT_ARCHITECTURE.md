# Architecture & Technical Design: The Living Reliquary // Mnemonic World Engine

## Overview
The Mnemonic World Engine is an experimental WebGL environment built with Three.js and TypeScript, designed to demonstrate long-horizon spatial reasoning and semantic synthesis. It turns a structured corpus of 64 projects and 35 exhibits into explorable 3D physical geography, while simultaneously visualizing its own codebase architecture in an operational subterranean machine city.

---

## 1. The Semantic Pipeline & Geography
- **Data Source**: Synthesized from visitor-facing records in `data/exhibit-mapping.json`, `data/exhibit-content.json`, and project specifications.
- **Regions**: 6 distinct geographical biomes:
  - *North*: Crystalline Badlands & Aether-Spire (Cosmology, star-metal, observatories)
  - *South*: The Crucible & Kinetic Foundry (Games, Katamari rolling yards, 4X simulation)
  - *East*: Obsidian Scriptorium & Local Silicon (Privacy, offline agents, tools)
  - *West*: Strata of Memory & Fossilized Canon (Archive, excavated ruins)
  - *Media*: Resonant Mezzanine & Harmonic Loom (Suno, promptcraft, sound waves)
  - *Infra*: Sub-Surface Substrate (Hardware compute, non-exposable pipelines)
- **Topological Elevation**: `Terrain.ts` implements continuous weighted elevation equations where conceptual affinity modulates ground elevation, material vertex coloring, and fault lines.
- **Archaeology**: The earlier single-file Three.js artifact (*The Reliquary of Iterative Becoming*, Exhibit E09) is physically excavated into an archaeological sunken ruin at Y = -8m.

---

## 2. Subterranean Machine Layer (Self-Architecture)
- **Self-Mapping**: `scripts/build-self-map.mjs` analyzes the target repository's TypeScript files, extracting module sizes, lines of code, systems, and static import relationships.
- **Physical Representation**: Placed directly beneath the world at Y = -25 to -45.
- **Runtime Instrumentation**: Player kinematics, searches, orbital toggles, timeline shifts, and mutations fire events that pulse corresponding machine systems in real time.

---

## 3. Knowledge Ingestion & Live Mutation
- **Ingestion**: Supports both structured JSON patches and freeform Markdown.
- **Confidence Separation**:
  - `EXPLICIT`: Grounded in confirmed relationships.
  - `INFERRED`: Local lexical similarity calculations (TF-IDF / token concordance), strictly distinguished with dashed gold indicators and low-confidence caveats.
- **Dynamic Topology**: Spawns emergent architectural spires, adjusts regional bounds, and weaves new bezier relational arcs across the world.
- **Reset**: Instantly rolls back the simulation to the pristine canonical state.

---

## 4. Dexter Sanctuary
- **Ontological Rule**: Positioned at `[-38, y, 38]` as a fixed stone oasis with a bronze ring and companion silhouette.
- **Invariance**: Explicitly excluded from project numbering, scoring, ranking, or graph re-layout algorithms.

---

## 5. Privacy Boundary & Gates
- Deterministic scanner `scripts/validate-privacy.mjs` scans all source files for private credentials, AWS/GitHub tokens, IPv4 literals, and absolute home directory paths (`/Users/...`).
