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
  public events: PlayerEvents = {};

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.camera.position.copy(this.position);

    this.bindEvents();
  }

  private bindEvents() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      // Clamp pitch to avoid gimbal flipping
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    });

    window.addEventListener('keydown', (e) => {
      this.handleKey(e.code, true);
      if (e.code === 'KeyE') {
        this.events.onInteract?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });
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
      const dir = new THREE.Vector3().subVectors(lookAtTarget, pos).normalize();
      this.yaw = Math.atan2(-dir.x, -dir.z);
      this.pitch = Math.asin(dir.y);
    }
  }

  public update(dt: number, groundHeightFn?: (x: number, z: number) => number) {
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      this.isFreeFlight ? Math.sin(this.pitch) : 0,
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();

    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    if (this.isFreeFlight) {
      if (this.keys.up) moveDir.y += 1;
      if (this.keys.down) moveDir.y -= 1;
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    const baseSpeed = this.isFreeFlight ? 38 : 12;
    const speed = baseSpeed * (this.keys.sprint ? 2.2 : 1.0);

    // Friction and acceleration
    const damping = Math.exp(-8 * dt);
    this.velocity.multiplyScalar(damping);
    this.velocity.addScaledVector(moveDir, speed * (1 - damping));

    this.position.addScaledVector(this.velocity, dt);

    if (!this.isFreeFlight && groundHeightFn) {
      const targetY = groundHeightFn(this.position.x, this.position.z) + 2.2;
      // Smooth vertical lerp (climbing slopes, descending ramps)
      this.position.y += (targetY - this.position.y) * Math.min(1, 10 * dt);
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
