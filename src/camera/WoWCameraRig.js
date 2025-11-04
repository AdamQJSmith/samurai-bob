export class WoWCameraRig {
  constructor(camera, target, opts = {}) {
    this.cam = camera;
    this.target = target;

    this.yaw = opts.yaw ?? 0;
    this.pitch = opts.pitch ?? 0.2;

    this.eyeHeight = opts.eyeHeight ?? 1.35; // not rotated by pitch
    this.minPitch = (opts.minPitchDeg ?? -15) * Math.PI / 180;
    this.maxPitch = (opts.maxPitchDeg ?? 45) * Math.PI / 180;

    this.dist = opts.dist ?? 4.0;
    this.minDist = opts.minDist ?? 2.2;
    this.maxDist = opts.maxDist ?? 8.0;

    this.rotateSpeed = opts.rotateSpeed ?? 0.0025;
    this.zoomSpeed   = opts.zoomSpeed   ?? 0.0015;

    this.smoothTau = opts.smoothTau ?? 0.16;
    this.locked = false;

    this._cur = new THREE.Vector3();
    this._q   = new THREE.Quaternion();
    this._off = new THREE.Vector3();
  }

  setLocked(v) { this.locked = !!v; }
  isLocked()   { return this.locked; }

  handleRotate(dx, dy) {
    if (this.locked) return;
    this.yaw   -= dx * this.rotateSpeed;
    const newPitch = this.pitch - dy * this.rotateSpeed;
    this.pitch  = Math.max(this.minPitch, Math.min(this.maxPitch, newPitch));
  }

  handleWheel(dy) {
    if (this.locked) return;
    const k = Math.sign(dy) * Math.min(Math.abs(dy), 200);
    const newDist = this.dist + k * this.zoomSpeed;
    this.dist = Math.max(this.minDist, Math.min(this.maxDist, newDist));
  }

  getCameraYaw() { return this.yaw; }

  _lookAt() {
    // slight downward aim to center the character
    return this.target.position.clone().add(new THREE.Vector3(0, this.eyeHeight - 0.45, 0));
  }

  _desired() {
    // base eye height that does not rotate
    const base = this.target.position.clone().add(new THREE.Vector3(0, this.eyeHeight, 0));
    // orbit offset that *does* rotate
    this._q.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this._off.set(0, 0, this.dist).applyQuaternion(this._q);
    return base.add(this._off);
  }

  snapNow() {
    const p = this._desired();
    this._cur.copy(p);
    this.cam.position.copy(p);
    this.cam.lookAt(this._lookAt());
  }

  update(dt) {
    const desired = this._desired();
    const a = 1 - Math.exp(-dt / this.smoothTau);
    this._cur.lerp(desired, a);
    this.cam.position.copy(this._cur);
    this.cam.lookAt(this._lookAt());
  }
}

