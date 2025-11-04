export function processSwordSlash(player, enemies, createHitParticles) {
  const hitbox = player.getAttackHitbox();
  if (!hitbox) return [];

  const hits = [];
  
  enemies.forEach(enemy => {
    const toEnemy = new THREE.Vector3();
    toEnemy.subVectors(enemy.position, hitbox.position);
    const distance = toEnemy.length();

    if (distance < hitbox.range) {
      toEnemy.normalize();
      const dot = hitbox.direction.dot(toEnemy);

      if (dot > Math.cos(hitbox.angle / 2)) {
        // Hit!
        hits.push({
          enemy,
          damage: hitbox.damage,
          knockback: toEnemy.multiplyScalar(8),
          stun: 1.0
        });
        
        if (createHitParticles) {
          createHitParticles(enemy.position);
        }
      }
    }
  });

  return hits;
}

export function processShieldBash(player, enemies, createHitParticles) {
  const hitbox = player.getShieldBashHitbox();
  if (!hitbox) return [];

  const hits = [];
  
  enemies.forEach(enemy => {
    const toEnemy = new THREE.Vector3();
    toEnemy.subVectors(enemy.position, hitbox.position);
    const distance = toEnemy.length();

    if (distance < hitbox.range) {
      toEnemy.normalize();
      const dot = hitbox.direction.dot(toEnemy);

      if (dot > Math.cos(hitbox.angle / 2)) {
        hits.push({
          enemy,
          damage: hitbox.damage,
          knockback: toEnemy.multiplyScalar(hitbox.knockback),
          stun: 0.5
        });
        
        if (createHitParticles) {
          createHitParticles(enemy.position);
        }
      }
    }
  });

  return hits;
}

export function processGroundPoundLanding(player, enemies, createHitParticles) {
  if (!player.isGroundPounding || player.vel.y >= 0) return [];

  const hits = [];
  const range = 4;
  
  enemies.forEach(enemy => {
    const distance = player.root.position.distanceTo(enemy.position);
    
    if (distance < range) {
      const toEnemy = new THREE.Vector3();
      toEnemy.subVectors(enemy.position, player.root.position);
      toEnemy.y = 0;
      toEnemy.normalize();
      
      hits.push({
        enemy,
        damage: 30 * player.powerMult,
        knockback: toEnemy.multiplyScalar(10),
        stun: 1.5
      });
      
      if (createHitParticles) {
        createHitParticles(enemy.position);
      }
    }
  });

  return hits;
}

export function applyHit(enemy, hit) {
  if (!enemy.userData) return;
  
  enemy.userData.health -= hit.damage;
  enemy.userData.stunned = hit.stun;
  
  if (hit.knockback) {
    enemy.position.add(hit.knockback);
  }
  
  // Flash enemy red
  enemy.children.forEach(child => {
    if (child.material) {
      const originalColor = child.material.color.clone();
      child.material.color.setHex(0xff0000);
      setTimeout(() => {
        if (child.material) child.material.color = originalColor;
      }, 100);
    }
  });
}

