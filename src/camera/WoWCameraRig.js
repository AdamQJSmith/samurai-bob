export class WoWCameraRig {
  constructor(camera, target, opts = {}) {
    this.cam = camera;
    this.target = target; // THREE.Object3D the camera follows

    // Spherical orbit state
    this.yaw = opts.yaw ?? 0;            // around Y
    this.pitch = opts.pitch ?? 0.3;      // up-down
    this.minPitch = (opts.minPitchDeg ?? -15) * Math.PI / 180;
    this.maxPitch = (opts.maxPitchDeg ?? 50) * Math.PI / 180;

    this.dist = opts.dist ?? 14;
    this.minDist = opts.minDist ?? 6.0;
    this.maxDist = opts.maxDist ?? 25.0;

    this.rotateSpeed = opts.rotateSpeed ?? 0.0025;
    this.zoomSpeed = opts.zoomSpeed ?? 0.0015;

    this.locked = false;

    // Smoothing
    this.currentPos = new THREE.Vector3();
    this.smoothTau = opts.smoothTau ?? 0.12; // seconds
    this.tmpQuat = new THREE.Quaternion();
    this.tmpV = new THREE.Vector3();
  }

  setLocked(v) { this.locked = !!v; }
  isLocked() { return this.locked; }

  // Called when both mouse buttons are held and mouse is moved
  handleRotate(dx, dy) {
    if (this.locked) return;
    this.yaw -= dx * this.rotateSpeed;
    const newPitch = this.pitch - dy * this.rotateSpeed;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, newPitch));
  }

  // Mouse wheel
  handleWheel(deltaY) {
    if (this.locked) return;
    const newDist = this.dist + deltaY * this.zoomSpeed * this.dist;
    this.dist = Math.max(this.minDist, Math.min(this.maxDist, newDist));
  }

  // Expose yaw so movement can be camera-relative
  getCameraYaw() { return this.yaw; }

  update(dt) {
    // Desired position in spherical around target
    const q = this.tmpQuat.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const offset = this.tmpV.set(0, 2.5, this.dist).applyQuaternion(q);
    const desired = this.target.position.clone().add(offset);

    // Exponential smoothing
    const a = 1 - Math.exp(-dt / this.smoothTau);
    this.currentPos.lerp(desired, a);

    this.cam.position.copy(this.currentPos);
    this.cam.lookAt(this.target.position.clone().add(new THREE.Vector3(0, 2.5, 0)));
  }
}

