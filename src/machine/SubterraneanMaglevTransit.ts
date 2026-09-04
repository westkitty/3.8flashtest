import * as THREE from 'three';

export class SubterraneanMaglevTransit {
  public group = new THREE.Group();
  public trainMesh!: THREE.Group;
  public trackCurve!: THREE.CatmullRomCurve3;
  public trackMesh!: THREE.Mesh;

  public progress = 0.0;
  public speed = 0.08; // loops track every ~12.5 seconds
  public isBoarded = false;

  constructor() {
    this.buildTrackAndTrain();
  }

  private buildTrackAndTrain() {
    // 3D winding loop through subterranean machine city
    const trackPoints = [
      new THREE.Vector3(-45, -34, -45),
      new THREE.Vector3(0, -32, -60),
      new THREE.Vector3(50, -35, -30),
      new THREE.Vector3(60, -30, 20),
      new THREE.Vector3(15, -36, 50),
      new THREE.Vector3(-40, -33, 30),
      new THREE.Vector3(-60, -35, -10)
    ];

    this.trackCurve = new THREE.CatmullRomCurve3(trackPoints, true); // Closed loop
    const trackGeo = new THREE.TubeGeometry(this.trackCurve, 80, 0.6, 8, true);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.3
    });
    this.trackMesh = new THREE.Mesh(trackGeo, trackMat);
    this.group.add(this.trackMesh);

    // Glowing Neon Guide Rail
    const railMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const railGeo = new THREE.TubeGeometry(this.trackCurve, 80, 0.15, 6, true);
    const railMesh = new THREE.Mesh(railGeo, railMat);
    this.group.add(railMesh);

    // Aerodynamic Maglev Pod Train
    this.trainMesh = new THREE.Group();
    this.trainMesh.name = 'subterranean_maglev_train';

    const podBodyGeo = new THREE.BoxGeometry(3.5, 1.8, 7);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6
    });
    const podBody = new THREE.Mesh(podBodyGeo, podMat);
    this.trainMesh.add(podBody);

    // Glowing Cockpit Canopy
    const canopyGeo = new THREE.BoxGeometry(2.8, 1.0, 3.5);
    const canopyMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.8, 0.5);
    this.trainMesh.add(canopy);

    // Train Headlights
    const headlightGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
    hlLeft.position.set(-1.2, 0, 3.5);
    const hlRight = new THREE.Mesh(headlightGeo, headlightMat);
    hlRight.position.set(1.2, 0, 3.5);
    this.trainMesh.add(hlLeft);
    this.trainMesh.add(hlRight);

    this.group.add(this.trainMesh);
  }

  public update(delta: number) {
    this.progress = (this.progress + delta * this.speed) % 1.0;

    const pos = this.trackCurve.getPointAt(this.progress);
    const nextPos = this.trackCurve.getPointAt((this.progress + 0.01) % 1.0);

    this.trainMesh.position.copy(pos);
    this.trainMesh.lookAt(nextPos);
  }

  public getPassengerCameraPosition(): THREE.Vector3 {
    return this.trainMesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  }

  public toggleBoarding(): boolean {
    this.isBoarded = !this.isBoarded;
    return this.isBoarded;
  }
}
