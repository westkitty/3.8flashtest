import type {
  SemanticExhibit,
  DexterSanctuaryData,
  Epoch,
  AppMode,
  SearchResult,
  MutationPreviewResult,
  MutationResult
} from '../types';
import type { CausalTraceStep } from '../provenance/ProvenanceTracer';
import type { ShadowMode } from '../render/RendererHost';
import type { QualityTier } from '../performance/PerformanceGovernor';

export interface UIEvents {
  onSearch: (q: string) => SearchResult[];
  onSelectSearchResult: (exhibit: SemanticExhibit) => void;
  onModeSelect: (mode: AppMode) => void;
  onEpochChange: (epoch: Epoch) => void;
  onOrbitalToggle: (active: boolean) => void;
  onMachineDescent: () => void;
  onSurfaceAscent: () => void;
  onPreviewPatch: (text: string, isJson: boolean) => { success: boolean; message: string; preview?: MutationPreviewResult };
  onApplyMutation: (preview: MutationPreviewResult) => MutationResult;
  onUndoMutation: () => { success: boolean; message: string };
  onIngestPatch: (text: string, isJson: boolean) => void;
  onResetCanonical: () => void;
  onTeleportToSanctuary: () => void;
  onTraceToMachine: (exhibit: SemanticExhibit) => void;
  onAudioToggle: () => boolean;
  onShadowToggle: (mode: ShadowMode) => void;
  onQualityTierOverride?: (tier: QualityTier | null) => void;
  onToggleGlider?: () => boolean;
  onToggleGrapple?: () => void;
  onToggleKatamari?: () => boolean;
  onToggleDirector?: () => boolean;
  onTriggerCymatics?: () => void;
  onToggleTrain?: () => boolean;
  onGitScrub?: (index: number) => void;
  onSpeakLore?: (title: string, summary: string) => void;
  onSelectExhibitById?: (id: string) => void;
  onToggleTelemetry?: () => boolean;
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
  private inspectCard!: HTMLElement;
  private toastContainer!: HTMLDivElement;
  private searchModal!: HTMLDivElement;
  private searchInput!: HTMLInputElement;
  private searchResultsList!: HTMLDivElement;
  private menuDrawer!: HTMLDivElement;
  private helpModal!: HTMLDivElement;
  private mutationModal!: HTMLDivElement;
  private confirmModal!: HTMLDivElement;
  private telemetryHud!: HTMLDivElement;

  private currentMode: AppMode = 'surface';
  private modePill!: HTMLSpanElement;
  private isCinematic = false;
  private activeExhibit: SemanticExhibit | null = null;
  private activeSearchResultIndex = 0;
  private currentSearchResults: SearchResult[] = [];
  private activeMutationPreview: MutationPreviewResult | null = null;

  // Primary persistent HUD buttons
  private findBtn!: HTMLButtonElement;
  private connectionsBtn!: HTMLButtonElement;
  private tourBtn!: HTMLButtonElement;
  private menuBtn!: HTMLButtonElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'mnemonic-ui-root';
    this.applyStyles();
    this.buildUI();
    document.body.appendChild(this.root);
  }

  private applyStyles(): void {
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
        background: rgba(10, 15, 26, 0.88);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 10px 35px rgba(0, 0, 0, 0.7);
      }
      .hud-header {
        top: 16px;
        left: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 14px;
      }
      .hud-header h1 {
        margin: 0;
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #38bdf8;
        font-weight: 700;
      }
      .mode-badge {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        padding: 3px 8px;
        border-radius: 4px;
        background: #0369a1;
        color: #f8fafc;
        text-transform: uppercase;
      }
      /* Primary 4-Action Visitor HUD */
      .hud-visitor-dock {
        position: fixed;
        pointer-events: auto;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 30px;
        background: rgba(10, 17, 34, 0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(56, 189, 248, 0.35);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.75);
      }
      .dock-btn {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.03em;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
        min-height: 40px;
      }
      .dock-btn:hover, .dock-btn:focus-visible {
        background: #0284c7;
        border-color: #38bdf8;
        outline: none;
        transform: translateY(-1px);
      }
      .dock-btn.active {
        background: #0284c7;
        border-color: #7dd3fc;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
      }
      .btn {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        padding: 7px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.15s ease;
        min-height: 36px;
        box-sizing: border-box;
      }
      .btn:hover, .btn:focus-visible {
        background: #334155;
        border-color: #38bdf8;
        outline: none;
      }
      .btn-primary {
        background: #0284c7;
        border-color: #38bdf8;
      }
      .btn-primary:hover, .btn-primary:focus-visible {
        background: #0369a1;
      }
      .btn-secondary {
        background: #4338ca;
        border-color: #818cf8;
      }
      .btn-secondary:hover, .btn-secondary:focus-visible {
        background: #3730a3;
      }
      .btn-danger {
        background: #991b1b;
        border-color: #f87171;
      }
      .btn-danger:hover, .btn-danger:focus-visible {
        background: #7f1d1d;
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
      /* Contextual Inspect Card */
      .inspect-card {
        top: 70px;
        right: 24px;
        width: 420px;
        max-width: calc(100vw - 48px);
        max-height: calc(100vh - 120px);
        overflow-y: auto;
        display: none;
        z-index: 80;
      }
      .inspect-card h2 {
        margin: 0 0 4px 0;
        font-size: 16px;
        color: #38bdf8;
      }
      .inspect-badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      .inspect-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 2px 7px;
        border-radius: 4px;
        background: #0369a1;
        color: #fff;
        font-weight: 600;
      }
      .inspect-badge-inferred {
        background: #d97706;
      }
      .inspect-section {
        margin-top: 8px;
        font-size: 11px;
        color: #cbd5e1;
        border-top: 1px solid #334155;
        padding-top: 6px;
        line-height: 1.5;
      }
      .inspect-section strong {
        color: #94a3b8;
      }
      .inspect-links-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .inspect-link-pill {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 10px;
        color: #38bdf8;
        cursor: pointer;
      }
      .inspect-link-pill:hover {
        background: #0284c7;
        color: #fff;
      }
      /* Compact Search Modal */
      .search-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.72);
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 80px;
        pointer-events: auto;
        z-index: 1500;
      }
      .search-box-card {
        width: 520px;
        max-width: 90vw;
        background: #0f172a;
        border: 1px solid #38bdf8;
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85);
      }
      .search-input-field {
        width: 100%;
        box-sizing: border-box;
        background: #020617;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
      }
      .search-input-field:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
      }
      .search-results-list {
        margin-top: 10px;
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .search-item {
        padding: 8px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.12s ease;
      }
      .search-item:hover, .search-item.selected {
        background: #0284c7;
        border-color: #7dd3fc;
      }
      .search-item-title {
        font-size: 12px;
        font-weight: 600;
        color: #f8fafc;
      }
      .search-item-meta {
        font-size: 10px;
        color: #94a3b8;
        margin-top: 2px;
      }
      /* Drawer / Menu Panel */
      .menu-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 380px;
        max-width: 90vw;
        background: rgba(10, 15, 28, 0.96);
        backdrop-filter: blur(16px);
        border-left: 1px solid rgba(255, 255, 255, 0.14);
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
        display: none;
        flex-direction: column;
        gap: 16px;
        pointer-events: auto;
        z-index: 1400;
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
      }
      .menu-drawer.open {
        display: flex;
      }
      .drawer-section {
        border-top: 1px solid #334155;
        padding-top: 12px;
      }
      .drawer-section h3 {
        margin: 0 0 8px 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #38bdf8;
      }
      .drawer-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      /* Modal common */
      .modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        z-index: 2000;
      }
      .modal-box {
        width: 540px;
        max-width: 92vw;
        max-height: 85vh;
        overflow-y: auto;
        background: #0f172a;
        border: 1px solid #38bdf8;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.85);
      }
      .modal-box textarea {
        width: 100%;
        height: 120px;
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
      .preview-callout {
        background: #1e293b;
        border: 1px solid #38bdf8;
        border-radius: 6px;
        padding: 12px;
        margin: 10px 0;
        font-size: 11px;
        line-height: 1.5;
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
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
        z-index: 2200;
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
      #mnemonic-ui-root.hud-hidden .hud-panel,
      #mnemonic-ui-root.hud-hidden .hud-visitor-dock,
      #mnemonic-ui-root.hud-hidden .inspect-card {
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
      /* Dev Telemetry HUD */
      .telemetry-hud {
        position: absolute;
        top: 60px;
        left: 20px;
        font-size: 10px;
        font-family: monospace;
        line-height: 1.4;
        background: rgba(2, 6, 23, 0.85);
        border: 1px solid #334155;
        padding: 8px 12px;
        border-radius: 6px;
        display: none;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  private buildUI(): void {
    const reticle = document.createElement('div');
    reticle.className = 'reticle';
    this.root.appendChild(reticle);

    // Cinematic Restore Pill
    const cinematicPill = document.createElement('button');
    cinematicPill.id = 'hud-restore-pill';
    cinematicPill.className = 'hud-cinematic-pill';
    cinematicPill.textContent = '👁 Restore HUD [H]';
    cinematicPill.addEventListener('click', () => {
      this.toggleCinematic(false);
    });
    this.root.appendChild(cinematicPill);

    // Minimal Header with Mode Indicator
    const header = document.createElement('header');
    header.className = 'hud-panel hud-header';
    header.innerHTML = `
      <h1>THE LIVING RELIQUARY</h1>
      <span class="mode-badge" id="hud-mode-pill">SURFACE</span>
    `;
    this.root.appendChild(header);
    this.modePill = header.querySelector('#hud-mode-pill') as HTMLSpanElement;

    // Primary 4-Action Visitor Dock
    const dock = document.createElement('nav');
    dock.className = 'hud-visitor-dock';
    dock.setAttribute('aria-label', 'Primary navigation');

    this.findBtn = document.createElement('button');
    this.findBtn.className = 'dock-btn';
    this.findBtn.id = 'dock-btn-find';
    this.findBtn.innerHTML = '🔍 Find <kbd style="font-size:9px;opacity:0.7;">[F]</kbd>';
    this.findBtn.addEventListener('click', () => this.openSearch());
    dock.appendChild(this.findBtn);

    this.connectionsBtn = document.createElement('button');
    this.connectionsBtn.className = 'dock-btn';
    this.connectionsBtn.id = 'dock-btn-connections';
    this.connectionsBtn.innerHTML = '🌐 Connections <kbd style="font-size:9px;opacity:0.7;">[O]</kbd>';
    this.connectionsBtn.addEventListener('click', () => {
      const next = this.currentMode === 'connections' ? 'surface' : 'connections';
      this.events.onModeSelect?.(next);
    });
    dock.appendChild(this.connectionsBtn);

    this.tourBtn = document.createElement('button');
    this.tourBtn.className = 'dock-btn';
    this.tourBtn.id = 'dock-btn-tour';
    this.tourBtn.innerHTML = '🎬 Guided Tour <kbd style="font-size:9px;opacity:0.7;">[T]</kbd>';
    this.tourBtn.addEventListener('click', () => {
      const next = this.currentMode === 'tour' ? 'surface' : 'tour';
      this.events.onModeSelect?.(next);
    });
    dock.appendChild(this.tourBtn);

    this.menuBtn = document.createElement('button');
    this.menuBtn.className = 'dock-btn';
    this.menuBtn.id = 'dock-btn-menu';
    this.menuBtn.innerHTML = '⚙️ Menu / Lab <kbd style="font-size:9px;opacity:0.7;">[M]</kbd>';
    this.menuBtn.addEventListener('click', () => this.toggleMenu());
    dock.appendChild(this.menuBtn);

    this.root.appendChild(dock);

    // Toast Container
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'hud-toast-container';
    this.root.appendChild(this.toastContainer);

    // Contextual Inspect Card
    this.inspectCard = document.createElement('aside');
    this.inspectCard.className = 'hud-panel inspect-card';
    this.inspectCard.setAttribute('aria-label', 'Exhibit inspection card');
    this.root.appendChild(this.inspectCard);

    // Compact Search Interface
    this.buildSearchInterface();

    // Menu / Lab Drawer
    this.buildMenuDrawer();

    // Help Dialog
    this.buildHelpModal();

    // Ingest / Mutation Modal
    this.buildMutationModal();

    // Confirmation Modal
    this.buildConfirmModal();

    // Dev Telemetry HUD
    this.telemetryHud = document.createElement('div');
    this.telemetryHud.className = 'telemetry-hud';
    this.telemetryHud.id = 'dev-telemetry-hud';
    this.root.appendChild(this.telemetryHud);

    // Global Key Listener
    this.bindKeyboardShortcuts();
  }

  private buildSearchInterface(): void {
    this.searchModal = document.createElement('div');
    this.searchModal.className = 'search-overlay';
    this.searchModal.innerHTML = `
      <div class="search-box-card" role="dialog" aria-modal="true" aria-label="Find Anything in Mnemonic World">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="margin:0;font-size:13px;color:#38bdf8;">FIND IN MNEMONIC WORLD</h3>
          <span style="font-size:10px;color:#94a3b8;"><kbd>↑↓</kbd> navigate &nbsp; <kbd>Enter</kbd> jump &nbsp; <kbd>Esc</kbd> close</span>
        </div>
        <input type="text" class="search-input-field" id="search-nav-input" placeholder="Search title, ID (e.g. E01), project, or concept..." />
        <div class="search-results-list" id="search-nav-results"></div>
      </div>
    `;
    this.root.appendChild(this.searchModal);

    this.searchInput = this.searchModal.querySelector('#search-nav-input') as HTMLInputElement;
    this.searchResultsList = this.searchModal.querySelector('#search-nav-results') as HTMLDivElement;

    this.searchInput.addEventListener('input', () => {
      const q = this.searchInput.value;
      if (this.events.onSearch) {
        this.currentSearchResults = this.events.onSearch(q);
        this.activeSearchResultIndex = 0;
        this.renderSearchResults();
      }
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.currentSearchResults.length > 0) {
          this.activeSearchResultIndex = (this.activeSearchResultIndex + 1) % this.currentSearchResults.length;
          this.renderSearchResults();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.currentSearchResults.length > 0) {
          this.activeSearchResultIndex = (this.activeSearchResultIndex - 1 + this.currentSearchResults.length) % this.currentSearchResults.length;
          this.renderSearchResults();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.currentSearchResults[this.activeSearchResultIndex]) {
          const selected = this.currentSearchResults[this.activeSearchResultIndex].exhibit;
          this.closeSearch();
          this.events.onSelectSearchResult?.(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSearch();
      }
    });

    this.searchModal.addEventListener('click', (e) => {
      if (e.target === this.searchModal) {
        this.closeSearch();
      }
    });
  }

  private renderSearchResults(): void {
    this.searchResultsList.innerHTML = '';
    if (this.currentSearchResults.length === 0) {
      if (this.searchInput.value.trim().length > 0) {
        this.searchResultsList.innerHTML = `<div style="font-size:11px;color:#94a3b8;padding:8px;">No matching exhibits found.</div>`;
      }
      return;
    }

    this.currentSearchResults.forEach((res, idx) => {
      const item = document.createElement('div');
      item.className = `search-item ${idx === this.activeSearchResultIndex ? 'selected' : ''}`;
      item.innerHTML = `
        <div>
          <div class="search-item-title">${escapeHtml(res.exhibit.title)} <span style="font-size:9px;color:#38bdf8;">[${res.exhibit.id}]</span></div>
          <div class="search-item-meta">${escapeHtml(res.matchedSnippet)}</div>
        </div>
        <div style="font-size:9px;text-transform:uppercase;color:#94a3b8;">${escapeHtml(res.exhibit.wing)}</div>
      `;
      item.addEventListener('click', () => {
        this.closeSearch();
        this.events.onSelectSearchResult?.(res.exhibit);
      });
      this.searchResultsList.appendChild(item);
    });
  }

  private buildMenuDrawer(): void {
    this.menuDrawer = document.createElement('div');
    this.menuDrawer.className = 'menu-drawer';
    this.menuDrawer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;font-size:15px;color:#38bdf8;">MENU &amp; LAB</h2>
        <button class="btn" id="drawer-close-btn" style="min-height:30px;padding:4px 8px;">✕</button>
      </div>

      <!-- Exploration & Chronology -->
      <div class="drawer-section">
        <h3>Exploration &amp; Chronology</h3>
        <label style="font-size:10px;color:#94a3b8;display:block;margin-bottom:4px;">Timeline Epoch:</label>
        <select class="btn" id="drawer-epoch-select" style="width:100%;margin-bottom:8px;">
          <option value="all">All Eras (Full Canon)</option>
          <option value="archaic">Archaic Predecessors (≤2025)</option>
          <option value="monumental">Monumental Tier A</option>
          <option value="contemporary">Contemporary (2026)</option>
          <option value="emergent">Emergent Mutations</option>
        </select>
        <div class="drawer-grid">
          <button class="btn" id="drawer-sanctuary-btn">Visit Sanctuary</button>
          <button class="btn" id="drawer-machine-btn">Machine Layer</button>
        </div>
      </div>

      <!-- Knowledge Mutation -->
      <div class="drawer-section">
        <h3>Knowledge Mutation</h3>
        <p style="font-size:10px;color:#94a3b8;margin:0 0 6px 0;">Speculatively ingest JSON patches or raw markdown to deform local geography.</p>
        <div class="drawer-grid">
          <button class="btn btn-primary" id="drawer-mutate-btn">New Mutation</button>
          <button class="btn" id="drawer-undo-btn">Undo Last</button>
        </div>
        <button class="btn btn-danger" id="drawer-reset-btn" style="width:100%;margin-top:6px;">Restore Canonical Baseline</button>
      </div>

      <!-- System Settings -->
      <div class="drawer-section">
        <h3>Settings</h3>
        <div class="drawer-grid">
          <button class="btn" id="drawer-audio-btn">Audio: Muted</button>
          <button class="btn" id="drawer-shadow-btn">Shadows: High</button>
          <button class="btn" id="drawer-fullscreen-btn">⛶ Fullscreen</button>
          <button class="btn" id="drawer-cinematic-btn">👁 Cinematic</button>
        </div>
      </div>

      <!-- Experimental Lab Surface -->
      <div class="drawer-section">
        <h3>Lab &amp; Experimental Mechanics</h3>
        <p style="font-size:10px;color:#94a3b8;margin:0 0 6px 0;">Advanced traversal tools and diagnostics (isolated from core tour).</p>
        <div class="drawer-grid" style="margin-bottom:6px;">
          <button class="btn" id="lab-glider-btn">✈ Glider</button>
          <button class="btn" id="lab-grapple-btn">⚡ Grapple</button>
          <button class="btn" id="lab-katamari-btn">⚽ Katamari</button>
          <button class="btn" id="lab-cymatics-btn">🔊 Cymatic Blast</button>
          <button class="btn" id="lab-train-btn">🚆 Maglev Train</button>
          <button class="btn" id="lab-telemetry-btn">📊 Telemetry</button>
        </div>
        <!-- Git Chronology in Lab -->
        <label style="font-size:10px;color:#94a3b8;display:block;margin-top:6px;">Git Repository Chronology:</label>
        <div id="lab-git-label" style="font-size:10px;color:#cbd5e1;margin-bottom:2px;">Snapshot 5 (HEAD)</div>
        <input type="range" id="lab-git-slider" min="0" max="5" value="5" style="width:100%;" />
      </div>

      <!-- Help & Controls -->
      <div class="drawer-section">
        <button class="btn" id="drawer-help-btn" style="width:100%;">❓ Controls &amp; Keyboard Shortcuts</button>
      </div>
    `;
    this.root.appendChild(this.menuDrawer);

    // Bind drawer events
    this.menuDrawer.querySelector('#drawer-close-btn')?.addEventListener('click', () => this.toggleMenu(false));

    this.menuDrawer.querySelector('#drawer-epoch-select')?.addEventListener('change', (e) => {
      const epoch = (e.target as HTMLSelectElement).value as Epoch;
      this.events.onEpochChange?.(epoch);
    });

    this.menuDrawer.querySelector('#drawer-sanctuary-btn')?.addEventListener('click', () => {
      this.toggleMenu(false);
      this.events.onTeleportToSanctuary?.();
    });

    this.menuDrawer.querySelector('#drawer-machine-btn')?.addEventListener('click', () => {
      this.toggleMenu(false);
      const next = this.currentMode === 'machine' ? 'surface' : 'machine';
      this.events.onModeSelect?.(next);
    });

    this.menuDrawer.querySelector('#drawer-mutate-btn')?.addEventListener('click', () => {
      this.toggleMenu(false);
      this.openMutationModal();
    });

    this.menuDrawer.querySelector('#drawer-undo-btn')?.addEventListener('click', () => {
      const res = this.events.onUndoMutation ? this.events.onUndoMutation() : { success: false, message: 'Undo not implemented.' };
      this.showToast(res.message, res.success ? 'success' : 'warning');
    });

    this.menuDrawer.querySelector('#drawer-reset-btn')?.addEventListener('click', () => {
      this.toggleMenu(false);
      this.openConfirmModal('Restore Canonical World?', 'All emergent mutations will be discarded and topology restored to the canonical baseline.', () => {
        this.events.onResetCanonical?.();
        this.hideInspect();
        this.showToast('World restored to pristine canonical baseline.', 'success');
      });
    });

    const audioBtn = this.menuDrawer.querySelector('#drawer-audio-btn') as HTMLButtonElement;
    audioBtn?.addEventListener('click', () => {
      const isMuted = this.events.onAudioToggle ? this.events.onAudioToggle() : true;
      audioBtn.textContent = isMuted ? 'Audio: Muted' : 'Audio: Active';
    });

    const shadowBtn = this.menuDrawer.querySelector('#drawer-shadow-btn') as HTMLButtonElement;
    const shadowModes: ShadowMode[] = ['reactive', 'static', 'off'];
    let sIdx = 0;
    shadowBtn?.addEventListener('click', () => {
      sIdx = (sIdx + 1) % shadowModes.length;
      const mode = shadowModes[sIdx];
      shadowBtn.textContent = mode === 'reactive' ? 'Shadows: High' : (mode === 'static' ? 'Shadows: Static' : 'Shadows: Off');
      this.events.onShadowToggle?.(mode);
    });

    this.menuDrawer.querySelector('#drawer-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    this.menuDrawer.querySelector('#drawer-cinematic-btn')?.addEventListener('click', () => {
      this.toggleMenu(false);
      this.toggleCinematic();
    });

    // Lab mechanics
    const gliderBtn = this.menuDrawer.querySelector('#lab-glider-btn') as HTMLButtonElement;
    gliderBtn?.addEventListener('click', () => {
      const active = this.events.onToggleGlider?.();
      gliderBtn.classList.toggle('btn-primary', !!active);
      this.showToast(active ? 'Glider Flight Mode Engaged.' : 'Glider Mode Disengaged.', 'info');
    });

    this.menuDrawer.querySelector('#lab-grapple-btn')?.addEventListener('click', () => {
      this.events.onToggleGrapple?.();
    });

    const katamariBtn = this.menuDrawer.querySelector('#lab-katamari-btn') as HTMLButtonElement;
    katamariBtn?.addEventListener('click', () => {
      const active = this.events.onToggleKatamari?.();
      katamariBtn.classList.toggle('btn-primary', !!active);
      this.showToast(active ? 'Katamari Knowledge Accretion Mode Active.' : 'Katamari Mode Exited.', 'info');
    });

    this.menuDrawer.querySelector('#lab-cymatics-btn')?.addEventListener('click', () => {
      this.events.onTriggerCymatics?.();
      this.showToast('Cymatic Sonic Shockwave Fired!', 'info');
    });

    const trainBtn = this.menuDrawer.querySelector('#lab-train-btn') as HTMLButtonElement;
    trainBtn?.addEventListener('click', () => {
      const boarded = this.events.onToggleTrain?.();
      trainBtn.classList.toggle('btn-primary', !!boarded);
      this.showToast(boarded ? 'Boarded Subterranean Maglev Train.' : 'Dismounted Train.', 'info');
    });

    this.menuDrawer.querySelector('#lab-telemetry-btn')?.addEventListener('click', () => {
      const active = this.toggleTelemetry();
      this.showToast(active ? 'Performance Telemetry HUD Enabled.' : 'Telemetry HUD Hidden.', 'info');
    });

    const gitSlider = this.menuDrawer.querySelector('#lab-git-slider') as HTMLInputElement;
    const gitLabel = this.menuDrawer.querySelector('#lab-git-label') as HTMLDivElement;
    gitSlider?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      gitLabel.textContent = `Snapshot ${val}`;
      this.events.onGitScrub?.(val);
    });

    this.menuDrawer.querySelector('#drawer-help-btn')?.addEventListener('click', () => {
      this.toggleMenu(false);
      this.openHelpModal();
    });
  }

  private buildHelpModal(): void {
    this.helpModal = document.createElement('div');
    this.helpModal.className = 'modal';
    this.helpModal.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="Controls and Shortcuts">
        <h3 style="margin:0 0 10px 0;color:#38bdf8;">CONTROLS &amp; SHORTCUTS</h3>
        <table style="width:100%;font-size:11px;color:#cbd5e1;border-collapse:collapse;line-height:1.6;">
          <tr><td style="width:120px;"><strong>[W A S D]</strong></td><td>Walk / Strafe</td></tr>
          <tr><td><strong>[Shift]</strong></td><td>Sprint</td></tr>
          <tr><td><strong>[Mouse]</strong></td><td>Look (Click viewport for pointer-lock)</td></tr>
          <tr><td><strong>[E]</strong></td><td>Inspect focused landmark / exhibit</td></tr>
          <tr><td><strong>[F]</strong></td><td>Find Anything (Search)</td></tr>
          <tr><td><strong>[O]</strong></td><td>Reveal Connections (Orbital relational graph)</td></tr>
          <tr><td><strong>[T]</strong></td><td>Guided Tour (Automated director drone camera)</td></tr>
          <tr><td><strong>[M]</strong></td><td>Menu / Lab drawer</td></tr>
          <tr><td><strong>[H]</strong></td><td>Toggle Cinematic HUD (Hide interface)</td></tr>
          <tr><td><strong>[?]</strong></td><td>Open this Help modal</td></tr>
          <tr><td><strong>[Esc]</strong></td><td>Close modals / inspect card / release focus</td></tr>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-top:14px;">
          <button class="btn btn-primary" id="help-close-btn">Got It</button>
        </div>
      </div>
    `;
    this.root.appendChild(this.helpModal);
    this.helpModal.querySelector('#help-close-btn')?.addEventListener('click', () => {
      this.helpModal.style.display = 'none';
    });
    this.helpModal.addEventListener('click', (e) => {
      if (e.target === this.helpModal) this.helpModal.style.display = 'none';
    });
  }

  private buildMutationModal(): void {
    this.mutationModal = document.createElement('div');
    this.mutationModal.className = 'modal';
    this.mutationModal.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="Knowledge Ingestion &amp; Mutation">
        <h3 style="margin:0;color:#38bdf8;">KNOWLEDGE MUTATION WORKFLOW</h3>
        <p style="font-size:11px;color:#94a3b8;margin:6px 0 10px 0;">
          Step 1: Input JSON patch or freeform Markdown notes. A speculative topological preview will be computed before modifying the world.
        </p>

        <textarea id="patch-input-textarea" placeholder='Paste JSON knowledge patch or Markdown...'></textarea>

        <div id="mutation-preview-panel" style="display:none;" class="preview-callout"></div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
          <button class="btn" id="mutate-cancel-btn">Cancel</button>
          <button class="btn" id="mutate-fixture-btn">Load Fixture</button>
          <button class="btn btn-secondary" id="mutate-preview-btn">Preview Speculation</button>
          <button class="btn btn-primary" id="mutate-apply-btn" style="display:none;">Apply Mutation</button>
        </div>
      </div>
    `;
    this.root.appendChild(this.mutationModal);

    const textarea = this.mutationModal.querySelector('#patch-input-textarea') as HTMLTextAreaElement;
    const previewPanel = this.mutationModal.querySelector('#mutation-preview-panel') as HTMLDivElement;
    const previewBtn = this.mutationModal.querySelector('#mutate-preview-btn') as HTMLButtonElement;
    const applyBtn = this.mutationModal.querySelector('#mutate-apply-btn') as HTMLButtonElement;
    const cancelBtn = this.mutationModal.querySelector('#mutate-cancel-btn') as HTMLButtonElement;
    const fixtureBtn = this.mutationModal.querySelector('#mutate-fixture-btn') as HTMLButtonElement;

    cancelBtn.addEventListener('click', () => {
      this.mutationModal.style.display = 'none';
      this.activeMutationPreview = null;
      previewPanel.style.display = 'none';
      applyBtn.style.display = 'none';
      previewBtn.style.display = 'inline-block';
    });

    fixtureBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/fixtures/knowledge-patch.json');
        if (res.ok) {
          textarea.value = await res.text();
          return;
        }
      } catch {
        // fallback
      }
      textarea.value = JSON.stringify({
        id: "patch-nebula-compiler",
        title: "Nebula Compiler & Stellar Synthesis",
        wing: "north",
        epoch: "emergent",
        summary: "A newly synthesized cosmological macro-compiler converting raw void entropy into programmable Starsilk substrate.",
        tags: ["compiler", "starsilk", "astral-forge"],
        relationships: [{ to: "E01", confidence: "explicit", reason: "Direct cosmological compiler link" }]
      }, null, 2);
    });

    previewBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) {
        this.showToast('Please paste a JSON patch or markdown text first.', 'warning');
        return;
      }
      const isJson = text.startsWith('{');
      if (this.events.onPreviewPatch) {
        const res = this.events.onPreviewPatch(text, isJson);
        if (!res.success || !res.preview) {
          this.showToast(res.message, 'warning');
          return;
        }
        this.activeMutationPreview = res.preview;
        previewPanel.style.display = 'block';
        previewPanel.innerHTML = `
          <div style="font-weight:700;color:#38bdf8;margin-bottom:4px;">SPECULATIVE TOPOLOGY PREVIEW</div>
          <div><strong>Candidate Exhibit:</strong> ${escapeHtml(res.preview.candidateExhibit.title)} (${escapeHtml(res.preview.candidateExhibit.id)})</div>
          <div><strong>Target Wing:</strong> ${escapeHtml(res.preview.targetRegion.name)}</div>
          <div><strong>Explicit Links:</strong> ${res.preview.explicitCount} &nbsp;|&nbsp; <strong>Inferred Links:</strong> ${res.preview.inferredCount}</div>
          <div><strong>Estimated Topology Displacement:</strong> ${res.preview.displacementScore}m</div>
          <div style="margin-top:4px;font-size:10px;color:#94a3b8;">${escapeHtml(res.preview.message)}</div>
        `;
        applyBtn.style.display = 'inline-block';
      }
    });

    applyBtn.addEventListener('click', () => {
      if (!this.activeMutationPreview) return;
      if (this.events.onApplyMutation) {
        const res = this.events.onApplyMutation(this.activeMutationPreview);
        this.showToast(res.message, res.success ? 'success' : 'warning');
        this.mutationModal.style.display = 'none';
        this.activeMutationPreview = null;
        previewPanel.style.display = 'none';
        applyBtn.style.display = 'none';
      }
    });
  }

  private buildConfirmModal(): void {
    this.confirmModal = document.createElement('div');
    this.confirmModal.className = 'modal';
    this.confirmModal.innerHTML = `
      <div class="modal-box" style="width:440px;" role="dialog" aria-modal="true">
        <h3 id="confirm-title" style="margin:0 0 6px 0;color:#f87171;">Confirm Action</h3>
        <p id="confirm-body" style="font-size:11px;color:#cbd5e1;line-height:1.5;margin:0 0 14px 0;"></p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn" id="confirm-cancel-btn">Cancel</button>
          <button class="btn btn-danger" id="confirm-ok-btn">Confirm</button>
        </div>
      </div>
    `;
    this.root.appendChild(this.confirmModal);
  }

  public openConfirmModal(title: string, body: string, onConfirm: () => void): void {
    const titleEl = this.confirmModal.querySelector('#confirm-title') as HTMLHeadingElement;
    const bodyEl = this.confirmModal.querySelector('#confirm-body') as HTMLParagraphElement;
    const okBtn = this.confirmModal.querySelector('#confirm-ok-btn') as HTMLButtonElement;
    const cancelBtn = this.confirmModal.querySelector('#confirm-cancel-btn') as HTMLButtonElement;

    titleEl.textContent = title;
    bodyEl.textContent = body;
    this.confirmModal.style.display = 'flex';

    const clean = () => {
      this.confirmModal.style.display = 'none';
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = clean;
    okBtn.onclick = () => {
      clean();
      onConfirm();
    };
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.openSearch();
      } else if (e.code === 'KeyO' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const next = this.currentMode === 'connections' ? 'surface' : 'connections';
        this.events.onModeSelect?.(next);
      } else if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const next = this.currentMode === 'tour' ? 'surface' : 'tour';
        this.events.onModeSelect?.(next);
      } else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleMenu();
      } else if (e.code === 'KeyH' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleCinematic();
      } else if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) {
        e.preventDefault();
        this.openHelpModal();
      } else if (e.code === 'Escape') {
        this.closeAllModals();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      const fsBtn = this.menuDrawer.querySelector('#drawer-fullscreen-btn');
      if (fsBtn) {
        fsBtn.textContent = isFs ? '🗗 Windowed' : '⛶ Fullscreen';
      }
    });
  }

  public setMode(mode: AppMode): void {
    this.currentMode = mode;
    if (this.modePill) {
      this.modePill.textContent = mode.toUpperCase();
    }
    // Update dock active states
    this.connectionsBtn.classList.toggle('active', mode === 'connections');
    this.tourBtn.classList.toggle('active', mode === 'tour');
  }

  public openSearch(): void {
    this.searchModal.style.display = 'flex';
    this.searchInput.value = '';
    this.currentSearchResults = [];
    this.searchResultsList.innerHTML = '';
    setTimeout(() => this.searchInput.focus(), 50);
  }

  public closeSearch(): void {
    this.searchModal.style.display = 'none';
  }

  public toggleMenu(force?: boolean): void {
    const isOpen = typeof force === 'boolean' ? force : !this.menuDrawer.classList.contains('open');
    this.menuDrawer.classList.toggle('open', isOpen);
  }

  public openHelpModal(): void {
    this.helpModal.style.display = 'flex';
  }

  public openMutationModal(): void {
    this.mutationModal.style.display = 'flex';
  }

  public closeAllModals(): void {
    this.closeSearch();
    this.toggleMenu(false);
    this.helpModal.style.display = 'none';
    this.mutationModal.style.display = 'none';
    this.confirmModal.style.display = 'none';
    this.hideInspect();
  }

  public toggleTelemetry(): boolean {
    const isVis = this.telemetryHud.style.display === 'block';
    this.telemetryHud.style.display = isVis ? 'none' : 'block';
    return !isVis;
  }

  public updateTelemetry(data: {
    fps: number;
    ms: number;
    tier: string;
    mode: string;
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
  }): void {
    if (this.telemetryHud.style.display !== 'block') return;
    this.telemetryHud.innerHTML = `
      <div><strong>FPS:</strong> ${data.fps} (${data.ms.toFixed(1)}ms)</div>
      <div><strong>Tier:</strong> ${data.tier} | <strong>Mode:</strong> ${data.mode}</div>
      <div><strong>Draw Calls:</strong> ${data.calls} | <strong>Triangles:</strong> ${data.triangles.toLocaleString()}</div>
      <div><strong>Geometries:</strong> ${data.geometries} | <strong>Textures:</strong> ${data.textures}</div>
    `;
  }

  public showToast(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
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

  public showInspect(exhibit: SemanticExhibit): void {
    this.activeExhibit = exhibit;
    this.inspectCard.style.display = 'block';

    const p = exhibit.projects[0] || ({} as any);
    const badgeText = `${escapeHtml(exhibit.wing.toUpperCase())} // ${escapeHtml(exhibit.tier)}-TIER // ${escapeHtml(exhibit.archetype)}`;
    const isMutated = !!exhibit.isMutated;
    const isLowConfidence = exhibit.projects?.[0]?.status === 'Inferred Mutation';

    const statusBadge = isMutated
      ? (isLowConfidence
          ? '<span class="inspect-badge inspect-badge-inferred">▲ INFERRED MUTATION</span>'
          : '<span class="inspect-badge inspect-badge-inferred">★ SYNTHESIZED MUTATION</span>')
      : '<span class="inspect-badge">● CANONICAL STATUS</span>';

    const projectListHtml = exhibit.projects.map(proj => `
      <div style="font-size:10px;margin-top:2px;">
        <strong>${escapeHtml(proj.name)}</strong> (${escapeHtml(proj.id)}) &mdash; <em>${escapeHtml(proj.kind || 'Component')}</em>
      </div>
    `).join('');

    this.inspectCard.innerHTML = `
      <button id="inspect-close-btn" style="float:right;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;">✕</button>
      <div class="inspect-badge-row">
        <span class="inspect-badge">${badgeText}</span>
        ${statusBadge}
      </div>
      <h2>${escapeHtml(exhibit.title)}</h2>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px 0;">${escapeHtml(exhibit.copy.subtitle || '')}</p>

      <div class="inspect-section">
        <strong>Plaque:</strong> ${escapeHtml(exhibit.copy.plaque)}
      </div>

      <div class="inspect-section">
        <strong>Problem &amp; Resolution:</strong> ${escapeHtml(exhibit.copy.problem || 'N/A')} &mdash; <em>${escapeHtml(exhibit.copy.made || 'N/A')}</em>
      </div>

      <div class="inspect-section">
        <strong>Represented Projects (${exhibit.projectIds.length}):</strong>
        ${projectListHtml}
      </div>

      <div class="inspect-section">
        <strong>Architectural Placement Reason:</strong>
        Placed in ${escapeHtml(exhibit.wing.toUpperCase())} region via semantic similarity affinity.
        <em>"${escapeHtml(p.lesson || 'Preserve structural boundaries.')}"</em>
      </div>

      <div class="inspect-section" id="inspect-connections-section">
        <strong>Direct Causal Relational Links:</strong>
        <div class="inspect-links-grid" id="inspect-links-container"></div>
      </div>

      <div class="inspect-section" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
        <button class="btn" id="speak-lore-btn">🔊 Listen (TTS)</button>
        <button class="btn btn-secondary" id="trace-btn">Trace to Machine ↓</button>
      </div>

      <div id="trace-container"></div>
    `;

    this.inspectCard.querySelector('#inspect-close-btn')?.addEventListener('click', () => {
      this.hideInspect();
    });

    this.inspectCard.querySelector('#speak-lore-btn')?.addEventListener('click', () => {
      if (this.activeExhibit && this.events.onSpeakLore) {
        this.events.onSpeakLore(this.activeExhibit.title, this.activeExhibit.copy.plaque);
      }
    });

    this.inspectCard.querySelector('#trace-btn')?.addEventListener('click', () => {
      if (this.activeExhibit && this.events.onTraceToMachine) {
        this.events.onTraceToMachine(this.activeExhibit);
      }
    });
  }

  public renderCausalTrace(steps: CausalTraceStep[]): void {
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

  public showSanctuaryInspect(s: DexterSanctuaryData): void {
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

  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          this.showToast('Fullscreen mode unavailable.', 'warning');
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  public toggleCinematic(force?: boolean): void {
    this.isCinematic = typeof force === 'boolean' ? force : !this.isCinematic;
    if (this.isCinematic) {
      this.root.classList.add('hud-hidden');
      this.showToast('Cinematic View active. Press [H] to restore HUD.', 'info');
    } else {
      this.root.classList.remove('hud-hidden');
    }
  }

  public hideInspect(): void {
    this.inspectCard.style.display = 'none';
    this.activeExhibit = null;
  }
}
