import * as THREE from 'three';

export interface PlayerEvents {
  onMove?: (velocity: number) => void;
  onInteract?: () => void;
}

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public isLocked = false;
  public position = new THREE.Vector3(0, 3, 25);
  public velocity = new THREE.Vector3();

  // Camera Euler angles
  public pitch = 0;
  public yaw = 0;

  // Key states
  private keys: Record<string, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    up: false,
    down: false
  };

  public isFreeFlight = false;
  public isSubterranean = false;
  public events: PlayerEvents = {};

  // Reusable scratch vectors to avoid hot-loop GC allocations
  private scratchForward = new THREE.Vector3();
  private scratchRight = new THREE.Vector3();
  private scratchMoveDir = new THREE.Vector3();
  private scratchDir = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.camera.position.copy(this.position);

    this.bindEvents();
  }

  private isTypingTarget(e: Event): boolean {
    const target = e.target as HTMLElement | null;
    return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  }

  private bindEvents() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        try {
          this.domElement.requestPointerLock?.();
        } catch {
          // Graceful fallback when pointer lock is unavailable or rejected
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    let touchStartX = 0;
    let touchStartY = 0;

    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        const touchSensitivity = 0.0035;
        this.yaw -= dx * touchSensitivity;
        this.pitch -= dy * touchSensitivity;
        this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
      }
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      // Clamp pitch to avoid gimbal flipping
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    });

    window.addEventListener('keydown', (e) => {
      if (this.isTypingTarget(e)) return;
      this.handleKey(e.code, true);
      if (e.code === 'KeyE') {
        this.events.onInteract?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.isTypingTarget(e)) {
        this.resetKeys();
        return;
      }
      this.handleKey(e.code, false);
    });
  }

  public resetKeys(): void {
    for (const k of Object.keys(this.keys)) {
      this.keys[k] = false;
    }
  }

  private handleKey(code: string, pressed: boolean) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = pressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = pressed;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = pressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = pressed;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = pressed;
        break;
      case 'Space':
        this.keys.up = pressed;
        break;
      case 'KeyC':
        this.keys.down = pressed;
        break;
    }
  }

  public teleport(pos: THREE.Vector3, lookAtTarget?: THREE.Vector3) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.position);
    if (lookAtTarget) {
      this.scratchDir.subVectors(lookAtTarget, pos).normalize();
      this.yaw = Math.atan2(-this.scratchDir.x, -this.scratchDir.z);
      this.pitch = Math.asin(this.scratchDir.y);
    }
  }

  public update(dt: number, groundHeightFn?: (x: number, z: number) => number) {
    this.scratchForward.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      this.isFreeFlight ? Math.sin(this.pitch) : 0,
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    this.scratchRight.set(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();

    this.scratchMoveDir.set(0, 0, 0);
    if (this.keys.forward) this.scratchMoveDir.add(this.scratchForward);
    if (this.keys.backward) this.scratchMoveDir.sub(this.scratchForward);
    if (this.keys.right) this.scratchMoveDir.add(this.scratchRight);
    if (this.keys.left) this.scratchMoveDir.sub(this.scratchRight);

    if (this.isFreeFlight) {
      if (this.keys.up) this.scratchMoveDir.y += 1;
      if (this.keys.down) this.scratchMoveDir.y -= 1;
    }

    if (this.scratchMoveDir.lengthSq() > 0) {
      this.scratchMoveDir.normalize();
    }

    const baseSpeed = this.isFreeFlight ? 38 : 12;
    const speed = baseSpeed * (this.keys.sprint ? 2.2 : 1.0);

    // Friction and acceleration
    const damping = Math.exp(-8 * dt);
    this.velocity.multiplyScalar(damping);
    this.velocity.addScaledVector(this.scratchMoveDir, speed * (1 - damping));

    this.position.addScaledVector(this.velocity, dt);

    if (!this.isFreeFlight && groundHeightFn) {
      if (this.isSubterranean) {
        // Subterranean machine cavern floor at -46; player standing boundary at -43.8
        const cavernFloor = -43.8;
        if (this.position.y < cavernFloor) {
          this.position.y = cavernFloor;
        }
      } else {
        const targetY = groundHeightFn(this.position.x, this.position.z) + 2.2;
        // Smooth vertical lerp (climbing slopes, descending ramps)
        this.position.y += (targetY - this.position.y) * Math.min(1, 10 * dt);
      }
    }

    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);

    const speedVal = this.velocity.length();
    if (speedVal > 0.1 && this.events.onMove) {
      this.events.onMove(speedVal);
    }
  }
}
