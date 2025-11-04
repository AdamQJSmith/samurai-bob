export class AbilityManager {
  constructor(player, scene) {
    this.player = player;
    this.scene = scene;
    this.activeAbility = null;
    this.abilities = {
      leaf: new LeafForm(player, scene),
      dragon: new DragonForm(player, scene),
      wind: new WindOrb(player, scene)
    };
  }

  activateAbility(type) {
    if (this.activeAbility && this.activeAbility.type === type) return;
    
    // Deactivate current
    if (this.activeAbility) {
      this.activeAbility.deactivate();
    }

    // Activate new
    const ability = this.abilities[type];
    if (ability && !ability.onCooldown()) {
      ability.activate();
      this.activeAbility = ability;
    }
  }

  update(dt, fireBreath, gust) {
    Object.values(this.abilities).forEach(a => a.updateCooldown(dt));
    
    if (this.activeAbility) {
      this.activeAbility.update(dt, fireBreath, gust);
      
      if (this.activeAbility.isExpired()) {
        this.activeAbility.deactivate();
        this.activeAbility = null;
      }
    }
  }

  getCurrentAbility() {
    return this.activeAbility?.type || null;
  }

  getAbilityInfo() {
    return {
      leaf: this.abilities.leaf.getInfo(),
      dragon: this.abilities.dragon.getInfo(),
      wind: this.abilities.wind.getInfo(),
      active: this.activeAbility?.type
    };
  }
}

class LeafForm {
  constructor(player, scene) {
    this.type = 'leaf';
    this.player = player;
    this.scene = scene;
    this.duration = 8.0;
    this.cooldown = 20.0;
    this.timeLeft = 0;
    this.cooldownLeft = 0;
    this.leaves = [];
  }

  activate() {
    this.timeLeft = this.duration;
    this.cooldownLeft = this.cooldown;
    
    // Create leaf particles
    for (let i = 0; i < 100; i++) {
      const geometry = new THREE.PlaneGeometry(0.3, 0.4);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8fce00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const leaf = new THREE.Mesh(geometry, material);
      leaf.userData.angle = Math.random() * Math.PI * 2;
      leaf.userData.height = Math.random() * 3;
      leaf.userData.radius = 1 + Math.random() * 0.5;
      leaf.userData.speed = 1 + Math.random() * 2;
      this.leaves.push(leaf);
      this.scene.add(leaf);
    }
  }

  deactivate() {
    this.leaves.forEach(leaf => this.scene.remove(leaf));
    this.leaves = [];
    this.timeLeft = 0;
  }

  update(dt, fireBreath, gust) {
    if (this.timeLeft <= 0) return;
    
    this.timeLeft -= dt;
    
    // Update leaf positions
    this.leaves.forEach(leaf => {
      leaf.userData.angle += dt * leaf.userData.speed;
      const x = Math.cos(leaf.userData.angle) * leaf.userData.radius;
      const z = Math.sin(leaf.userData.angle) * leaf.userData.radius;
      leaf.position.set(
        this.player.position.x + x,
        this.player.position.y + leaf.userData.height,
        this.player.position.z + z
      );
      leaf.rotation.y += dt * 2;
    });
  }

  updateCooldown(dt) {
    if (this.cooldownLeft > 0) this.cooldownLeft -= dt;
  }

  onCooldown() {
    return this.cooldownLeft > 0;
  }

  isExpired() {
    return this.timeLeft <= 0;
  }

  getInfo() {
    return {
      timeLeft: this.timeLeft,
      cooldownLeft: this.cooldownLeft,
      ready: !this.onCooldown()
    };
  }
}

class DragonForm {
  constructor(player, scene) {
    this.type = 'dragon';
    this.player = player;
    this.scene = scene;
    this.duration = 8.0;
    this.cooldown = 20.0;
    this.timeLeft = 0;
    this.cooldownLeft = 0;
    this.flames = [];
  }

  activate() {
    this.timeLeft = this.duration;
    this.cooldownLeft = this.cooldown;
  }

  deactivate() {
    this.flames.forEach(f => this.scene.remove(f));
    this.flames = [];
    this.timeLeft = 0;
  }

  update(dt, fireBreath, gust) {
    if (this.timeLeft <= 0) return;
    
    this.timeLeft -= dt;
    
    // Create flame aura
    if (Math.random() < 0.3) {
      const geometry = new THREE.SphereGeometry(0.3, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.7
      });
      const flame = new THREE.Mesh(geometry, material);
      flame.position.copy(this.player.position);
      flame.position.x += (Math.random() - 0.5) * 2;
      flame.position.y += Math.random() * 4;
      flame.position.z += (Math.random() - 0.5) * 2;
      flame.userData.life = 0.5;
      this.flames.push(flame);
      this.scene.add(flame);
    }
    
    // Update flames
    this.flames = this.flames.filter(flame => {
      flame.userData.life -= dt;
      flame.position.y += dt * 2;
      flame.material.opacity = flame.userData.life;
      
      if (flame.userData.life <= 0) {
        this.scene.remove(flame);
        return false;
      }
      return true;
    });
  }

  updateCooldown(dt) {
    if (this.cooldownLeft > 0) this.cooldownLeft -= dt;
  }

  onCooldown() {
    return this.cooldownLeft > 0;
  }

  isExpired() {
    return this.timeLeft <= 0;
  }

  getInfo() {
    return {
      timeLeft: this.timeLeft,
      cooldownLeft: this.cooldownLeft,
      ready: !this.onCooldown()
    };
  }
}

class WindOrb {
  constructor(player, scene) {
    this.type = 'wind';
    this.player = player;
    this.scene = scene;
    this.duration = 8.0;
    this.cooldown = 20.0;
    this.gustCooldown = 3.0;
    this.timeLeft = 0;
    this.cooldownLeft = 0;
    this.gustCooldownLeft = 0;
  }

  activate() {
    this.timeLeft = this.duration;
    this.cooldownLeft = this.cooldown;
    this.gustCooldownLeft = 0;
  }

  deactivate() {
    this.timeLeft = 0;
  }

  update(dt, fireBreath, gust) {
    if (this.timeLeft <= 0) return;
    
    this.timeLeft -= dt;
    this.gustCooldownLeft -= dt;
    
    // Gust ability
    if (gust && this.gustCooldownLeft <= 0) {
      this.gustCooldownLeft = this.gustCooldown;
      // Gust effect would go here
    }
  }

  updateCooldown(dt) {
    if (this.cooldownLeft > 0) this.cooldownLeft -= dt;
  }

  onCooldown() {
    return this.cooldownLeft > 0;
  }

  isExpired() {
    return this.timeLeft <= 0;
  }

  getInfo() {
    return {
      timeLeft: this.timeLeft,
      cooldownLeft: this.cooldownLeft,
      gustCooldownLeft: this.gustCooldownLeft,
      ready: !this.onCooldown()
    };
  }
}

