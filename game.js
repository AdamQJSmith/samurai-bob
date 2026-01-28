// ===== GAME STATE ===== v3-epic-overhaul
let gameState = 'title';
let scene, camera, renderer;
let player, enemies = [], particles = [];
let clock, deltaTime;
let keys = {}, mouseDown = {};

// ===== SCREEN SHAKE SYSTEM =====
const screenShake = {
    intensity: 0,
    duration: 0,
    decay: 0.9,
    offset: new THREE.Vector3()
};

function triggerScreenShake(intensity, duration = 0.1) {
    screenShake.intensity = Math.max(screenShake.intensity, intensity);
    screenShake.duration = Math.max(screenShake.duration, duration);
}

function updateScreenShake() {
    if (screenShake.duration > 0) {
        screenShake.offset.set(
            (Math.random() - 0.5) * 2 * screenShake.intensity,
            (Math.random() - 0.5) * 2 * screenShake.intensity,
            (Math.random() - 0.5) * 2 * screenShake.intensity
        );
        screenShake.intensity *= screenShake.decay;
        screenShake.duration -= deltaTime;
    } else {
        screenShake.offset.set(0, 0, 0);
        screenShake.intensity = 0;
    }
}

// ===== HIT STOP / FREEZE FRAME SYSTEM =====
const hitStop = {
    active: false,
    duration: 0,
    callback: null
};

function triggerHitStop(duration, callback = null) {
    hitStop.active = true;
    hitStop.duration = duration;
    hitStop.callback = callback;
}

function updateHitStop() {
    if (hitStop.active) {
        hitStop.duration -= deltaTime;
        if (hitStop.duration <= 0) {
            hitStop.active = false;
            if (hitStop.callback) hitStop.callback();
        }
        return true; // Game should be paused
    }
    return false;
}

// ===== FLOATING DAMAGE NUMBERS =====
let damageNumbers = [];

function createDamageNumber(position, damage, isCritical = false) {
    const number = {
        text: Math.floor(damage).toString(),
        position: position.clone(),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 5, (Math.random() - 0.5) * 2),
        life: 1.0,
        scale: isCritical ? 1.5 : 1.0,
        color: isCritical ? '#ffffff' : '#ffdd00',
        isCritical: isCritical
    };
    damageNumbers.push(number);
}

function updateDamageNumbers() {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const num = damageNumbers[i];
        num.life -= deltaTime * 1.5;
        num.position.add(num.velocity.clone().multiplyScalar(deltaTime));
        num.velocity.y -= 15 * deltaTime;
        num.scale = Math.min(num.scale + deltaTime * 2, num.isCritical ? 2.0 : 1.3);

        if (num.life <= 0) {
            damageNumbers.splice(i, 1);
        }
    }
}

function renderDamageNumbers() {
    damageNumbers.forEach(num => {
        const screenPos = num.position.clone().project(camera);
        const x = (screenPos.x + 1) / 2 * window.innerWidth;
        const y = (-screenPos.y + 1) / 2 * window.innerHeight;

        if (screenPos.z < 1) { // In front of camera
            let el = document.getElementById('damage-' + damageNumbers.indexOf(num));
            if (!el) {
                el = document.createElement('div');
                el.id = 'damage-' + damageNumbers.indexOf(num);
                el.className = 'damage-number';
                document.getElementById('game-screen').appendChild(el);
            }
            el.textContent = num.text;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.color = num.color;
            el.style.fontSize = (24 * num.scale) + 'px';
            el.style.opacity = Math.min(1, num.life * 2);
            el.style.transform = `translate(-50%, -50%) scale(${num.scale})`;
            el.style.textShadow = num.isCritical ? '0 0 10px #fff, 0 0 20px #fff' : '2px 2px 0 #000';
        }
    });

    // Clean up old damage number elements
    document.querySelectorAll('.damage-number').forEach(el => {
        const idx = parseInt(el.id.replace('damage-', ''));
        if (isNaN(idx) || idx >= damageNumbers.length) {
            el.remove();
        }
    });
}

// ===== COMBO SYSTEM =====
const comboSystem = {
    count: 0,
    timer: 0,
    maxTimer: 2.0,
    multiplier: 1.0,
    lastMilestone: 0
};

function addComboHit() {
    comboSystem.count++;
    comboSystem.timer = comboSystem.maxTimer;

    // Update multiplier based on combo count
    if (comboSystem.count >= 20) {
        comboSystem.multiplier = 3.0;
    } else if (comboSystem.count >= 10) {
        comboSystem.multiplier = 2.0;
    } else if (comboSystem.count >= 5) {
        comboSystem.multiplier = 1.5;
    } else {
        comboSystem.multiplier = 1.0;
    }

    // Check for milestones
    const milestones = [5, 10, 20, 50, 100];
    if (milestones.includes(comboSystem.count) && comboSystem.count > comboSystem.lastMilestone) {
        comboSystem.lastMilestone = comboSystem.count;
        triggerComboMilestone(comboSystem.count);
    }
}

function triggerComboMilestone(count) {
    // Flash the combo counter and play sound
    const comboEl = document.getElementById('combo-counter');
    if (comboEl) {
        comboEl.classList.add('milestone');
        setTimeout(() => comboEl.classList.remove('milestone'), 500);
    }
    triggerScreenShake(0.3, 0.15);
    if (audioManager) audioManager.play('comboMilestone');
}

function updateComboSystem() {
    if (comboSystem.count > 0) {
        comboSystem.timer -= deltaTime;
        if (comboSystem.timer <= 0) {
            // Combo broken
            if (comboSystem.count >= 5 && audioManager) {
                audioManager.play('comboBreak');
            }
            comboSystem.count = 0;
            comboSystem.multiplier = 1.0;
            comboSystem.lastMilestone = 0;
        }
    }
}

function renderComboCounter() {
    let comboEl = document.getElementById('combo-counter');
    if (!comboEl) {
        comboEl = document.createElement('div');
        comboEl.id = 'combo-counter';
        document.getElementById('hud').appendChild(comboEl);
    }

    if (comboSystem.count >= 2) {
        comboEl.style.display = 'block';
        comboEl.innerHTML = `
            <div class="combo-count">${comboSystem.count}</div>
            <div class="combo-label">COMBO</div>
            <div class="combo-mult">x${comboSystem.multiplier.toFixed(1)}</div>
        `;
        // Pulse effect based on combo count
        const pulseScale = 1 + Math.sin(Date.now() / 100) * 0.05 * Math.min(comboSystem.count / 10, 1);
        comboEl.style.transform = `translate(-50%, 0) scale(${pulseScale})`;
    } else {
        comboEl.style.display = 'none';
    }
}

// ===== AUDIO SYSTEM (Web Audio API Synthesized Sounds) =====
let audioContext = null;
let audioManager = null;

function initAudioSystem() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioManager = {
            masterVolume: 0.5,
            muted: false,
            sounds: {},

            play: function(soundName, volume = 1.0) {
                if (this.muted) return;
                if (!audioContext || audioContext.state === 'suspended') {
                    audioContext.resume();
                }

                const sound = this.sounds[soundName];
                if (sound) {
                    sound(volume * this.masterVolume);
                }
            },

            toggleMute: function() {
                this.muted = !this.muted;
                return this.muted;
            },

            // Synthesized sound generators
            sounds: {
                // Sword whoosh - filtered noise burst
                swordSwing: function(volume) {
                    const ctx = audioContext;
                    const duration = 0.15;

                    const noise = ctx.createBufferSource();
                    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < buffer.length; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    noise.buffer = buffer;

                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(1000, ctx.currentTime);
                    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + duration);
                    filter.Q.value = 1;

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    noise.start();
                },

                // Hit impact - low frequency thump
                hitImpact: function(volume) {
                    const ctx = audioContext;

                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(150, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

                    // Add some noise for punch
                    const noise = ctx.createBufferSource();
                    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < buffer.length; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    noise.buffer = buffer;

                    const noiseFilter = ctx.createBiquadFilter();
                    noiseFilter.type = 'lowpass';
                    noiseFilter.frequency.value = 500;

                    const noiseGain = ctx.createGain();
                    noiseGain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
                    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.15);

                    noise.connect(noiseFilter);
                    noiseFilter.connect(noiseGain);
                    noiseGain.connect(ctx.destination);
                    noise.start();
                },

                // Enemy death - pitch-shifted pop
                enemyDeath: function(volume) {
                    const ctx = audioContext;

                    const osc = ctx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

                    const osc2 = ctx.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(600, ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

                    osc.connect(gain);
                    osc2.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc2.start();
                    osc.stop(ctx.currentTime + 0.2);
                    osc2.stop(ctx.currentTime + 0.15);
                },

                // Shield block - metallic clang
                shieldBlock: function(volume) {
                    const ctx = audioContext;

                    const osc1 = ctx.createOscillator();
                    osc1.type = 'triangle';
                    osc1.frequency.setValueAtTime(800, ctx.currentTime);
                    osc1.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);

                    const osc2 = ctx.createOscillator();
                    osc2.type = 'square';
                    osc2.frequency.setValueAtTime(1200, ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

                    // Metallic resonance
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = 2000;
                    filter.Q.value = 5;

                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    osc1.start();
                    osc2.start();
                    osc1.stop(ctx.currentTime + 0.35);
                    osc2.stop(ctx.currentTime + 0.25);
                },

                // Jump sound
                jump: function(volume) {
                    const ctx = audioContext;

                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.12);
                },

                // Land sound
                land: function(volume) {
                    const ctx = audioContext;

                    const noise = ctx.createBufferSource();
                    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < buffer.length; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    noise.buffer = buffer;

                    const filter = ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 300;

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    noise.start();
                },

                // Player hurt
                playerHurt: function(volume) {
                    const ctx = audioContext;

                    const osc = ctx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

                    const filter = ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 800;

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.25);
                },

                // Combo milestone
                comboMilestone: function(volume) {
                    const ctx = audioContext;
                    const notes = [523, 659, 784]; // C5, E5, G5 - major chord arpeggio

                    notes.forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.value = freq;

                        const gain = ctx.createGain();
                        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
                        gain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + i * 0.05 + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.05 + 0.3);

                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(ctx.currentTime + i * 0.05);
                        osc.stop(ctx.currentTime + i * 0.05 + 0.35);
                    });
                },

                // Combo break
                comboBreak: function(volume) {
                    const ctx = audioContext;

                    const osc = ctx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.35);
                },

                // Ability activation
                abilityActivate: function(volume) {
                    const ctx = audioContext;
                    const notes = [392, 523, 659, 784]; // G4, C5, E5, G5

                    notes.forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.value = freq;

                        const gain = ctx.createGain();
                        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.03);
                        gain.gain.linearRampToValueAtTime(volume * 0.15, ctx.currentTime + i * 0.03 + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.03 + 0.2);

                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(ctx.currentTime + i * 0.03);
                        osc.stop(ctx.currentTime + i * 0.03 + 0.25);
                    });
                },

                // Critical hit
                criticalHit: function(volume) {
                    const ctx = audioContext;

                    // Impact
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

                    // High pitched ring
                    const ring = ctx.createOscillator();
                    ring.type = 'sine';
                    ring.frequency.value = 1200;

                    const ringGain = ctx.createGain();
                    ringGain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
                    ringGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.25);

                    ring.connect(ringGain);
                    ringGain.connect(ctx.destination);
                    ring.start();
                    ring.stop(ctx.currentTime + 0.45);
                }
            }
        };

        console.log('Audio system initialized');
    } catch (e) {
        console.warn('Web Audio API not supported:', e);
    }
}

// ===== SWORD TRAIL SYSTEM =====
let swordTrailPoints = [];
const SWORD_TRAIL_LENGTH = 15;

function updateSwordTrail() {
    if (!player || !player.userData.sword) return;

    // Only add trail points during attack
    if (playerStats.isAttackingNow) {
        const swordTip = new THREE.Vector3(0, 2.5, 0);
        player.userData.sword.localToWorld(swordTip);

        swordTrailPoints.unshift({
            position: swordTip.clone(),
            age: 0
        });

        // Limit trail length
        if (swordTrailPoints.length > SWORD_TRAIL_LENGTH) {
            swordTrailPoints.pop();
        }
    }

    // Age and remove old points
    for (let i = swordTrailPoints.length - 1; i >= 0; i--) {
        swordTrailPoints[i].age += deltaTime;
        if (swordTrailPoints[i].age > 0.3) {
            swordTrailPoints.splice(i, 1);
        }
    }
}

function renderSwordTrail() {
    // Remove old trail mesh
    const oldTrail = scene.getObjectByName('swordTrail');
    if (oldTrail) scene.remove(oldTrail);

    if (swordTrailPoints.length < 2) return;

    // Create trail geometry
    const positions = [];
    const colors = [];

    for (let i = 0; i < swordTrailPoints.length; i++) {
        const point = swordTrailPoints[i];
        const alpha = 1 - (point.age / 0.3);

        positions.push(point.position.x, point.position.y, point.position.z);
        colors.push(1, 1, 1, alpha);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        linewidth: 3
    });

    const trail = new THREE.Line(geometry, material);
    trail.name = 'swordTrail';
    scene.add(trail);
}

// ===== POST-PROCESSING EFFECTS =====
function initPostProcessing() {
    const gameScreen = document.getElementById('game-screen');

    // Cinematic vignette (always on)
    if (!document.getElementById('cinematic-vignette')) {
        const vignette = document.createElement('div');
        vignette.id = 'cinematic-vignette';
        gameScreen.appendChild(vignette);
    }

    // Color grading overlay
    if (!document.getElementById('color-grade')) {
        const colorGrade = document.createElement('div');
        colorGrade.id = 'color-grade';
        gameScreen.appendChild(colorGrade);
    }

    // Bloom layer
    if (!document.getElementById('bloom-layer')) {
        const bloom = document.createElement('div');
        bloom.id = 'bloom-layer';
        gameScreen.appendChild(bloom);
    }

    // Action bloom for hits
    if (!document.getElementById('action-bloom')) {
        const actionBloom = document.createElement('div');
        actionBloom.id = 'action-bloom';
        actionBloom.className = 'action-bloom';
        gameScreen.appendChild(actionBloom);
    }

    // Speed lines
    if (!document.getElementById('speed-lines')) {
        const speedLines = document.createElement('div');
        speedLines.id = 'speed-lines';
        gameScreen.appendChild(speedLines);
    }
}

function updatePostProcessing() {
    const bloomLayer = document.getElementById('bloom-layer');
    const actionBloom = document.getElementById('action-bloom');
    const speedLines = document.getElementById('speed-lines');

    if (!bloomLayer) return;

    // Ability-specific bloom
    if (playerStats.isDragonForm) {
        bloomLayer.className = 'dragon-bloom';
    } else if (playerStats.isWindForm) {
        bloomLayer.className = 'wind-bloom';
    } else if (playerStats.isLeafForm) {
        bloomLayer.className = 'leaf-bloom';
    } else {
        bloomLayer.className = '';
    }

    // Speed lines when moving fast
    if (speedLines && player) {
        const velocity = playerStats.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (speed > 10 * playerStats.speedMult) {
            speedLines.classList.add('active');
        } else {
            speedLines.classList.remove('active');
        }
    }
}

function triggerActionBloom() {
    const actionBloom = document.getElementById('action-bloom');
    if (actionBloom) {
        actionBloom.classList.add('flash');
        setTimeout(() => actionBloom.classList.remove('flash'), 50);
    }
}

// Player stats
let playerStats = {
    health: 100,
    maxHealth: 100,
    speed: 8,
    jumpPower: 15,
    kills: 0,
    score: 0,
    speedMult: 1.0,
    powerMult: 1.0,
    isJumping: false,
    velocity: new THREE.Vector3(),
    isAttacking: false,
    attackCooldown: 0,
    isBlocking: false,
    // Mario-style jump tracking
    jumpCount: 0,
    lastJumpTime: 0,
    isGrounded: true,
    jumpComboWindow: 0.4, // seconds to chain jumps
    isGroundPounding: false,
    groundPoundSpeed: 35,
    // Ability states
    currentAbility: null, // 'leaf', 'dragon', 'wind'
    abilityTimer: 0,
    abilityDuration: 10, // seconds
    // Leaf form
    leafParticles: [],
    isLeafForm: false,
    // Dragon form
    isDragonForm: false,
    fireBreathCooldown: 0,
    // Wind form
    isWindForm: false,
    windGustCooldown: 0,
    windChargeTime: 0,
    isTransparent: false
};

let gameTimer = 0;
let enemySpawnTimer = 0;
let enemySpawnRate = 120;
let powerUpSpawnTimer = 0;

if (window.__samuraiLog) {
    window.__samuraiLog('game.js executing...');
}

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

    const cx = size / 2;
    const cy = size / 2;
    const faceRadius = 230;

    // ===== CLEAR CANVAS (transparent background) =====
    ctx.clearRect(0, 0, size, size);

    // ===== CLIP to circular region =====
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, faceRadius, 0, Math.PI * 2);
    ctx.clip();

    // ===== SKIN BASE =====
    ctx.fillStyle = '#E8B080';
    ctx.fillRect(0, 0, size, size);

    // Subtle shading for 3D look
    const gradient = ctx.createRadialGradient(cx - 40, cy - 60, 30, cx, cy, faceRadius);
    gradient.addColorStop(0, 'rgba(255, 225, 190, 0.4)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(150, 100, 60, 0.25)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // ===== EYEBROWS - Very thick, angular =====
    ctx.fillStyle = '#252525';

    // Left eyebrow - thick wedge pointing down to center
    ctx.beginPath();
    ctx.moveTo(50, 145);
    ctx.lineTo(75, 90);
    ctx.lineTo(215, 120);
    ctx.lineTo(200, 172);
    ctx.lineTo(65, 162);
    ctx.closePath();
    ctx.fill();

    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(462, 145);
    ctx.lineTo(437, 90);
    ctx.lineTo(297, 120);
    ctx.lineTo(312, 172);
    ctx.lineTo(447, 162);
    ctx.closePath();
    ctx.fill();

    // ===== EYES - Large ovals =====
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(138, 200, 30, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(374, 200, 30, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(125, 185, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(361, 185, 12, 0, Math.PI * 2);
    ctx.fill();

    // ===== ROSY CHEEKS =====
    ctx.fillStyle = '#E07575';
    ctx.beginPath();
    ctx.arc(65, 285, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(447, 285, 48, 0, Math.PI * 2);
    ctx.fill();

    // ===== MUSTACHE - THE signature feature =====
    ctx.fillStyle = '#252525';

    // Left curl - big and curly
    ctx.beginPath();
    ctx.moveTo(cx, 338);
    ctx.bezierCurveTo(190, 343, 120, 322, 75, 275);
    ctx.bezierCurveTo(45, 245, 28, 208, 40, 188);
    ctx.bezierCurveTo(55, 193, 70, 215, 90, 255);
    ctx.bezierCurveTo(120, 310, 170, 358, cx, 373);
    ctx.closePath();
    ctx.fill();

    // Right curl
    ctx.beginPath();
    ctx.moveTo(cx, 338);
    ctx.bezierCurveTo(322, 343, 392, 322, 437, 275);
    ctx.bezierCurveTo(467, 245, 484, 208, 472, 188);
    ctx.bezierCurveTo(457, 193, 442, 215, 422, 255);
    ctx.bezierCurveTo(392, 310, 342, 358, cx, 373);
    ctx.closePath();
    ctx.fill();

    // Mustache center bulge
    ctx.beginPath();
    ctx.ellipse(cx, 352, 65, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== MOUTH - Wide smile =====
    ctx.fillStyle = '#CC2828';
    ctx.beginPath();
    ctx.moveTo(170, 408);
    ctx.quadraticCurveTo(cx, 495, 342, 408);
    ctx.quadraticCurveTo(cx, 450, 170, 408);
    ctx.fill();

    // Restore from circular clip
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    TEXTURES.face = texture;
    return texture;
}

// Create body/kimono texture with collar and belt details
function createBodyTexture() {
    if (TEXTURES.body) return TEXTURES.body;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Blue kimono base
    ctx.fillStyle = '#3366DD';
    ctx.fillRect(0, 0, 256, 256);

    // V-neck collar (white/cream)
    ctx.fillStyle = '#EEEEDD';
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(70, 0);
    ctx.lineTo(100, 100);
    ctx.lineTo(128, 120);
    ctx.lineTo(156, 100);
    ctx.lineTo(186, 0);
    ctx.lineTo(128, 0);
    ctx.fill();

    // Dark trim on collar
    ctx.strokeStyle = '#1a2a4a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(65, 0);
    ctx.lineTo(95, 105);
    ctx.lineTo(128, 125);
    ctx.lineTo(161, 105);
    ctx.lineTo(191, 0);
    ctx.stroke();

    // Belt area (black obi)
    ctx.fillStyle = '#252525';
    ctx.fillRect(0, 180, 256, 50);

    // Subtle fabric texture
    ctx.strokeStyle = 'rgba(0, 0, 50, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    TEXTURES.body = texture;
    return texture;
}

function createShieldTexture() {
    if (TEXTURES.shield) return TEXTURES.shield;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    // Wood background - warm brown like reference
    ctx.fillStyle = '#b87333';
    ctx.fillRect(0, 0, size, size);
    
    // Vertical wood plank lines (like reference)
    ctx.strokeStyle = 'rgba(80, 45, 20, 0.5)';
    ctx.lineWidth = 4;
    const planks = 7;
    for (let i = 1; i < planks; i++) {
        const x = (i / planks) * size;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
    }

    // Cream/white 5-petal flower (matching reference exactly)
    ctx.fillStyle = '#f0ebe0';
    
    const petalDist = 95;
    const petalSize = 55;
    
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(angle) * petalDist * 0.6;
        const py = cy + Math.sin(angle) * petalDist * 0.6;
        
        ctx.beginPath();
        ctx.ellipse(px, py, petalSize, petalSize * 0.7, angle, 0, Math.PI * 2);
        ctx.fill();
    }

    // Gold/yellow center circle
    ctx.fillStyle = '#d4a030';
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Cross pattern in center (like reference)
    ctx.strokeStyle = '#a07820';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy);
    ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22);
    ctx.lineTo(cx, cy + 22);
    ctx.stroke();
    
    // Small center dot
    ctx.fillStyle = '#c49028';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
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

    // Bright vibrant grass green like reference
    ctxTop.fillStyle = '#44AA44';
    ctxTop.fillRect(0, 0, size, size);

    // Visible alternating stripe pattern like reference
    const stripeWidth = 32;
    ctxTop.fillStyle = '#3D9A3D';
    for (let i = 0; i < size; i += stripeWidth * 2) {
        ctxTop.fillRect(0, i, size, stripeWidth);
    }

    // Subtle darker patches for natural variation
    ctxTop.fillStyle = 'rgba(50, 130, 50, 0.25)';
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 40 + Math.random() * 60;
        ctxTop.beginPath();
        ctxTop.arc(x, y, r, 0, Math.PI * 2);
        ctxTop.fill();
    }

    TEXTURES.grassTop = new THREE.CanvasTexture(canvasTop);
    TEXTURES.grassTop.wrapS = TEXTURES.grassTop.wrapT = THREE.RepeatWrapping;

    // Dirt sides texture - warmer brown tones
    const canvasSide = document.createElement('canvas');
    canvasSide.width = 256;
    canvasSide.height = 512;
    const ctxSide = canvasSide.getContext('2d');

    // Gradient from grass at top to warm brown dirt
    const dirtGradient = ctxSide.createLinearGradient(0, 0, 0, canvasSide.height);
    dirtGradient.addColorStop(0, '#44AA44');
    dirtGradient.addColorStop(0.05, '#5A9040');
    dirtGradient.addColorStop(0.12, '#8B7020');
    dirtGradient.addColorStop(0.3, '#8B6914');
    dirtGradient.addColorStop(1, '#6B4A0A');
    ctxSide.fillStyle = dirtGradient;
    ctxSide.fillRect(0, 0, canvasSide.width, canvasSide.height);

    // Add dirt texture detail
    ctxSide.fillStyle = 'rgba(100, 70, 20, 0.35)';
    for (let i = 0; i < 25; i++) {
        const x = Math.random() * canvasSide.width;
        const y = 80 + Math.random() * (canvasSide.height - 80);
        const w = 8 + Math.random() * 25;
        const h = 4 + Math.random() * 12;
        ctxSide.fillRect(x, y, w, h);
    }

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

// ===== CHECK THREE.JS IS LOADED =====
// This check will be done when init() is called, not here

// ===== CAPSULE GEOMETRY FALLBACK =====
// Create CapsuleGeometry if it doesn't exist (for older Three.js versions)
if (typeof THREE !== 'undefined' && !THREE.CapsuleGeometry) {
    THREE.CapsuleGeometry = class extends THREE.BufferGeometry {
        constructor(radius = 1, length = 1, capSubdivisions = 4, radialSegments = 8) {
            super();
            
            const vertices = [];
            const indices = [];
            
            // Create a cylinder-like shape (approximation of capsule)
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
            
            // Create indices
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

// ===== INITIALIZATION =====
function init() {
    console.log('init() called - initializing game...');
    if (window.__samuraiLog) {
        window.__samuraiLog('init() called - initializing game...');
    }
    
    // Check if THREE.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded! Waiting...');
        if (window.__samuraiLog) {
            window.__samuraiLog('THREE.js not loaded yet, retrying...', true);
        }
        setTimeout(init, 100); // Retry in 100ms
        return;
    }
    
    console.log('THREE.js is loaded, proceeding with initialization');
    if (window.__samuraiLog) {
        window.__samuraiLog('THREE.js is loaded, proceeding with initialization');
    }
    
    try {
        // Setup Three.js
        scene = new THREE.Scene();
        // Bright blue sky like reference image
        scene.background = new THREE.Color(0x70B8E8);
        scene.fog = new THREE.Fog(0x70B8E8, 100, 250);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.setClearColor(0x70B8E8, 1);
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        clock = new THREE.Clock();
    } catch (error) {
        console.error('Error initializing Three.js:', error);
        alert('Error loading game. Please refresh the page.');
        return;
    }

    // Lighting - softer, not too bright
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xccccbb, 0x667766, 0.3);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xeeeedd, 0.6);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.bias = -0.0005;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xbfd9ff, 0.35);
    fillLight.position.set(-40, 60, -25);
    scene.add(fillLight);

    // Create arena
    createArena();

    // Event listeners
    document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    // Mouse handlers are now in setupCameraControls()

    // UI buttons - with error handling
    const battleRoyaleBtn = document.getElementById('battle-royale-button');
    const restartBtn = document.getElementById('restart-button');
    
    console.log('Looking for button, found:', battleRoyaleBtn);
    
    if (battleRoyaleBtn) {
        battleRoyaleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Battle Royale button clicked! (from event listener)');
            try {
                if (typeof startGame === 'function') {
                    startGame();
                } else {
                    console.error('startGame is not a function!', typeof startGame);
                    alert('Error: startGame function not found');
                }
            } catch (error) {
                console.error('Error starting game:', error);
                alert('Error starting game: ' + error.message);
            }
        });
        console.log('Event listener attached to Battle Royale button');
    } else {
        console.error('Battle Royale button not found in DOM!');
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', startGame);
    }
    
    console.log('All button event listeners attached. init() complete.');
    
    // Settings button
    document.getElementById('settings-button').addEventListener('click', () => {
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('settings-screen').classList.remove('hidden');
    });
    
    // Back to menu button
    document.getElementById('back-to-menu').addEventListener('click', () => {
        document.getElementById('settings-screen').classList.add('hidden');
        document.getElementById('title-screen').classList.remove('hidden');
    });
    
    // Campaign button (disabled)
    document.getElementById('campaign-button').addEventListener('click', (e) => {
        e.preventDefault();
        // Do nothing, it's coming soon!
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// ===== FIXED CAMERA =====
function setupCameraControls() {
    const canvas = renderer.domElement;

    // Simple: left click = attack
    canvas.addEventListener('mousedown', (e) => {
        if (gameState === 'playing' && e.button === 0) {
            playerAttack();
        }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== CREATE ARENA - Floating island like reference image =====
function createArena() {
    createGrassTextures();

    const arenaGroup = new THREE.Group();
    arenaGroup.name = 'arenaGroup';

    // Brighter grass colors matching reference
    const grassGreen = 0x44AA44;
    const grassDark = 0x338833;
    const dirtBrown = 0x8B6914;
    const dirtDark = 0x6B4A0A;

    // === GRASS TOP with bright striped texture ===
    const topGeo = new THREE.CircleGeometry(ARENA_RADIUS, 64);
    const topMat = new THREE.MeshStandardMaterial({
        map: TEXTURES.grassTop,
        roughness: 0.85,
        metalness: 0.0
    });
    topMat.map.repeat.set(2, 2);
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = 0.02;
    topMesh.receiveShadow = true;
    arenaGroup.add(topMesh);

    // === JAGGED GRASS EDGE - Sharp triangular spikes like reference ===
    const grassBladeMat = new THREE.MeshStandardMaterial({ color: grassGreen, roughness: 0.8, flatShading: true });
    const grassBladeDarkMat = new THREE.MeshStandardMaterial({ color: 0x2D882D, roughness: 0.8, flatShading: true });

    // Create DENSE grass blade spikes around the entire edge - MORE blades, BIGGER
    const numBlades = 180;
    for (let i = 0; i < numBlades; i++) {
        const angle = (i / numBlades) * Math.PI * 2;

        // Randomize blade properties - TALLER and sharper
        const bladeHeight = 1.2 + Math.random() * 1.0;
        const bladeWidth = 0.35 + Math.random() * 0.25;

        // Create sharp triangular grass blade (3-sided cone for sharper look)
        const bladeGeo = new THREE.ConeGeometry(bladeWidth, bladeHeight, 3);
        const bladeMat = Math.random() > 0.4 ? grassBladeMat : grassBladeDarkMat;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);

        // Position at edge, pointing downward
        const dist = ARENA_RADIUS - 0.1 + Math.random() * 0.3;
        blade.position.set(
            Math.cos(angle) * dist,
            -bladeHeight / 2 + 0.1,
            Math.sin(angle) * dist
        );

        // Point downward with slight outward angle
        blade.rotation.x = Math.PI + (Math.random() - 0.5) * 0.3;
        blade.rotation.z = (Math.random() - 0.5) * 0.25;

        // Face outward slightly
        blade.rotation.y = angle;

        arenaGroup.add(blade);
    }

    // Second row of grass blades slightly behind for density
    for (let i = 0; i < 120; i++) {
        const angle = (i / 120) * Math.PI * 2 + 0.02;
        const bladeHeight = 0.9 + Math.random() * 0.8;
        const bladeWidth = 0.3 + Math.random() * 0.2;
        const bladeGeo = new THREE.ConeGeometry(bladeWidth, bladeHeight, 3);
        const bladeMat = Math.random() > 0.5 ? grassBladeMat : grassBladeDarkMat;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        const dist = ARENA_RADIUS - 0.4 + Math.random() * 0.2;
        blade.position.set(
            Math.cos(angle) * dist,
            -bladeHeight / 2 - 0.2,
            Math.sin(angle) * dist
        );
        blade.rotation.x = Math.PI + (Math.random() - 0.5) * 0.35;
        blade.rotation.y = angle;
        arenaGroup.add(blade);
    }

    // === GRASS EDGE BULK - rounded rim at top ===
    const edgeGeo = new THREE.TorusGeometry(ARENA_RADIUS - 0.4, 0.4, 10, 64);
    const edgeMat = new THREE.MeshStandardMaterial({ color: grassGreen, roughness: 0.85, metalness: 0 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.05;
    arenaGroup.add(edge);

    // === DIRT SIDES - warm brown layers like reference ===
    // Upper section - transition from grass to dirt
    const upperSideGeo = new THREE.CylinderGeometry(ARENA_RADIUS - 0.3, ARENA_RADIUS * 0.82, 1.8, 48, 1, true);
    const upperSideMat = new THREE.MeshStandardMaterial({ color: dirtBrown, roughness: 0.9, metalness: 0 });
    const upperSide = new THREE.Mesh(upperSideGeo, upperSideMat);
    upperSide.position.y = -1.0;
    arenaGroup.add(upperSide);

    // Middle dirt section
    const midSideGeo = new THREE.CylinderGeometry(ARENA_RADIUS * 0.82, ARENA_RADIUS * 0.55, 3.0, 48, 1, true);
    const midSideMat = new THREE.MeshStandardMaterial({ color: dirtDark, roughness: 0.9, metalness: 0 });
    const midSide = new THREE.Mesh(midSideGeo, midSideMat);
    midSide.position.y = -3.4;
    arenaGroup.add(midSide);

    // Lower tapered section
    const lowerSideGeo = new THREE.CylinderGeometry(ARENA_RADIUS * 0.55, ARENA_RADIUS * 0.25, 3.0, 48, 1, true);
    const lowerSideMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.9, metalness: 0 });
    const lowerSide = new THREE.Mesh(lowerSideGeo, lowerSideMat);
    lowerSide.position.y = -6.4;
    arenaGroup.add(lowerSide);

    // Bottom tip
    const bottomTipGeo = new THREE.ConeGeometry(ARENA_RADIUS * 0.25, 2.5, 32);
    const bottomTipMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9, metalness: 0 });
    const bottomTip = new THREE.Mesh(bottomTipGeo, bottomTipMat);
    bottomTip.position.y = -9.0;
    bottomTip.rotation.x = Math.PI;
    arenaGroup.add(bottomTip);

    // Dirt texture lumps on sides
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
        const lumpGeo = new THREE.SphereGeometry(1.0 + Math.random() * 0.6, 8, 8);
        const lumpMat = new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? dirtBrown : dirtDark,
            roughness: 0.9, metalness: 0
        });
        const lump = new THREE.Mesh(lumpGeo, lumpMat);
        const dist = ARENA_RADIUS * (0.6 + Math.random() * 0.15);
        lump.position.set(
            Math.cos(angle) * dist,
            -3.5 - Math.random() * 3,
            Math.sin(angle) * dist
        );
        lump.scale.set(1.3, 0.7, 1);
        arenaGroup.add(lump);
    }

    scene.add(arenaGroup);

    // === WATER below - bright blue like reference ===
    const waterGeo = new THREE.PlaneGeometry(500, 500);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x3388CC,
        roughness: 0.2,
        metalness: 0.05
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -18;
    scene.add(water);

    // Background hills, trees, clouds
    addBackgroundElements();
}

function addBackgroundElements() {
    const backgroundGroup = new THREE.Group();
    backgroundGroup.name = 'backgroundGroup';

    // === ROLLING GREEN HILLS - bright saturated green like reference ===
    const hillColors = [0x44AA44, 0x55BB55, 0x3D9D3D, 0x66CC66];

    // Large distant hills
    for (let i = 0; i < 8; i++) {
        const radius = 25 + Math.random() * 20;
        const hillGeo = new THREE.SphereGeometry(radius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const hillMat = new THREE.MeshStandardMaterial({
            color: hillColors[i % hillColors.length],
            roughness: 0.9,
            metalness: 0.0
        });
        const hill = new THREE.Mesh(hillGeo, hillMat);
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
        const distance = 60 + Math.random() * 30;
        hill.position.set(
            Math.cos(angle) * distance,
            -15,
            Math.sin(angle) * distance
        );
        backgroundGroup.add(hill);
    }

    // Closer medium hills
    for (let i = 0; i < 6; i++) {
        const radius = 15 + Math.random() * 10;
        const hillGeo = new THREE.SphereGeometry(radius, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
        const hillMat = new THREE.MeshStandardMaterial({
            color: hillColors[(i + 2) % hillColors.length],
            roughness: 0.9,
            metalness: 0.0
        });
        const hill = new THREE.Mesh(hillGeo, hillMat);
        const angle = (i / 6) * Math.PI * 2 + 0.5;
        const distance = 45 + Math.random() * 15;
        hill.position.set(
            Math.cos(angle) * distance,
            -15,
            Math.sin(angle) * distance
        );
        backgroundGroup.add(hill);
    }

    // === LARGE TREE on edge of arena - like reference ===
    // Thick brown trunk - warm rich brown like reference
    const trunkGeo = new THREE.CylinderGeometry(2.5, 3.5, 25, 24);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9, metalness: 0.0 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(18, 8, -8);
    backgroundGroup.add(trunk);

    // Trunk base bulge
    const trunkBaseGeo = new THREE.SphereGeometry(4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const trunkBase = new THREE.Mesh(trunkBaseGeo, trunkMat);
    trunkBase.position.set(18, -4, -8);
    trunkBase.scale.set(1, 0.6, 1);
    backgroundGroup.add(trunkBase);

    // Tree branches (simple stumps)
    const branchGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 12);
    const branch1 = new THREE.Mesh(branchGeo, trunkMat);
    branch1.position.set(16, 12, -7);
    branch1.rotation.z = 0.6;
    backgroundGroup.add(branch1);
    const branch2 = new THREE.Mesh(branchGeo, trunkMat);
    branch2.position.set(20, 14, -9);
    branch2.rotation.z = -0.5;
    backgroundGroup.add(branch2);

    // Large fluffy green foliage - multiple spheres, bright green like reference
    const foliageColor = 0x44BB44;
    const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85, metalness: 0.0 });

    const foliagePositions = [
        [18, 22, -8, 7],   // main center
        [15, 20, -6, 5],   // left
        [21, 20, -10, 5],  // right
        [17, 26, -7, 5],   // top left
        [20, 25, -9, 4],   // top right
        [18, 17, -8, 4],   // bottom
    ];

    foliagePositions.forEach(([x, y, z, r]) => {
        const foliageGeo = new THREE.SphereGeometry(r, 16, 16);
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.set(x, y, z);
        backgroundGroup.add(foliage);
    });

    // === FLUFFY WHITE CLOUDS - bright white like reference ===
    for (let i = 0; i < 10; i++) {
        const cloudGroup = new THREE.Group();
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1, metalness: 0, emissive: 0xFFFFFF, emissiveIntensity: 0.15 });

        // Each cloud is made of multiple spheres for fluffiness
        const numPuffs = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numPuffs; j++) {
            const puffSize = 3 + Math.random() * 3;
            const puffGeo = new THREE.SphereGeometry(puffSize, 12, 12);
            const puff = new THREE.Mesh(puffGeo, cloudMat);
            puff.position.set(
                j * 4 - numPuffs * 2,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            );
            puff.scale.set(1.5, 0.7, 1);
            cloudGroup.add(puff);
        }

        cloudGroup.position.set(
            (Math.random() - 0.5) * 180,
            30 + Math.random() * 20,
            (Math.random() - 0.5) * 180
        );

        backgroundGroup.add(cloudGroup);
    }

    // === DISTANT HORIZON HILLS - bright green like reference ===
    for (let i = 0; i < 12; i++) {
        const radius = 40 + Math.random() * 30;
        const hillGeo = new THREE.SphereGeometry(radius, 24, 24, 0, Math.PI * 2, 0, Math.PI / 3);
        const hillMat = new THREE.MeshStandardMaterial({
            color: 0x55BB55,
            roughness: 0.95,
            metalness: 0.0
        });
        const hill = new THREE.Mesh(hillGeo, hillMat);
        const angle = (i / 12) * Math.PI * 2;
        const distance = 120 + Math.random() * 40;
        hill.position.set(
            Math.cos(angle) * distance,
            -20,
            Math.sin(angle) * distance
        );
        backgroundGroup.add(hill);
    }

    scene.add(backgroundGroup);
}

// ===== CREATE SAMURAI BOB - TEXTURE-BASED APPROACH =====
function createPlayer() {
    const playerGroup = new THREE.Group();
    playerGroup.name = 'samuraiBob';

    // ========== MATERIALS ==========
    const kimonoBlue = new THREE.MeshStandardMaterial({
        color: 0x3366DD,
        roughness: 0.7,
        flatShading: true
    });
    const skin = new THREE.MeshStandardMaterial({
        color: 0xE8B080,
        roughness: 0.65,
        flatShading: true
    });
    const black = new THREE.MeshStandardMaterial({
        color: 0x252525,
        roughness: 0.75,
        flatShading: true
    });
    const pants = new THREE.MeshStandardMaterial({
        color: 0xCC3333,
        roughness: 0.7,
        flatShading: true
    });
    const shoes = new THREE.MeshStandardMaterial({
        color: 0x2a3040,
        roughness: 0.8,
        flatShading: true
    });
    const metal = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.3,
        metalness: 0.6,
        flatShading: true
    });

    // ========== BODY - Using textured front ==========
    // Main torso with body texture
    const torsoGeo = new THREE.BoxGeometry(1.8, 1.3, 1.2);
    const bodyTexture = createBodyTexture();
    const torsoMaterials = [
        kimonoBlue, // right
        kimonoBlue, // left
        kimonoBlue, // top
        kimonoBlue, // bottom
        new THREE.MeshStandardMaterial({ map: bodyTexture, roughness: 0.7 }), // front (textured)
        kimonoBlue  // back
    ];
    const torso = new THREE.Mesh(torsoGeo, torsoMaterials);
    torso.position.y = 1.35;
    playerGroup.add(torso);

    // Shoulder bumps
    const shoulderGeo = new THREE.SphereGeometry(0.4, 6, 5);
    const leftShoulderBump = new THREE.Mesh(shoulderGeo, kimonoBlue);
    leftShoulderBump.position.set(-0.95, 1.65, 0);
    playerGroup.add(leftShoulderBump);
    const rightShoulderBump = new THREE.Mesh(shoulderGeo, kimonoBlue);
    rightShoulderBump.position.set(0.95, 1.65, 0);
    playerGroup.add(rightShoulderBump);

    // ========== LEFT ARM with SHIELD ==========
    // The animation system dynamically creates arm segments between joints
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-1.1, 1.5, 0.3);

    // Joint markers - small spheres that get positioned by animation
    // Elbow joint
    const leftElbowGeo = new THREE.SphereGeometry(0.2, 6, 5);
    const leftElbow = new THREE.Mesh(leftElbowGeo, kimonoBlue);
    leftElbow.position.set(-0.3, -0.5, 0.3); // Default resting position
    leftArmGroup.add(leftElbow);

    // Hand
    const leftHandGeo = new THREE.SphereGeometry(0.22, 6, 5);
    const leftHand = new THREE.Mesh(leftHandGeo, skin);
    leftHand.position.set(-0.5, -0.9, 0.6); // Default resting position
    leftArmGroup.add(leftHand);

    // SHIELD - round wooden with metal rim and flower emblem
    const shieldGroup = new THREE.Group();

    // Metal rim - thick gray ring
    const rimGeo = new THREE.TorusGeometry(0.9, 0.12, 8, 24);
    const rim = new THREE.Mesh(rimGeo, metal);
    shieldGroup.add(rim);

    // Shield face - wooden with flower texture
    const shieldFaceGeo = new THREE.CircleGeometry(0.85, 24);
    const shieldFaceMat = new THREE.MeshStandardMaterial({
        map: createShieldTexture(),
        roughness: 0.55
    });
    const shieldFace = new THREE.Mesh(shieldFaceGeo, shieldFaceMat);
    shieldFace.position.z = 0.02;
    shieldGroup.add(shieldFace);

    // Shield back
    const shieldBackGeo = new THREE.CircleGeometry(0.85, 24);
    const shieldBackMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
    const shieldBack = new THREE.Mesh(shieldBackGeo, shieldBackMat);
    shieldBack.position.z = -0.03;
    shieldBack.rotation.y = Math.PI;
    shieldGroup.add(shieldBack);

    // Default shield position - held at side like reference image
    shieldGroup.position.set(-0.6, -0.85, 0.75);
    shieldGroup.rotation.y = -0.25;
    shieldGroup.rotation.x = 0.05;
    leftArmGroup.add(shieldGroup);

    playerGroup.add(leftArmGroup);

    // Store references for animation system
    playerGroup.userData.leftArm = leftArmGroup;
    playerGroup.userData.shield = shieldGroup;
    playerGroup.userData.leftHand = leftHand;
    playerGroup.userData.leftElbow = leftElbow;
    playerGroup.userData.kimonoBlue = kimonoBlue;
    playerGroup.userData.skin = skin;
    playerGroup.userData.leftUpperArmMesh = null;
    playerGroup.userData.leftForearmMesh = null;

    // Function to create arm tube segment between two joint positions
    playerGroup.userData.createArmSegment = function(start, end, startRadius, endRadius, material) {
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        if (length < 0.01) return null;
        const geo = new THREE.CylinderGeometry(endRadius, startRadius, length, 6);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const dir = direction.clone().normalize();
        const dot = up.dot(dir);
        if (Math.abs(dot) < 0.999) {
            const axis = new THREE.Vector3().crossVectors(up, dir).normalize();
            const angle = Math.acos(dot);
            mesh.setRotationFromAxisAngle(axis, angle);
        }
        return mesh;
    };

    // Build initial arm segments
    const shoulderPos = new THREE.Vector3(0, 0, 0);
    const initUpperArm = playerGroup.userData.createArmSegment(
        shoulderPos, leftElbow.position, 0.24, 0.2, kimonoBlue
    );
    const initForearm = playerGroup.userData.createArmSegment(
        leftElbow.position, leftHand.position, 0.2, 0.16, skin
    );
    if (initUpperArm) {
        leftArmGroup.add(initUpperArm);
        playerGroup.userData.leftUpperArmMesh = initUpperArm;
    }
    if (initForearm) {
        leftArmGroup.add(initForearm);
        playerGroup.userData.leftForearmMesh = initForearm;
    }

    // ========== RIGHT ARM with SWORD ==========
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(1.1, 1.5, 0);

    // Upper arm (blue sleeve)
    const rightUpperArmGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.5, 6);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, kimonoBlue);
    rightUpperArm.rotation.z = -0.4;
    rightUpperArm.position.set(0.15, -0.1, 0.05);
    rightArmGroup.add(rightUpperArm);

    // Forearm (skin)
    const rightForearmGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.35, 6);
    const rightForearm = new THREE.Mesh(rightForearmGeo, skin);
    rightForearm.rotation.z = -0.6;
    rightForearm.position.set(0.35, -0.35, 0.1);
    rightArmGroup.add(rightForearm);

    // Right hand
    const rightHandGeo = new THREE.SphereGeometry(0.18, 6, 5);
    const rightHand = new THREE.Mesh(rightHandGeo, skin);
    rightHand.position.set(0.5, -0.5, 0.15);
    rightArmGroup.add(rightHand);

    // SWORD
    const swordGroup = new THREE.Group();

    // Blade - silver/white
    const bladeGeo = new THREE.BoxGeometry(0.08, 2.0, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.8, roughness: 0.2 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 1.0;
    swordGroup.add(blade);

    // Guard - brown
    const guardGeo = new THREE.BoxGeometry(0.45, 0.08, 0.15);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.05;
    swordGroup.add(guard);

    // Handle - dark brown
    const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.2;
    swordGroup.add(handle);

    swordGroup.position.set(0.5, -0.55, 0.2);
    swordGroup.rotation.z = 0.2;
    rightArmGroup.add(swordGroup);

    playerGroup.add(rightArmGroup);
    playerGroup.userData.rightArm = rightArmGroup;
    playerGroup.userData.sword = swordGroup;

    // ========== LEGS - Short stubby red ==========
    const legGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.5, 6);
    const leftLeg = new THREE.Mesh(legGeo, pants);
    leftLeg.position.set(-0.4, 0.35, 0);
    playerGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, pants);
    rightLeg.position.set(0.4, 0.35, 0);
    playerGroup.add(rightLeg);

    // ========== FEET - Dark rounded ==========
    const footGeo = new THREE.SphereGeometry(0.3, 6, 5);
    const leftFoot = new THREE.Mesh(footGeo, shoes);
    leftFoot.position.set(-0.4, 0.08, 0.06);
    leftFoot.scale.set(1.0, 0.4, 1.15);
    playerGroup.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, shoes);
    rightFoot.position.set(0.4, 0.08, 0.06);
    rightFoot.scale.set(1.0, 0.4, 1.15);
    playerGroup.add(rightFoot);

    // ========== HEAD with TEXTURED FACE ==========
    // Main head sphere (skin colored base)
    const headGeo = new THREE.SphereGeometry(1.5, 16, 12);
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 3.6;
    head.scale.set(1, 0.9, 0.92);
    playerGroup.add(head);

    // Face - simple plane with texture (circular via alpha)
    const faceGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const faceTexture = createFaceTexture();
    const faceMat = new THREE.MeshBasicMaterial({
        map: faceTexture,
        transparent: true,
        side: THREE.FrontSide
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 3.55, 1.4);
    playerGroup.add(face);

    // ========== 3D NOSE - Prominent ==========
    const noseGeo = new THREE.SphereGeometry(0.4, 8, 6);
    const noseMat = new THREE.MeshStandardMaterial({
        color: 0xDDA875,
        roughness: 0.55
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 3.3, 1.6);
    nose.scale.set(1.0, 0.72, 0.65);
    playerGroup.add(nose);

    // ========== EARS - Large, sticking out ==========
    const earGeo = new THREE.SphereGeometry(0.4, 6, 5);
    const leftEar = new THREE.Mesh(earGeo, skin);
    leftEar.position.set(-1.48, 3.55, 0);
    leftEar.scale.set(0.25, 0.8, 0.5);
    playerGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skin);
    rightEar.position.set(1.48, 3.55, 0);
    rightEar.scale.set(0.25, 0.8, 0.5);
    playerGroup.add(rightEar);

    // ========== HAIR - Black cap with angular edges ==========
    // Main hair cap - covers top half of head
    const hairCapGeo = new THREE.SphereGeometry(1.55, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const hairCap = new THREE.Mesh(hairCapGeo, black);
    hairCap.position.set(0, 3.9, -0.15);
    hairCap.rotation.x = 0.1;
    playerGroup.add(hairCap);

    // Hair front edge - angular band
    const hairFrontGeo = new THREE.BoxGeometry(2.2, 0.35, 0.6);
    const hairFront = new THREE.Mesh(hairFrontGeo, black);
    hairFront.position.set(0, 4.55, 0.6);
    hairFront.rotation.x = -0.25;
    playerGroup.add(hairFront);

    // Hair side pieces coming down
    const hairSideGeo = new THREE.BoxGeometry(0.35, 0.8, 0.5);
    const hairL = new THREE.Mesh(hairSideGeo, black);
    hairL.position.set(-1.1, 4.0, 0.2);
    hairL.rotation.z = 0.12;
    playerGroup.add(hairL);
    const hairR = new THREE.Mesh(hairSideGeo, black);
    hairR.position.set(1.1, 4.0, 0.2);
    hairR.rotation.z = -0.12;
    playerGroup.add(hairR);

    // Hair back
    const hairBackGeo = new THREE.SphereGeometry(1.45, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairBack = new THREE.Mesh(hairBackGeo, black);
    hairBack.position.set(0, 3.75, -0.4);
    hairBack.rotation.x = 0.15;
    playerGroup.add(hairBack);

    // ========== TOPKNOT - Iconic samurai feature ==========
    // Cylindrical base
    const knotBaseGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.55, 6);
    const knotBase = new THREE.Mesh(knotBaseGeo, black);
    knotBase.position.set(0, 5.15, -0.15);
    playerGroup.add(knotBase);

    // Top bun - faceted
    const knotTopGeo = new THREE.OctahedronGeometry(0.38, 0);
    const knotTop = new THREE.Mesh(knotTopGeo, black);
    knotTop.position.set(0, 5.55, -0.15);
    knotTop.scale.set(1.1, 0.65, 1.1);
    knotTop.rotation.y = Math.PI / 4;
    playerGroup.add(knotTop);

    scene.add(playerGroup);
    return playerGroup;
}

// ===== CREATE ENEMY FACE TEXTURES =====
function createOniFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128, cy = 128;

    // Red demon skin
    ctx.fillStyle = '#CC3333';
    ctx.fillRect(0, 0, 256, 256);

    // Shading
    const grad = ctx.createRadialGradient(cx - 20, cy - 30, 20, cx, cy, 128);
    grad.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
    grad.addColorStop(1, 'rgba(80, 0, 0, 0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Angry eyebrows
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(30, 75);
    ctx.lineTo(50, 50);
    ctx.lineTo(115, 70);
    ctx.lineTo(105, 90);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(226, 75);
    ctx.lineTo(206, 50);
    ctx.lineTo(141, 70);
    ctx.lineTo(151, 90);
    ctx.closePath();
    ctx.fill();

    // Fierce eyes - yellow with black pupils
    ctx.fillStyle = '#FFDD00';
    ctx.beginPath();
    ctx.ellipse(75, 100, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(181, 100, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(75, 100, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(181, 100, 10, 0, Math.PI * 2);
    ctx.fill();

    // Snarling mouth with tusks
    ctx.fillStyle = '#660000';
    ctx.beginPath();
    ctx.moveTo(60, 170);
    ctx.quadraticCurveTo(128, 230, 196, 170);
    ctx.quadraticCurveTo(128, 200, 60, 170);
    ctx.fill();

    // Tusks
    ctx.fillStyle = '#FFFFEE';
    ctx.beginPath();
    ctx.moveTo(70, 165);
    ctx.lineTo(60, 200);
    ctx.lineTo(85, 175);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(186, 165);
    ctx.lineTo(196, 200);
    ctx.lineTo(171, 175);
    ctx.closePath();
    ctx.fill();

    // Wrinkle lines
    ctx.strokeStyle = '#991111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 130);
    ctx.lineTo(90, 150);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(156, 130);
    ctx.lineTo(166, 150);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createFoxSpiritFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // White/cream fox fur
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle fur shading
    const grad = ctx.createRadialGradient(128, 100, 30, 128, 128, 130);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    grad.addColorStop(1, 'rgba(220, 180, 150, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Slanted cunning eyes - glowing blue
    ctx.fillStyle = '#00DDFF';
    ctx.beginPath();
    ctx.ellipse(80, 95, 25, 15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(176, 95, 25, 15, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Black slit pupils
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(80, 95, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(176, 95, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye glow
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(80, 95, 30, 20, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(176, 95, 30, 20, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Small black nose
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(128, 140, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sly smile
    ctx.strokeStyle = '#aa6655';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 165);
    ctx.quadraticCurveTo(128, 185, 166, 165);
    ctx.stroke();

    // Whisker marks
    ctx.strokeStyle = '#ccaa99';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(40, 130 + i * 15);
        ctx.lineTo(75, 135 + i * 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(216, 130 + i * 15);
        ctx.lineTo(181, 135 + i * 12);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createTerracottaFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Terracotta clay color
    ctx.fillStyle = '#C4956A';
    ctx.fillRect(0, 0, 256, 256);

    // Stone texture - cracks and weathering
    ctx.strokeStyle = 'rgba(100, 70, 50, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, Math.random() * 256);
        ctx.lineTo(Math.random() * 256, Math.random() * 256);
        ctx.stroke();
    }

    // Stern carved eyebrows
    ctx.fillStyle = '#8B6B4A';
    ctx.beginPath();
    ctx.rect(40, 65, 70, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(146, 65, 70, 12);
    ctx.fill();

    // Carved eyes - hollow dark
    ctx.fillStyle = '#3D2B1F';
    ctx.beginPath();
    ctx.ellipse(75, 100, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(181, 100, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dim eye glow
    ctx.fillStyle = 'rgba(255, 150, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(75, 100, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(181, 100, 6, 0, Math.PI * 2);
    ctx.fill();

    // Carved nose
    ctx.fillStyle = '#A67B5B';
    ctx.beginPath();
    ctx.moveTo(128, 95);
    ctx.lineTo(115, 145);
    ctx.lineTo(141, 145);
    ctx.closePath();
    ctx.fill();

    // Stern mouth line
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(85, 175);
    ctx.lineTo(171, 175);
    ctx.stroke();

    // Mustache carving
    ctx.fillStyle = '#8B6B4A';
    ctx.beginPath();
    ctx.moveTo(128, 155);
    ctx.quadraticCurveTo(90, 160, 70, 150);
    ctx.quadraticCurveTo(90, 170, 128, 168);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(128, 155);
    ctx.quadraticCurveTo(166, 160, 186, 150);
    ctx.quadraticCurveTo(166, 170, 128, 168);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createNianBeastFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const cx = 256, cy = 256;

    // Dark red/crimson beast fur
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(0, 0, 512, 512);

    // Fur texture gradient
    const grad = ctx.createRadialGradient(cx, cy - 50, 50, cx, cy, 280);
    grad.addColorStop(0, 'rgba(200, 50, 50, 0.4)');
    grad.addColorStop(1, 'rgba(40, 0, 0, 0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Golden mane pattern on forehead
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.moveTo(100, 80);
    ctx.quadraticCurveTo(256, 20, 412, 80);
    ctx.quadraticCurveTo(256, 120, 100, 80);
    ctx.fill();

    // Fierce glowing eyes
    ctx.fillStyle = '#FF4400';
    ctx.beginPath();
    ctx.ellipse(150, 180, 50, 35, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(362, 180, 50, 35, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye glow
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.ellipse(150, 180, 30, 20, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(362, 180, 30, 20, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Black pupils
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(150, 180, 15, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(362, 180, 15, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Massive nose
    ctx.fillStyle = '#550000';
    ctx.beginPath();
    ctx.ellipse(cx, 280, 60, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nostrils
    ctx.fillStyle = '#2a0000';
    ctx.beginPath();
    ctx.ellipse(230, 285, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(282, 285, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ferocious mouth
    ctx.fillStyle = '#2a0000';
    ctx.beginPath();
    ctx.moveTo(100, 360);
    ctx.quadraticCurveTo(256, 480, 412, 360);
    ctx.quadraticCurveTo(256, 420, 100, 360);
    ctx.fill();

    // Fangs
    ctx.fillStyle = '#FFFFF0';
    for (let i = 0; i < 6; i++) {
        const x = 140 + i * 45;
        ctx.beginPath();
        ctx.moveTo(x - 12, 360);
        ctx.lineTo(x, 400 + (i % 2) * 15);
        ctx.lineTo(x + 12, 360);
        ctx.closePath();
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// ===== CREATE ENEMY - Ancient Chinese Monsters =====
function createEnemy(type = 'grunt') {
    const enemyGroup = new THREE.Group();

    let health, speed, damage, points;

    switch(type) {
        case 'grunt':
            health = 30;
            speed = 2;
            damage = 8;
            points = 50;
            createOniDemon(enemyGroup);
            break;
        case 'speedy':
            health = 20;
            speed = 4.5;
            damage = 5;
            points = 75;
            createFoxSpirit(enemyGroup);
            break;
        case 'tank':
            health = 60;
            speed = 1.2;
            damage = 15;
            points = 150;
            createTerracottaWarrior(enemyGroup);
            break;
        case 'boss':
            health = 100;
            speed = 2;
            damage = 20;
            points = 500;
            createNianBeast(enemyGroup);
            break;
    }

    // Random spawn position
    const angle = Math.random() * Math.PI * 2;
    const distance = ARENA_RADIUS + 6 + Math.random() * 4;
    enemyGroup.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
    );

    enemyGroup.userData = {
        type: type,
        health: health + gameTimer * 2,
        maxHealth: health + gameTimer * 2,
        speed: speed,
        baseSpeed: speed,
        damage: damage,
        points: points,
        velocity: new THREE.Vector3(),
        stunned: 0,
        attackCooldown: type === 'boss' ? 3 : 0,
        currentAttack: null,
        attackTimer: 0,
        isRaging: false,
        summonCooldown: type === 'boss' ? 10 : 0,
        chargeTarget: null,
        isCharging: false
    };

    scene.add(enemyGroup);
    return enemyGroup;
}

// ===== ONI DEMON (Grunt) =====
function createOniDemon(group) {
    const red = new THREE.MeshStandardMaterial({ color: 0xCC3333, roughness: 0.7, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x660000, roughness: 0.8, flatShading: true });
    const bone = new THREE.MeshStandardMaterial({ color: 0xFFFFF0, roughness: 0.6, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.5, metalness: 0.3 });

    // Body - muscular torso
    const bodyGeo = new THREE.SphereGeometry(1.0, 8, 6);
    const body = new THREE.Mesh(bodyGeo, red);
    body.position.y = 1.2;
    body.scale.set(1.1, 1.0, 0.9);
    group.add(body);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(0.7, 6, 5);
    const belly = new THREE.Mesh(bellyGeo, red);
    belly.position.set(0, 0.9, 0.3);
    group.add(belly);

    // Head with face texture
    const headGeo = new THREE.SphereGeometry(0.75, 10, 8);
    const head = new THREE.Mesh(headGeo, red);
    head.position.y = 2.3;
    group.add(head);

    // Face
    const faceGeo = new THREE.PlaneGeometry(1.4, 1.4, 8, 8);
    const faceVerts = faceGeo.attributes.position;
    for (let i = 0; i < faceVerts.count; i++) {
        const x = faceVerts.getX(i);
        const y = faceVerts.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        faceVerts.setZ(i, Math.sqrt(Math.max(0, 0.8 - dist * dist * 0.4)) * 0.15);
    }
    faceGeo.computeVertexNormals();
    const faceMat = new THREE.MeshBasicMaterial({ map: createOniFaceTexture() });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 2.3, 0.65);
    group.add(face);

    // Horns - curved
    const hornGeo = new THREE.ConeGeometry(0.15, 0.8, 6);
    const leftHorn = new THREE.Mesh(hornGeo, bone);
    leftHorn.position.set(-0.4, 2.9, 0);
    leftHorn.rotation.z = 0.4;
    group.add(leftHorn);
    const rightHorn = new THREE.Mesh(hornGeo, bone);
    rightHorn.position.set(0.4, 2.9, 0);
    rightHorn.rotation.z = -0.4;
    group.add(rightHorn);

    // Wild hair
    for (let i = 0; i < 8; i++) {
        const hairGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
        const hair = new THREE.Mesh(hairGeo, dark);
        const angle = (i / 8) * Math.PI * 2;
        hair.position.set(
            Math.cos(angle) * 0.5,
            2.8 + Math.random() * 0.2,
            Math.sin(angle) * 0.3 - 0.2
        );
        hair.rotation.x = -0.5 + Math.random() * 0.3;
        hair.rotation.z = (Math.random() - 0.5) * 0.5;
        group.add(hair);
    }

    // Arms - muscular
    const armGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 6);
    const leftArm = new THREE.Mesh(armGeo, red);
    leftArm.position.set(-1.0, 1.5, 0);
    leftArm.rotation.z = 0.8;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, red);
    rightArm.position.set(1.0, 1.5, 0);
    rightArm.rotation.z = -0.8;
    group.add(rightArm);

    // Hands with claws
    const handGeo = new THREE.SphereGeometry(0.2, 6, 5);
    const leftHand = new THREE.Mesh(handGeo, red);
    leftHand.position.set(-1.4, 1.1, 0);
    group.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, red);
    rightHand.position.set(1.4, 1.1, 0);
    group.add(rightHand);

    // Tiger-skin loincloth
    const clothGeo = new THREE.BoxGeometry(0.9, 0.4, 0.5);
    const clothMat = new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.9 });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(0, 0.5, 0);
    group.add(cloth);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.6, 6);
    const leftLeg = new THREE.Mesh(legGeo, red);
    leftLeg.position.set(-0.35, 0.3, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, red);
    rightLeg.position.set(0.35, 0.3, 0);
    group.add(rightLeg);

    // Feet
    const footGeo = new THREE.SphereGeometry(0.22, 6, 5);
    const leftFoot = new THREE.Mesh(footGeo, red);
    leftFoot.position.set(-0.35, 0.08, 0.08);
    leftFoot.scale.set(1, 0.5, 1.2);
    group.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, red);
    rightFoot.position.set(0.35, 0.08, 0.08);
    rightFoot.scale.set(1, 0.5, 1.2);
    group.add(rightFoot);

    // Kanabo (iron club)
    const clubGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8);
    const clubMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 });
    const club = new THREE.Mesh(clubGeo, clubMat);
    club.position.set(1.6, 1.0, 0);
    club.rotation.z = -0.5;
    group.add(club);

    // Club spikes
    const spikeGeo = new THREE.ConeGeometry(0.05, 0.15, 4);
    for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeo, clubMat);
        spike.position.set(1.5 + (i % 2) * 0.15, 0.6 + i * 0.15, 0.15);
        spike.rotation.x = Math.PI / 2;
        group.add(spike);
    }
}

// ===== FOX SPIRIT (Speedy) =====
function createFoxSpirit(group) {
    const white = new THREE.MeshStandardMaterial({ color: 0xFFF8F0, roughness: 0.6, flatShading: true });
    const orange = new THREE.MeshStandardMaterial({ color: 0xFF8844, roughness: 0.65, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });

    // Sleek body
    const bodyGeo = new THREE.SphereGeometry(0.6, 8, 6);
    const body = new THREE.Mesh(bodyGeo, white);
    body.position.y = 0.7;
    body.scale.set(1.3, 0.9, 1.0);
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const head = new THREE.Mesh(headGeo, white);
    head.position.set(0, 1.3, 0.3);
    head.scale.set(1, 0.9, 1.1);
    group.add(head);

    // Snout
    const snoutGeo = new THREE.ConeGeometry(0.2, 0.5, 6);
    const snout = new THREE.Mesh(snoutGeo, white);
    snout.position.set(0, 1.2, 0.7);
    snout.rotation.x = Math.PI / 2;
    group.add(snout);

    // Face texture
    const faceGeo = new THREE.PlaneGeometry(1.0, 1.0, 6, 6);
    const faceVerts = faceGeo.attributes.position;
    for (let i = 0; i < faceVerts.count; i++) {
        const x = faceVerts.getX(i);
        const y = faceVerts.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        faceVerts.setZ(i, Math.sqrt(Math.max(0, 0.6 - dist * dist * 0.5)) * 0.12);
    }
    faceGeo.computeVertexNormals();
    const faceMat = new THREE.MeshBasicMaterial({ map: createFoxSpiritFaceTexture() });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 1.35, 0.55);
    group.add(face);

    // Large pointed ears
    const earGeo = new THREE.ConeGeometry(0.18, 0.45, 4);
    const leftEar = new THREE.Mesh(earGeo, white);
    leftEar.position.set(-0.3, 1.75, 0.1);
    leftEar.rotation.z = 0.2;
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, white);
    rightEar.position.set(0.3, 1.75, 0.1);
    rightEar.rotation.z = -0.2;
    group.add(rightEar);

    // Inner ear (orange)
    const innerEarGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
    const leftInner = new THREE.Mesh(innerEarGeo, orange);
    leftInner.position.set(-0.28, 1.72, 0.15);
    leftInner.rotation.z = 0.2;
    group.add(leftInner);
    const rightInner = new THREE.Mesh(innerEarGeo, orange);
    rightInner.position.set(0.28, 1.72, 0.15);
    rightInner.rotation.z = -0.2;
    group.add(rightInner);

    // Legs - slender
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
    const positions = [[-0.35, 0.25, 0.2], [0.35, 0.25, 0.2], [-0.35, 0.25, -0.2], [0.35, 0.25, -0.2]];
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, white);
        leg.position.set(...pos);
        group.add(leg);
    });

    // Paws
    const pawGeo = new THREE.SphereGeometry(0.1, 6, 5);
    positions.forEach(pos => {
        const paw = new THREE.Mesh(pawGeo, white);
        paw.position.set(pos[0], 0.05, pos[2] + 0.05);
        paw.scale.set(1, 0.5, 1.2);
        group.add(paw);
    });

    // NINE TAILS - the signature feature
    const tailMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.6,
        flatShading: true,
        emissive: 0x88DDFF,
        emissiveIntensity: 0.2
    });

    for (let i = 0; i < 9; i++) {
        const tailGroup = new THREE.Group();
        const spread = (i - 4) * 0.25;
        const height = Math.abs(i - 4) * 0.08;

        // Each tail made of segments
        for (let j = 0; j < 4; j++) {
            const segSize = 0.15 - j * 0.02;
            const segGeo = new THREE.SphereGeometry(segSize, 6, 5);
            const seg = new THREE.Mesh(segGeo, j < 2 ? white : tailMat);
            seg.position.set(
                spread * (j + 1) * 0.3,
                0.7 + height + j * 0.15 + Math.sin(j * 0.5) * 0.1,
                -0.4 - j * 0.25
            );
            seg.scale.set(1, 1.3, 1);
            tailGroup.add(seg);
        }

        // Tail tip (glowing)
        const tipGeo = new THREE.ConeGeometry(0.08, 0.25, 5);
        const tip = new THREE.Mesh(tipGeo, tailMat);
        tip.position.set(spread * 1.5, 1.3 + height, -1.4);
        tip.rotation.x = -0.8;
        tailGroup.add(tip);

        group.add(tailGroup);
    }

    // Ghostly aura particles
    for (let i = 0; i < 5; i++) {
        const auraGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x88DDFF,
            transparent: true,
            opacity: 0.4
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.set(
            (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 1.2,
            (Math.random() - 0.5) * 1.5
        );
        group.add(aura);
    }
}

// ===== TERRACOTTA WARRIOR (Tank) =====
function createTerracottaWarrior(group) {
    const clay = new THREE.MeshStandardMaterial({ color: 0xC4956A, roughness: 0.85, flatShading: true });
    const darkClay = new THREE.MeshStandardMaterial({ color: 0x8B6B4A, roughness: 0.9, flatShading: true });
    const metal = new THREE.MeshStandardMaterial({ color: 0x707060, roughness: 0.4, metalness: 0.5 });

    // Armored torso - boxy
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.4, 1.0);
    const torso = new THREE.Mesh(torsoGeo, clay);
    torso.position.y = 1.8;
    group.add(torso);

    // Armor plates on chest
    const plateGeo = new THREE.BoxGeometry(0.7, 0.35, 0.15);
    for (let i = 0; i < 3; i++) {
        const plate = new THREE.Mesh(plateGeo, darkClay);
        plate.position.set(0, 2.2 - i * 0.4, 0.55);
        group.add(plate);
    }

    // Shoulder armor
    const shoulderGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
    const leftShoulder = new THREE.Mesh(shoulderGeo, darkClay);
    leftShoulder.position.set(-0.95, 2.3, 0);
    group.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeo, darkClay);
    rightShoulder.position.set(0.95, 2.3, 0);
    group.add(rightShoulder);

    // Head
    const headGeo = new THREE.BoxGeometry(0.9, 1.0, 0.85);
    const head = new THREE.Mesh(headGeo, clay);
    head.position.y = 3.0;
    group.add(head);

    // Face texture
    const faceGeo = new THREE.PlaneGeometry(0.9, 1.0);
    const faceMat = new THREE.MeshBasicMaterial({ map: createTerracottaFaceTexture() });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 3.0, 0.43);
    group.add(face);

    // Helmet
    const helmetGeo = new THREE.BoxGeometry(1.0, 0.4, 0.95);
    const helmet = new THREE.Mesh(helmetGeo, darkClay);
    helmet.position.y = 3.55;
    group.add(helmet);

    // Helmet crest
    const crestGeo = new THREE.BoxGeometry(0.15, 0.35, 0.6);
    const crest = new THREE.Mesh(crestGeo, darkClay);
    crest.position.set(0, 3.8, 0);
    group.add(crest);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
    const leftArm = new THREE.Mesh(armGeo, clay);
    leftArm.position.set(-1.1, 1.6, 0);
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, clay);
    rightArm.position.set(1.1, 1.6, 0);
    group.add(rightArm);

    // Hands
    const handGeo = new THREE.BoxGeometry(0.3, 0.3, 0.25);
    const leftHand = new THREE.Mesh(handGeo, clay);
    leftHand.position.set(-1.1, 1.0, 0.1);
    group.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, clay);
    rightHand.position.set(1.1, 1.0, 0.1);
    group.add(rightHand);

    // Armored skirt
    const skirtGeo = new THREE.BoxGeometry(1.5, 0.6, 0.9);
    const skirt = new THREE.Mesh(skirtGeo, darkClay);
    skirt.position.y = 0.9;
    group.add(skirt);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    const leftLeg = new THREE.Mesh(legGeo, clay);
    leftLeg.position.set(-0.4, 0.4, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, clay);
    rightLeg.position.set(0.4, 0.4, 0);
    group.add(rightLeg);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.45, 0.2, 0.55);
    const leftFoot = new THREE.Mesh(footGeo, darkClay);
    leftFoot.position.set(-0.4, 0.1, 0.05);
    group.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, darkClay);
    rightFoot.position.set(0.4, 0.1, 0.05);
    group.add(rightFoot);

    // Spear
    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.5, 8);
    const shaft = new THREE.Mesh(shaftGeo, new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.8 }));
    shaft.position.set(1.4, 1.8, 0);
    group.add(shaft);

    // Spear head
    const spearHeadGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
    const spearHead = new THREE.Mesh(spearHeadGeo, metal);
    spearHead.position.set(1.4, 3.6, 0);
    group.add(spearHead);

    // Shield (on left arm)
    const shieldGeo = new THREE.BoxGeometry(0.1, 0.9, 0.7);
    const shield = new THREE.Mesh(shieldGeo, metal);
    shield.position.set(-1.35, 1.6, 0.2);
    group.add(shield);
}

// ===== NIAN BEAST (Boss) =====
function createNianBeast(group) {
    const red = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7, flatShading: true });
    const darkRed = new THREE.MeshStandardMaterial({ color: 0x4a0000, roughness: 0.8, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.4, metalness: 0.4, flatShading: true });
    const bone = new THREE.MeshStandardMaterial({ color: 0xFFFFF0, roughness: 0.5 });

    // Massive body
    const bodyGeo = new THREE.SphereGeometry(1.8, 10, 8);
    const body = new THREE.Mesh(bodyGeo, red);
    body.position.y = 2.0;
    body.scale.set(1.2, 0.9, 1.0);
    group.add(body);

    // Chest fur/mane
    const chestGeo = new THREE.SphereGeometry(1.2, 8, 6);
    const chest = new THREE.Mesh(chestGeo, gold);
    chest.position.set(0, 2.2, 0.8);
    chest.scale.set(1.0, 0.8, 0.6);
    group.add(chest);

    // Massive head
    const headGeo = new THREE.SphereGeometry(1.3, 10, 8);
    const head = new THREE.Mesh(headGeo, red);
    head.position.set(0, 3.5, 0.5);
    head.scale.set(1.1, 0.95, 1.0);
    group.add(head);

    // Face texture
    const faceGeo = new THREE.PlaneGeometry(2.6, 2.6, 10, 10);
    const faceVerts = faceGeo.attributes.position;
    for (let i = 0; i < faceVerts.count; i++) {
        const x = faceVerts.getX(i);
        const y = faceVerts.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        faceVerts.setZ(i, Math.sqrt(Math.max(0, 1.5 - dist * dist * 0.3)) * 0.2);
    }
    faceGeo.computeVertexNormals();
    const faceMat = new THREE.MeshBasicMaterial({ map: createNianBeastFaceTexture() });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 3.5, 1.4);
    group.add(face);

    // Large curved horns
    for (let side of [-1, 1]) {
        const hornGroup = new THREE.Group();
        for (let i = 0; i < 5; i++) {
            const hornSegGeo = new THREE.CylinderGeometry(0.2 - i * 0.03, 0.25 - i * 0.03, 0.5, 6);
            const hornSeg = new THREE.Mesh(hornSegGeo, bone);
            hornSeg.position.set(
                side * (0.8 + i * 0.15),
                4.2 + i * 0.35,
                -0.2 - i * 0.1
            );
            hornSeg.rotation.z = side * (0.3 + i * 0.15);
            hornSeg.rotation.x = -0.2;
            hornGroup.add(hornSeg);
        }
        group.add(hornGroup);
    }

    // Golden mane around head
    for (let i = 0; i < 12; i++) {
        const maneGeo = new THREE.ConeGeometry(0.2, 0.6, 5);
        const mane = new THREE.Mesh(maneGeo, gold);
        const angle = (i / 12) * Math.PI * 2;
        mane.position.set(
            Math.cos(angle) * 1.2,
            3.8 + Math.sin(angle * 2) * 0.2,
            0.3 + Math.sin(angle) * 0.8
        );
        mane.rotation.x = -0.5 + Math.sin(angle) * 0.3;
        mane.rotation.z = Math.cos(angle) * 0.5;
        group.add(mane);
    }

    // Forelegs - thick and powerful
    const forelegGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8);
    const leftForeleg = new THREE.Mesh(forelegGeo, red);
    leftForeleg.position.set(-1.2, 0.8, 0.6);
    leftForeleg.rotation.x = 0.2;
    group.add(leftForeleg);
    const rightForeleg = new THREE.Mesh(forelegGeo, red);
    rightForeleg.position.set(1.2, 0.8, 0.6);
    rightForeleg.rotation.x = 0.2;
    group.add(rightForeleg);

    // Hind legs
    const hindlegGeo = new THREE.CylinderGeometry(0.4, 0.45, 1.0, 8);
    const leftHindleg = new THREE.Mesh(hindlegGeo, red);
    leftHindleg.position.set(-1.0, 0.7, -0.8);
    group.add(leftHindleg);
    const rightHindleg = new THREE.Mesh(hindlegGeo, red);
    rightHindleg.position.set(1.0, 0.7, -0.8);
    group.add(rightHindleg);

    // Massive paws with claws
    const pawGeo = new THREE.SphereGeometry(0.4, 6, 5);
    const pawPositions = [[-1.2, 0.2, 0.8], [1.2, 0.2, 0.8], [-1.0, 0.2, -0.8], [1.0, 0.2, -0.8]];
    pawPositions.forEach((pos, idx) => {
        const paw = new THREE.Mesh(pawGeo, red);
        paw.position.set(...pos);
        paw.scale.set(1.2, 0.5, 1.3);
        group.add(paw);

        // Claws
        for (let c = 0; c < 3; c++) {
            const clawGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
            const claw = new THREE.Mesh(clawGeo, bone);
            claw.position.set(
                pos[0] + (c - 1) * 0.2,
                0.08,
                pos[2] + 0.35
            );
            claw.rotation.x = Math.PI / 2;
            group.add(claw);
        }
    });

    // Tail - long and serpentine
    const tailGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
        const tailSegGeo = new THREE.SphereGeometry(0.35 - i * 0.03, 6, 5);
        const tailSeg = new THREE.Mesh(tailSegGeo, i % 2 === 0 ? red : darkRed);
        tailSeg.position.set(
            Math.sin(i * 0.3) * 0.3,
            1.5 - i * 0.08,
            -1.2 - i * 0.4
        );
        tailGroup.add(tailSeg);
    }
    // Tail tuft
    const tuftGeo = new THREE.ConeGeometry(0.25, 0.5, 6);
    const tuft = new THREE.Mesh(tuftGeo, gold);
    tuft.position.set(0, 1.0, -4.0);
    tuft.rotation.x = -0.5;
    tailGroup.add(tuft);
    group.add(tailGroup);

    // Fire breath effect (particles around mouth)
    for (let i = 0; i < 6; i++) {
        const fireGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const fireMat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xFF4400 : 0xFFAA00,
            transparent: true,
            opacity: 0.7
        });
        const fire = new THREE.Mesh(fireGeo, fireMat);
        fire.position.set(
            (Math.random() - 0.5) * 0.8,
            3.0 + Math.random() * 0.5,
            1.8 + Math.random() * 0.3
        );
        fire.userData.isFireParticle = true;
        group.add(fire);
    }
}

// ===== GAME START =====
function startGame() {
    console.log('startGame called!');
    
    // Check if THREE.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded! Please wait and try again.');
        alert('Error: Game engine not ready yet. Please wait a moment and try again.');
        return;
    }
    
    try {
        console.log('Starting game...');
        gameState = 'playing';

        // Initialize audio on first user interaction
        if (!audioManager) {
            initAudioSystem();
        }
        // Resume audio context if suspended
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Clear texture cache so new textures generate
        TEXTURES.face = null;
        TEXTURES.shield = null;
        
        // Reset stats
        playerStats = {
            health: 100,
            maxHealth: 100,
            speed: 8,
            jumpPower: 15,
            kills: 0,
            score: 0,
            speedMult: 1.0,
            powerMult: 1.0,
            isJumping: false,
            velocity: new THREE.Vector3(),
            isAttacking: false,
            attackCooldown: 0,
            isBlocking: false,
            // Mario-style jump tracking
            jumpCount: 0,
            lastJumpTime: 0,
            isGrounded: true,
            jumpComboWindow: 0.4,
            isGroundPounding: false,
            groundPoundSpeed: 35,
            jumpPressed: false,
            // Ability states
            currentAbility: null,
            abilityTimer: 0,
            abilityDuration: 10,
            // Leaf form
            leafParticles: [],
            isLeafForm: false,
            // Dragon form
            isDragonForm: false,
            fireBreathCooldown: 0,
            // Wind form
            isWindForm: false,
            windGustCooldown: 0,
            windChargeTime: 0,
            isTransparent: false
        };

        gameTimer = 0;
        enemySpawnTimer = 0;
        powerUpSpawnTimer = 0;

        // Reset combat systems
        comboSystem.count = 0;
        comboSystem.timer = 0;
        comboSystem.multiplier = 1.0;
        comboSystem.lastMilestone = 0;

        damageNumbers = [];
        swordTrailPoints = [];

        // Clean up UI elements from previous game
        const oldCombo = document.getElementById('combo-counter');
        if (oldCombo) oldCombo.remove();
        const oldHealthBars = document.getElementById('enemy-health-bars');
        if (oldHealthBars) oldHealthBars.innerHTML = '';
        const oldKillFeed = document.getElementById('kill-feed');
        if (oldKillFeed) oldKillFeed.innerHTML = '';
        const oldVignette = document.getElementById('low-health-vignette');
        if (oldVignette) oldVignette.remove();
        document.querySelectorAll('.damage-number').forEach(el => el.remove());

        // Clear scene
        enemies.forEach(e => {
            try { scene.remove(e); } catch (err) {}
        });
        enemies = [];
        particles.forEach(p => {
            try { scene.remove(p); } catch (err) {}
        });
        particles = [];
        powerUps.forEach(p => {
            try { scene.remove(p); } catch (err) {}
        });
        powerUps = [];
        
        if (player) {
            try { scene.remove(player); } catch (err) {}
        }

        // Create player
        console.log('Creating player...');
        player = createPlayer();
        console.log('Player created successfully');
        
        // Initialize camera position (prevent starting under arena)
        camera.position.set(0, 12, 14);
        camera.lookAt(0, 2.5, 0);
    } catch (error) {
        console.error('Error in startGame:', error);
        alert('Error starting game: ' + error.message);
        return;
    }

    // Show game screen
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // Prepare pointer lock for mouse look (user can click canvas to lock)
    if (renderer && renderer.domElement) {
        const canvas = renderer.domElement;
        canvas.onclick = () => {
            if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
                try {
                    canvas.requestPointerLock();
                } catch (err) {
                    console.warn('Pointer lock request was blocked', err);
                }
            }
        };
    }

    // Setup camera controls
    setupCameraControls();

    // Initialize post-processing effects
    initPostProcessing();

    // Start game loop
    animate();
}

// Make startGame globally accessible IMMEDIATELY after definition
window.startGame = startGame;
console.log('startGame assigned to window:', typeof window.startGame);
if (window.__samuraiLog) {
    window.__samuraiLog(`startGame assigned to window: ${typeof window.startGame}`);
}
if (window.__samuraiUpdateBattleButton) {
    window.__samuraiUpdateBattleButton(true);
}

// ===== GAME LOOP =====
function animate() {
    if (gameState !== 'playing') return;

    deltaTime = clock.getDelta();

    // Check hit stop - if active, only update visuals, not game logic
    if (!updateHitStop()) {
        update();
    }

    // Update screen shake
    updateScreenShake();

    // Update sword trail (visual only, runs during hitstop too)
    updateSwordTrail();

    // Update damage numbers (visual only)
    updateDamageNumbers();

    // Update combo system
    updateComboSystem();

    render();

    // Render UI elements
    renderDamageNumbers();
    renderComboCounter();
    renderEnemyHealthBars();

    requestAnimationFrame(animate);
}

function update() {
    gameTimer += deltaTime;

    // Update player
    updatePlayer();
    
    // Update ability-specific effects
    if (playerStats.isDragonForm) updateDragonForm();
    if (playerStats.isWindForm) updateWindForm();

    // Update enemies
    updateEnemies();

    // Update particles
    updateParticles();
    
    // Update power-ups
    updatePowerUps();

    // Spawn enemies
    spawnEnemies();
    
    // Spawn power-ups periodically
    spawnPowerUpsPeriodically();

    // Update HUD
    updateHUD();

    // Update post-processing
    updatePostProcessing();

    // Check game over (not in leaf form - invincible there)
    if (playerStats.health <= 0 && !playerStats.isLeafForm) {
        gameOver();
    }

    // Score increases over time
    playerStats.score += Math.floor(deltaTime * 10);
    
    // Handle ability test keys
    handleAbilityKeys();
}

function spawnPowerUpsPeriodically() {
    powerUpSpawnTimer += deltaTime;
    
    // Spawn a power-up every 15-20 seconds, max 3 on field
    if (powerUpSpawnTimer >= 15 && powerUps.length < 3) {
        powerUpSpawnTimer = 0;
        spawnPowerUp();
    }
}

function handleAbilityKeys() {
    // Test keys for abilities (1, 2, 3)
    if (keys['1'] && !keys['1_pressed']) {
        keys['1_pressed'] = true;
        activateAbility('leaf');
    }
    if (!keys['1']) keys['1_pressed'] = false;
    
    if (keys['2'] && !keys['2_pressed']) {
        keys['2_pressed'] = true;
        activateAbility('dragon');
    }
    if (!keys['2']) keys['2_pressed'] = false;
    
    if (keys['3'] && !keys['3_pressed']) {
        keys['3_pressed'] = true;
        activateAbility('wind');
    }
    if (!keys['3']) keys['3_pressed'] = false;
    
    // Fire breath (K key while in dragon form)
    if (keys['k'] && playerStats.isDragonForm) {
        fireBreath();
    }
    
    // Wind gust handled in updateWindForm (Q key)
    
    // J key for attack
    if (keys['j'] && !keys['j_pressed']) {
        keys['j_pressed'] = true;
        playerAttack();
    }
    if (!keys['j']) keys['j_pressed'] = false;
}

function updatePlayer() {
    if (!player) return;

    // Decrease attack cooldown
    if (playerStats.attackCooldown > 0) {
        playerStats.attackCooldown -= deltaTime;
    }
    
    // Decrease ability cooldowns
    if (playerStats.fireBreathCooldown > 0) {
        playerStats.fireBreathCooldown -= deltaTime;
    }
    if (playerStats.windGustCooldown > 0) {
        playerStats.windGustCooldown -= deltaTime;
    }
    
    // Update ability timer
    if (playerStats.currentAbility) {
        playerStats.abilityTimer -= deltaTime;
        if (playerStats.abilityTimer <= 0) {
            deactivateAbility();
        }
        updateAbilityHUD();
    }

    // If in leaf form, update leaf particles instead of normal movement
    if (playerStats.isLeafForm) {
        updateLeafForm();
        updateCamera();
        return;
    }

    // Simple instant movement (WASD or Arrow keys)
    const moveSpeed = playerStats.speed * playerStats.speedMult * deltaTime;
    const moveDirection = new THREE.Vector3();

    if (keys['w'] || keys['arrowup']) moveDirection.z -= 1;
    if (keys['s'] || keys['arrowdown']) moveDirection.z += 1;
    if (keys['a'] || keys['arrowleft']) moveDirection.x -= 1;
    if (keys['d'] || keys['arrowright']) moveDirection.x += 1;

    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        player.position.x += moveDirection.x * moveSpeed;
        player.position.z += moveDirection.z * moveSpeed;
        player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
    }

    // Space bar = attack (drops shield while attacking)
    if (keys[' '] && !playerStats.spacePressed && playerStats.attackCooldown <= 0) {
        playerStats.spacePressed = true;
        playerStats.isAttackingNow = true;
        playerStats.attackAnimTime = 0;
        playerAttack();
        // Attack animation lasts 400ms
        setTimeout(() => { playerStats.isAttackingNow = false; }, 400);
    }
    if (!keys[' ']) playerStats.spacePressed = false;

    // Track attack animation time
    if (playerStats.isAttackingNow) {
        playerStats.attackAnimTime = (playerStats.attackAnimTime || 0) + deltaTime;
    }

    // Shift = shield block (but not while attacking)
    const wantsBlock = keys['shift'] && !playerStats.isAttackingNow;
    playerStats.isBlocking = wantsBlock;

    // === ANIMATE LEFT ARM - position joints and rebuild arm segments ===
    if (player.userData.leftElbow && player.userData.leftHand && player.userData.shield) {
        const shoulderPos = new THREE.Vector3(0, 0, 0);
        let elbowPos, handPos, shieldPos, shieldRotY, shieldRotX;

        if (playerStats.isBlocking) {
            // BLOCKING: Arm reaches across body, shield in front of chest
            elbowPos = new THREE.Vector3(0.5, -0.15, 0.5);
            handPos = new THREE.Vector3(1.0, 0.1, 0.9);
            shieldPos = new THREE.Vector3(1.1, 0.15, 1.1);
            shieldRotY = 0.2;
            shieldRotX = 0;
        } else {
            // RESTING: Shield held at side like reference image
            elbowPos = new THREE.Vector3(-0.3, -0.5, 0.3);
            handPos = new THREE.Vector3(-0.5, -0.9, 0.6);
            shieldPos = new THREE.Vector3(-0.6, -0.85, 0.75);
            shieldRotY = -0.25;
            shieldRotX = 0.05;
        }

        // Position joints
        player.userData.leftElbow.position.copy(elbowPos);
        player.userData.leftHand.position.copy(handPos);
        player.userData.shield.position.copy(shieldPos);
        player.userData.shield.rotation.y = shieldRotY;
        player.userData.shield.rotation.x = shieldRotX;

        // Remove old arm segments
        if (player.userData.leftUpperArmMesh) {
            player.userData.leftArm.remove(player.userData.leftUpperArmMesh);
        }
        if (player.userData.leftForearmMesh) {
            player.userData.leftArm.remove(player.userData.leftForearmMesh);
        }

        // Create new arm segments connecting the joints
        const createSeg = player.userData.createArmSegment;
        const blueMat = player.userData.kimonoBlue;
        const skinMat = player.userData.skin;

        player.userData.leftUpperArmMesh = createSeg(shoulderPos, elbowPos, 0.24, 0.2, blueMat);
        player.userData.leftForearmMesh = createSeg(elbowPos, handPos, 0.2, 0.16, skinMat || blueMat);

        if (player.userData.leftUpperArmMesh) {
            player.userData.leftArm.add(player.userData.leftUpperArmMesh);
        }
        if (player.userData.leftForearmMesh) {
            player.userData.leftArm.add(player.userData.leftForearmMesh);
        }
    }

    // === ANIMATE RIGHT ARM (sword arm) ===
    if (player.userData.rightArm) {
        if (playerStats.isAttackingNow) {
            // Swing sword arm forward in an arc
            const t = (playerStats.attackAnimTime || 0) / 0.4; // 0 to 1 over 400ms
            const swingAngle = Math.sin(t * Math.PI) * 1.8; // Arc swing
            player.userData.rightArm.rotation.x = -swingAngle;
            player.userData.rightArm.rotation.z = -0.3 - swingAngle * 0.3;
        } else {
            // Relaxed position - arm slightly raised with sword
            player.userData.rightArm.rotation.x = -0.2;
            player.userData.rightArm.rotation.z = 0;
        }
    }

    // Gravity
    playerStats.velocity.y -= 50 * deltaTime;
    player.position.y += playerStats.velocity.y * deltaTime;

    // Ground check
    if (player.position.y <= 0) {
        player.position.y = 0;
        playerStats.velocity.y = 0;
        playerStats.isGrounded = true;
    }

    // Keep player on platform
    const radiusClamp = ARENA_RADIUS - 0.8;
    const pos2D = new THREE.Vector2(player.position.x, player.position.z);
    if (pos2D.length() > radiusClamp) {
        pos2D.setLength(radiusClamp);
        player.position.x = pos2D.x;
        player.position.z = pos2D.y;
    }

    // Update camera
    updateCamera();
}

function updateCamera() {
    if (!player) return;

    // Fixed camera behind and above player - instant follow
    const offset = new THREE.Vector3(0, 12, 16);
    camera.position.copy(player.position).add(offset);

    // Apply screen shake
    camera.position.add(screenShake.offset);

    camera.lookAt(player.position);
}

// ===== ENEMY HEALTH BARS =====
function renderEnemyHealthBars() {
    // Get or create container
    let container = document.getElementById('enemy-health-bars');
    if (!container) {
        container = document.createElement('div');
        container.id = 'enemy-health-bars';
        document.getElementById('game-screen').appendChild(container);
    }

    // Clear old bars
    container.innerHTML = '';

    enemies.forEach((enemy, idx) => {
        const healthPercent = enemy.userData.health / enemy.userData.maxHealth;

        // Only show if damaged
        if (healthPercent >= 1) return;

        // Get screen position
        const worldPos = enemy.position.clone();
        worldPos.y += enemy.userData.type === 'boss' ? 5 : 3; // Above enemy head

        const screenPos = worldPos.project(camera);
        const x = (screenPos.x + 1) / 2 * window.innerWidth;
        const y = (-screenPos.y + 1) / 2 * window.innerHeight;

        // Only render if in front of camera
        if (screenPos.z > 1) return;

        // Create health bar element
        const bar = document.createElement('div');
        bar.className = 'enemy-health-bar';
        bar.innerHTML = `
            <div class="enemy-health-bg">
                <div class="enemy-health-fill" style="width: ${healthPercent * 100}%"></div>
            </div>
        `;
        bar.style.left = x + 'px';
        bar.style.top = y + 'px';

        // Color based on enemy type
        const fill = bar.querySelector('.enemy-health-fill');
        switch(enemy.userData.type) {
            case 'grunt': fill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)'; break;
            case 'speedy': fill.style.background = 'linear-gradient(90deg, #3498db, #2980b9)'; break;
            case 'tank': fill.style.background = 'linear-gradient(90deg, #95a5a6, #7f8c8d)'; break;
            case 'boss': fill.style.background = 'linear-gradient(90deg, #9b59b6, #8e44ad)'; break;
        }

        container.appendChild(bar);
    });
}

// ===== JUMP AND GROUND POUND PARTICLES =====
function createJumpParticles(position, color) {
    for (let i = 0; i < 8; i++) {
        const geometry = new THREE.SphereGeometry(0.15, 6, 6);
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const particle = new THREE.Mesh(geometry, material);
        
        const angle = (i / 8) * Math.PI * 2;
        particle.position.set(
            position.x + Math.cos(angle) * 0.5,
            position.y + 0.2,
            position.z + Math.sin(angle) * 0.5
        );
        particle.userData.velocity = new THREE.Vector3(
            Math.cos(angle) * 2,
            Math.random() * 2,
            Math.sin(angle) * 2
        );
        particle.userData.life = 0.5;
        
        scene.add(particle);
        particles.push(particle);
    }
}

function createGroundPoundEffect(position) {
    // Shockwave ring
    for (let i = 0; i < 20; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 6, 6);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true });
        const particle = new THREE.Mesh(geometry, material);
        
        const angle = (i / 20) * Math.PI * 2;
        particle.position.set(
            position.x,
            position.y + 0.3,
            position.z
        );
        particle.userData.velocity = new THREE.Vector3(
            Math.cos(angle) * 12,
            Math.random() * 3,
            Math.sin(angle) * 12
        );
        particle.userData.life = 0.8;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Dust cloud
    for (let i = 0; i < 15; i++) {
        const geometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x886644, transparent: true, opacity: 0.7 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.set(
            position.x + (Math.random() - 0.5) * 2,
            position.y + 0.1,
            position.z + (Math.random() - 0.5) * 2
        );
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            Math.random() * 4 + 2,
            (Math.random() - 0.5) * 3
        );
        particle.userData.life = 1.2;
        
        scene.add(particle);
        particles.push(particle);
    }
}

// ===== ABILITY SYSTEM =====
function activateAbility(abilityType) {
    // Deactivate current ability first
    if (playerStats.currentAbility) {
        deactivateAbility();
    }
    
    playerStats.currentAbility = abilityType;
    playerStats.abilityTimer = playerStats.abilityDuration;

    // Play ability activation sound
    if (audioManager) audioManager.play('abilityActivate', 0.8);

    switch(abilityType) {
        case 'leaf':
            activateLeafForm();
            break;
        case 'dragon':
            activateDragonForm();
            break;
        case 'wind':
            activateWindForm();
            break;
    }
    
    updateAbilityHUD();
}

function deactivateAbility() {
    switch(playerStats.currentAbility) {
        case 'leaf':
            deactivateLeafForm();
            break;
        case 'dragon':
            deactivateDragonForm();
            break;
        case 'wind':
            deactivateWindForm();
            break;
    }
    
    playerStats.currentAbility = null;
    playerStats.abilityTimer = 0;
    updateAbilityHUD();
}

function updateAbilityHUD() {
    const abilities = ['leaf', 'dragon', 'wind'];
    abilities.forEach(ab => {
        const el = document.getElementById(`ability-${ab}`);
        if (!el) return;
        
        const timeEl = el.querySelector('.ability-time');
        if (playerStats.currentAbility === ab) {
            el.classList.add('active');
            if (timeEl) timeEl.textContent = Math.ceil(playerStats.abilityTimer) + 's';
        } else {
            el.classList.remove('active');
            if (timeEl) timeEl.textContent = '';
        }
    });
}

// ===== LEAF FORM =====
// Turn into a bunch of invincible leaves that scatter, solidify when you want to attack
function activateLeafForm() {
    playerStats.isLeafForm = true;
    player.visible = false;
    
    // Create leaf particles around player position
    for (let i = 0; i < 25; i++) {
        const leafGeo = new THREE.PlaneGeometry(0.4, 0.6);
        const leafMat = new THREE.MeshBasicMaterial({ 
            color: Math.random() > 0.5 ? 0x44aa44 : 0x88cc44, 
            side: THREE.DoubleSide,
            transparent: true
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        
        leaf.position.copy(player.position);
        leaf.position.x += (Math.random() - 0.5) * 3;
        leaf.position.y += Math.random() * 4 + 1;
        leaf.position.z += (Math.random() - 0.5) * 3;
        
        leaf.userData.baseY = leaf.position.y;
        leaf.userData.offset = Math.random() * Math.PI * 2;
        leaf.userData.spinSpeed = (Math.random() - 0.5) * 5;
        leaf.userData.floatSpeed = 1 + Math.random();
        
        scene.add(leaf);
        playerStats.leafParticles.push(leaf);
    }
}

function updateLeafForm() {
    // Move leaves with WASD or arrow keys
    const moveSpeed = playerStats.speed * playerStats.speedMult * 1.5 * deltaTime;
    const moveDirection = new THREE.Vector3();

    if (keys['w'] || keys['arrowup']) moveDirection.z -= 1;
    if (keys['s'] || keys['arrowdown']) moveDirection.z += 1;
    if (keys['a'] || keys['arrowleft']) moveDirection.x -= 1;
    if (keys['d'] || keys['arrowright']) moveDirection.x += 1;

    // Move player position (invisible but still tracked)
    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        player.position.x += moveDirection.x * moveSpeed;
        player.position.z += moveDirection.z * moveSpeed;
    }
    
    // Keep on platform
    const radiusClamp = ARENA_RADIUS - 0.8;
    const pos2D = new THREE.Vector2(player.position.x, player.position.z);
    if (pos2D.length() > radiusClamp) {
        pos2D.setLength(radiusClamp);
        player.position.x = pos2D.x;
        player.position.z = pos2D.y;
    }
    
    // Animate leaves floating around player
    playerStats.leafParticles.forEach((leaf, i) => {
        const time = gameTimer + leaf.userData.offset;
        
        // Orbit around player
        const orbitRadius = 1.5 + Math.sin(time * leaf.userData.floatSpeed) * 0.5;
        const orbitAngle = time * 1.5 + (i / playerStats.leafParticles.length) * Math.PI * 2;
        
        leaf.position.x = player.position.x + Math.cos(orbitAngle) * orbitRadius;
        leaf.position.z = player.position.z + Math.sin(orbitAngle) * orbitRadius;
        leaf.position.y = player.position.y + 2 + Math.sin(time * leaf.userData.floatSpeed * 2) * 1;
        
        // Spin
        leaf.rotation.x = time * leaf.userData.spinSpeed;
        leaf.rotation.y = time * leaf.userData.spinSpeed * 0.7;
    });
    
    // Invincible in leaf form - no damage taken
    
    // Click or attack key to solidify and attack
    if (playerStats.isAttacking || keys['j']) {
        solidifyFromLeaves();
    }
}

function solidifyFromLeaves() {
    playerStats.isLeafForm = false;
    player.visible = true;
    
    // Leaves rush to center and explode outward as attack
    const center = player.position.clone();
    
    // Damage all nearby enemies
    enemies.forEach(enemy => {
        const dist = center.distanceTo(enemy.position);
        if (dist < 8) {
            const damage = 60 * playerStats.powerMult;
            damageEnemy(enemy, damage);
            createHitParticles(enemy.position);
            
            // Knockback
            const knockDir = new THREE.Vector3().subVectors(enemy.position, center).normalize();
            enemy.position.add(knockDir.multiplyScalar(6));
            enemy.userData.stunned = 1.0;
        }
    });
    
    // Turn leaves into attack particles
    playerStats.leafParticles.forEach(leaf => {
        leaf.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            Math.random() * 5,
            (Math.random() - 0.5) * 15
        );
        leaf.userData.life = 0.8;
        particles.push(leaf);
    });
    playerStats.leafParticles = [];
}

function deactivateLeafForm() {
    if (playerStats.isLeafForm) {
        solidifyFromLeaves();
    }
    playerStats.isLeafForm = false;
    player.visible = true;
}

// ===== DRAGON FORM =====
// Flaming warrior with dragon head, enemies die on touch, can breathe fire
function activateDragonForm() {
    playerStats.isDragonForm = true;
    
    // Change player appearance - add fire aura
    if (player) {
        // Add flame particles around player
        player.userData.fireAura = [];
        for (let i = 0; i < 12; i++) {
            const flameGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const flameMat = new THREE.MeshBasicMaterial({ 
                color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00,
                transparent: true,
                opacity: 0.8
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.userData.offset = (i / 12) * Math.PI * 2;
            player.add(flame);
            player.userData.fireAura.push(flame);
        }
        
        // Tint player red/orange
        player.traverse(child => {
            if (child.material && child.material.color) {
                child.userData.originalColor = child.material.color.clone();
                child.material.color.lerp(new THREE.Color(0xff4400), 0.3);
            }
        });
    }
}

function createFireParticles(position) {
    for (let i = 0; i < 12; i++) {
        const geometry = new THREE.SphereGeometry(0.15, 6, 6);
        const color = Math.random() > 0.5 ? 0xff4400 : 0xffaa00;
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.position.y += 1;
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 6 + 2,
            (Math.random() - 0.5) * 4
        );
        particle.userData.life = 0.6;
        
        scene.add(particle);
        particles.push(particle);
    }
}

function fireBreath() {
    if (playerStats.fireBreathCooldown > 0 || !playerStats.isDragonForm) return;
    
    playerStats.fireBreathCooldown = 0.8;
    
    // Create fire breath cone in front of player
    const forward = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
    const startPos = player.position.clone().add(new THREE.Vector3(0, 2, 0));
    
    for (let i = 0; i < 30; i++) {
        const geometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 6, 6);
        const color = Math.random() > 0.3 ? 0xff4400 : 0xffff00;
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(startPos);
        
        // Spread in a cone
        const spread = (Math.random() - 0.5) * 0.5;
        const spreadVert = (Math.random() - 0.5) * 0.3;
        const speed = 15 + Math.random() * 10;
        
        particle.userData.velocity = new THREE.Vector3(
            (forward.x + spread) * speed,
            spreadVert * speed,
            (forward.z + spread) * speed
        );
        particle.userData.life = 0.5;
        particle.userData.isFireBreath = true;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Damage enemies in cone
    enemies.forEach(enemy => {
        const toEnemy = new THREE.Vector3().subVectors(enemy.position, player.position);
        toEnemy.y = 0;
        const dist = toEnemy.length();
        
        if (dist < 12) {
            toEnemy.normalize();
            const dot = forward.dot(toEnemy);
            
            if (dot > 0.5) { // In front ~60 degree cone
                const damage = 80 * playerStats.powerMult;
                damageEnemy(enemy, damage);
                createFireParticles(enemy.position);
                enemy.userData.stunned = 0.5;
            }
        }
    });
}

function updateDragonForm() {
    if (!playerStats.isDragonForm || !player.userData.fireAura) return;
    
    // Animate fire aura
    player.userData.fireAura.forEach((flame, i) => {
        const time = gameTimer * 3 + flame.userData.offset;
        flame.position.set(
            Math.cos(time) * 1.8,
            2 + Math.sin(time * 2) * 0.5,
            Math.sin(time) * 1.8
        );
        flame.scale.setScalar(0.8 + Math.sin(time * 4) * 0.3);
    });
}

function deactivateDragonForm() {
    playerStats.isDragonForm = false;
    
    if (player) {
        // Remove fire aura
        if (player.userData.fireAura) {
            player.userData.fireAura.forEach(flame => {
                player.remove(flame);
            });
            player.userData.fireAura = [];
        }
        
        // Restore original colors
        player.traverse(child => {
            if (child.userData.originalColor && child.material) {
                child.material.color.copy(child.userData.originalColor);
            }
        });
    }
}

// ===== WIND FORM =====
// Higher jump, wind gust pushback, semi-transparent
function activateWindForm() {
    playerStats.isWindForm = true;
    playerStats.isTransparent = false;
    
    // Make player slightly transparent with wind swirls
    if (player) {
        player.traverse(child => {
            if (child.material) {
                child.userData.originalOpacity = child.material.opacity;
                child.material.transparent = true;
                child.material.opacity = 0.7;
            }
        });
        
        // Add wind swirl particles
        player.userData.windParticles = [];
        for (let i = 0; i < 8; i++) {
            const windGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
            const windMat = new THREE.MeshBasicMaterial({ 
                color: 0xaaddff,
                transparent: true,
                opacity: 0.5
            });
            const wind = new THREE.Mesh(windGeo, windMat);
            wind.userData.offset = (i / 8) * Math.PI * 2;
            player.add(wind);
            player.userData.windParticles.push(wind);
        }
    }
}

function windGust() {
    if (playerStats.windGustCooldown > 0 || !playerStats.isWindForm) return;
    
    playerStats.windGustCooldown = 1.5;
    
    // Create wind gust effect
    const forward = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
    
    for (let i = 0; i < 20; i++) {
        const geometry = new THREE.TorusGeometry(0.2 + Math.random() * 0.3, 0.05, 6, 12);
        const material = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(player.position);
        particle.position.y += 1.5;
        
        const spread = (Math.random() - 0.5) * 0.3;
        const speed = 20 + Math.random() * 5;
        
        particle.userData.velocity = new THREE.Vector3(
            (forward.x + spread) * speed,
            (Math.random() - 0.5) * 2,
            (forward.z + spread) * speed
        );
        particle.userData.life = 0.6;
        particle.rotation.x = Math.random() * Math.PI;
        particle.rotation.y = Math.random() * Math.PI;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Push back enemies
    enemies.forEach(enemy => {
        const toEnemy = new THREE.Vector3().subVectors(enemy.position, player.position);
        toEnemy.y = 0;
        const dist = toEnemy.length();
        
        if (dist < 10) {
            toEnemy.normalize();
            const dot = forward.dot(toEnemy);
            
            if (dot > 0.3) {
                // Push enemy back
                const pushForce = (1 - dist / 10) * 15;
                enemy.position.add(forward.clone().multiplyScalar(pushForce));
                enemy.userData.stunned = 1.0;
                
                // Small damage
                damageEnemy(enemy, 15 * playerStats.powerMult);
            }
        }
    });
}

function updateWindForm() {
    if (!playerStats.isWindForm || !player.userData.windParticles) return;
    
    // Animate wind swirls
    player.userData.windParticles.forEach((wind, i) => {
        const time = gameTimer * 4 + wind.userData.offset;
        wind.position.set(
            Math.cos(time) * 1.2,
            1.5 + Math.sin(time * 1.5) * 1,
            Math.sin(time) * 1.2
        );
        wind.rotation.x = time;
        wind.rotation.z = time * 0.7;
    });
    
    // Charge wind gust
    if (keys['q'] && playerStats.windGustCooldown <= 0) {
        playerStats.windChargeTime += deltaTime;
        if (playerStats.windChargeTime > 0.3) {
            playerStats.isTransparent = true;
            if (player) {
                player.traverse(child => {
                    if (child.material) {
                        child.material.opacity = 0.3;
                    }
                });
            }
        }
    } else if (playerStats.windChargeTime > 0) {
        // Release wind gust
        if (playerStats.windChargeTime > 0.3) {
            windGust();
        }
        playerStats.windChargeTime = 0;
        playerStats.isTransparent = false;
        if (player) {
            player.traverse(child => {
                if (child.material) {
                    child.material.opacity = 0.7;
                }
            });
        }
    }
}

function deactivateWindForm() {
    playerStats.isWindForm = false;
    playerStats.isTransparent = false;
    playerStats.windChargeTime = 0;
    
    if (player) {
        // Remove wind particles
        if (player.userData.windParticles) {
            player.userData.windParticles.forEach(wind => {
                player.remove(wind);
            });
            player.userData.windParticles = [];
        }
        
        // Restore opacity
        player.traverse(child => {
            if (child.material) {
                child.material.opacity = child.userData.originalOpacity || 1;
            }
        });
    }
}

// ===== POWER-UP SPAWNING =====
let powerUps = [];

function spawnPowerUp() {
    const types = ['leaf', 'dragon', 'wind'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerUp = new THREE.Group();

    switch(type) {
        case 'leaf':
            // Create a 3D leaf shape
            createLeafPowerUp(powerUp);
            break;
        case 'dragon':
            // Create a flame/fire shape
            createFirePowerUp(powerUp);
            break;
        case 'wind':
            // Create a wind swirl shape
            createWindPowerUp(powerUp);
            break;
    }

    // Random position on arena
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (ARENA_RADIUS - 3);
    powerUp.position.set(
        Math.cos(angle) * dist,
        2.5,
        Math.sin(angle) * dist
    );

    powerUp.userData = {
        type: type,
        baseY: 2.5,
        spawnTime: gameTimer
    };

    scene.add(powerUp);
    powerUps.push(powerUp);
}

function createLeafPowerUp(group) {
    // Main leaf body - elongated diamond shape
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 1.2);
    leafShape.quadraticCurveTo(0.6, 0.8, 0.5, 0);
    leafShape.quadraticCurveTo(0.3, -0.4, 0, -0.6);
    leafShape.quadraticCurveTo(-0.3, -0.4, -0.5, 0);
    leafShape.quadraticCurveTo(-0.6, 0.8, 0, 1.2);

    const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.1, bevelEnabled: false });
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x44DD44,
        emissive: 0x228822,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
    });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.y = 0.5;
    group.add(leaf);

    // Leaf stem/vein
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 1.5, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x228822 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.3;
    stem.rotation.z = 0.1;
    group.add(stem);

    // Glow effect
    const glowGeo = new THREE.SphereGeometry(1.0, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x88ff88,
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.5;
    group.add(glow);
}

function createFirePowerUp(group) {
    // Fire/flame made of multiple cones
    const flameMat = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        transparent: true,
        opacity: 0.9
    });
    const flameCoreMat = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.95
    });
    const flameOuterMat = new THREE.MeshBasicMaterial({
        color: 0xFF3300,
        transparent: true,
        opacity: 0.7
    });

    // Central flame
    const coreGeo = new THREE.ConeGeometry(0.4, 1.8, 8);
    const core = new THREE.Mesh(coreGeo, flameCoreMat);
    core.position.y = 0.9;
    group.add(core);

    // Middle flame
    const midGeo = new THREE.ConeGeometry(0.6, 1.5, 8);
    const mid = new THREE.Mesh(midGeo, flameMat);
    mid.position.y = 0.7;
    group.add(mid);

    // Outer flames
    const outerGeo = new THREE.ConeGeometry(0.35, 1.0, 6);
    for (let i = 0; i < 5; i++) {
        const outer = new THREE.Mesh(outerGeo, flameOuterMat);
        const angle = (i / 5) * Math.PI * 2;
        outer.position.set(
            Math.cos(angle) * 0.4,
            0.4 + Math.random() * 0.3,
            Math.sin(angle) * 0.4
        );
        outer.rotation.z = (Math.random() - 0.5) * 0.4;
        outer.rotation.x = (Math.random() - 0.5) * 0.4;
        group.add(outer);
    }

    // Ember particles
    for (let i = 0; i < 8; i++) {
        const emberGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00 });
        const ember = new THREE.Mesh(emberGeo, emberMat);
        ember.position.set(
            (Math.random() - 0.5) * 0.8,
            0.5 + Math.random() * 1.2,
            (Math.random() - 0.5) * 0.8
        );
        ember.userData.emberOffset = Math.random() * Math.PI * 2;
        group.add(ember);
    }

    // Glow
    const glowGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.8;
    group.add(glow);
}

function createWindPowerUp(group) {
    // Wind swirl made of torus rings
    const windMat = new THREE.MeshBasicMaterial({
        color: 0x88DDFF,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const windMat2 = new THREE.MeshBasicMaterial({
        color: 0xAAEEFF,
        transparent: true,
        opacity: 0.5
    });

    // Swirling rings at different heights
    for (let i = 0; i < 5; i++) {
        const ringGeo = new THREE.TorusGeometry(0.3 + i * 0.15, 0.06, 8, 16);
        const ring = new THREE.Mesh(ringGeo, i % 2 === 0 ? windMat : windMat2);
        ring.position.y = i * 0.35;
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = i * 0.4;
        ring.userData.windRingIndex = i;
        group.add(ring);
    }

    // Central updraft cone (transparent)
    const updraftGeo = new THREE.ConeGeometry(0.8, 2.0, 12, 1, true);
    const updraftMat = new THREE.MeshBasicMaterial({
        color: 0xCCEEFF,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const updraft = new THREE.Mesh(updraftGeo, updraftMat);
    updraft.position.y = 1.0;
    group.add(updraft);

    // Floating particles
    for (let i = 0; i < 10; i++) {
        const particleGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.6
        });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.userData.windParticleAngle = (i / 10) * Math.PI * 2;
        particle.userData.windParticleHeight = Math.random();
        particle.userData.windParticleRadius = 0.3 + Math.random() * 0.5;
        group.add(particle);
    }

    // Glow
    const glowGeo = new THREE.SphereGeometry(1.0, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x66CCFF,
        transparent: true,
        opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.8;
    group.add(glow);
}

function updatePowerUps() {
    powerUps.forEach((powerUp, index) => {
        // Float animation
        powerUp.position.y = powerUp.userData.baseY + Math.sin(gameTimer * 2) * 0.3;
        powerUp.rotation.y += deltaTime * 1.5;

        // Type-specific animations
        const type = powerUp.userData.type;

        if (type === 'dragon') {
            // Animate fire - flicker embers
            powerUp.children.forEach(child => {
                if (child.userData.emberOffset !== undefined) {
                    const t = gameTimer * 5 + child.userData.emberOffset;
                    child.position.y = 0.5 + Math.abs(Math.sin(t)) * 1.2;
                    child.position.x += (Math.random() - 0.5) * 0.02;
                    child.position.z += (Math.random() - 0.5) * 0.02;
                }
            });
        } else if (type === 'wind') {
            // Animate wind rings and particles
            powerUp.children.forEach(child => {
                if (child.userData.windRingIndex !== undefined) {
                    child.rotation.z = gameTimer * 3 + child.userData.windRingIndex * 0.5;
                }
                if (child.userData.windParticleAngle !== undefined) {
                    const t = gameTimer * 4 + child.userData.windParticleAngle;
                    const r = child.userData.windParticleRadius;
                    const h = child.userData.windParticleHeight;
                    child.position.set(
                        Math.cos(t) * r,
                        (h + gameTimer * 0.5) % 2.0,
                        Math.sin(t) * r
                    );
                }
            });
        } else if (type === 'leaf') {
            // Gentle sway for leaf
            powerUp.children[0].rotation.z = Math.sin(gameTimer * 2) * 0.15;
        }

        // Check player collision (generous pickup radius)
        const dist = player.position.distanceTo(powerUp.position);
        if (dist < 5.0) {
            // Collect power-up
            activateAbility(powerUp.userData.type);
            scene.remove(powerUp);
            powerUps.splice(index, 1);

            // Collection particles - color based on type
            let particleColor = 0xffff00;
            if (type === 'leaf') particleColor = 0x88ff88;
            else if (type === 'dragon') particleColor = 0xff6600;
            else if (type === 'wind') particleColor = 0x88ddff;

            for (let i = 0; i < 15; i++) {
                const geo = new THREE.SphereGeometry(0.15, 6, 6);
                const mat = new THREE.MeshBasicMaterial({ color: particleColor, transparent: true });
                const p = new THREE.Mesh(geo, mat);
                p.position.copy(powerUp.position);
                p.userData.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 6,
                    (Math.random() - 0.5) * 8
                );
                p.userData.life = 0.8;
                scene.add(p);
                particles.push(p);
            }
        }
    });
}

function updateEnemies() {
    // Iterate backwards to safely remove enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Check if enemy is dead FIRST
        if (enemy.userData.health <= 0) {
            killEnemy(enemy, i);
            continue;
        }

        // Decrease stun timer
        if (enemy.userData.stunned > 0) {
            enemy.userData.stunned -= deltaTime;
            continue; // Don't move while stunned
        }

        // Boss-specific AI
        if (enemy.userData.type === 'boss') {
            updateBossAI(enemy);
            continue;
        }

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, enemy.position);
        direction.y = 0;
        const distToPlayer = direction.length();
        direction.normalize();

        const speed = enemy.userData.speed * (1 + gameTimer * 0.005) * deltaTime;

        // Only move if not too close (prevents sticking)
        if (distToPlayer > 2.0) {
            enemy.position.add(direction.clone().multiplyScalar(speed));
        }

        // Rotate to face player
        const angle = Math.atan2(direction.x, direction.z);
        enemy.rotation.y = angle + Math.PI;

        // Check collision with player - only damage on contact
        if (distToPlayer < 2.0) {
            // Wind form: when transparent (charging), pass through enemies completely
            if (playerStats.isWindForm && playerStats.isTransparent) {
                // Player is ghostly - no collision, just pass through
                // Don't push enemy, don't take damage
                continue;
            }

            // Wind form: even when not charging, take reduced damage and push enemies away
            if (playerStats.isWindForm) {
                // Light knockback on enemies that get close
                const pushBack = direction.clone().multiplyScalar(-0.15);
                enemy.position.add(pushBack);
                // Take only 25% damage in wind form
                const damageTaken = enemy.userData.damage * deltaTime * 0.125;
                playerStats.health -= damageTaken;
                continue;
            }

            if (!playerStats.isBlocking) {
                // Damage player
                const damageTaken = enemy.userData.damage * deltaTime * 0.5;
                playerStats.health -= damageTaken;

                // Player hurt feedback
                if (!playerStats.lastHurtTime || gameTimer - playerStats.lastHurtTime > 0.3) {
                    playerStats.lastHurtTime = gameTimer;
                    triggerScreenShake(0.2, 0.1);
                    flashScreen('#ff0000', 0.1);
                    if (audioManager) audioManager.play('playerHurt', 0.5);
                }

                // Push enemy back slightly to prevent sticking
                const pushBack = direction.clone().multiplyScalar(-0.1);
                enemy.position.add(pushBack);
            } else {
                // Shield blocks and damages enemy
                damageEnemy(enemy, 15 * playerStats.powerMult * deltaTime, false);

                // Block feedback
                if (!playerStats.lastBlockTime || gameTimer - playerStats.lastBlockTime > 0.2) {
                    playerStats.lastBlockTime = gameTimer;
                    if (audioManager) audioManager.play('shieldBlock', 0.6);
                    triggerScreenShake(0.1, 0.05);
                }

                // Push enemy back when blocked
                const pushBack = direction.clone().multiplyScalar(-0.2);
                enemy.position.add(pushBack);
            }
        }

        // Keep enemy on platform
        const platformRadius = ARENA_RADIUS - 0.8;
        const enemyPos2D = new THREE.Vector2(enemy.position.x, enemy.position.z);
        if (enemyPos2D.length() > platformRadius) {
            enemyPos2D.setLength(platformRadius);
            enemy.position.x = enemyPos2D.x;
            enemy.position.z = enemyPos2D.y;
        }
    }
}

// ===== BOSS AI PATTERNS =====
function updateBossAI(boss) {
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, boss.position);
    direction.y = 0;
    const distToPlayer = direction.length();
    direction.normalize();

    // Decrease cooldowns
    if (boss.userData.attackCooldown > 0) boss.userData.attackCooldown -= deltaTime;
    if (boss.userData.summonCooldown > 0) boss.userData.summonCooldown -= deltaTime;

    // Check for rage mode (below 30% health)
    const healthPercent = boss.userData.health / boss.userData.maxHealth;
    if (healthPercent < 0.3 && !boss.userData.isRaging) {
        boss.userData.isRaging = true;
        boss.userData.speed = boss.userData.baseSpeed * 1.5;
        boss.userData.damage *= 1.3;

        // Visual rage effect
        boss.children.forEach(child => {
            if (child.material && child.material.color) {
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.3;
            }
        });

        // Rage activation effects
        triggerScreenShake(0.6, 0.3);
        flashScreen('#ff0000', 0.15);
        if (audioManager) audioManager.play('abilityActivate', 1.0);

        // Create rage particles
        for (let j = 0; j < 30; j++) {
            const geo = new THREE.SphereGeometry(0.2, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(boss.position);
            p.position.y += 2;
            p.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 8 + 3,
                (Math.random() - 0.5) * 10
            );
            p.userData.life = 1.0;
            scene.add(p);
            particles.push(p);
        }
    }

    // Handle current attack
    if (boss.userData.currentAttack) {
        boss.userData.attackTimer -= deltaTime;

        switch(boss.userData.currentAttack) {
            case 'charge':
                updateBossCharge(boss, direction, distToPlayer);
                break;
            case 'groundSlam':
                updateBossGroundSlam(boss);
                break;
        }

        if (boss.userData.attackTimer <= 0) {
            boss.userData.currentAttack = null;
            boss.userData.attackCooldown = boss.userData.isRaging ? 1.5 : 3;
        }
        return;
    }

    // Choose attack if cooldown ready
    if (boss.userData.attackCooldown <= 0 && distToPlayer < 15) {
        const attackRoll = Math.random();

        if (attackRoll < 0.4 && distToPlayer > 5) {
            // Charge attack
            startBossCharge(boss, direction);
        } else if (attackRoll < 0.7) {
            // Ground slam
            startBossGroundSlam(boss);
        } else if (boss.userData.summonCooldown <= 0 && enemies.length < 10) {
            // Summon grunts
            bossSummonGrunts(boss);
        }
    }

    // Normal movement towards player
    const speed = boss.userData.speed * (1 + gameTimer * 0.003) * deltaTime;
    if (distToPlayer > 3.0) {
        boss.position.add(direction.clone().multiplyScalar(speed));
    }

    // Rotate to face player
    const angle = Math.atan2(direction.x, direction.z);
    boss.rotation.y = angle + Math.PI;

    // Contact damage
    if (distToPlayer < 3.0) {
        if (!playerStats.isBlocking) {
            playerStats.health -= boss.userData.damage * deltaTime * 0.5;
            if (!playerStats.lastHurtTime || gameTimer - playerStats.lastHurtTime > 0.3) {
                playerStats.lastHurtTime = gameTimer;
                triggerScreenShake(0.3, 0.1);
                flashScreen('#ff0000', 0.1);
                if (audioManager) audioManager.play('playerHurt', 0.6);
            }
        } else {
            damageEnemy(boss, 10 * playerStats.powerMult * deltaTime, false);
            if (!playerStats.lastBlockTime || gameTimer - playerStats.lastBlockTime > 0.2) {
                playerStats.lastBlockTime = gameTimer;
                if (audioManager) audioManager.play('shieldBlock', 0.8);
                triggerScreenShake(0.15, 0.05);
            }
        }
    }

    // Keep on platform
    const platformRadius = ARENA_RADIUS - 1.5;
    const bossPos2D = new THREE.Vector2(boss.position.x, boss.position.z);
    if (bossPos2D.length() > platformRadius) {
        bossPos2D.setLength(platformRadius);
        boss.position.x = bossPos2D.x;
        boss.position.z = bossPos2D.y;
    }
}

function startBossCharge(boss, direction) {
    boss.userData.currentAttack = 'charge';
    boss.userData.attackTimer = 1.5;
    boss.userData.chargeTarget = player.position.clone();
    boss.userData.isCharging = false;
    boss.userData.chargeWindup = 0.5;

    // Warning indicator
    createChargeWarning(boss.position, boss.userData.chargeTarget);
}

function updateBossCharge(boss, direction, distToPlayer) {
    if (boss.userData.chargeWindup > 0) {
        // Windup phase - boss shakes and glows
        boss.userData.chargeWindup -= deltaTime;
        boss.position.x += (Math.random() - 0.5) * 0.1;
        boss.position.z += (Math.random() - 0.5) * 0.1;

        if (boss.userData.chargeWindup <= 0) {
            boss.userData.isCharging = true;
        }
        return;
    }

    if (boss.userData.isCharging) {
        // Charge towards target
        const chargeDir = new THREE.Vector3().subVectors(boss.userData.chargeTarget, boss.position);
        chargeDir.y = 0;
        const chargeDist = chargeDir.length();
        chargeDir.normalize();

        const chargeSpeed = 25 * deltaTime;
        boss.position.add(chargeDir.multiplyScalar(chargeSpeed));

        // Create charge trail particles
        if (Math.random() < 0.3) {
            const geo = new THREE.SphereGeometry(0.3, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(boss.position);
            p.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2);
            p.userData.life = 0.4;
            scene.add(p);
            particles.push(p);
        }

        // Hit player during charge
        if (distToPlayer < 3.5 && !playerStats.isBlocking) {
            playerStats.health -= boss.userData.damage * 2;
            triggerScreenShake(0.8, 0.2);
            flashScreen('#ff0000', 0.15);
            if (audioManager) audioManager.play('playerHurt', 1.0);

            // Knockback player
            const knockDir = direction.clone().normalize();
            player.position.add(knockDir.multiplyScalar(8));
        }

        // Stop if reached target or hit wall
        if (chargeDist < 1 || new THREE.Vector2(boss.position.x, boss.position.z).length() > ARENA_RADIUS - 2) {
            boss.userData.isCharging = false;
            boss.userData.attackTimer = 0.3; // Brief recovery
            triggerScreenShake(0.4, 0.1);
        }
    }
}

function createChargeWarning(start, end) {
    // Visual warning line
    const points = [start.clone(), end.clone()];
    points[0].y = 0.2;
    points[1].y = 0.2;

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geo, mat);
    line.userData.velocity = new THREE.Vector3(0, 0, 0);
    line.userData.life = 0.5;
    scene.add(line);
    particles.push(line);
}

function startBossGroundSlam(boss) {
    boss.userData.currentAttack = 'groundSlam';
    boss.userData.attackTimer = 1.2;
    boss.userData.slamPhase = 'jump';
    boss.userData.slamStartY = boss.position.y;
}

function updateBossGroundSlam(boss) {
    if (boss.userData.slamPhase === 'jump') {
        // Jump up
        boss.position.y += 15 * deltaTime;
        if (boss.position.y > 8) {
            boss.userData.slamPhase = 'fall';
        }
    } else if (boss.userData.slamPhase === 'fall') {
        // Slam down
        boss.position.y -= 30 * deltaTime;
        if (boss.position.y <= boss.userData.slamStartY) {
            boss.position.y = boss.userData.slamStartY;
            boss.userData.slamPhase = 'impact';

            // Ground slam impact!
            triggerScreenShake(1.0, 0.3);
            if (audioManager) audioManager.play('hitImpact', 1.2);

            // AOE damage
            const slamRadius = 8;
            const distToPlayer = boss.position.distanceTo(player.position);
            if (distToPlayer < slamRadius && !playerStats.isBlocking) {
                const damage = boss.userData.damage * 1.5 * (1 - distToPlayer / slamRadius);
                playerStats.health -= damage;
                flashScreen('#ff0000', 0.2);
                if (audioManager) audioManager.play('playerHurt', 0.8);

                // Knockback
                const knockDir = new THREE.Vector3().subVectors(player.position, boss.position).normalize();
                player.position.add(knockDir.multiplyScalar(5));
            }

            // Shockwave particles
            for (let j = 0; j < 30; j++) {
                const angle = (j / 30) * Math.PI * 2;
                const geo = new THREE.SphereGeometry(0.3, 6, 6);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true });
                const p = new THREE.Mesh(geo, mat);
                p.position.copy(boss.position);
                p.position.y = 0.3;
                p.userData.velocity = new THREE.Vector3(Math.cos(angle) * 15, 2, Math.sin(angle) * 15);
                p.userData.life = 0.6;
                scene.add(p);
                particles.push(p);
            }
        }
    }
}

function bossSummonGrunts(boss) {
    boss.userData.summonCooldown = boss.userData.isRaging ? 8 : 15;

    // Summon 3 grunts around the boss
    for (let j = 0; j < 3; j++) {
        const angle = (j / 3) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 3 + Math.random() * 2;

        const grunt = createEnemy('grunt');
        grunt.position.set(
            boss.position.x + Math.cos(angle) * dist,
            0,
            boss.position.z + Math.sin(angle) * dist
        );
        enemies.push(grunt);

        // Summon effect
        for (let k = 0; k < 10; k++) {
            const geo = new THREE.SphereGeometry(0.15, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0x9944ff, transparent: true });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(grunt.position);
            p.position.y += 1;
            p.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5 + 2,
                (Math.random() - 0.5) * 5
            );
            p.userData.life = 0.8;
            scene.add(p);
            particles.push(p);
        }
    }

    // Boss summon animation
    triggerScreenShake(0.3, 0.15);
    if (audioManager) audioManager.play('abilityActivate', 0.7);
}

function spawnEnemies() {
    enemySpawnTimer += deltaTime;
    enemySpawnRate = Math.max(2, 5 - gameTimer / 20);

    if (enemySpawnTimer >= enemySpawnRate) {
        enemySpawnTimer = 0;

        let type = 'grunt';
        const rand = Math.random();
        
        if (gameTimer > 120) {
            if (rand < 0.1) type = 'boss';
            else if (rand < 0.4) type = 'tank';
            else if (rand < 0.7) type = 'speedy';
        } else if (gameTimer > 60) {
            if (rand < 0.3) type = 'tank';
            else if (rand < 0.6) type = 'speedy';
        } else if (gameTimer > 30) {
            if (rand < 0.3) type = 'speedy';
        }

        const enemy = createEnemy(type);
        enemies.push(enemy);
    }
}

function playerAttack() {
    if (playerStats.attackCooldown > 0 || !player) return;

    playerStats.attackCooldown = 0.5;
    playerStats.isAttacking = true;

    // Play sword swing sound
    if (audioManager) {
        audioManager.play('swordSwing', 0.6);
    }

    // Reset sword trail for fresh swing
    swordTrailPoints = [];

    // Sword swing animation
    if (player.userData.sword) {
        const sword = player.userData.sword;
        sword.rotation.z = -Math.PI / 2;
        setTimeout(() => {
            if (sword) sword.rotation.z = Math.PI / 4;
        }, 200);
    }

    // Create visible sword slash arc
    createSwordSlash();

    // Attack hitbox (wider cone in front of player)
    const attackRange = 6;
    const attackAngle = Math.PI / 2; // 90 degree cone - wider swing

    let hitCount = 0;
    enemies.forEach(enemy => {
        const toEnemy = new THREE.Vector3();
        toEnemy.subVectors(enemy.position, player.position);
        const distance = toEnemy.length();

        if (distance < attackRange) {
            // Check if enemy is in front of player
            toEnemy.normalize();
            const forward = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
            const dot = forward.dot(toEnemy);

            if (dot > Math.cos(attackAngle / 2)) {
                hitCount++;

                // Hit! - Increased damage
                const damage = 35 * playerStats.powerMult;
                damageEnemy(enemy, damage, true);

                // Strong knockback
                const knockback = toEnemy.clone().multiplyScalar(10);
                enemy.position.add(knockback);

                // Longer stun
                enemy.userData.stunned = 1.5;

                // Create enhanced hit particles with direction
                createHitParticles(enemy.position, toEnemy.clone().negate());
            }
        }
    });

    // Extra shake for multi-hits
    if (hitCount > 1) {
        triggerScreenShake(0.3 * hitCount, 0.1);
    }

    setTimeout(() => {
        playerStats.isAttacking = false;
    }, 200);
}

function createSwordSlash() {
    // Create a visible arc slash effect
    const slashGroup = new THREE.Group();

    // Arc geometry for the slash
    const curve = new THREE.EllipseCurve(0, 0, 3, 3, 0, Math.PI * 0.7, false, 0);
    const points = curve.getPoints(20);
    const slashGeo = new THREE.BufferGeometry().setFromPoints(
        points.map(p => new THREE.Vector3(p.x, 0, p.y))
    );

    // Create multiple lines for thickness
    for (let i = 0; i < 3; i++) {
        const mat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1 - i * 0.3,
            linewidth: 3
        });
        const line = new THREE.Line(slashGeo, mat);
        line.scale.setScalar(1 + i * 0.15);
        slashGroup.add(line);
    }

    // Add a filled arc mesh for more visibility
    const arcShape = new THREE.Shape();
    arcShape.absarc(0, 0, 3.5, 0, Math.PI * 0.7, false);
    arcShape.lineTo(0, 0);
    const arcGeo = new THREE.ShapeGeometry(arcShape);
    const arcMat = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.rotation.x = -Math.PI / 2;
    slashGroup.add(arcMesh);

    // Position at player
    slashGroup.position.copy(player.position);
    slashGroup.position.y += 2;
    slashGroup.rotation.y = player.rotation.y - Math.PI * 0.35;

    scene.add(slashGroup);

    // Animate and remove
    let life = 0;
    const animateSlash = () => {
        life += 0.05;
        slashGroup.scale.setScalar(1 + life * 0.5);
        slashGroup.children.forEach(child => {
            if (child.material) child.material.opacity *= 0.85;
        });

        if (life < 0.3) {
            requestAnimationFrame(animateSlash);
        } else {
            scene.remove(slashGroup);
            slashGroup.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    };
    animateSlash();
}

function damageEnemy(enemy, damage, fromPlayer = true) {
    // Check for critical hit (10% chance)
    const isCritical = Math.random() < 0.1;
    const finalDamage = isCritical ? damage * 2 : damage;

    // Apply combo multiplier
    const comboMultipliedDamage = finalDamage * comboSystem.multiplier;
    enemy.userData.health -= comboMultipliedDamage;

    // Add to combo if from player attack
    if (fromPlayer) {
        addComboHit();
    }

    // Create floating damage number
    const numPos = enemy.position.clone();
    numPos.y += 2;
    createDamageNumber(numPos, comboMultipliedDamage, isCritical);

    // Screen shake (intensity based on damage)
    const shakeIntensity = Math.min(0.3 + (comboMultipliedDamage / 100) * 0.3, 0.8);
    triggerScreenShake(shakeIntensity, 0.08);

    // Action bloom flash
    triggerActionBloom();

    // Hit stop for impact
    const hitStopDuration = isCritical ? 0.08 : 0.05;
    triggerHitStop(hitStopDuration);

    // Play hit sound
    if (audioManager) {
        if (isCritical) {
            audioManager.play('criticalHit', 1.0);
        } else {
            audioManager.play('hitImpact', 0.7);
        }
    }

    // Flash enemy WHITE for impact (not red)
    enemy.children.forEach(child => {
        if (child.material && child.material.color) {
            const originalColor = child.material.color.clone();
            child.material.color.setHex(0xffffff);
            if (child.material.emissive) {
                child.material.emissive.setHex(0xffffff);
                child.material.emissiveIntensity = 0.5;
            }

            setTimeout(() => {
                if (child.material && child.material.color) {
                    child.material.color.copy(originalColor);
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                }
            }, 100);
        }
    });
}

function killEnemy(enemy, index) {
    const pointsEarned = enemy.userData.points * comboSystem.multiplier;
    playerStats.kills++;
    playerStats.score += pointsEarned;

    // Increase multipliers
    playerStats.speedMult = Math.min(1.0 + playerStats.kills * 0.08, 5.0);
    playerStats.powerMult = Math.min(1.0 + playerStats.kills * 0.4, 20.0);

    // Longer hit stop for killing blow
    const isBoss = enemy.userData.type === 'boss';
    triggerHitStop(isBoss ? 0.15 : 0.1);

    // Bigger screen shake for kills
    triggerScreenShake(isBoss ? 0.8 : 0.5, isBoss ? 0.2 : 0.12);

    // Play death sound
    if (audioManager) {
        audioManager.play('enemyDeath', isBoss ? 1.2 : 0.8);
    }

    // Screen flash for boss kills
    if (isBoss) {
        flashScreen('#ffffff', 0.2);
    }

    // Add to kill feed
    addKillFeedItem(enemy.userData.type, pointsEarned);

    // Create enhanced death particles
    createDeathParticles(enemy.position, enemy.userData.type);

    // Remove enemy
    scene.remove(enemy);
    enemies.splice(index, 1);
}

// Screen flash effect
function flashScreen(color, duration) {
    let flash = document.getElementById('screen-flash');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'screen-flash';
        document.getElementById('game-screen').appendChild(flash);
    }
    flash.style.backgroundColor = color;
    flash.style.opacity = '0.5';

    setTimeout(() => {
        flash.style.opacity = '0';
    }, duration * 1000);
}

function createHitParticles(position, hitDirection = null) {
    // More particles for impact feel
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6);

        // Variety of spark colors (orange, yellow, white)
        const colors = [0xff8800, 0xffaa00, 0xffdd00, 0xffffff];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true
        });
        const particle = new THREE.Mesh(geometry, material);

        particle.position.copy(position);
        particle.position.y += 1; // Center on enemy body

        // Directional spray if hit direction provided
        let velocity;
        if (hitDirection) {
            // Spray in direction of hit with spread
            velocity = new THREE.Vector3(
                hitDirection.x * (3 + Math.random() * 4) + (Math.random() - 0.5) * 3,
                Math.random() * 5 + 2,
                hitDirection.z * (3 + Math.random() * 4) + (Math.random() - 0.5) * 3
            );
        } else {
            velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 6 + 2,
                (Math.random() - 0.5) * 6
            );
        }

        particle.userData.velocity = velocity;
        particle.userData.life = 0.5 + Math.random() * 0.3;

        scene.add(particle);
        particles.push(particle);
    }

    // Add a flash sphere at impact point
    const flashGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    flash.position.y += 1;
    flash.userData.velocity = new THREE.Vector3(0, 0, 0);
    flash.userData.life = 0.1;
    flash.userData.isFlash = true;
    scene.add(flash);
    particles.push(flash);
}

function createDeathParticles(position, enemyType = 'grunt') {
    // More particles for bigger enemies
    const particleCount = enemyType === 'boss' ? 50 : enemyType === 'tank' ? 35 : 25;

    // Color based on enemy type
    let colors;
    switch(enemyType) {
        case 'grunt': colors = [0xff4444, 0xff6666, 0xff8888, 0xffaaaa]; break;
        case 'speedy': colors = [0x4488ff, 0x66aaff, 0x88ccff, 0xaaddff]; break;
        case 'tank': colors = [0x888888, 0xaaaaaa, 0xcccccc, 0xeeeeee]; break;
        case 'boss': colors = [0x9944ff, 0xaa66ff, 0xcc88ff, 0xddaaff]; break;
        default: colors = [0xff4444, 0xff6666];
    }

    for (let i = 0; i < particleCount; i++) {
        const size = enemyType === 'boss' ? 0.25 : 0.15;
        const geometry = new THREE.SphereGeometry(size + Math.random() * size, 6, 6);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const particle = new THREE.Mesh(geometry, material);

        particle.position.copy(position);
        particle.position.y += 1;

        // Explosive outward velocity
        const speed = enemyType === 'boss' ? 12 : 8;
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * speed * 2,
            Math.random() * speed + 3,
            (Math.random() - 0.5) * speed * 2
        );
        particle.userData.life = 1.0 + Math.random() * 0.5;

        scene.add(particle);
        particles.push(particle);
    }

    // Central explosion flash
    const flashGeo = new THREE.SphereGeometry(enemyType === 'boss' ? 2 : 1, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    flash.position.y += 1;
    flash.userData.velocity = new THREE.Vector3(0, 0, 0);
    flash.userData.life = 0.15;
    flash.userData.isFlash = true;
    scene.add(flash);
    particles.push(flash);

    // Ring shockwave for bosses
    if (enemyType === 'boss') {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const ringGeo = new THREE.SphereGeometry(0.3, 6, 6);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(position);
            ring.position.y += 0.5;
            ring.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * 20,
                1,
                Math.sin(angle) * 20
            );
            ring.userData.life = 0.4;
            scene.add(ring);
            particles.push(ring);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.userData.life -= deltaTime;

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            if (particle.geometry) particle.geometry.dispose();
            if (particle.material) particle.material.dispose();
            particles.splice(i, 1);
        } else {
            // Move particle
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));

            // Flash effects expand and fade quickly
            if (particle.userData.isFlash) {
                const scale = 1 + (1 - particle.userData.life / 0.15) * 2;
                particle.scale.setScalar(scale);
                particle.material.opacity = particle.userData.life / 0.15;
            } else {
                // Normal particles have gravity
                particle.userData.velocity.y -= 15 * deltaTime;

                // Fade out
                if (particle.material) {
                    particle.material.opacity = Math.min(1, particle.userData.life * 2);
                    particle.material.transparent = true;
                }

                // Shrink slightly
                const shrink = 0.95;
                particle.scale.multiplyScalar(shrink);
            }
        }
    }
}

function updateHUD() {
    const minutes = Math.floor(gameTimer / 60);
    const seconds = Math.floor(gameTimer % 60);
    document.getElementById('timer').textContent =
        `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    document.getElementById('kills').textContent = `Kills: ${playerStats.kills}`;
    document.getElementById('score').textContent = `Score: ${Math.floor(playerStats.score)}`;

    const healthPercent = Math.max(0, (playerStats.health / playerStats.maxHealth) * 100);
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent =
        `HP: ${Math.max(0, Math.floor(playerStats.health))}/${playerStats.maxHealth}`;

    // Low health warning effects
    const healthBar = document.getElementById('health-bar');
    const lowHealthThreshold = 30;
    if (healthPercent <= lowHealthThreshold) {
        healthBar.classList.add('low-health');
        showLowHealthVignette(true);
    } else {
        healthBar.classList.remove('low-health');
        showLowHealthVignette(false);
    }

    document.getElementById('speed-mult').textContent = `⚡ Speed: x${playerStats.speedMult.toFixed(1)}`;
    document.getElementById('power-mult').textContent = `💪 Power: x${playerStats.powerMult.toFixed(1)}`;
}

// Low health vignette effect
function showLowHealthVignette(show) {
    let vignette = document.getElementById('low-health-vignette');
    if (show) {
        if (!vignette) {
            vignette = document.createElement('div');
            vignette.id = 'low-health-vignette';
            vignette.className = 'low-health-vignette';
            document.getElementById('game-screen').appendChild(vignette);
        }
    } else if (vignette) {
        vignette.remove();
    }
}

// Kill feed
let killFeedItems = [];

function addKillFeedItem(enemyType, points) {
    let feed = document.getElementById('kill-feed');
    if (!feed) {
        feed = document.createElement('div');
        feed.id = 'kill-feed';
        document.getElementById('hud').appendChild(feed);
    }

    const item = document.createElement('div');
    item.className = 'kill-notification';

    const typeNames = {
        'grunt': 'GRUNT',
        'speedy': 'SPEEDY',
        'tank': 'TANK',
        'boss': 'BOSS'
    };

    const typeColors = {
        'grunt': '#e74c3c',
        'speedy': '#3498db',
        'tank': '#95a5a6',
        'boss': '#9b59b6'
    };

    item.innerHTML = `<span style="color: ${typeColors[enemyType]}">${typeNames[enemyType]}</span> +${Math.floor(points)}`;
    feed.insertBefore(item, feed.firstChild);

    killFeedItems.push({
        element: item,
        time: gameTimer
    });

    // Remove old items after 3 seconds
    setTimeout(() => {
        item.classList.add('fading');
        setTimeout(() => item.remove(), 300);
    }, 3000);

    // Limit feed to 5 items
    while (feed.children.length > 5) {
        feed.lastChild.remove();
    }
}

function render() {
    // Render sword trail
    renderSwordTrail();

    renderer.render(scene, camera);
}

function gameOver() {
    gameState = 'gameover';

    const minutes = Math.floor(gameTimer / 60);
    const seconds = Math.floor(gameTimer % 60);

    document.getElementById('final-time').textContent = 
        `Time Survived: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('final-score').textContent = `Final Score: ${Math.floor(playerStats.score)}`;
    document.getElementById('final-kills').textContent = `Total Kills: ${playerStats.kills}`;
    document.getElementById('final-speed').textContent = `Max Speed: x${playerStats.speedMult.toFixed(1)}`;
    document.getElementById('final-power').textContent = `Max Power: x${playerStats.powerMult.toFixed(1)}`;

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.remove('hidden');

    // Exit pointer lock
    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
}

// Global sound toggle function (called by UI button)
function toggleSound() {
    if (audioManager) {
        const muted = audioManager.toggleMute();
        const btn = document.getElementById('sound-toggle');
        if (btn) {
            btn.textContent = muted ? '🔇' : '🔊';
            btn.classList.toggle('muted', muted);
        }
    }
}
window.toggleSound = toggleSound;

// Ensure startGame is always on window (even if there were errors)
if (typeof startGame !== 'undefined') {
    window.startGame = startGame;
    console.log('Final check: startGame assigned to window:', typeof window.startGame);
    if (window.__samuraiLog) {
        window.__samuraiLog(`Final check: startGame assigned to window: ${typeof window.startGame}`);
    }
    if (window.__samuraiUpdateBattleButton) {
        window.__samuraiUpdateBattleButton(true);
    }
} else {
    console.error('CRITICAL: startGame function is undefined!');
    if (window.__samuraiLog) {
        window.__samuraiLog('CRITICAL: startGame function is undefined!', true);
    }
}

// Start initialization when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM is already loaded
    init();
}

