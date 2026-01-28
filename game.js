// ===== GAME STATE =====
let gameState = 'title';
let scene, camera, renderer;
let player, enemies = [], particles = [];
let clock, deltaTime;
let keys = {}, mouseDown = {};

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

    // Transparent background (face features only)
    ctx.clearRect(0, 0, size, size);

    // Rosy cheeks - solid pink circles like reference
    ctx.fillStyle = '#e85a6b';
    ctx.beginPath();
    ctx.arc(95, 300, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(417, 300, 35, 0, Math.PI * 2);
    ctx.fill();

    // Thick angular black eyebrows (blocky like reference)
    ctx.fillStyle = '#1a1a1a';
    // Left eyebrow - angular shape
    ctx.beginPath();
    ctx.moveTo(90, 160);
    ctx.lineTo(130, 120);
    ctx.lineTo(210, 145);
    ctx.lineTo(200, 175);
    ctx.lineTo(120, 165);
    ctx.closePath();
    ctx.fill();

    // Right eyebrow - angular shape
    ctx.beginPath();
    ctx.moveTo(302, 145);
    ctx.lineTo(382, 120);
    ctx.lineTo(422, 160);
    ctx.lineTo(392, 165);
    ctx.lineTo(312, 175);
    ctx.closePath();
    ctx.fill();

    // Eyes - simple black ovals with white highlight
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(160, 215, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(352, 215, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlights - small white dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(152, 205, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(344, 205, 8, 0, Math.PI * 2);
    ctx.fill();

    // MUSTACHE - curly handlebar style matching reference exactly
    ctx.fillStyle = '#1a1a1a';
    
    // Left mustache curl
    ctx.beginPath();
    ctx.moveTo(256, 350);
    ctx.quadraticCurveTo(210, 355, 160, 330);
    ctx.quadraticCurveTo(110, 305, 80, 270);
    ctx.quadraticCurveTo(90, 290, 120, 320);
    ctx.quadraticCurveTo(170, 365, 220, 375);
    ctx.quadraticCurveTo(240, 378, 256, 375);
    ctx.closePath();
    ctx.fill();
    
    // Right mustache curl
    ctx.beginPath();
    ctx.moveTo(256, 350);
    ctx.quadraticCurveTo(302, 355, 352, 330);
    ctx.quadraticCurveTo(402, 305, 432, 270);
    ctx.quadraticCurveTo(422, 290, 392, 320);
    ctx.quadraticCurveTo(342, 365, 292, 375);
    ctx.quadraticCurveTo(272, 378, 256, 375);
    ctx.closePath();
    ctx.fill();

    // Smiling mouth - red, open smile
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(195, 410);
    ctx.quadraticCurveTo(256, 470, 317, 410);
    ctx.quadraticCurveTo(256, 450, 195, 410);
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
        scene.background = new THREE.Color(0x78b8ff);
        scene.fog = new THREE.Fog(0x9dd3ff, 80, 220);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.setClearColor(0x78b8ff, 1);
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        clock = new THREE.Clock();
    } catch (error) {
        console.error('Error initializing Three.js:', error);
        alert('Error loading game. Please refresh the page.');
        return;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ec, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xfffbe6, 0x2d5630, 0.5);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffe1b5, 1.0);
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

// ===== CREATE ARENA =====
function createArena() {
    createGrassTextures();

    const arenaGroup = new THREE.Group();
    arenaGroup.name = 'arenaGroup';

    // Floating diorama base
    const sideGeometry = new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS * 1.06, ARENA_HEIGHT, 64, 1, true);
    const sideMaterial = new THREE.MeshStandardMaterial({
        map: TEXTURES.grassSide,
        roughness: 1.0,
        metalness: 0.0
    });
    const sideMesh = new THREE.Mesh(sideGeometry, sideMaterial);
    sideMesh.position.y = -ARENA_HEIGHT / 2;
    sideMesh.castShadow = true;
    sideMesh.receiveShadow = true;
    arenaGroup.add(sideMesh);

    const topGeometry = new THREE.CircleGeometry(ARENA_RADIUS - 0.05, 64);
    const topMaterial = new THREE.MeshStandardMaterial({
        map: TEXTURES.grassTop,
        roughness: 0.65,
        metalness: 0.0
    });
    const topMesh = new THREE.Mesh(topGeometry, topMaterial);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = 0.02;
    topMesh.receiveShadow = true;
    arenaGroup.add(topMesh);

    const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x6f3b1f, roughness: 1, metalness: 0 });
    const bottomMesh = new THREE.Mesh(topGeometry.clone(), bottomMaterial);
    bottomMesh.rotation.x = Math.PI / 2;
    bottomMesh.position.y = -ARENA_HEIGHT;
    arenaGroup.add(bottomMesh);

    // Soft moss fringe
    const fringeGeometry = new THREE.TorusGeometry(ARENA_RADIUS - 0.4, 0.3, 16, 64);
    const fringeMaterial = new THREE.MeshStandardMaterial({ color: 0x3ba94f, roughness: 0.8, metalness: 0 });
    const fringe = new THREE.Mesh(fringeGeometry, fringeMaterial);
    fringe.rotation.x = Math.PI / 2;
    fringe.position.y = -0.12;
    fringe.castShadow = true;
    arenaGroup.add(fringe);

    arenaGroup.position.y = 0;
    scene.add(arenaGroup);

    // Water ring beneath platform
    const waterTexture = createWaterTexture();
    const waterGeometry = new THREE.CircleGeometry(60, 64);
    const waterMaterial = new THREE.MeshStandardMaterial({
        map: waterTexture,
        roughness: 0.2,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -ARENA_HEIGHT - 0.25;
    water.receiveShadow = false;
    scene.add(water);

    // Background hills and trees
    addBackgroundElements();
}

function addBackgroundElements() {
    const backgroundGroup = new THREE.Group();
    backgroundGroup.name = 'backgroundGroup';

    const hillColors = [0x7bbf5f, 0x5ea848, 0x4a8f3a];
    for (let i = 0; i < 6; i++) {
        const color = hillColors[i % hillColors.length];
        const radius = 18 + Math.random() * 6;
        const hillGeometry = new THREE.SphereGeometry(radius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.0
        });
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        const angle = (i / 6) * Math.PI * 2 + (Math.random() * 0.4);
        const distance = 45 + Math.random() * 20;
        hill.position.set(Math.cos(angle) * distance, -ARENA_HEIGHT / 2 + radius * 0.2, Math.sin(angle) * distance);
        hill.rotation.x = Math.PI / 2;
        hill.receiveShadow = false;
        backgroundGroup.add(hill);
    }

    // Stylized trees
    const treeGroup = new THREE.Group();
    const treePositions = [
        { x: 12, z: 8 },
        { x: -14, z: -6 },
        { x: 9, z: -13 }
    ];
    treePositions.forEach(pos => {
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.8, 4, 12);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6e412a, roughness: 0.9, metalness: 0.0 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(pos.x, ARENA_HEIGHT / 2 + 1.5, pos.z);

        const foliageGeometry = new THREE.SphereGeometry(3.2, 16, 16);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x3ea846, roughness: 0.7, metalness: 0.0 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(pos.x, ARENA_HEIGHT / 2 + 3.8, pos.z);
        foliage.castShadow = true;

        treeGroup.add(trunk);
        treeGroup.add(foliage);
    });
    backgroundGroup.add(treeGroup);

    // Soft clouds
    for (let i = 0; i < 12; i++) {
        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(2 + Math.random() * 1.5, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 })
        );
        puff.position.set(
            (Math.random() - 0.5) * 80,
            20 + Math.random() * 8,
            (Math.random() - 0.5) * 80
        );
        puff.castShadow = false;
        backgroundGroup.add(puff);
    }

    scene.add(backgroundGroup);
}

// ===== CREATE SAMURAI BOB (Low-poly faceted style like Wind Waker!) =====
function createPlayer() {
    const playerGroup = new THREE.Group();
    playerGroup.name = 'samuraiBob';

    // LOW-POLY segments for faceted look
    const LP = 8; // Low poly segment count
    const MP = 12; // Medium poly
    
    // Colors matching the reference image EXACTLY
    const kimonoMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2e6ed8, flatShading: true, roughness: 0.7, metalness: 0.1 
    });
    const skinMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf0b888, flatShading: true, roughness: 0.8, metalness: 0 
    });
    const beltMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, flatShading: true, roughness: 0.6, metalness: 0.1 
    });
    const redMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xc43030, flatShading: true, roughness: 0.7, metalness: 0 
    });
    const blueShoeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2850a0, flatShading: true, roughness: 0.6, metalness: 0.1 
    });
    const hairMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, flatShading: true, roughness: 0.5, metalness: 0.1 
    });
    const collarMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xd0d0d0, flatShading: true, roughness: 0.6, metalness: 0 
    });
    const noseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xe8a050, flatShading: true, roughness: 0.7, metalness: 0 
    });

    // BODY - blocky rounded shape (low poly sphere)
    const bodyGeo = new THREE.SphereGeometry(1.3, LP, LP);
    const body = new THREE.Mesh(bodyGeo, kimonoMaterial);
    body.scale.set(1.0, 1.1, 0.85);
    body.position.y = 1.9;
    body.castShadow = true;
    playerGroup.add(body);

    // V-neck collar crossing (like reference - white/gray straps)
    const collarLeftGeo = new THREE.BoxGeometry(0.25, 1.2, 0.2);
    const collarLeft = new THREE.Mesh(collarLeftGeo, collarMaterial);
    collarLeft.position.set(-0.25, 2.45, 0.85);
    collarLeft.rotation.z = 0.35;
    collarLeft.rotation.x = -0.25;
    playerGroup.add(collarLeft);
    
    const collarRight = new THREE.Mesh(collarLeftGeo, collarMaterial);
    collarRight.position.set(0.25, 2.45, 0.85);
    collarRight.rotation.z = -0.35;
    collarRight.rotation.x = -0.25;
    playerGroup.add(collarRight);

    // Black belt/obi
    const beltGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.35, LP);
    const belt = new THREE.Mesh(beltGeo, beltMaterial);
    belt.position.y = 1.35;
    playerGroup.add(belt);

    // ARMS - stubby blocky (low poly capsule)
    const armGeo = new THREE.CapsuleGeometry(0.28, 0.5, 2, LP);
    const leftArm = new THREE.Mesh(armGeo, kimonoMaterial);
    leftArm.position.set(-1.4, 2.0, 0.25);
    leftArm.rotation.z = Math.PI / 2.8;
    leftArm.castShadow = true;
    playerGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, kimonoMaterial);
    rightArm.position.set(1.4, 2.0, 0.25);
    rightArm.rotation.z = -Math.PI / 2.8;
    rightArm.castShadow = true;
    playerGroup.add(rightArm);

    // HANDS - small blocky spheres
    const handGeo = new THREE.SphereGeometry(0.22, LP, LP);
    const leftHand = new THREE.Mesh(handGeo, skinMaterial);
    leftHand.position.set(-1.75, 1.7, 0.4);
    playerGroup.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, skinMaterial);
    rightHand.position.set(1.75, 1.7, 0.4);
    playerGroup.add(rightHand);

    // HEAD - big blocky sphere (low poly for faceted look)
    const headGeo = new THREE.SphereGeometry(1.25, LP, LP);
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.y = 4.0;
    head.castShadow = true;
    playerGroup.add(head);

    // FACE TEXTURE (mustache, eyebrows, eyes, cheeks)
    const faceGeo = new THREE.PlaneGeometry(2.3, 2.3);
    const faceMat = new THREE.MeshBasicMaterial({ 
        map: createFaceTexture(), 
        transparent: true,
        depthWrite: false
    });
    const facePlane = new THREE.Mesh(faceGeo, faceMat);
    facePlane.position.set(0, 3.95, 1.15);
    playerGroup.add(facePlane);

    // BIG NOSE - prominent round (low poly)
    const noseGeo = new THREE.SphereGeometry(0.32, LP, LP);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, 3.7, 1.25);
    nose.scale.set(1.0, 0.85, 0.9);
    nose.castShadow = true;
    playerGroup.add(nose);

    // EARS - pointy, sticking out (like reference)
    const earGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
    const leftEar = new THREE.Mesh(earGeo, skinMaterial);
    leftEar.position.set(-1.2, 4.0, 0.15);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.rotation.y = 0.3;
    playerGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skinMaterial);
    rightEar.position.set(1.2, 4.0, 0.15);
    rightEar.rotation.z = -Math.PI / 2;
    rightEar.rotation.y = -0.3;
    playerGroup.add(rightEar);

    // HAIR - black cap wrapping around head (low poly)
    const hairCapGeo = new THREE.SphereGeometry(1.28, LP, LP, 0, Math.PI * 2, 0, Math.PI / 2.5);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMaterial);
    hairCap.position.y = 4.15;
    hairCap.rotation.x = Math.PI;
    playerGroup.add(hairCap);
    
    // Hair sides wrapping down (like reference - covers sides of head)
    const hairSideGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const hairSideL = new THREE.Mesh(hairSideGeo, hairMaterial);
    hairSideL.position.set(-1.0, 4.2, -0.2);
    hairSideL.scale.set(0.7, 1.3, 0.9);
    playerGroup.add(hairSideL);
    const hairSideR = new THREE.Mesh(hairSideGeo, hairMaterial);
    hairSideR.position.set(1.0, 4.2, -0.2);
    hairSideR.scale.set(0.7, 1.3, 0.9);
    playerGroup.add(hairSideR);

    // TOPKNOT (chonmage) - blocky
    const topKnotBaseGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.35, 6);
    const topKnotBase = new THREE.Mesh(topKnotBaseGeo, hairMaterial);
    topKnotBase.position.y = 5.1;
    playerGroup.add(topKnotBase);
    const topKnotGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const topKnot = new THREE.Mesh(topKnotGeo, hairMaterial);
    topKnot.position.y = 5.35;
    topKnot.scale.set(1, 0.75, 1);
    playerGroup.add(topKnot);

    // LEGS - short stubby red (low poly)
    const legGeo = new THREE.CapsuleGeometry(0.35, 0.5, 2, LP);
    const leftLeg = new THREE.Mesh(legGeo, redMaterial);
    leftLeg.position.set(-0.5, 0.7, 0.05);
    playerGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, redMaterial);
    rightLeg.position.set(0.5, 0.7, 0.05);
    playerGroup.add(rightLeg);

    // FEET - blue rounded shoes (like reference!)
    const footGeo = new THREE.SphereGeometry(0.32, LP, LP);
    const leftFoot = new THREE.Mesh(footGeo, blueShoeMaterial);
    leftFoot.position.set(-0.5, 0.2, 0.3);
    leftFoot.scale.set(1.2, 0.5, 1.4);
    leftFoot.castShadow = true;
    playerGroup.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, blueShoeMaterial);
    rightFoot.position.set(0.5, 0.2, 0.3);
    rightFoot.scale.set(1.2, 0.5, 1.4);
    rightFoot.castShadow = true;
    playerGroup.add(rightFoot);

    // SWORD (on back)
    const swordGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.06, 2.0, 0.12);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.8, roughness: 0.2, flatShading: true });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 1.0;
    swordGroup.add(blade);
    const guardGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 6);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, flatShading: true });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.rotation.x = Math.PI / 2;
    guard.position.y = 0.25;
    swordGroup.add(guard);
    const handleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, flatShading: true });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    swordGroup.add(handle);
    swordGroup.position.set(0, 1.7, -1.1);
    swordGroup.rotation.x = -0.25;
    swordGroup.castShadow = true;
    playerGroup.add(swordGroup);
    playerGroup.userData.sword = swordGroup;

    // SHIELD - held in front/side (low poly, matching reference)
    const shieldGroup = new THREE.Group();
    
    // Gray metal rim (low poly torus)
    const rimGeo = new THREE.TorusGeometry(0.9, 0.12, 6, MP);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x707070, metalness: 0.7, roughness: 0.3, flatShading: true });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    shieldGroup.add(rim);
    
    // Wooden shield face with flower
    const shieldFaceGeo = new THREE.CircleGeometry(0.85, MP);
    const shieldFaceMat = new THREE.MeshStandardMaterial({
        map: createShieldTexture(),
        roughness: 0.6,
        metalness: 0.1,
        flatShading: true
    });
    const shieldFace = new THREE.Mesh(shieldFaceGeo, shieldFaceMat);
    shieldFace.position.z = 0.04;
    shieldFace.castShadow = true;
    shieldGroup.add(shieldFace);
    
    // Shield back (wood)
    const shieldBackGeo = new THREE.CircleGeometry(0.85, MP);
    const shieldBackMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8, flatShading: true });
    const shieldBack = new THREE.Mesh(shieldBackGeo, shieldBackMat);
    shieldBack.position.z = -0.04;
    shieldBack.rotation.y = Math.PI;
    shieldGroup.add(shieldBack);
    
    // Position like reference - held to the left side, angled
    shieldGroup.position.set(-1.5, 1.5, 1.0);
    shieldGroup.rotation.y = 0.4;
    shieldGroup.rotation.x = 0.1;
    shieldGroup.visible = true;
    playerGroup.add(shieldGroup);
    playerGroup.userData.shield = shieldGroup;

    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    return playerGroup;
}

// ===== CREATE ENEMY (Low-poly 3D) =====
function createEnemy(type = 'grunt') {
    const enemyGroup = new THREE.Group();

    let color, size, health, speed, damage, points;

    switch(type) {
        case 'grunt':
            color = 0xe74c3c;
            size = 1.2;
            health = 50;
            speed = 2;
            damage = 10;
            points = 50;
            break;
        case 'speedy':
            color = 0x3498db;
            size = 1;
            health = 30;
            speed = 4.5;
            damage = 5;
            points = 75;
            break;
        case 'tank':
            color = 0x95a5a6;
            size = 2;
            health = 120;
            speed = 1.2;
            damage = 20;
            points = 150;
            break;
        case 'boss':
            color = 0xc0392b;
            size = 2.5;
            health = 200;
            speed = 2;
            damage = 30;
            points = 500;
            break;
    }

    // Body
    const bodyGeometry = new THREE.SphereGeometry(size, 32, 32);
    const bodyMaterial = getToonMaterial(color);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = size;
    body.castShadow = true;
    enemyGroup.add(body);

    // Horns (if boss or grunt)
    if (type === 'grunt' || type === 'boss') {
        const hornGeometry = new THREE.ConeGeometry(0.3, 1, 6);
        const hornMaterial = getToonMaterial(0x1a1a1a);
        const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        leftHorn.position.set(-size * 0.5, size * 1.5, 0);
        enemyGroup.add(leftHorn);
        
        const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        rightHorn.position.set(size * 0.5, size * 1.5, 0);
        enemyGroup.add(rightHorn);
    }

    // Eyes (glowing red)
    const eyeGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff5252 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-size * 0.3, size * 1.1, size * 0.8);
    enemyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(size * 0.3, size * 1.1, size * 0.8);
    enemyGroup.add(rightEye);

    // Random spawn position around arena
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
        damage: damage,
        points: points,
        velocity: new THREE.Vector3(),
        stunned: 0
    };

    scene.add(enemyGroup);
    return enemyGroup;
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
    
    update();
    render();

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

    // Space bar = attack
    if (keys[' '] && !playerStats.spacePressed && playerStats.attackCooldown <= 0) {
        playerStats.spacePressed = true;
        playerAttack();
    }
    if (!keys[' ']) playerStats.spacePressed = false;

    // Shift = shield block
    playerStats.isBlocking = keys['shift'];
    if (player.userData.shield) {
        player.userData.shield.visible = true;
        if (playerStats.isBlocking) {
            player.userData.shield.position.set(-0.8, 2.5, 1.8);
        } else {
            player.userData.shield.position.set(-1.8, 2.0, 1.2);
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
    camera.lookAt(player.position);
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
    // Move leaves with WASD
    const moveSpeed = playerStats.speed * playerStats.speedMult * 1.2 * deltaTime;
    const moveDirection = new THREE.Vector3();

    if (keys['w']) moveDirection.z -= 1;
    if (keys['s']) moveDirection.z += 1;
    if (keys['a']) moveDirection.x -= 1;
    if (keys['d']) moveDirection.x += 1;
    moveDirection.normalize();
    
    // Move player position (invisible but still tracked)
    if (moveDirection.length() > 0) {
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
    
    // Floating box (like Mario cap boxes)
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    let boxColor, iconColor;
    
    switch(type) {
        case 'leaf':
            boxColor = 0x44aa44;
            iconColor = 0x88ff88;
            break;
        case 'dragon':
            boxColor = 0xcc4400;
            iconColor = 0xff6600;
            break;
        case 'wind':
            boxColor = 0x4488cc;
            iconColor = 0x88ccff;
            break;
    }
    
    const boxMat = new THREE.MeshStandardMaterial({ 
        color: boxColor,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.8
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    powerUp.add(box);
    
    // Glowing icon inside
    const iconGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const iconMat = new THREE.MeshBasicMaterial({ color: iconColor });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    powerUp.add(icon);
    
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

function updatePowerUps() {
    powerUps.forEach((powerUp, index) => {
        // Float animation
        powerUp.position.y = powerUp.userData.baseY + Math.sin(gameTimer * 2) * 0.3;
        powerUp.rotation.y += deltaTime;
        
        // Check player collision
        const dist = player.position.distanceTo(powerUp.position);
        if (dist < 2.5) {
            // Collect power-up
            activateAbility(powerUp.userData.type);
            scene.remove(powerUp);
            powerUps.splice(index, 1);
            
            // Collection particles
            for (let i = 0; i < 15; i++) {
                const geo = new THREE.SphereGeometry(0.15, 6, 6);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true });
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
    enemies.forEach((enemy, index) => {
        // Decrease stun timer
        if (enemy.userData.stunned > 0) {
            enemy.userData.stunned -= deltaTime;
            return; // Don't move while stunned
        }

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, enemy.position);
        direction.y = 0;
        direction.normalize();

        const speed = enemy.userData.speed * (1 + gameTimer * 0.005) * deltaTime;
        enemy.position.add(direction.multiplyScalar(speed));

        // Rotate to face player
        const angle = Math.atan2(direction.x, direction.z);
        enemy.rotation.y = angle + Math.PI;

        // Check collision with player
        const distance = player.position.distanceTo(enemy.position);
        if (distance < 2.5) {
            if (!playerStats.isBlocking) {
                // Damage player
                playerStats.health -= enemy.userData.damage * deltaTime;
                
                // Knockback
                const knockback = direction.multiplyScalar(-3);
                player.position.add(knockback);
            } else {
                // Shield blocks and damages enemy
                damageEnemy(enemy, 10 * playerStats.powerMult * deltaTime);
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

        // Check if enemy is dead
        if (enemy.userData.health <= 0) {
            killEnemy(enemy, index);
        }
    });
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

    // Attack hitbox (cone in front of player)
    const attackRange = 5;
    const attackAngle = Math.PI / 3; // 60 degree cone

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
                // Hit!
                const damage = 25 * playerStats.powerMult;
                damageEnemy(enemy, damage);

                // Knockback
                const knockback = toEnemy.multiplyScalar(8);
                enemy.position.add(knockback);

                // Stun
                enemy.userData.stunned = 1.0;

                // Create hit particles
                createHitParticles(enemy.position);
            }
        }
    });

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

function damageEnemy(enemy, damage) {
    enemy.userData.health -= damage;
    
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

function killEnemy(enemy, index) {
    playerStats.kills++;
    playerStats.score += enemy.userData.points;

    // Increase multipliers
    playerStats.speedMult = Math.min(1.0 + playerStats.kills * 0.08, 5.0);
    playerStats.powerMult = Math.min(1.0 + playerStats.kills * 0.4, 20.0);

    // Create death particles
    createDeathParticles(enemy.position);

    // Remove enemy
    scene.remove(enemy);
    enemies.splice(index, 1);
}

function createHitParticles(position) {
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.SphereGeometry(0.1, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 5,
            (Math.random() - 0.5) * 5
        );
        particle.userData.life = 1.0;
        
        scene.add(particle);
        particles.push(particle);
    }
}

function createDeathParticles(position) {
    for (let i = 0; i < 20; i++) {
        const geometry = new THREE.SphereGeometry(0.15, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 8,
            (Math.random() - 0.5) * 8
        );
        particle.userData.life = 1.5;
        
        scene.add(particle);
        particles.push(particle);
    }
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.userData.life -= deltaTime;
        
        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(index, 1);
        } else {
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
            particle.userData.velocity.y -= 10 * deltaTime; // Gravity
            
            // Fade out
            if (particle.material) {
                particle.material.opacity = particle.userData.life;
                particle.material.transparent = true;
            }
        }
    });
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
    
    document.getElementById('speed-mult').textContent = `⚡ Speed: x${playerStats.speedMult.toFixed(1)}`;
    document.getElementById('power-mult').textContent = `💪 Power: x${playerStats.powerMult.toFixed(1)}`;
}

function render() {
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

