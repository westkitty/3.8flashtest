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

## 3. Speculative Mutation Workflow & Spatial Solver
- **Three-Stage Workflow**:
  1. *Preview*: Speculatively ingests candidate JSON or Markdown notes, computes target region, builds provisional exhibit/relationships, and calculates topological displacement via `SemanticSpatialSolver` without mutating the canonical world.
  2. *Apply*: Commits previewed patch to `currentWorldData`, snapshots previous state onto an undo history stack, and animates topological reorganization.
  3. *Undo*: Pops previous state from history stack and restores former geometry.
  4. *Reset*: Instant rollback to pristine canonical baseline with confirmation protection.
- **Confidence Stratification**:
  - `EXPLICIT`: Source-grounded links (cyan solid catenary arcs).
  - `STRONGLY_DERIVED`: Architectural lineages (lime solid catenary arcs).
  - `INFERRED`: Local lexical concordance (golden dashed traces with low-confidence caveats).

---

## 4. Consolidation & Performance Engine
- **ModeManager (`src/world/ModeManager.ts`)**:
  - Authoritative mutual-exclusion state machine managing `surface`, `connections`, `machine`, `tour`, `mutation-preview`, and `lab`.
  - Guaranteed lifecycle transitions: entering `machine` automatically ceases conflicting surface loops; entering `connections` activates orbital views and graph shaders; exiting safely cleans up transient state.
- **PerformanceGovernor (`src/performance/PerformanceGovernor.ts`)**:
  - Maintains rolling 60-frame execution window.
  - Hysteresis thresholds (`high` at <14ms, `balanced` at 14-22ms, `low` at >22ms) prevent rapid visual quality flapping.
- **FrameScheduler (`src/performance/FrameScheduler.ts`)**:
  - Distributes workload across frame buckets (`REALTIME` at 60Hz, `MEDIUM` at 20Hz, `LOW` at 5Hz).
  - Keeps heavy updates (radar, celestial sun position, spatial distance checks) from contending with camera and physics loops.
- **LayerActivityManager (`src/performance/LayerActivityManager.ts`)**:
  - Mode and depth gating: puts subterranean city simulation to sleep when the visitor is exploring the surface, and ceases surface starfield/weather animations when deep in the machine cavern.
- **ResourceDisposer (`src/utils/ResourceDisposer.ts`)**:
  - Traverses object hierarchies to recursively invoke `.dispose()` on geometries, materials, and textures, preventing WebGL context memory leaks.

---

## 5. Honest Local Presence
- **Protocol**: Browser-native `BroadcastChannel` (`mnemonic-world-presence`) enables zero-infrastructure multi-tab synchronization on the user's local machine.
- **Throttling**: Position broadcasts throttled to &le;10 Hz and &gt;0.4m displacement delta.
- **Truthful Default**: Synthetic demo peers are disabled by default; only real active local tabs appear as presence avatars unless explicitly enabled in the Lab.

---

## 6. Dexter Sanctuary Anchor
- **Ontological Rule**: Positioned at `[-38, y, 38]` as a fixed stone oasis with a bronze ring and companion silhouette.
- **Invariance**: Explicitly tagged `NON_PROJECT_ANCHOR` and excluded from project numbering, scoring, ranking, or graph re-layout algorithms.

---

## 7. Privacy Boundary & Gates
- Deterministic scanner `scripts/validate-privacy.mjs` scans all source files for private credentials, AWS/GitHub tokens, IPv4 literals, denied personal names, and absolute home directory paths (`/Users/...`).
