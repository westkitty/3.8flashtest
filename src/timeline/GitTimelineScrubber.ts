export interface GitCommitSnapshot {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  activeExhibitCount: number;
}

export class GitTimelineScrubber {
  public commits: GitCommitSnapshot[] = [
    { hash: 'e01a001', message: 'Initial commit: primordial spatial coordinate plane & seed foundations', author: 'Andrew', timestamp: '2026-08-15', activeExhibitCount: 8 },
    { hash: 'b14c004', message: 'feat: erect North Wing spires and compiler cathedral arches', author: 'Andrew', timestamp: '2026-08-22', activeExhibitCount: 16 },
    { hash: 'd38e009', message: 'feat: excavate subterranean machine city AST substrate', author: 'Andrew', timestamp: '2026-08-28', activeExhibitCount: 24 },
    { hash: '9c8fbf1', message: 'fix: close final mnemonic world bug sweep & establish canonical invariants', author: 'Andrew', timestamp: '2026-09-02', activeExhibitCount: 32 },
    { hash: '07d50d6', message: 'feat: bright lighting, reactive shadows, contained cosmos plane & parallax starfield', author: 'Andrew', timestamp: '2026-09-03', activeExhibitCount: 35 },
    { hash: 'edf4718', message: 'feat: full screen mode, cinematic HUD toggle, and responsive canvas sizing', author: 'Andrew', timestamp: '2026-09-04', activeExhibitCount: 35 }
  ];

  public currentIndex = 5; // Default to HEAD

  public scrubToCommit(index: number): GitCommitSnapshot {
    this.currentIndex = Math.max(0, Math.min(this.commits.length - 1, index));
    return this.commits[this.currentIndex];
  }

  public getCommit(index: number): GitCommitSnapshot {
    return this.commits[index] || this.commits[this.commits.length - 1];
  }
}
