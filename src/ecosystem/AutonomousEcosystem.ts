import * as THREE from 'three';
import type { SemanticExhibit } from '../types';

export interface ArchaeologistDrone {
  mesh: THREE.Group;
  scannerCone: THREE.Mesh;
  targetPos: THREE.Vector3;
  state: 'patrol' | 'scan' | 'dwell';
  timer: number;
}

export class AutonomousEcosystem {
  public group = new THREE.Group();
  private drones: ArchaeologistDrone[] = [];
  private mantaRays: THREE.Group[] = [];
  private firefliesMesh!: THREE.Points;
  private fireflyPositions!: Float32Array;

  // Director Mode
  public isDirectorActive = false;
  public directorSpline!: THREE.CatmullRomCurve3;
  public directorProgress = 0.0;

  constructor(exhibits: SemanticExhibit[]) {
    this.buildArchaeologistDrones(exhibits);
    this.buildCelestialMantaRays();
    this.buildCyberFireflies();
    this.buildDirectorSpline(exhibits);
  }

  private buildArchaeologistDrones(exhibits: SemanticExhibit[]) {
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });

    // Create 4 autonomous scholar drones
    for (let i = 0; i < 4; i++) {
      const drone = new THREE.Group();
      drone.name = `code_archaeologist_drone_${i}`;

      // Floating rhombic torso
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), droneMat);
      drone.add(body);

      // Glowing optic sensor
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), eyeMat);
      eye.position.set(0, 0, 0.9);
      drone.add(eye);

      // Holographic scanning cone
      const coneGeo = new THREE.ConeGeometry(2.5, 6.0, 16, 1, true);
      coneGeo.rotateX(-Math.PI / 2);
      coneGeo.translate(0, 0, 3.0);
      const scanner = new THREE.Mesh(coneGeo, coneMat);
      scanner.visible = false;
      drone.add(scanner);

      const target = exhibits[i * 7]?.position || [0, 4, 0];
      const initialPos = new THREE.Vector3(target[0] + (Math.random() - 0.5) * 20, 6, target[2] + (Math.random() - 0.5) * 20);
      drone.position.copy(initialPos);

      this.group.add(drone);
      this.drones.push({
        mesh: drone,
        scannerCone: scanner,
        targetPos: new THREE.Vector3(target[0], 5, target[2]),
        state: 'patrol',
        timer: 3 + Math.random() * 4
      });
    }
  }

  private buildCelestialMantaRays() {
    // 2 Grand bioluminescent star-manta rays cruising upper atmosphere (Y = 85..110)
    for (let i = 0; i < 2; i++) {
      const manta = new THREE.Group();
      manta.name = `celestial_manta_ray_${i}`;

      const mantaShape = new THREE.Shape();
      mantaShape.moveTo(0, 6);
      mantaShape.lineTo(-12, -2);
      mantaShape.lineTo(-4, -6);
      mantaShape.lineTo(0, -10);
      mantaShape.lineTo(4, -6);
      mantaShape.lineTo(12, -2);
      mantaShape.closePath();

      const mantaGeo = new THREE.ShapeGeometry(mantaShape);
      const mantaMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.8,
        roughness: 0.1,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide
      });

      const mantaMesh = new THREE.Mesh(mantaGeo, mantaMat);
      mantaMesh.rotation.x = Math.PI / 2;
      manta.add(mantaMesh);

      // Trailing tail
      const tailGeo = new THREE.CylinderGeometry(0.1, 0.4, 18, 8);
      const tailMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, 0, 9);
      tail.rotation.x = Math.PI / 2;
      manta.add(tail);

      manta.position.set(i === 0 ? 80 : -80, 95 + i * 15, i === 0 ? -60 : 60);
      this.group.add(manta);
      this.mantaRays.push(manta);
    }
  }

  private buildCyberFireflies() {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    this.fireflyPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.fireflyPositions[i * 3] = (Math.random() - 0.5) * 260;
      this.fireflyPositions[i * 3 + 1] = 2 + Math.random() * 20;
      this.fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 260;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.fireflyPositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.firefliesMesh = new THREE.Points(geo, mat);
    this.group.add(this.firefliesMesh);
  }

  private buildDirectorSpline(exhibits: SemanticExhibit[]) {
    const waypoints: THREE.Vector3[] = [];
    for (let i = 0; i < exhibits.length; i += 4) {
      const p = exhibits[i].position;
      waypoints.push(new THREE.Vector3(p[0] * 0.85, 14, p[2] * 0.85));
    }
    // High orbital overlook waypoint
    waypoints.push(new THREE.Vector3(0, 75, 90));
    // Subterranean transition waypoint
    waypoints.push(new THREE.Vector3(0, -25, 0));

    this.directorSpline = new THREE.CatmullRomCurve3(waypoints, true);
  }

  public toggleDirectorMode(): boolean {
    this.isDirectorActive = !this.isDirectorActive;
    return this.isDirectorActive;
  }

  public speakMonumentLore(title: string, summary: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${title}. ${summary}`);
    utterance.pitch = 0.95;
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  public update(delta: number, time: number) {
    // 1. Drones behavior trees
    for (const d of this.drones) {
      d.timer -= delta;
      d.mesh.position.y += Math.sin(time * 3.0) * 0.015; // Hover bob

      if (d.state === 'patrol') {
        const dir = new THREE.Vector3().subVectors(d.targetPos, d.mesh.position);
        if (dir.length() > 1.5) {
          dir.normalize();
          d.mesh.position.addScaledVector(dir, delta * 6.0);
          d.mesh.lookAt(d.targetPos);
        } else {
          d.state = 'scan';
          d.scannerCone.visible = true;
          d.timer = 4.0;
        }
      } else if (d.state === 'scan') {
        d.mesh.rotation.y += delta * 0.8;
        if (d.timer <= 0) {
          d.scannerCone.visible = false;
          d.state = 'dwell';
          d.timer = 2.0;
        }
      } else if (d.state === 'dwell') {
        if (d.timer <= 0) {
          d.state = 'patrol';
          d.targetPos.set((Math.random() - 0.5) * 160, 5 + Math.random() * 5, (Math.random() - 0.5) * 160);
          d.timer = 6.0;
        }
      }
    }

    // 2. Manta Rays soaring in wide celestial circles
    for (let i = 0; i < this.mantaRays.length; i++) {
      const m = this.mantaRays[i];
      const speed = 0.12 * (i === 0 ? 1 : -1);
      const angle = time * speed + i * Math.PI;
      const radius = 120 + i * 20;

      m.position.x = Math.cos(angle) * radius;
      m.position.z = Math.sin(angle) * radius;
      m.position.y = 95 + Math.sin(time * 0.8 + i) * 8;
      m.lookAt(Math.cos(angle + 0.1) * radius, m.position.y, Math.sin(angle + 0.1) * radius);
    }

    // 3. Fireflies drift
    const posArr = this.fireflyPositions;
    for (let i = 0; i < posArr.length / 3; i++) {
      posArr[i * 3 + 1] += Math.sin(time * 1.5 + i) * 0.04;
    }
    (this.firefliesMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // 4. Director Mode Camera Path
    if (this.isDirectorActive) {
      this.directorProgress = (this.directorProgress + delta * 0.02) % 1.0;
    }
  }

  public getDirectorCameraPose(): { pos: THREE.Vector3; lookAt: THREE.Vector3 } {
    const pos = this.directorSpline.getPointAt(this.directorProgress);
    const lookAt = this.directorSpline.getPointAt((this.directorProgress + 0.03) % 1.0);
    return { pos, lookAt };
  }
}
