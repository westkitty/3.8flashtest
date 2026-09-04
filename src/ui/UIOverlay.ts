import type { SemanticExhibit, DexterSanctuaryData, Epoch } from '../types';
import type { CausalTraceStep } from '../provenance/ProvenanceTracer';
import type { ShadowMode } from '../render/RendererHost';

export interface UIEvents {
  onSearch: (q: string) => void;
  onEpochChange: (epoch: Epoch) => void;
  onOrbitalToggle: (active: boolean) => void;
  onMachineDescent: () => void;
  onSurfaceAscent: () => void;
  onIngestPatch: (text: string, isJson: boolean) => void;
  onResetCanonical: () => void;
  onTeleportToSanctuary: () => void;
  onTraceToMachine: (exhibit: SemanticExhibit) => void;
  onAudioToggle: () => boolean;
  onShadowToggle: (mode: ShadowMode) => void;
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class UIOverlay {
  public root: HTMLDivElement;
  public events: Partial<UIEvents> = {};
  private inspectCard!: HTMLDivElement;
  private toastContainer!: HTMLDivElement;
  private isOrbital = false;
  private isSubterranean = false;
  private isCinematic = false;
  private activeExhibit: SemanticExhibit | null = null;
  private audioBtn!: HTMLButtonElement;
  private fullscreenBtn!: HTMLButtonElement;
  private cinematicBtn!: HTMLButtonElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'mnemonic-ui-root';
    this.applyStyles();
    this.buildUI();
    document.body.appendChild(this.root);
  }

  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #mnemonic-ui-root {
        position: fixed;
        inset: 0;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
        color: #e2e8f0;
        z-index: 1000;
        user-select: none;
      }
      .hud-panel {
        position: absolute;
        pointer-events: auto;
        background: rgba(10, 15, 26, 0.85);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 10px 35px rgba(0, 0, 0, 0.7);
      }
      .hud-header {
        top: 16px;
        left: 20px;
        max-width: 440px;
      }
      .hud-header h1 {
        margin: 0 0 4px 0;
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #38bdf8;
      }
      .hud-header p {
        margin: 0;
        font-size: 11px;
        color: #94a3b8;
      }
      .hud-controls {
        bottom: 16px;
        left: 20px;
        font-size: 11px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .hud-actions {
        top: 16px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 220px;
      }
      .btn {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .btn:hover {
        background: #334155;
        border-color: #38bdf8;
      }
      .btn-primary {
        background: #0284c7;
        border-color: #38bdf8;
      }
      .btn-primary:hover {
        background: #0369a1;
      }
      .btn-secondary {
        background: #4338ca;
        border-color: #818cf8;
      }
      .btn-secondary:hover {
        background: #3730a3;
      }
      .btn-danger {
        background: #991b1b;
        border-color: #f87171;
      }
      .btn-danger:hover {
        background: #7f1d1d;
      }
      .search-box {
        width: 100%;
        box-sizing: border-box;
        background: #0f172a;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 11px;
        margin-bottom: 4px;
      }
      .inspect-card {
        bottom: 24px;
        right: 256px;
        width: 400px;
        max-width: calc(100vw - 280px);
        max-height: 520px;
        overflow-y: auto;
        display: none;
        z-index: 50;
      }
      .inspect-card h2 {
        margin: 0 0 4px 0;
        font-size: 16px;
        color: #38bdf8;
      }
      .inspect-badge {
        display: inline-block;
        font-size: 9px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        background: #0369a1;
        color: #fff;
        margin-bottom: 6px;
      }
      .inspect-section {
        margin-top: 6px;
        font-size: 11px;
        color: #cbd5e1;
        border-top: 1px solid #334155;
        padding-top: 6px;
      }
      .inspect-section strong {
        color: #94a3b8;
      }
      .reticle {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6px;
        height: 6px;
        transform: translate(-50%, -50%);
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        pointer-events: none;
      }
      .modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.78);
        display: none;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      }
      .modal-box {
        width: 520px;
        background: #0f172a;
        border: 1px solid #38bdf8;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.8);
      }
      .modal-box textarea {
        width: 100%;
        height: 140px;
        background: #020617;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        padding: 8px;
        box-sizing: border-box;
        margin: 10px 0;
      }
      .trace-step {
        background: #1e293b;
        border-left: 3px solid #38bdf8;
        padding: 6px 10px;
        margin-top: 6px;
        border-radius: 2px;
      }
      .trace-step strong {
        color: #38bdf8;
        font-size: 10px;
        text-transform: uppercase;
      }
      .hud-toast-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
        z-index: 2000;
      }
      .hud-toast {
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        border: 1px solid #38bdf8;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 11px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.6);
        pointer-events: auto;
        opacity: 0;
        transform: translateY(8px);
        transition: all 0.25s ease;
      }
      .hud-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
      .hud-toast-success {
        border-color: #4ade80;
        color: #bbf7d0;
      }
      .hud-toast-warning {
        border-color: #facc15;
        color: #fef08a;
      }
      #mnemonic-ui-root.hud-hidden .hud-panel {
        opacity: 0;
        pointer-events: none;
        transform: translateY(-8px);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .hud-cinematic-pill {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 17, 40, 0.88);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(56, 189, 248, 0.5);
        border-radius: 20px;
        padding: 6px 18px;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: #94a3b8;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s ease;
        z-index: 1200;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      }
      #mnemonic-ui-root.hud-hidden .hud-cinematic-pill {
        opacity: 1;
        pointer-events: auto;
      }
      .hud-cinematic-pill:hover {
        color: #38bdf8;
        border-color: #38bdf8;
        background: rgba(15, 23, 42, 0.95);
      }
    `;
    document.head.appendChild(style);
  }

  private buildUI() {
    const reticle = document.createElement('div');
    reticle.className = 'reticle';
    this.root.appendChild(reticle);

    const cinematicPill = document.createElement('button');
    cinematicPill.id = 'hud-restore-pill';
    cinematicPill.className = 'hud-cinematic-pill';
    cinematicPill.textContent = '👁 Restore HUD [H]';
    cinematicPill.addEventListener('click', () => {
      this.toggleCinematic(false);
    });
    this.root.appendChild(cinematicPill);

    const header = document.createElement('div');
    header.className = 'hud-panel hud-header';
    header.innerHTML = `
      <h1>THE LIVING RELIQUARY // MNEMONIC WORLD ENGINE</h1>
      <p>A living 3D world where meaning creates geography, relationships form physical infrastructure, and the subterranean machine city is literally its own source code.</p>
    `;
    this.root.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'hud-panel hud-controls';
    controls.innerHTML = `
      <div><strong>[W A S D]</strong> Walk | <strong>[Shift]</strong> Sprint | <strong>[Mouse]</strong> Look</div>
      <div><strong>[E]</strong> Inspect Provenance | <strong>[F]</strong> Fullscreen | <strong>[H]</strong> Cinematic View</div>
      <div><strong>[Space / C]</strong> Vertical Motion (Freeflight & Orbital) | <strong>[Click]</strong> Pointer Lock</div>
    `;
    this.root.appendChild(controls);

    const actions = document.createElement('div');
    actions.className = 'hud-panel hud-actions';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-box';
    searchInput.placeholder = 'Search concept (e.g. Starsilk, S\'mores)...';
    searchInput.addEventListener('input', (e) => {
      this.events.onSearch?.((e.target as HTMLInputElement).value);
    });
    actions.appendChild(searchInput);

    const orbitalBtn = document.createElement('button');
    orbitalBtn.className = 'btn btn-primary';
    orbitalBtn.textContent = 'Ascend to Orbital / Reveal Graph';
    orbitalBtn.addEventListener('click', () => {
      this.isOrbital = !this.isOrbital;
      orbitalBtn.textContent = this.isOrbital ? 'Return to Surface Walk' : 'Ascend to Orbital / Reveal Graph';
      this.events.onOrbitalToggle?.(this.isOrbital);
    });
    actions.appendChild(orbitalBtn);

    const machineBtn = document.createElement('button');
    machineBtn.className = 'btn';
    machineBtn.textContent = 'Descend to Machine Underworld';
    machineBtn.addEventListener('click', () => {
      this.isSubterranean = !this.isSubterranean;
      machineBtn.textContent = this.isSubterranean ? 'Ascend to Semantic Surface' : 'Descend to Machine Underworld';
      if (this.isSubterranean) {
        this.events.onMachineDescent?.();
      } else {
        this.events.onSurfaceAscent?.();
      }
    });
    actions.appendChild(machineBtn);

    const sanctuaryBtn = document.createElement('button');
    sanctuaryBtn.className = 'btn';
    sanctuaryBtn.textContent = 'Visit Dexter Sanctuary';
    sanctuaryBtn.addEventListener('click', () => {
      this.events.onTeleportToSanctuary?.();
    });
    actions.appendChild(sanctuaryBtn);

    this.audioBtn = document.createElement('button');
    this.audioBtn.className = 'btn';
    this.audioBtn.textContent = 'Audio: Muted';
    this.audioBtn.addEventListener('click', () => {
      const isMuted = this.events.onAudioToggle ? this.events.onAudioToggle() : true;
      this.audioBtn.textContent = isMuted ? 'Audio: Muted' : 'Audio: Active';
    });
    actions.appendChild(this.audioBtn);

    const shadowBtn = document.createElement('button');
    shadowBtn.className = 'btn';
    shadowBtn.id = 'shadow-toggle-btn';
    shadowBtn.textContent = 'Shadows: Reactive High';
    const modes: ShadowMode[] = ['reactive', 'static', 'off'];
    let currentModeIndex = 0;
    shadowBtn.addEventListener('click', () => {
      currentModeIndex = (currentModeIndex + 1) % modes.length;
      const nextMode = modes[currentModeIndex];
      if (nextMode === 'reactive') shadowBtn.textContent = 'Shadows: Reactive High';
      else if (nextMode === 'static') shadowBtn.textContent = 'Shadows: Static Standard';
      else shadowBtn.textContent = 'Shadows: Off';
      this.events.onShadowToggle?.(nextMode);
    });
    actions.appendChild(shadowBtn);

    const epochSelect = document.createElement('select');
    epochSelect.className = 'search-box';
    epochSelect.innerHTML = `
      <option value="all">Timeline: All Eras (Full Canon)</option>
      <option value="archaic">Timeline: Archaic & Ruins (≤2025)</option>
      <option value="monumental">Timeline: Monumental Tier A</option>
      <option value="contemporary">Timeline: Contemporary (2026)</option>
      <option value="emergent">Timeline: Emergent Mutations</option>
    `;
    epochSelect.addEventListener('change', (e) => {
      this.events.onEpochChange?.((e.target as HTMLSelectElement).value as Epoch);
    });
    actions.appendChild(epochSelect);

    const viewRow = document.createElement('div');
    viewRow.style.display = 'grid';
    viewRow.style.gridTemplateColumns = '1fr 1fr';
    viewRow.style.gap = '6px';

    this.fullscreenBtn = document.createElement('button');
    this.fullscreenBtn.className = 'btn';
    this.fullscreenBtn.id = 'fullscreen-toggle-btn';
    this.fullscreenBtn.textContent = '⛶ Fullscreen [F]';
    this.fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });
    viewRow.appendChild(this.fullscreenBtn);

    this.cinematicBtn = document.createElement('button');
    this.cinematicBtn.className = 'btn';
    this.cinematicBtn.id = 'cinematic-toggle-btn';
    this.cinematicBtn.textContent = '👁 Cinematic [H]';
    this.cinematicBtn.title = 'Hide HUD for unobstructed cinematic view (Press H or click to toggle)';
    this.cinematicBtn.addEventListener('click', () => {
      this.toggleCinematic();
    });
    viewRow.appendChild(this.cinematicBtn);

    actions.appendChild(viewRow);

    const patchBtn = document.createElement('button');
    patchBtn.className = 'btn';
    patchBtn.textContent = 'Ingest Knowledge Patch';
    patchBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
    actions.appendChild(patchBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-danger';
    resetBtn.textContent = 'Reset to Canonical World';
    resetBtn.addEventListener('click', () => {
      this.events.onResetCanonical?.();
      this.hideInspect();
      this.showToast('World topology restored to pristine canonical baseline.', 'success');
    });
    actions.appendChild(resetBtn);

    this.root.appendChild(actions);

    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'hud-toast-container';
    this.root.appendChild(this.toastContainer);

    this.inspectCard = document.createElement('div');
    this.inspectCard.className = 'hud-panel inspect-card';
    this.root.appendChild(this.inspectCard);

    // Modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-box">
        <h3 style="margin:0;color:#38bdf8;">In-World Knowledge Ingestion</h3>
        <p style="font-size:11px;color:#94a3b8;margin:6px 0;">Paste structured JSON or raw Markdown. The tectonic solver will dynamically recalculate physical landscape topology.</p>
        <textarea id="patch-input" placeholder='Paste JSON patch or markdown...'></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-sample">Load Fixture Patch</button>
          <button class="btn btn-primary" id="modal-submit">Mutate World</button>
        </div>
      </div>
    `;
    this.root.appendChild(modal);

    modal.querySelector('#modal-cancel')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.querySelector('#modal-sample')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/fixtures/knowledge-patch.json');
        if (res.ok) {
          const text = await res.text();
          (modal.querySelector('#patch-input') as HTMLTextAreaElement).value = text;
          return;
        }
      } catch {
        // Fallback to in-memory JSON definition
      }
      (modal.querySelector('#patch-input') as HTMLTextAreaElement).value = JSON.stringify({
        id: "patch-emergent-forge",
        title: "Nebula Compiler & Stellar Synthesis",
        domain: "Cosmology & Programmable Reality",
        wing: "north",
        summary: "A newly synthesized cosmological macro-compiler converting raw void entropy into programmable Starsilk substrate.",
        tags: ["compiler", "starsilk", "astral-forge"]
      }, null, 2);
    });

    modal.querySelector('#modal-submit')?.addEventListener('click', () => {
      const text = (modal.querySelector('#patch-input') as HTMLTextAreaElement).value.trim();
      if (!text) return;
      const isJson = text.startsWith('{');
      this.events.onIngestPatch?.(text, isJson);
      modal.style.display = 'none';
    });

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.code === 'KeyH' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleCinematic();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      if (this.fullscreenBtn) {
        this.fullscreenBtn.textContent = isFs ? '🗗 Window [F]' : '⛶ Fullscreen [F]';
      }
    });
  }

  public showToast(message: string, type: 'info' | 'success' | 'warning' = 'info') {
    const toast = document.createElement('div');
    toast.className = `hud-toast hud-toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3200);
  }

  public showInspect(exhibit: SemanticExhibit) {
    this.activeExhibit = exhibit;
    this.inspectCard.style.display = 'block';
    const p = exhibit.projects[0] || ({} as any);
    const badgeText = `${escapeHtml(exhibit.wing.toUpperCase())} // ${escapeHtml(exhibit.tier)}-TIER // ${escapeHtml(exhibit.archetype)}`;
    const projectNames = exhibit.projects.map(proj => escapeHtml(proj.name)).join(', ');

    this.inspectCard.innerHTML = `
      <button id="inspect-close-btn" style="float:right;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;">✕</button>
      <div class="inspect-badge">${badgeText}</div>
      <h2>${escapeHtml(exhibit.title)}</h2>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px 0;">${escapeHtml(exhibit.copy.subtitle || '')}</p>

      <div class="inspect-section">
        <strong>Plaque:</strong> ${escapeHtml(exhibit.copy.plaque)}
      </div>
      <div class="inspect-section">
        <strong>Problem & Creation:</strong> ${escapeHtml(exhibit.copy.problem || 'N/A')} — <em>${escapeHtml(exhibit.copy.made || 'N/A')}</em>
      </div>
      <div class="inspect-section">
        <strong>Represented Projects (${exhibit.projectIds.length}):</strong> ${projectNames}
      </div>
      <div class="inspect-section">
        <strong>Lesson:</strong> <em>"${escapeHtml(p.lesson || 'Preserve structural boundaries.')}"</em>
      </div>
      <div class="inspect-section" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
        <span style="color:#4ade80;font-size:10px;">${exhibit.isMutated ? 'EMERGENT MUTATION' : 'CANONICAL STATUS VERIFIED'}</span>
        <button class="btn btn-secondary" id="trace-btn">TRACE TO MACHINE ↓</button>
      </div>
      <div id="trace-container"></div>
    `;

    this.inspectCard.querySelector('#inspect-close-btn')?.addEventListener('click', () => {
      this.hideInspect();
    });

    this.inspectCard.querySelector('#trace-btn')?.addEventListener('click', () => {
      if (this.activeExhibit && this.events.onTraceToMachine) {
        this.events.onTraceToMachine(this.activeExhibit);
      }
    });
  }

  public renderCausalTrace(steps: CausalTraceStep[]) {
    const container = this.inspectCard.querySelector('#trace-container');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-top:10px;border-top:1px solid #38bdf8;padding-top:6px;">
        <h4 style="margin:0 0 6px 0;font-size:11px;color:#38bdf8;letter-spacing:0.05em;">CAUSAL RECURSION TRACE</h4>
        ${steps.map(s => `
          <div class="trace-step">
            <strong>${escapeHtml(s.stage)}</strong>: ${escapeHtml(s.title)}
            <div style="font-size:10px;color:#cbd5e1;margin-top:2px;">${escapeHtml(s.description)}</div>
            <div style="font-size:9px;color:#94a3b8;margin-top:1px;"><em>${escapeHtml(s.evidence)}</em></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  public showSanctuaryInspect(s: DexterSanctuaryData) {
    this.inspectCard.style.display = 'block';
    this.inspectCard.innerHTML = `
      <button id="sanctuary-close-btn" style="float:right;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;">✕</button>
      <div class="inspect-badge" style="background:#b45309;">NON-PROJECT CONSTANT</div>
      <h2>${escapeHtml(s.name)}</h2>
      <p style="font-size:11px;color:#d97706;margin:0 0 8px 0;">${escapeHtml(s.domain)}</p>
      <div class="inspect-section">
        <strong>Ontological Status:</strong> ${escapeHtml(s.note)}
      </div>
      <div class="inspect-section">
        <strong>Architecture:</strong> ${escapeHtml(s.description)}
      </div>
    `;

    this.inspectCard.querySelector('#sanctuary-close-btn')?.addEventListener('click', () => {
      this.hideInspect();
    });
  }

  public toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          this.showToast('Fullscreen mode could not be entered.', 'warning');
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  public toggleCinematic(force?: boolean) {
    this.isCinematic = typeof force === 'boolean' ? force : !this.isCinematic;
    if (this.isCinematic) {
      this.root.classList.add('hud-hidden');
      this.showToast('Cinematic View active. Press [H] or top pill to restore HUD.', 'success');
    } else {
      this.root.classList.remove('hud-hidden');
    }
    if (this.cinematicBtn) {
      this.cinematicBtn.textContent = this.isCinematic ? '👁 Show HUD [H]' : '👁 Cinematic [H]';
    }
  }

  public hideInspect() {
    this.inspectCard.style.display = 'none';
  }
}
