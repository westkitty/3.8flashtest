import type { AppMode } from '../types';

export interface ModeTransitionContext {
  onStopTour?: () => void;
  onStartTour?: () => void;
  onAscendSurface?: () => void;
  onDescendMachine?: () => void;
  onEnableConnections?: () => void;
  onDisableConnections?: () => void;
  onResetLabModifiers?: () => void;
}

export type ModeChangeListener = (newMode: AppMode, prevMode: AppMode) => void;

export class ModeManager {
  private _currentMode: AppMode = 'surface';
  private listeners: ModeChangeListener[] = [];
  private context: ModeTransitionContext = {};

  constructor(context?: ModeTransitionContext) {
    if (context) {
      this.context = context;
    }
  }

  public get currentMode(): AppMode {
    return this._currentMode;
  }

  public getMode(): AppMode {
    return this._currentMode;
  }

  public transitionTo(targetMode: AppMode, _reason?: string): boolean {
    return this.setMode(targetMode);
  }

  public setContext(context: ModeTransitionContext): void {
    this.context = context;
  }

  public addListener(listener: ModeChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public setMode(targetMode: AppMode): boolean {
    if (this._currentMode === targetMode) {
      return false;
    }

    const prevMode = this._currentMode;

    // Clean up previous mode state
    this.cleanupMode(prevMode, targetMode);

    // Apply new mode state
    this.applyMode(targetMode, prevMode);

    this._currentMode = targetMode;

    // Notify listeners
    for (const listener of this.listeners) {
      listener(targetMode, prevMode);
    }

    return true;
  }

  private cleanupMode(from: AppMode, to: AppMode): void {
    if (from === 'tour') {
      this.context.onStopTour?.();
    }
    if (from === 'connections' && to !== 'connections') {
      this.context.onDisableConnections?.();
    }
    if (from === 'lab' && to !== 'lab') {
      this.context.onResetLabModifiers?.();
    }
  }

  private applyMode(to: AppMode, _from: AppMode): void {
    // Deterministic mutual exclusion
    switch (to) {
      case 'surface':
        this.context.onDisableConnections?.();
        this.context.onStopTour?.();
        this.context.onResetLabModifiers?.();
        this.context.onAscendSurface?.();
        break;

      case 'connections':
        this.context.onStopTour?.();
        this.context.onResetLabModifiers?.();
        this.context.onEnableConnections?.();
        break;

      case 'machine':
        this.context.onDisableConnections?.();
        this.context.onStopTour?.();
        this.context.onResetLabModifiers?.();
        this.context.onDescendMachine?.();
        break;

      case 'tour':
        this.context.onDisableConnections?.();
        this.context.onResetLabModifiers?.();
        this.context.onStartTour?.();
        break;

      case 'mutation-preview':
        // Speculative preview mode — preserves current position but disables conflicting inputs
        break;

      case 'lab':
        // Opens lab controls surface
        break;
    }
  }
}
