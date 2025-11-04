export class PlayerController {
  constructor(root, collisionMeshes, getCameraYaw) {
    this.root = root;
    this.col = collisionMeshes;
    this.getCameraYaw = getCameraYaw;
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.ray = new THREE.Raycaster();

    // Tunables - SM64 style
    this.maxSpeed = 7.0;
    this.accel = 20.0;
    this.airAccel = 6.0;
    this.friction = 12.0;
    this.gravity = 25.0;
    this.jumpSpeed = 6.5;
    this.stepHeight = 0.35;
    this.slopeLimit = 37 * Math.PI / 180;

    // Jump helpers
    this.coyoteTime = 0.08;
    this.bufferTime = 0.10;
    this.timeSinceUngrounded = 999;
    this.timeSinceJumpPress = 999;

    // Input
    this.input = new THREE.Vector3();
    this.raw = new THREE.Vector3();
    this.jumpHeld = false;

    // Triple jump
    this.jumpChain = 0;
    this.timeSinceLastJump = 1;

    // Shield actions
    this.isShieldBashing = false;
    this.isBackflipping = false;
    this.isGroundPounding = false;
    this.actionTimer = 0;

    // Attack
    this.isAttacking = false;
    this.attackCooldown = 0;

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.speedMult = 1.0;
    this.powerMult = 1.0;
  }

  setInput(ix, iz, jumpPressed, jumpHeld, shieldPressed, shieldHeld, attackPressed, camYaw, dt) {
    this.camYaw = camYaw;
    
    // Smooth WASD input
    const a = 1 - Math.exp(-dt / 0.06);
    this.raw.set(ix, 0, iz);
    if (this.raw.lengthSq() > 1) this.raw.normalize();
    this.input.lerp(this.raw, a);

    // Edges
    if (jumpPressed) this.timeSinceJumpPress = 0;
    this.jumpHeld = jumpHeld;

    // Shield combos
    if (shieldPressed && this.onGround && this.timeSinceJumpPress < this.bufferTime) {
      const horizSpeed = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
      if (horizSpeed > 1.0) {
        this.enterShieldBash();
        this.timeSinceJumpPress = 999;
      } else {
        this.enterBackflip();
        this.timeSinceJumpPress = 999;
      }
    }

    // Air shield smash (ground pound)
    if (shieldPressed && !this.onGround && !this.isGroundPounding) {
      this.enterGroundPound();
    }

    // Attack
    if (attackPressed && this.attackCooldown <= 0) {
      this.isAttacking = true;
      this.attackCooldown = 0.5;
    }
  }

  enterShieldBash() {
    this.isShieldBashing = true;
    this.actionTimer = 0.4;
    const forward = new THREE.Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    this.vel.x = forward.x * 15;
    this.vel.z = forward.z * 15;
    this.vel.y = 2;
  }

  enterBackflip() {
    this.isBackflipping = true;
    this.actionTimer = 0.5;
    const backward = new THREE.Vector3(-Math.sin(this.root.rotation.y), 0, -Math.cos(this.root.rotation.y));
    this.vel.x = backward.x * 5;
    this.vel.z = backward.z * 5;
    this.vel.y = 8;
  }

  enterGroundPound() {
    this.isGroundPounding = true;
    this.vel.y = Math.min(this.vel.y, -18);
  }

  update(dt) {
    // Update timers
    this.timeSinceJumpPress += dt;
    this.timeSinceUngrounded += dt;
    this.timeSinceLastJump += dt;
    if (this.actionTimer > 0) this.actionTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    
    if (this.actionTimer <= 0) {
      this.isShieldBashing = false;
      this.isBackflipping = false;
    }

    // Gravity
    this.vel.y -= this.gravity * dt;

    // Ground check
    const origin = this.root.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    this.ray.set(origin, new THREE.Vector3(0, -1, 0));
    const hits = this.ray.intersectObjects(this.col, true);
    const hit = hits.find(h => h.distance <= 0.65);
    
    const wasGrounded = this.onGround;
    this.onGround = !!hit;
    
    if (this.onGround) {
      this.timeSinceUngrounded = 0;
      this.groundNormal.copy(hit.face.normal);
      const desiredY = hit.point.y + 0.01;
      
      if (this.root.position.y - desiredY < this.stepHeight) {
        this.root.position.y = desiredY;
        if (this.vel.y < 0) {
          this.vel.y = 0;
          // Ground pound landing
          if (this.isGroundPounding) {
            this.isGroundPounding = false;
            // Landing effect would go here
          }
        }
      }
    }

    // Variable jump height
    if (!this.onGround && !this.jumpHeld && this.vel.y > 0) {
      this.vel.y *= 0.6; // Cut 40%
    }

    // Jump
    if ((this.onGround || this.timeSinceUngrounded < this.coyoteTime) && this.timeSinceJumpPress < this.bufferTime) {
      let jumpPower = this.jumpSpeed;
      
      // Triple jump boost
      if (this.timeSinceLastJump < 0.35 && this.jumpChain === 2) {
        jumpPower *= 1.25;
      }
      
      this.vel.y = jumpPower;
      this.timeSinceLastJump = 0;
      this.jumpChain = Math.min(2, this.jumpChain + 1);
      this.timeSinceJumpPress = 999;
    }

    // Reset jump chain when grounded for a while
    if (this.onGround && this.timeSinceLastJump > 0.5) {
      this.jumpChain = 0;
    }

    // Movement
    const yaw = this.camYaw ?? 0;
    const inputWorld = new THREE.Vector3(
      Math.sin(yaw) * this.input.z + Math.cos(yaw) * this.input.x,
      0,
      Math.cos(yaw) * this.input.z - Math.sin(yaw) * this.input.x
    );
    
    let horiz = new THREE.Vector3(this.vel.x, 0, this.vel.z);

    // Don't allow control during special moves
    const inSpecialMove = this.isShieldBashing || this.isBackflipping;

    if (this.onGround && !inSpecialMove) {
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
    } else if (!inSpecialMove) {
      // Air control
      if (this.input.lengthSq() > 1e-4) {
        horiz.add(inputWorld.clone().normalize().multiplyScalar(this.airAccel * dt));
        const cap = this.maxSpeed * this.speedMult * 0.8;
        if (horiz.length() > cap) horiz.setLength(cap);
      }
    }

    this.vel.x = horiz.x;
    this.vel.z = horiz.z;

    // Integrate
    this.root.position.addScaledVector(this.vel, dt);

    // Face move direction
    if (horiz.lengthSq() > 0.01 && !inSpecialMove) {
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
      angle: Math.PI / 3, // 60 degree cone
      damage: 25 * this.powerMult
    };
  }

  getShieldBashHitbox() {
    if (!this.isShieldBashing || this.actionTimer <= 0) return null;
    
    const forward = new THREE.Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    return {
      position: this.root.position.clone(),
      direction: forward,
      range: 3,
      angle: Math.PI / 2,
      damage: 15 * this.powerMult,
      knockback: 12
    };
  }
}

