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
    jumpPower: 12,
    kills: 0,
    score: 0,
    speedMult: 1.0,
    powerMult: 1.0,
    isJumping: false,
    velocity: new THREE.Vector3(),
    isAttacking: false,
    attackCooldown: 0,
    isBlocking: false
};

let gameTimer = 0;
let enemySpawnTimer = 0;
let enemySpawnRate = 120;

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

    // base skin
    ctx.fillStyle = '#f7c59f';
    ctx.fillRect(0, 0, size, size);

    // cheeks
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
    // eyebrows
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

    // eyes
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

    // wood background
    const wood = ctx.createLinearGradient(0, 0, size, size);
    wood.addColorStop(0, '#ab6a2a');
    wood.addColorStop(1, '#8d4f1d');
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, size, size);

    // rings
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

    // petals
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
    document.addEventListener('mousedown', (e) => {
        mouseDown[e.button] = true;
        if (gameState === 'playing') {
            if (e.button === 0) playerAttack(); // Left click
            if (e.button === 2) playerStats.isBlocking = true; // Right click
        }
        e.preventDefault();
    });
    document.addEventListener('mouseup', (e) => {
        mouseDown[e.button] = false;
        if (e.button === 2) playerStats.isBlocking = false;
        e.preventDefault();
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

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

    // Mouse movement for camera
    document.addEventListener('mousemove', onMouseMove);
}

let mouseX = 0, mouseY = 0;
let targetCameraRotation = 0;

function onMouseMove(event) {
    if (gameState !== 'playing') return;
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
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

// ===== CREATE SAMURAI BOB (Cute rounded chibi character like the reference!) =====
function createPlayer() {
    const playerGroup = new THREE.Group();
    playerGroup.name = 'samuraiBob';

    const kimonoMaterial = getToonMaterial(0x2e5ec9);
    const skinMaterial = getToonMaterial(0xf7c59f);
    const beltMaterial = getToonMaterial(0x141414);
    const redMaterial = getToonMaterial(0xbf2e28);
    const shoeMaterial = getToonMaterial(0x050506);
    const hairMaterial = getToonMaterial(0x121212);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.28, 1.6, 24, 32), kimonoMaterial);
    body.position.y = 2.05;
    body.castShadow = true;
    playerGroup.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.1, 16, 32), getToonMaterial(0xffffff));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 2.95;
    playerGroup.add(collar);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.35, 32), beltMaterial);
    belt.position.y = 1.65;
    playerGroup.add(belt);

    const armGeometry = new THREE.CapsuleGeometry(0.26, 1.1, 16, 24);
    const leftArm = new THREE.Mesh(armGeometry, kimonoMaterial);
    leftArm.position.set(-1.1, 2.25, 0.15);
    leftArm.rotation.z = Math.PI / 2.3;
    leftArm.castShadow = true;
    playerGroup.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 1.1;
    rightArm.rotation.z = -Math.PI / 2.3;
    playerGroup.add(rightArm);

    const handGeometry = new THREE.SphereGeometry(0.34, 24, 24);
    const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
    leftHand.position.set(-1.75, 1.95, 0.2);
    playerGroup.add(leftHand);
    const rightHand = leftHand.clone();
    rightHand.position.x = 1.75;
    playerGroup.add(rightHand);

    const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 48), skinMaterial);
    head.position.y = 4.3;
    head.castShadow = true;
    playerGroup.add(head);

    const facePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 1.9),
        new THREE.MeshBasicMaterial({ map: createFaceTexture(), transparent: true })
    );
    facePlane.position.set(0, 4.3, 0.98);
    playerGroup.add(facePlane);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), getToonMaterial(0xffa45a));
    nose.position.set(0, 4.12, 1.05);
    nose.scale.set(1.05, 0.85, 1.2);
    playerGroup.add(nose);

    const earGeometry = new THREE.SphereGeometry(0.22, 24, 24);
    const leftEar = new THREE.Mesh(earGeometry, skinMaterial);
    leftEar.position.set(-1.05, 4.2, 0.1);
    playerGroup.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 1.05;
    playerGroup.add(rightEar);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.7), hairMaterial);
    hairCap.position.y = 4.55;
    hairCap.rotation.x = Math.PI;
    playerGroup.add(hairCap);

    const topKnotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.35, 16), hairMaterial);
    topKnotBase.position.y = 4.9;
    playerGroup.add(topKnotBase);
    const topKnot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), hairMaterial);
    topKnot.position.y = 5.15;
    playerGroup.add(topKnot);

    const legGeometry = new THREE.CapsuleGeometry(0.38, 1.0, 16, 24);
    const leftLeg = new THREE.Mesh(legGeometry, redMaterial);
    leftLeg.position.set(-0.48, 0.95, 0.05);
    playerGroup.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.48;
    playerGroup.add(rightLeg);

    const footGeometry = new THREE.SphereGeometry(0.34, 24, 24);
    const leftFoot = new THREE.Mesh(footGeometry, shoeMaterial);
    leftFoot.position.set(-0.55, 0.2, 0.45);
    leftFoot.scale.set(1.6, 0.6, 1.9);
    leftFoot.castShadow = true;
    playerGroup.add(leftFoot);
    const rightFoot = leftFoot.clone();
    rightFoot.position.x = 0.55;
    playerGroup.add(rightFoot);

    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.18), new THREE.MeshStandardMaterial({ color: 0xf6f7fb, metalness: 0.65, roughness: 0.25 }));
    blade.position.y = 1.2;
    swordGroup.add(blade);
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x4b2b16, metalness: 0.15, roughness: 0.7 }));
    guard.rotation.x = Math.PI / 2;
    guard.position.y = 0.4;
    swordGroup.add(guard);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0x2f1a0f, metalness: 0.2, roughness: 0.6 }));
    swordGroup.add(handle);
    swordGroup.position.set(1.75, 2.05, -0.25);
    swordGroup.rotation.z = -Math.PI / 5;
    swordGroup.castShadow = true;
    playerGroup.add(swordGroup);
    playerGroup.userData.sword = swordGroup;

    const shieldGroup = new THREE.Group();
    const shieldMaterial = new THREE.MeshStandardMaterial({
        map: createShieldTexture(),
        roughness: 0.4,
        metalness: 0.25
    });
    const shieldMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.25, 32), shieldMaterial);
    shieldMesh.rotation.x = Math.PI / 2;
    shieldMesh.castShadow = true;
    shieldGroup.add(shieldMesh);
    shieldGroup.position.set(-1.7, 2.05, 0.2);
    shieldGroup.rotation.z = Math.PI / 5;
    shieldGroup.visible = false;
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
        
        // Reset stats
        playerStats = {
            health: 100,
            maxHealth: 100,
            speed: 8,
            jumpPower: 12,
            kills: 0,
            score: 0,
            speedMult: 1.0,
            powerMult: 1.0,
            isJumping: false,
            velocity: new THREE.Vector3(),
            isAttacking: false,
            attackCooldown: 0,
            isBlocking: false
        };

        gameTimer = 0;
        enemySpawnTimer = 0;

        // Clear scene
        enemies.forEach(e => {
            try { scene.remove(e); } catch (err) {}
        });
        enemies = [];
        particles.forEach(p => {
            try { scene.remove(p); } catch (err) {}
        });
        particles = [];
        
        if (player) {
            try { scene.remove(player); } catch (err) {}
        }

        // Create player
        console.log('Creating player...');
        player = createPlayer();
        console.log('Player created successfully');
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

    // Update enemies
    updateEnemies();

    // Update particles
    updateParticles();

    // Spawn enemies
    spawnEnemies();

    // Update HUD
    updateHUD();

    // Check game over
    if (playerStats.health <= 0) {
        gameOver();
    }

    // Score increases over time
    playerStats.score += Math.floor(deltaTime * 10);
}

function updatePlayer() {
    if (!player) return;

    // Decrease attack cooldown
    if (playerStats.attackCooldown > 0) {
        playerStats.attackCooldown -= deltaTime;
    }

    // Movement
    const moveSpeed = playerStats.speed * playerStats.speedMult * deltaTime;
    const moveDirection = new THREE.Vector3();

    if (keys['w']) moveDirection.z -= 1;
    if (keys['s']) moveDirection.z += 1;
    if (keys['a']) moveDirection.x -= 1;
    if (keys['d']) moveDirection.x += 1;

    moveDirection.normalize();

    if (moveDirection.length() > 0) {
        player.position.x += moveDirection.x * moveSpeed;
        player.position.z += moveDirection.z * moveSpeed;

        // Rotate player to face movement direction
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
        player.rotation.y = angle;
    }

    // Jump
    if (keys[' '] && !playerStats.isJumping) {
        playerStats.velocity.y = playerStats.jumpPower;
        playerStats.isJumping = true;
    }

    // Apply gravity
    playerStats.velocity.y -= 30 * deltaTime;
    player.position.y += playerStats.velocity.y * deltaTime;

    // Ground check
    if (player.position.y <= 0) {
        player.position.y = 0;
        playerStats.velocity.y = 0;
        playerStats.isJumping = false;
    }

    // Keep player on platform
    const radiusClamp = ARENA_RADIUS - 0.8;
    const pos2D = new THREE.Vector2(player.position.x, player.position.z);
    if (pos2D.length() > radiusClamp) {
        pos2D.setLength(radiusClamp);
        player.position.x = pos2D.x;
        player.position.z = pos2D.y;
    }

    // Update sword and shield visibility
    if (player.userData.shield) {
        player.userData.shield.visible = playerStats.isBlocking;
    }

    // Camera follow player (third person)
    const cameraOffset = new THREE.Vector3(-8, 12, 14);
    camera.position.lerp(player.position.clone().add(cameraOffset), 0.08);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 2.5, 0)));
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

