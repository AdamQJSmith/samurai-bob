// ===== GAME CONSTANTS =====
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 35;
const POWERUP_SIZE = 30;

// ===== ENEMY TYPES =====
const ENEMY_TYPES = {
    GRUNT: {
        name: 'Grunt',
        color: '#e74c3c',
        health: 50,
        speed: 2,
        damage: 1, // Reduced from 2
        points: 50
    },
    SPEEDY: {
        name: 'Speedy',
        color: '#3498db',
        health: 30,
        speed: 4.5,
        damage: 0.5, // Reduced from 1
        points: 75
    },
    TANK: {
        name: 'Tank',
        color: '#95a5a6',
        health: 120,
        speed: 1.2,
        damage: 2, // Reduced from 4
        points: 150
    },
    ASSASSIN: {
        name: 'Assassin',
        color: '#9b59b6',
        health: 40,
        speed: 3.5,
        damage: 1.5, // Reduced from 3
        points: 100
    },
    BRUTE: {
        name: 'Brute',
        color: '#e67e22',
        health: 80,
        speed: 2.5,
        damage: 1.5, // Reduced from 3
        points: 125
    },
    BOSS: {
        name: 'Boss',
        color: '#c0392b',
        health: 200,
        speed: 2,
        damage: 3, // Reduced from 5
        points: 500
    }
};

// ===== GAME STATE =====
let gameState = 'title'; // title, playing, gameover
let canvas, ctx;
let keys = {};
let keyPressed = {}; // Track key presses (not just held state)
let gameTime = 0;
let score = 0;
let kills = 0;
let speedMult = 1.0;
let powerMult = 1.0;
let survivalFrames = 0;
let highScores = [];

// ===== PLAYER =====
let player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    speed: 5,
    health: 100,
    maxHealth: 100,
    shielding: false,
    jumping: false,
    jumpCount: 0,
    attackCooldown: 0,
    shieldBashCooldown: 0,
    powerup: null,
    powerupTime: 0,
    invincible: false,
    windChargeCooldown: 0,
    facingRight: true,
    lastSoundTime: 0,
    swordSwingFrame: 0, // Animation frame for sword swing
    armor: 0, // Reduces incoming damage (0-50%)
    strength: 1.0 // Increases attack damage multiplier
};

// ===== ENEMIES =====
let enemies = [];
let enemySpawnTimer = 0;
let enemySpawnRate = 120;

// ===== POWERUPS =====
let powerups = [];
const POWERUP_TYPES = ['leaf', 'dragon', 'wind'];
let powerupSpawnTimer = 0;

// ===== PARTICLES =====
let particles = [];

// ===== HIGH SCORES =====
function loadHighScores() {
    const saved = localStorage.getItem('samuraiBobHighScores');
    if (saved) {
        highScores = JSON.parse(saved);
    } else {
        highScores = [];
    }
}

function saveHighScores() {
    localStorage.setItem('samuraiBobHighScores', JSON.stringify(highScores));
}

function addHighScore(score, kills, time) {
    const entry = {
        score: score,
        kills: kills,
        time: time,
        date: new Date().toLocaleDateString()
    };
    
    highScores.push(entry);
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10); // Keep top 10
    saveHighScores();
    
    return highScores[0].score === score; // Returns true if new #1
}

function displayHighScores() {
    const list = document.getElementById('high-score-list');
    list.innerHTML = '';
    
    highScores.forEach((entry, index) => {
        const li = document.createElement('li');
        const minutes = Math.floor(entry.time / 60);
        const seconds = entry.time % 60;
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        li.innerHTML = `
            <span class="score-name">${index + 1}. ${entry.date}</span>
            <span class="score-value">${entry.score} pts (${entry.kills} kills, ${timeStr})</span>
        `;
        list.appendChild(li);
    });
}

// ===== SETTINGS =====
let soundEnabled = true;
let masterVolume = 0.3;

function loadSettings() {
    const savedVolume = localStorage.getItem('samuraiBobVolume');
    const savedSound = localStorage.getItem('samuraiBobSound');
    
    if (savedVolume !== null) {
        masterVolume = parseFloat(savedVolume);
        sounds.masterVolume = masterVolume;
        document.getElementById('master-volume').value = Math.floor(masterVolume * 100);
        document.getElementById('volume-value').textContent = Math.floor(masterVolume * 100) + '%';
    }
    
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
        updateSoundToggle();
    }
}

function saveSettings() {
    localStorage.setItem('samuraiBobVolume', masterVolume.toString());
    localStorage.setItem('samuraiBobSound', soundEnabled.toString());
}

function updateSoundToggle() {
    const toggle = document.getElementById('sound-toggle');
    if (soundEnabled) {
        toggle.textContent = 'ON';
        toggle.classList.remove('off');
    } else {
        toggle.textContent = 'OFF';
        toggle.classList.add('off');
    }
}

// ===== INITIALIZATION =====
function init() {
    canvas = document.getElementById('game-canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    loadHighScores();
    loadSettings();

    // Event listeners
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (!keys[key]) {
            // Key was just pressed (not held)
            keyPressed[key] = true;
        }
        keys[key] = true;
        if (e.key === ' ') e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        keyPressed[e.key.toLowerCase()] = false;
    });

    // Menu navigation
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', startGame);
    
    document.getElementById('settings-button').addEventListener('click', () => {
        showScreen('settings-screen');
    });
    
    document.getElementById('how-to-play-button').addEventListener('click', () => {
        showScreen('howtoplay-screen');
    });
    
    document.getElementById('back-to-menu').addEventListener('click', () => {
        showScreen('title-screen');
    });
    
    document.getElementById('back-to-menu-2').addEventListener('click', () => {
        showScreen('title-screen');
    });

    // Volume control
    document.getElementById('master-volume').addEventListener('input', (e) => {
        masterVolume = parseInt(e.target.value) / 100;
        sounds.masterVolume = masterVolume;
        document.getElementById('volume-value').textContent = e.target.value + '%';
        saveSettings();
    });

    // Sound toggle
    document.getElementById('sound-toggle').addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        updateSoundToggle();
        saveSettings();
    });
}

function showScreen(screenId) {
    const screens = ['title-screen', 'settings-screen', 'howtoplay-screen', 'game-screen', 'gameover-screen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// ===== GAME LOOP =====
function startGame() {
    gameState = 'playing';
    gameTime = 0;
    score = 0;
    kills = 0;
    speedMult = 1.0;
    powerMult = 1.0;
    survivalFrames = 0;
    enemies = [];
    powerups = [];
    particles = [];
    enemySpawnTimer = 0;
    powerupSpawnTimer = 0;

    player = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: 0,
        vy: 0,
        speed: 5,
        health: 100,
        maxHealth: 100,
        shielding: false,
        jumping: false,
        jumpCount: 0,
        attackCooldown: 0,
        shieldBashCooldown: 0,
        powerup: null,
        powerupTime: 0,
        invincible: false,
        windChargeCooldown: 0,
        facingRight: true,
        lastSoundTime: 0,
        swordSwingFrame: 0,
        armor: 0,
        strength: 1.0
    };

    showScreen('game-screen');
    
    // Show controls message at start
    const controlsMessage = document.getElementById('start-controls-message');
    controlsMessage.classList.remove('hidden');
    
    // Hide after 5 seconds or when player presses a key
    setTimeout(() => {
        controlsMessage.classList.add('hidden');
    }, 5000);
    
    // Also hide when player presses any key
    const hideControls = () => {
        controlsMessage.classList.add('hidden');
        document.removeEventListener('keydown', hideControls);
    };
    document.addEventListener('keydown', hideControls);
    
    gameLoop();
}

function gameLoop() {
    if (gameState !== 'playing') return;

    update();
    render();
    requestAnimationFrame(gameLoop);
}

// ===== UPDATE =====
function update() {
    survivalFrames++;
    gameTime = Math.floor(survivalFrames / 60);
    score += 1;

    updatePlayer();
    updateEnemies();
    updatePowerups();
    updateParticles();
    checkCollisions();
    spawnEnemies();
    spawnPowerups();
    updateHUD();

    if (player.health <= 0) {
        gameOver();
    }
}

function updatePlayer() {
    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.shieldBashCooldown > 0) player.shieldBashCooldown--;
    if (player.windChargeCooldown > 0) player.windChargeCooldown--;
    if (player.powerupTime > 0) player.powerupTime--;
    if (player.lastSoundTime > 0) player.lastSoundTime--;
    if (player.swordSwingFrame > 0) player.swordSwingFrame--;

    if (player.powerupTime <= 0 && player.powerup) {
        player.powerup = null;
        player.invincible = false;
        document.getElementById('powerup-indicator').classList.add('hidden');
    }

    let moveSpeed = player.speed * speedMult;
    let moving = false;

    if (keys['arrowleft']) {
        player.vx = -moveSpeed;
        player.facingRight = false;
        moving = true;
    } else if (keys['arrowright']) {
        player.vx = moveSpeed;
        player.facingRight = true;
        moving = true;
    } else {
        player.vx *= 0.8;
    }

    if (keys['arrowup']) {
        player.vy = -moveSpeed;
        moving = true;
    } else if (keys['arrowdown']) {
        player.vy = moveSpeed;
        moving = true;
    } else {
        player.vy *= 0.8;
    }

    // Updated controls: 'd' for shield - triggers immediately when D is pressed
    player.shielding = keys['d'];
    if (player.shielding && player.lastSoundTime === 0) {
        if (soundEnabled) sounds.shieldBlock();
        player.lastSoundTime = 15;
    }

    if (keys['d'] && moving && player.shieldBashCooldown === 0) {
        player.shieldBashCooldown = 60;
        shieldBash();
    }

    if (keys['d'] && keys[' '] && !moving) {
        shieldBackflip();
    }

    // Updated controls: 'a' or space for sword attack
    // Handle A key attack - use keyPressed to trigger once per press
    if (keyPressed['a'] && player.attackCooldown === 0) {
        swordAttack();
        player.attackCooldown = 15;
        player.swordSwingFrame = 15;
        keyPressed['a'] = false; // Clear the press flag
    }
    
    // Handle Space key attack (or jump if attack on cooldown)
    if (keyPressed[' '] && player.attackCooldown === 0) {
        // Attack takes priority if ready
        swordAttack();
        player.attackCooldown = 15;
        player.swordSwingFrame = 15;
        keyPressed[' '] = false;
    } else if (keyPressed[' '] && player.attackCooldown > 0 && player.jumpCount < 3) {
        // Jump only if attack is on cooldown
        jump();
        keyPressed[' '] = false;
    }

    if (keys['w'] && player.powerup === 'wind' && player.windChargeCooldown === 0) {
        blowWind();
        player.windChargeCooldown = 60;
    }

    if (keys['f'] && player.powerup === 'dragon') {
        breatheFire();
    }

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(PLAYER_SIZE, Math.min(CANVAS_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, player.y));
}

function jump() {
    player.jumpCount++;
    player.vy = -10;
    if (soundEnabled) sounds.jump();
    createParticles(player.x, player.y + PLAYER_SIZE / 2, '#88ff88', 5);
}

function shieldBash() {
    let dashPower = 20;
    if (player.facingRight) {
        player.vx = dashPower;
    } else {
        player.vx = -dashPower;
    }
    if (soundEnabled) sounds.shieldBash();
    createParticles(player.x, player.y, '#4488ff', 10);
    
    enemies.forEach(enemy => {
        let dx = enemy.x - player.x;
        let dy = enemy.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 60 && ((player.facingRight && dx > 0) || (!player.facingRight && dx < 0))) {
            damageEnemy(enemy, 30 * powerMult);
        }
    });
}

function shieldBackflip() {
    player.vy = -15;
    player.jumpCount = 1;
    if (soundEnabled) sounds.jump();
    createParticles(player.x, player.y, '#ffaa44', 15);
}

function swordAttack() {
    let attackRange = 150; // Increased range significantly for better sword reach
    let attackAngle = player.facingRight ? 0 : Math.PI;
    
    if (soundEnabled) sounds.swordSlash();
    
    // Create more particles for visual effect
    for (let i = 0; i < 20; i++) {
        let angle = attackAngle + (Math.random() - 0.5) * Math.PI * 0.6;
        let dist = 40 + Math.random() * 80;
        createParticles(
            player.x + Math.cos(angle) * dist,
            player.y + Math.sin(angle) * dist,
            '#ff4444',
            1
        );
    }

    enemies.forEach(enemy => {
        let dx = enemy.x - player.x;
        let dy = enemy.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check attack range in front of player (wider arc)
        let angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToEnemy - attackAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        
        // Attack hits enemies in a 150-degree arc in front of player
        if (dist < attackRange && angleDiff < Math.PI * 0.75) {
            // Apply strength multiplier to damage
            damageEnemy(enemy, 25 * powerMult * player.strength);
            // Strong knockback for hit enemies - pushes them away
            let knockbackPower = 30; // Strong knockback
            enemy.vx = (dx / dist) * knockbackPower;
            enemy.vy = (dy / dist) * knockbackPower;
            enemy.knockback = 20; // Knockback duration
            // Stun/freeze enemy for 1.5 seconds (90 frames) - starts after knockback
            enemy.stunned = 90;
        }
    });
}

function blowWind() {
    if (soundEnabled) sounds.windBlast();
    enemies.forEach(enemy => {
        let dx = enemy.x - player.x;
        let dy = enemy.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
            let pushPower = 15;
            enemy.vx = (dx / dist) * pushPower;
            enemy.vy = (dy / dist) * pushPower;
        }
    });
    
    createParticles(player.x, player.y, '#aaffff', 30);
}

function breatheFire() {
    if (soundEnabled && Math.random() > 0.7) sounds.fireBreathe();
    
    let fireAngle = player.facingRight ? 0 : Math.PI;
    for (let i = 0; i < 3; i++) {
        particles.push({
            x: player.x + Math.cos(fireAngle) * 30,
            y: player.y + (Math.random() - 0.5) * 20,
            vx: Math.cos(fireAngle) * 10,
            vy: (Math.random() - 0.5) * 2,
            life: 30,
            color: Math.random() > 0.5 ? '#ff4400' : '#ffaa00',
            size: 15
        });
    }

    enemies.forEach(enemy => {
        let dx = enemy.x - player.x;
        let dy = enemy.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150 && ((player.facingRight && dx > 0) || (!player.facingRight && dx < 0))) {
            damageEnemy(enemy, 5 * powerMult);
        }
    });
}

function damageEnemy(enemy, damage) {
    enemy.health -= damage;
    enemy.knockback = 10;
    if (soundEnabled) sounds.enemyHit();
    
    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    kills++;
    score += enemy.points;
    
    speedMult = Math.min(1.0 + kills * 0.08, 5.0);
    powerMult = Math.min(1.0 + kills * 0.4, 20.0);
    
    // Gain armor and strength with kills
    // Armor reduces damage (max 50% reduction)
    player.armor = Math.min(0.5, kills * 0.01);
    // Strength increases attack damage (starts at 1.0, increases with kills)
    player.strength = 1.0 + kills * 0.05;
    
    if (soundEnabled) sounds.enemyDeath();
    createParticles(enemy.x, enemy.y, '#ffff00', 20);
    
    // 60% chance to drop a heart for health
    if (Math.random() < 0.6) {
        powerups.push({
            x: enemy.x,
            y: enemy.y,
            type: 'heart',
            rotation: 0,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 600 // Hearts disappear after 10 seconds if not collected
        });
    }
    
    let index = enemies.indexOf(enemy);
    if (index > -1) {
        enemies.splice(index, 1);
    }
}

function updateEnemies() {
    enemies.forEach(enemy => {
        // Decrease stun timer
        if (enemy.stunned > 0) {
            enemy.stunned--;
        }
        
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (enemy.knockback > 0) {
            // During knockback, enemy moves back
            enemy.knockback--;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.vx *= 0.95; // Slightly slower decay to maintain knockback
            enemy.vy *= 0.95;
        } else if (enemy.stunned > 0) {
            // Enemy is frozen - no movement during stun
            // Stun will be decremented above
        } else {
            // Only move if not stunned and not in knockback - reduced speed multiplier
            let speed = enemy.speed * (1 + gameTime * 0.005); // Reduced speed scaling
            enemy.x += (dx / dist) * speed;
            enemy.y += (dy / dist) * speed;
        }

        if (dist < PLAYER_SIZE + ENEMY_SIZE) {
            if (!player.shielding && !player.invincible) {
                // Apply armor reduction to damage
                let damage = enemy.damage * (1 - player.armor);
                player.health -= damage;
                if (soundEnabled) sounds.playerHurt();
                createParticles(player.x, player.y, '#ff0000', 5);
            }
            
            // Shield block damages enemies (reduced damage)
            if (player.shielding) {
                damageEnemy(enemy, 2 * powerMult); // Reduced from 5 to 2
                createParticles(enemy.x, enemy.y, '#4488ff', 5);
                // Small knockback
                enemy.vx = (dx / dist) * 5;
                enemy.vy = (dy / dist) * 5;
                enemy.knockback = 10;
            }
            
            if (player.powerup === 'dragon') {
                damageEnemy(enemy, 100);
            }
        }

        enemy.x = Math.max(ENEMY_SIZE, Math.min(CANVAS_WIDTH - ENEMY_SIZE, enemy.x));
        enemy.y = Math.max(ENEMY_SIZE, Math.min(CANVAS_HEIGHT - ENEMY_SIZE, enemy.y));
    });
}

function spawnEnemies() {
    enemySpawnTimer++;
    
    enemySpawnRate = Math.max(30, 120 - Math.floor(gameTime / 5));
    
    if (enemySpawnTimer >= enemySpawnRate) {
        enemySpawnTimer = 0;
        
        let side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0:
                x = Math.random() * CANVAS_WIDTH;
                y = -ENEMY_SIZE;
                break;
            case 1:
                x = CANVAS_WIDTH + ENEMY_SIZE;
                y = Math.random() * CANVAS_HEIGHT;
                break;
            case 2:
                x = Math.random() * CANVAS_WIDTH;
                y = CANVAS_HEIGHT + ENEMY_SIZE;
                break;
            case 3:
                x = -ENEMY_SIZE;
                y = Math.random() * CANVAS_HEIGHT;
                break;
        }
        
        // Choose enemy type based on time - gradual introduction
        let enemyType;
        let rand = Math.random();
        
        // Very early game: only grunts
        if (gameTime < 20) {
            enemyType = ENEMY_TYPES.GRUNT;
        }
        // Early game: mostly grunts, occasional speedy
        else if (gameTime < 45) {
            enemyType = rand < 0.9 ? ENEMY_TYPES.GRUNT : ENEMY_TYPES.SPEEDY;
        }
        // Early-mid game: more speedies introduced
        else if (gameTime < 75) {
            if (rand < 0.6) enemyType = ENEMY_TYPES.GRUNT;
            else if (rand < 0.9) enemyType = ENEMY_TYPES.SPEEDY;
            else enemyType = ENEMY_TYPES.TANK;
        }
        // Mid game: tank introduced
        else if (gameTime < 120) {
            if (rand < 0.4) enemyType = ENEMY_TYPES.GRUNT;
            else if (rand < 0.7) enemyType = ENEMY_TYPES.SPEEDY;
            else if (rand < 0.95) enemyType = ENEMY_TYPES.TANK;
            else enemyType = ENEMY_TYPES.ASSASSIN;
        }
        // Late game: assassin and brute introduced
        else if (gameTime < 180) {
            if (rand < 0.3) enemyType = ENEMY_TYPES.GRUNT;
            else if (rand < 0.5) enemyType = ENEMY_TYPES.SPEEDY;
            else if (rand < 0.7) enemyType = ENEMY_TYPES.ASSASSIN;
            else if (rand < 0.9) enemyType = ENEMY_TYPES.BRUTE;
            else enemyType = ENEMY_TYPES.TANK;
        }
        // End game: all types including bosses
        else {
            if (rand < 0.2) enemyType = ENEMY_TYPES.GRUNT;
            else if (rand < 0.35) enemyType = ENEMY_TYPES.SPEEDY;
            else if (rand < 0.5) enemyType = ENEMY_TYPES.ASSASSIN;
            else if (rand < 0.7) enemyType = ENEMY_TYPES.BRUTE;
            else if (rand < 0.92) enemyType = ENEMY_TYPES.TANK;
            else enemyType = ENEMY_TYPES.BOSS;
        }
        
        enemies.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            speed: enemyType.speed,
            health: enemyType.health + gameTime * 2,
            maxHealth: enemyType.health + gameTime * 2,
            damage: enemyType.damage,
            points: enemyType.points,
            color: enemyType.color,
            type: enemyType.name,
            knockback: 0,
            stunned: 0 // Stun timer - enemy frozen when > 0
        });
    }
}

function updatePowerups() {
    powerups.forEach((powerup, index) => {
        powerup.rotation += 0.05;
        
        // Hearts have physics - bounce and fade
        if (powerup.type === 'heart') {
            powerup.x += powerup.vx;
            powerup.y += powerup.vy;
            powerup.vx *= 0.98; // Friction
            powerup.vy *= 0.98;
            powerup.vy += 0.2; // Gravity
            powerup.life--;
            
            // Remove if life expired
            if (powerup.life <= 0) {
                powerups.splice(index, 1);
                return;
            }
        }
        
        let dx = player.x - powerup.x;
        let dy = player.y - powerup.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < PLAYER_SIZE + POWERUP_SIZE) {
            collectPowerup(powerup);
            powerups.splice(index, 1);
        }
    });
}

function spawnPowerups() {
    powerupSpawnTimer++;
    
    if (powerupSpawnTimer >= 600) {
        powerupSpawnTimer = 0;
        
        let type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push({
            x: Math.random() * (CANVAS_WIDTH - 100) + 50,
            y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
            type: type,
            rotation: 0
        });
    }
}

function collectPowerup(powerup) {
    if (powerup.type === 'heart') {
        // Heart restores health
        player.health = Math.min(player.health + 20, player.maxHealth);
        if (soundEnabled) sounds.powerupCollect();
        createParticles(powerup.x, powerup.y, '#ff69b4', 20);
        return;
    }
    
    player.powerup = powerup.type;
    player.powerupTime = 600;
    
    if (soundEnabled) sounds.powerupCollect();
    
    let msg = '';
    switch(powerup.type) {
        case 'leaf':
            msg = '🍃 LEAF POWER! Press L to transform!';
            player.invincible = true;
            break;
        case 'dragon':
            msg = '🐲 DRAGON POWER! Press F to breathe fire!';
            break;
        case 'wind':
            msg = '💨 WIND POWER! Press W to blow wind!';
            break;
    }
    
    let indicator = document.getElementById('powerup-indicator');
    indicator.textContent = msg;
    indicator.classList.remove('hidden');
    
    createParticles(powerup.x, powerup.y, '#ffd700', 30);
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vy += 0.3;
        return p.life > 0;
    });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30 + Math.random() * 20,
            color: color,
            size: 5 + Math.random() * 5
        });
    }
}

function checkCollisions() {
    // Handled in other functions
}

// ===== DRAWING FUNCTIONS =====
function drawSamuraiBob(x, y, facingRight, shielding, swordSwinging) {
    ctx.save();
    ctx.translate(x, y);
    if (!facingRight) {
        ctx.scale(-1, 1);
    }
    
    // Body (kimono)
    ctx.fillStyle = '#4a90e2'; // Blue kimono
    ctx.fillRect(-15, -10, 30, 40); // Body
    
    // White collar
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12, -10, 24, 8);
    
    // Black belt
    ctx.fillStyle = '#000000';
    ctx.fillRect(-15, 10, 30, 5);
    
    // Red pants
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-12, 15, 24, 25);
    
    // Head
    ctx.fillStyle = '#fdbcb4'; // Skin tone
    ctx.beginPath();
    ctx.arc(0, -25, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Black hair (topknot)
    ctx.fillStyle = '#000000';
    ctx.fillRect(-8, -38, 16, 8);
    ctx.beginPath();
    ctx.arc(0, -38, 8, 0, Math.PI, true);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-18, -22, 4, 8);
    ctx.fillRect(14, -22, 4, 8);
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(-5, -28, 3, 3);
    ctx.fillRect(2, -28, 3, 3);
    
    // Eyebrows
    ctx.fillStyle = '#000000';
    ctx.fillRect(-6, -32, 4, 2);
    ctx.fillRect(2, -32, 4, 2);
    
    // Orange nose
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.arc(0, -25, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mustache
    ctx.fillStyle = '#000000';
    ctx.fillRect(-10, -23, 20, 4);
    ctx.beginPath();
    ctx.arc(-8, -23, 4, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -23, 4, 0, Math.PI);
    ctx.fill();
    
    // Cheeks (rosy blush)
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(-8, -20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -20, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (small smile)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -18, 2, 0, Math.PI);
    ctx.stroke();
    
    // Shield (left arm) - only when blocking
    if (shielding) {
        ctx.fillStyle = '#d4a574'; // Wooden center
        ctx.beginPath();
        ctx.arc(20, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Cherry blossom on shield
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Five petals
        for (let i = 0; i < 5; i++) {
            let angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
            let px = 20 + Math.cos(angle) * 6;
            let py = 0 + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // Center
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(20, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Grey rim
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(20, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Sword (swinging animation) - only when attacking
    if (swordSwinging) {
        let swingProgress = 1 - (player.swordSwingFrame / 15);
        let swordAngle = swingProgress * Math.PI * 0.8 - Math.PI * 0.4;
        
        ctx.save();
        ctx.rotate(swordAngle);
        
        // Sword handle near character (at origin)
        ctx.fillStyle = '#8b4513'; // Brown handle
        ctx.fillRect(13, -5, 4, 10);
        
        // Sword guard
        ctx.fillStyle = '#654321';
        ctx.fillRect(11, -5, 8, 3);
        
        // Sword blade extends outward from handle
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(15, -5); // Start at handle
        ctx.lineTo(15, -55); // Blade extends outward (downward when rotated)
        ctx.stroke();
        
        // Sword shine
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, -5);
        ctx.lineTo(16, -55);
        ctx.stroke();
        
        ctx.restore();
        
        // Sword arc effect (visual indicator of attack range) - matches actual range
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        let arcStart = swordAngle - Math.PI * 0.375; // 150 degree arc
        let arcEnd = swordAngle + Math.PI * 0.375;
        ctx.beginPath();
        ctx.arc(0, 0, 150, arcStart, arcEnd); // Match the 150 pixel range
        ctx.stroke();
        ctx.restore();
    }
    
    // Feet (black shoes)
    ctx.fillStyle = '#000000';
    ctx.fillRect(-8, 38, 6, 4);
    ctx.fillRect(2, 38, 6, 4);
    
    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    
    let size = enemy.type === 'Boss' ? ENEMY_SIZE * 1.5 : ENEMY_SIZE;
    let baseColor = enemy.color;
    
    // Visual indicator if stunned (slightly transparent with pulsing effect)
    if (enemy.stunned > 0) {
        let alpha = 0.4 + (enemy.stunned / 90) * 0.6 + Math.sin(Date.now() / 100) * 0.1;
        ctx.globalAlpha = Math.max(0.4, Math.min(1.0, alpha)); // Fade in as stun wears off
    }
    
    // Different enemy designs based on type
    if (enemy.type === 'Grunt') {
        // Simple demon/oni creature
        // Body
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Horns
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(-8, -size/2);
        ctx.lineTo(-4, -size/2 - 8);
        ctx.lineTo(0, -size/2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, -size/2);
        ctx.lineTo(4, -size/2 - 8);
        ctx.lineTo(0, -size/2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-6, -5, 4, 4);
        ctx.fillRect(2, -5, 4, 4);
        
        // Mouth
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 5, 6, 0, Math.PI);
        ctx.fill();
        
    } else if (enemy.type === 'Speedy') {
        // Small fast creature
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pointed ears
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/3);
        ctx.lineTo(-size/2 - 4, -size/2);
        ctx.lineTo(-size/2 + 2, -size/3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size/2, -size/3);
        ctx.lineTo(size/2 + 4, -size/2);
        ctx.lineTo(size/2 - 2, -size/3);
        ctx.fill();
        
        // Big eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-4, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-4, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        
    } else if (enemy.type === 'Tank') {
        // Large armored creature
        ctx.fillStyle = baseColor;
        ctx.fillRect(-size/2, -size/2, size, size);
        
        // Armor plates
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-size/2, -size/2, size, 8);
        ctx.fillRect(-size/2, size/2 - 8, size, 8);
        ctx.fillRect(-size/2, -size/2, 8, size);
        ctx.fillRect(size/2 - 8, -size/2, 8, size);
        
        // Single eye
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
    } else if (enemy.type === 'Assassin') {
        // Stealthy ninja-like creature
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Mask
        ctx.fillStyle = '#000000';
        ctx.fillRect(-size/2, -size/3, size, size/2);
        
        // Eyes
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-6, -8, 3, 3);
        ctx.fillRect(3, -8, 3, 3);
        
        // Shuriken-like symbol
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(0, size/2);
        ctx.moveTo(-size/2, 0);
        ctx.lineTo(size/2, 0);
        ctx.stroke();
        
    } else if (enemy.type === 'Brute') {
        // Muscular creature
        ctx.fillStyle = baseColor;
        ctx.fillRect(-size/2, -size/2, size, size);
        
        // Muscles
        ctx.fillStyle = '#d35400';
        ctx.fillRect(-size/2 + 4, -size/2 + 4, 8, 12);
        ctx.fillRect(size/2 - 12, -size/2 + 4, 8, 12);
        
        // Angry face
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -size/2 + 4, 3, 3);
        ctx.fillRect(3, -size/2 + 4, 3, 3);
        
        // Frown
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 2, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
        
    } else if (enemy.type === 'Boss') {
        // Large demon boss
        // Body
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Multiple horns
        for (let i = -2; i <= 2; i++) {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(i * 6, -size/2);
            ctx.lineTo(i * 6 - 2, -size/2 - 10);
            ctx.lineTo(i * 6 + 2, -size/2 - 10);
            ctx.fill();
        }
        
        // Glowing eyes
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(-10, -8, 6, 6);
        ctx.fillRect(4, -8, 6, 6);
        ctx.shadowBlur = 0;
        
        // Large mouth
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 10, 12, 0, Math.PI);
        ctx.fill();
        
        // Teeth
        ctx.fillStyle = '#ffffff';
        for (let i = -8; i <= 8; i += 4) {
            ctx.fillRect(i - 1, 8, 2, 4);
        }
    }
    
    ctx.restore();
    
    // Reset alpha after drawing
    ctx.globalAlpha = 1;
    
    // Health bar
    let healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = '#000';
    ctx.fillRect(enemy.x - 20, enemy.y - size/2 - 12, 40, 5);
    ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(enemy.x - 20, enemy.y - size/2 - 12, 40 * healthPercent, 5);
}

// ===== RENDER =====
function render() {
    let gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#3498db');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#27ae60';
    ctx.fillRect(100, 100, CANVAS_WIDTH - 200, CANVAS_HEIGHT - 200);
    ctx.strokeStyle = '#229954';
    ctx.lineWidth = 5;
    ctx.strokeRect(100, 100, CANVAS_WIDTH - 200, CANVAS_HEIGHT - 200);

    particles.forEach(p => {
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        if (p.type === 'leaf') {
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(10, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-10, 0);
            ctx.fill();
        } else if (p.type === 'dragon') {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(-15, -15, 30, 30);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(-5, -20, 10, 10);
        } else if (p.type === 'wind') {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.stroke();
        } else if (p.type === 'heart') {
            // Draw heart shape
            ctx.globalAlpha = 0.8 + Math.sin(p.rotation * 2) * 0.2;
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            // Left part of heart
            ctx.moveTo(0, 5);
            ctx.bezierCurveTo(-8, -8, -15, -8, -15, 0);
            ctx.bezierCurveTo(-15, 8, -8, 12, 0, 18);
            // Right part of heart
            ctx.bezierCurveTo(8, 12, 15, 8, 15, 0);
            ctx.bezierCurveTo(15, -8, 8, -8, 0, 5);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = '#ffb6c1';
            ctx.beginPath();
            ctx.moveTo(0, 5);
            ctx.bezierCurveTo(-4, -4, -8, -4, -8, 0);
            ctx.bezierCurveTo(-8, 4, -4, 6, 0, 10);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    });

    enemies.forEach(enemy => {
        drawEnemy(enemy);
    });

    ctx.save();
    
    // Power-up effects
    if (player.powerup === 'leaf' && player.invincible) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#2ecc71';
    } else if (player.powerup === 'dragon') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4400';
    } else if (player.powerup === 'wind') {
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3498db';
    }
    
    // Draw Samurai Bob
    drawSamuraiBob(player.x, player.y, player.facingRight, player.shielding, player.swordSwingFrame > 0);
    
    ctx.restore();
    ctx.globalAlpha = 1;
}

function updateHUD() {
    let minutes = Math.floor(gameTime / 60);
    let seconds = gameTime % 60;
    document.getElementById('timer').textContent = 
        `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('health').textContent = `❤️ Health: ${Math.max(0, Math.floor(player.health))}`;
    document.getElementById('speed-mult').textContent = `⚡ Speed: x${speedMult.toFixed(1)}`;
    document.getElementById('power-mult').textContent = `💪 Power: x${powerMult.toFixed(1)}`;
    document.getElementById('kills').textContent = `🗡️ Kills: ${kills}`;
    
    // Show armor and strength if they've increased
    let armorPercent = Math.floor(player.armor * 100);
    let strengthMult = player.strength.toFixed(1);
    // You could add these to HUD if there's space, or they're shown in final stats
}

function gameOver() {
    gameState = 'gameover';
    if (soundEnabled) sounds.gameOver();
    
    let minutes = Math.floor(gameTime / 60);
    let seconds = gameTime % 60;
    
    document.getElementById('final-time').textContent = 
        `Time Survived: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('final-score').textContent = `Final Score: ${score}`;
    document.getElementById('final-kills').textContent = `Total Kills: ${kills}`;
    document.getElementById('final-speed').textContent = `Max Speed: x${speedMult.toFixed(1)}`;
    document.getElementById('final-power').textContent = `Max Power: x${powerMult.toFixed(1)}`;
    
    // Add armor and strength to final stats
    let armorPercent = Math.floor(player.armor * 100);
    let strengthMult = player.strength.toFixed(1);
    
    // Check if armor/strength elements exist, if not create them
    let armorEl = document.getElementById('final-armor');
    let strengthEl = document.getElementById('final-strength');
    if (!armorEl) {
        const statsDiv = document.getElementById('final-stats');
        armorEl = document.createElement('p');
        armorEl.id = 'final-armor';
        statsDiv.appendChild(armorEl);
        strengthEl = document.createElement('p');
        strengthEl.id = 'final-strength';
        statsDiv.appendChild(strengthEl);
    }
    armorEl.textContent = `🛡️ Armor: ${armorPercent}% damage reduction`;
    strengthEl.textContent = `⚔️ Strength: x${strengthMult} damage multiplier`;
    
    const isNewHighScore = addHighScore(score, kills, gameTime);
    displayHighScores();
    
    if (isNewHighScore && score > 0) {
        if (soundEnabled) sounds.highScore();
        document.getElementById('new-high-score').classList.remove('hidden');
    } else {
        document.getElementById('new-high-score').classList.add('hidden');
    }
    
    showScreen('gameover-screen');
    
    // Check scroll position and show prompts
    const gameoverScreen = document.getElementById('gameover-screen');
    const scrollUpPrompt = document.getElementById('scroll-up-prompt');
    const scrollDownPrompt = document.getElementById('scroll-down-prompt');
    
    function checkScroll() {
        const scrollTop = gameoverScreen.scrollTop;
        const scrollHeight = gameoverScreen.scrollHeight;
        const clientHeight = gameoverScreen.clientHeight;
        const scrollBottom = scrollHeight - scrollTop - clientHeight;
        
        // Show scroll up prompt if scrolled down
        if (scrollTop > 50) {
            scrollUpPrompt.classList.remove('hidden');
        } else {
            scrollUpPrompt.classList.add('hidden');
        }
        
        // Show scroll down prompt if can scroll down
        if (scrollBottom > 50) {
            scrollDownPrompt.classList.remove('hidden');
        } else {
            scrollDownPrompt.classList.add('hidden');
        }
    }
    
    // Check immediately and on scroll
    setTimeout(checkScroll, 100);
    gameoverScreen.addEventListener('scroll', checkScroll);
    
    // Also check on resize
    window.addEventListener('resize', checkScroll);
}

window.onload = init;
