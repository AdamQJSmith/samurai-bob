// ===== WOW CAMERA RIG (Inlined) =====
class WoWCameraRig {
  constructor(camera, target, opts = {}) {
    this.cam = camera;
    this.target = target;

    this.yaw = opts.yaw ?? 0;
    this.pitch = opts.pitch ?? 0.2;

    this.eyeHeight = opts.eyeHeight ?? 1.35;
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
    return this.target.position.clone().add(new THREE.Vector3(0, this.eyeHeight - 0.45, 0));
  }

  _desired() {
    const base = this.target.position.clone().add(new THREE.Vector3(0, this.eyeHeight, 0));
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

// ===== CONTROLS (Inlined) =====
class Controls {
  constructor(canvas, { onRotate, onWheel, onAttack, onBlock }) {
    this.canvas = canvas;
    this.onRotate = onRotate;
    this.onWheel  = onWheel;
    this.onAttack = onAttack;
    this.onBlock  = onBlock;

    this.leftDown = false;
    this.rightDown = false;
    this.orbiting = false;

    this.keys = new Set();
    this.jumpPressed = false;
    this.jumpHeld = false;

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    const enterOrbit = () => {
      if (this.orbiting) return;
      this.canvas.requestPointerLock?.();
      this.orbiting = true;
    };
    const exitOrbit = () => {
      if (!this.orbiting) return;
      document.exitPointerLock?.();
      this.orbiting = false;
    };

    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) this.leftDown  = true;
      if (e.button === 2) this.rightDown = true;

      const both = this.leftDown && this.rightDown;
      if (both) {
        enterOrbit();
        return;
      }

      if (!this.orbiting) {
        if (e.button === 0 && this.onAttack) this.onAttack();
        if (e.button === 2 && this.onBlock)  this.onBlock(true);
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.leftDown  = false;
      if (e.button === 2) {
        this.rightDown = false;
        this.onBlock?.(false);
      }
      if (!(this.leftDown && this.rightDown)) exitOrbit();
    });

    window.addEventListener('mousemove', e => {
      if (this.orbiting) this.onRotate?.(e.movementX ?? 0, e.movementY ?? 0);
    });

    canvas.addEventListener('wheel', e => this.onWheel?.(e.deltaY), { passive: true });

    window.addEventListener('blur', () => { this.leftDown = this.rightDown = false; exitOrbit(); });
    canvas.addEventListener('mouseleave', () => { this.leftDown = this.rightDown = false; exitOrbit(); });

    window.addEventListener('keydown', e => {
      if (['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'Space') { this.jumpPressed = true; this.jumpHeld = true; }
      if (e.code === 'ShiftLeft') this.onBlock?.(true);
    }, { passive:false });

    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.jumpHeld = false;
      if (e.code === 'ShiftLeft') this.onBlock?.(false);
    });
  }

  readAxes() {
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const z = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    return { x, z };
  }

  consumeJumpEdge() {
    const pressed = this.jumpPressed;
    this.jumpPressed = false;
    return { jumpPressed: pressed, jumpHeld: this.jumpHeld };
  }
}

// ===== PLAYER CONTROLLER (Inlined) =====
class PlayerController {
  constructor(root, collisionMeshes, getCameraYaw) {
    this.root = root;
    this.col = collisionMeshes;
    this.getCameraYaw = getCameraYaw;
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.ray = new THREE.Raycaster();

    this.maxSpeed = 7.0;
    this.accel = 20.0;
    this.airAccel = 6.0;
    this.friction = 12.0;
    this.gravity = 25.0;
    this.jumpSpeed = 6.5;
    this.stepHeight = 0.35;
    this.slopeLimit = 37 * Math.PI / 180;

    this.coyoteTime = 0.08;
    this.bufferTime = 0.10;
    this.timeSinceUngrounded = 999;
    this.timeSinceJumpPress = 999;

    this.input = new THREE.Vector3();
    this.raw = new THREE.Vector3();
    this.jumpHeld = false;

    this.jumpChain = 0;
    this.timeSinceLastJump = 1;

    this.isAttacking = false;
    this.attackCooldown = 0;

    this.health = 100;
    this.maxHealth = 100;
    this.speedMult = 1.0;
    this.powerMult = 1.0;
  }

  setInput(ix, iz, jumpPressed, jumpHeld, camYaw, dt) {
    this.camYaw = camYaw;
    
    const a = 1 - Math.exp(-dt / 0.06);
    this.raw.set(ix, 0, iz);
    if (this.raw.lengthSq() > 1) this.raw.normalize();
    this.input.lerp(this.raw, a);

    if (jumpPressed) this.timeSinceJumpPress = 0;
    this.jumpHeld = jumpHeld;
  }

  update(dt) {
    this.timeSinceJumpPress += dt;
    this.timeSinceUngrounded += dt;
    this.timeSinceLastJump += dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    this.vel.y -= this.gravity * dt;

    const origin = this.root.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    this.ray.set(origin, new THREE.Vector3(0, -1, 0));
    const hits = this.ray.intersectObjects(this.col, true);
    const hit = hits.find(h => h.distance <= 0.65);
    
    this.onGround = !!hit;
    
    if (this.onGround) {
      this.timeSinceUngrounded = 0;
      this.groundNormal.copy(hit.face.normal);
      const desiredY = hit.point.y + 0.01;
      
      if (this.root.position.y - desiredY < this.stepHeight) {
        this.root.position.y = desiredY;
        if (this.vel.y < 0) this.vel.y = 0;
      }
    }

    if (!this.onGround && !this.jumpHeld && this.vel.y > 0) {
      this.vel.y *= 0.6;
    }

    if ((this.onGround || this.timeSinceUngrounded < this.coyoteTime) && this.timeSinceJumpPress < this.bufferTime) {
      let jumpPower = this.jumpSpeed;
      
      if (this.timeSinceLastJump < 0.35 && this.jumpChain === 2) {
        jumpPower *= 1.25;
      }
      
      this.vel.y = jumpPower;
      this.timeSinceLastJump = 0;
      this.jumpChain = Math.min(2, this.jumpChain + 1);
      this.timeSinceJumpPress = 999;
    }

    if (this.onGround && this.timeSinceLastJump > 0.5) {
      this.jumpChain = 0;
    }

    const yaw = this.camYaw ?? 0;
    const inputWorld = new THREE.Vector3(
      Math.sin(yaw) * this.input.z + Math.cos(yaw) * this.input.x,
      0,
      Math.cos(yaw) * this.input.z - Math.sin(yaw) * this.input.x
    );
    
    let horiz = new THREE.Vector3(this.vel.x, 0, this.vel.z);

    if (this.onGround) {
      const upDot = this.groundNormal.dot(new THREE.Vector3(0, 1, 0));
      const clampedDot = Math.max(-1, Math.min(1, upDot));
      const slope = Math.acos(clampedDot);
      const canClimb = slope <= this.slopeLimit;

      if (this.input.lengthSq() > 1e-4 && canClimb) {
        const desired = inputWorld.clone().normalize().multiplyScalar(this.maxSpeed * this.speedMult);
        const delta = desired.clone().sub(horiz);
        const add = Math.min(delta.length(), this.accel * dt);
        if (delta.lengthSq() > 1e-6) {
          delta.setLength(add);
          horiz.add(delta);
        }
      } else {
        const speed = Math.max(0, horiz.length() - this.friction * dt);
        if (horiz.lengthSq() > 1e-6) horiz.setLength(speed);
      }

      if (slope > this.slopeLimit) {
        const slideDir = this.groundNormal.clone().projectOnPlane(new THREE.Vector3(0, 1, 0)).normalize().negate();
        horiz.lerp(slideDir.multiplyScalar(4.0), 0.2);
      }
    } else {
      if (this.input.lengthSq() > 1e-4) {
        horiz.add(inputWorld.clone().normalize().multiplyScalar(this.airAccel * dt));
        const cap = this.maxSpeed * this.speedMult * 0.8;
        if (horiz.length() > cap) horiz.setLength(cap);
      }
    }

    this.vel.x = horiz.x;
    this.vel.z = horiz.z;

    this.root.position.addScaledVector(this.vel, dt);

    if (horiz.lengthSq() > 0.01) {
      const targetYaw = Math.atan2(horiz.x, horiz.z);
      const cur = this.root.rotation.y;
      const delta = ((targetYaw - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
      const maxStep = (540 * Math.PI / 180) * dt;
      const clampedDelta = Math.max(-maxStep, Math.min(maxStep, delta));
      this.root.rotation.y = cur + clampedDelta;
    }
  }

  getAttackHitbox() {
    if (!this.isAttacking || this.attackCooldown > 0.3) return null;
    
    const forward = new THREE.Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    return {
      position: this.root.position.clone(),
      direction: forward,
      range: 5,
      angle: Math.PI / 3,
      damage: 25 * this.powerMult
    };
  }
}

// ===== GAME STATE =====
let gameState = 'title';
let scene, camera, renderer;
let player, playerController, cameraRig, controls;
let enemies = [], particles = [];
let clock, accumulator = 0;
const FIXED_DT = 1 / 60;

let playerStats = {
    kills: 0,
    score: 0
};

let gameTimer = 0;
let enemySpawnTimer = 0;
let enemySpawnRate = 120;

const TEXTURES = {
    toonGradient: null,
    face: null,
    shield: null,
    grassTop: null,
    grassSide: null,
    water: null
};

const ARENA_RADIUS = 17;
const ARENA_HEIGHT = 1.6;

// ===== TEXTURE FUNCTIONS =====
function createGradientTexture(stops) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 1);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
}

function getToonGradient() {
    if (!TEXTURES.toonGradient) {
        TEXTURES.toonGradient = createGradientTexture([
            [0.0, '#192b54'],
            [0.2, '#345a9f'],
            [0.5, '#d6e4ff'],
            [1.0, '#ffffff']
        ]);
    }
    return TEXTURES.toonGradient;
}

function getToonMaterial(color) {
    return new THREE.MeshToonMaterial({
        color,
        gradientMap: getToonGradient()
    });
}

function createFaceTexture() {
    if (TEXTURES.face) return TEXTURES.face;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f7c59f';
    ctx.fillRect(0, 0, size, size);

    const cheekGradient = ctx.createRadialGradient(150, 320, 50, 150, 320, 110);
    cheekGradient.addColorStop(0, 'rgba(255,140,160,0.7)');
    cheekGradient.addColorStop(1, 'rgba(255,140,160,0)');
    ctx.fillStyle = cheekGradient;
    ctx.fillRect(0, 240, 220, 160);
    const cheekGradient2 = ctx.createRadialGradient(362, 320, 50, 362, 320, 110);
    cheekGradient2.addColorStop(0, 'rgba(255,140,160,0.7)');
    cheekGradient2.addColorStop(1, 'rgba(255,140,160,0)');
    ctx.fillStyle = cheekGradient2;
    ctx.fillRect(292, 240, 220, 160);

    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.moveTo(120, 140);
    ctx.quadraticCurveTo(170, 110, 220, 140);
    ctx.quadraticCurveTo(200, 132, 180, 132);
    ctx.quadraticCurveTo(160, 132, 120, 140);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(292, 140);
    ctx.quadraticCurveTo(342, 110, 392, 140);
    ctx.quadraticCurveTo(372, 132, 352, 132);
    ctx.quadraticCurveTo(332, 132, 292, 140);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(180, 210, 40, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(332, 210, 40, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(180, 215, 18, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(332, 215, 18, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(120, 320);
    ctx.quadraticCurveTo(256, 380, 392, 320);
    ctx.quadraticCurveTo(332, 360, 256, 360);
    ctx.quadraticCurveTo(180, 360, 120, 320);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    TEXTURES.face = texture;
    return texture;
}

function createShieldTexture() {
    if (TEXTURES.shield) return TEXTURES.shield;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const wood = ctx.createLinearGradient(0, 0, size, size);
    wood.addColorStop(0, '#ab6a2a');
    wood.addColorStop(1, '#8d4f1d');
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#d8cbb3';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#73675a';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f7f5ef';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = size / 2 + Math.cos(angle) * 120;
        const py = size / 2 + Math.sin(angle) * 120;
        ctx.moveTo(size / 2, size / 2);
        ctx.quadraticCurveTo(
            (size / 2 + px) / 2,
            (size / 2 + py) / 2 - 60,
            px,
            py
        );
        ctx.quadraticCurveTo(
            (size / 2 + px) / 2,
            (size / 2 + py) / 2 + 60,
            size / 2,
            size / 2
        );
    }
    ctx.fill();

    ctx.fillStyle = '#d4a047';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 35, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    TEXTURES.shield = texture;
    return texture;
}

function createGrassTextures() {
    if (TEXTURES.grassTop && TEXTURES.grassSide) return;
    const size = 512;
    const canvasTop = document.createElement('canvas');
    canvasTop.width = size;
    canvasTop.height = size;
    const ctxTop = canvasTop.getContext('2d');
    const gradient = ctxTop.createRadialGradient(size / 2, size / 2, size / 6, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#8fe07e');
    gradient.addColorStop(0.5, '#5cc45c');
    gradient.addColorStop(1, '#2f8a3a');
    ctxTop.fillStyle = gradient;
    ctxTop.fillRect(0, 0, size, size);
    TEXTURES.grassTop = new THREE.CanvasTexture(canvasTop);
    TEXTURES.grassTop.wrapS = TEXTURES.grassTop.wrapT = THREE.RepeatWrapping;

    const canvasSide = document.createElement('canvas');
    canvasSide.width = 256;
    canvasSide.height = 512;
    const ctxSide = canvasSide.getContext('2d');
    const dirtGradient = ctxSide.createLinearGradient(0, 0, 0, canvasSide.height);
    dirtGradient.addColorStop(0, '#3a9a46');
    dirtGradient.addColorStop(0.15, '#4f8a3d');
    dirtGradient.addColorStop(0.5, '#a86a3c');
    dirtGradient.addColorStop(1, '#7c4726');
    ctxSide.fillStyle = dirtGradient;
    ctxSide.fillRect(0, 0, canvasSide.width, canvasSide.height);
    TEXTURES.grassSide = new THREE.CanvasTexture(canvasSide);
    TEXTURES.grassSide.wrapS = THREE.RepeatWrapping;
    TEXTURES.grassSide.wrapT = THREE.ClampToEdgeWrapping;
}

function createWaterTexture() {
    if (TEXTURES.water) return TEXTURES.water;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    gradient.addColorStop(0, '#90d7ff');
    gradient.addColorStop(1, '#3a7bd5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    TEXTURES.water = new THREE.CanvasTexture(canvas);
    TEXTURES.water.needsUpdate = true;
    TEXTURES.water.wrapS = TEXTURES.water.wrapT = THREE.RepeatWrapping;
    return TEXTURES.water;
}

// ===== CAPSULE GEOMETRY FALLBACK =====
if (typeof THREE !== 'undefined' && !THREE.CapsuleGeometry) {
    THREE.CapsuleGeometry = class extends THREE.BufferGeometry {
        constructor(radius = 1, length = 1, capSubdivisions = 4, radialSegments = 8) {
            super();
            
            const vertices = [];
            const indices = [];
            const height = length;
            const radiusTop = radius;
            const radiusBottom = radius;
            
            for (let y = 0; y <= capSubdivisions; y++) {
                const v = y / capSubdivisions;
                const r = v * (radiusTop - radiusBottom) + radiusBottom;
                
                for (let x = 0; x <= radialSegments; x++) {
                    const u = x / radialSegments;
                    const theta = u * Math.PI * 2;
                    
                    const sinTheta = Math.sin(theta);
                    const cosTheta = Math.cos(theta);
                    
                    vertices.push(
                        r * sinTheta,
                        -height / 2 + v * height,
                        r * cosTheta
                    );
                }
            }
            
            for (let y = 0; y < capSubdivisions; y++) {
                for (let x = 0; x < radialSegments; x++) {
                    const a = y * (radialSegments + 1) + x;
                    const b = a + 1;
                    const c = a + radialSegments + 1;
                    const d = c + 1;
                    
                    indices.push(a, b, d);
                    indices.push(a, d, c);
                }
            }
            
            this.setIndex(indices);
            this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            this.computeVertexNormals();
        }
    };
}

// Rest of the original game.js continues... Let me create the full file

