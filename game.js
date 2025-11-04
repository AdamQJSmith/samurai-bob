// Import new modules
import { WoWCameraRig } from './src/camera/WoWCameraRig.js';
import { Controls } from './src/input/Controls.js';
import { PlayerController } from './src/player/PlayerController.js';
import { AbilityManager } from './src/player/Abilities.js';
import { processSwordSlash, processShieldBash, applyHit } from './src/combat/Attacks.js';

// ===== GAME STATE =====
let gameState = 'title';
let scene, camera, renderer;
let player, playerController, abilityManager, cameraRig, controls;
let enemies = [], particles = [];
let clock, accumulator = 0;
const FIXED_DT = 1 / 60;

// Player stats
let playerStats = {
    kills: 0,
    score: 0
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

// Create CapsuleGeometry fallback
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

// ===== INITIALIZATION =====
function init() {
    console.log('init() called - initializing game...');
    if (window.__samuraiLog) {
        window.__samuraiLog('init() called - initializing game...');
    }
    
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded! Waiting...');
        if (window.__samuraiLog) {
            window.__samuraiLog('THREE.js not loaded yet, retrying...', true);
        }
        setTimeout(init, 100);
        return;
    }
    
    console.log('THREE.js is loaded, proceeding with initialization');
    if (window.__samuraiLog) {
        window.__samuraiLog('THREE.js is loaded, proceeding with initialization');
    }
    
    try {
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

    // UI buttons
    const battleRoyaleBtn = document.getElementById('battle-royale-button');
    const restartBtn = document.getElementById('restart-button');
    
    if (battleRoyaleBtn) {
        battleRoyaleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof startGame === 'function') {
                startGame();
            }
        });
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', startGame);
    }
    
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
    
    // Camera lock setting
    const lockCameraCheckbox = document.getElementById('lock-camera');
    const saved = localStorage.getItem('lockCamera') === 'true';
    lockCameraCheckbox.checked = saved;
    lockCameraCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('lockCamera', e.target.checked ? 'true' : 'false');
        if (cameraRig) {
            cameraRig.setLocked(e.target.checked);
        }
        if (e.target.checked) {
            document.exitPointerLock?.();
        }
    });
    
    // Campaign button (disabled)
    document.getElementById('campaign-button').addEventListener('click', (e) => {
        e.preventDefault();
    });

    window.addEventListener('resize', onWindowResize);
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

    const fringeGeometry = new THREE.TorusGeometry(ARENA_RADIUS - 0.4, 0.3, 16, 64);
    const fringeMaterial = new THREE.MeshStandardMaterial({ color: 0x3ba94f, roughness: 0.8, metalness: 0 });
    const fringe = new THREE.Mesh(fringeGeometry, fringeMaterial);
    fringe.rotation.x = Math.PI / 2;
    fringe.position.y = -0.12;
    fringe.castShadow = true;
    arenaGroup.add(fringe);

    arenaGroup.position.y = 0;
    scene.add(arenaGroup);

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

// ===== CREATE PLAYER =====
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

// ===== CREATE ENEMY =====
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

    const bodyGeometry = new THREE.SphereGeometry(size, 32, 32);
    const bodyMaterial = getToonMaterial(color);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = size;
    body.castShadow = true;
    enemyGroup.add(body);

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

    const eyeGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff5252 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-size * 0.3, size * 1.1, size * 0.8);
    enemyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(size * 0.3, size * 1.1, size * 0.8);
    enemyGroup.add(rightEye);

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

function updateParticles(dt) {
    particles.forEach((particle, index) => {
        particle.userData.life -= dt;
        
        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(index, 1);
        } else {
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(dt));
            particle.userData.velocity.y -= 10 * dt;
            
            if (particle.material) {
                particle.material.opacity = particle.userData.life;
                particle.material.transparent = true;
            }
        }
    });
}

// ===== GAME START =====
function startGame() {
    console.log('startGame called!');
    
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
            kills: 0,
            score: 0
        };

        gameTimer = 0;
        enemySpawnTimer = 0;
        accumulator = 0;

        // Clear scene
        enemies.forEach(e => { try { scene.remove(e); } catch (err) {} });
        enemies = [];
        particles.forEach(p => { try { scene.remove(p); } catch (err) {} });
        particles = [];
        
        if (player) { try { scene.remove(player); } catch (err) {} }

        // Create player
        console.log('Creating player...');
        player = createPlayer();
        console.log('Player created successfully');

        // Get collision meshes for ground detection
        const collisionMeshes = [];
        scene.traverse(obj => {
            if (obj.name === 'arenaGroup') {
                obj.children.forEach(child => {
                    if (child instanceof THREE.Mesh) {
                        collisionMeshes.push(child);
                    }
                });
            }
        });

        // Initialize WoW camera
        const lockCameraCheckbox = document.getElementById('lock-camera');
        const isLocked = lockCameraCheckbox?.checked || false;
        
        cameraRig = new WoWCameraRig(camera, player, {
            dist: 14,
            minDist: 6,
            maxDist: 25,
            pitch: 0.3
        });
        cameraRig.setLocked(isLocked);

        // Initialize controls
        controls = new Controls(renderer.domElement, {
            onRotate: (dx, dy) => { if (cameraRig && !cameraRig.isLocked()) cameraRig.handleRotate(dx, dy); },
            onWheel: dy => { if (cameraRig && !cameraRig.isLocked()) cameraRig.handleWheel(dy); },
            onAttack: () => {
                // Left click triggers attack
                console.log('Attack triggered!');
            },
            onBlock: (isBlocking) => {
                // Right click toggles shield
                console.log('Shield:', isBlocking);
            }
        });

        // Initialize player controller with SM64 movement
        playerController = new PlayerController(player, collisionMeshes, () => cameraRig ? cameraRig.getCameraYaw() : 0);

        // Initialize abilities
        abilityManager = new AbilityManager(player, scene);

    } catch (error) {
        console.error('Error in startGame:', error);
        alert('Error starting game: ' + error.message);
        return;
    }

    // Show game screen
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // Start game loop
    clock.getDelta(); // Reset clock
    animate();
}

window.startGame = startGame;
console.log('startGame assigned to window:', typeof window.startGame);

// ===== GAME LOOP WITH FIXED TIMESTEP =====
function animate() {
    if (gameState !== 'playing') return;

    const dt = Math.min(clock.getDelta(), 0.1); // Cap at 100ms
    accumulator += dt;

    // Fixed timestep loop
    while (accumulator >= FIXED_DT) {
        fixedUpdate(FIXED_DT);
        accumulator -= FIXED_DT;
    }

    // Render
    if (cameraRig) cameraRig.update(dt);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

function fixedUpdate(dt) {
    gameTimer += dt;

    // Get input
    const axes = controls.readAxes();
    const edges = controls.consumeEdges();

    // Update abilities
    if (edges.abilityKeys.leaf) abilityManager.activateAbility('leaf');
    if (edges.abilityKeys.dragon) abilityManager.activateAbility('dragon');
    if (edges.abilityKeys.wind) abilityManager.activateAbility('wind');
    
    abilityManager.update(dt, edges.abilityKeys.fireBreath, edges.abilityKeys.gust);

    // Update player controller
    playerController.setInput(
        axes.x,
        axes.z,
        edges.jumpPressed,
        edges.jumpHeld,
        edges.shieldPressed,
        edges.shieldHeld,
        edges.attackPressed,
        cameraRig ? cameraRig.getCameraYaw() : 0,
        dt
    );
    playerController.update(dt);

    // Keep player on platform
    const radiusClamp = ARENA_RADIUS - 0.8;
    const pos2D = new THREE.Vector2(player.position.x, player.position.z);
    if (pos2D.length() > radiusClamp) {
        pos2D.setLength(radiusClamp);
        player.position.x = pos2D.x;
        player.position.z = pos2D.y;
    }

    // Update shield visibility
    if (player.userData.shield) {
        player.userData.shield.visible = edges.shieldHeld || playerController.isShieldBashing;
    }

    // Sword swing animation
    if (playerController.isAttacking && player.userData.sword) {
        player.userData.sword.rotation.z = -Math.PI / 2;
        setTimeout(() => {
            if (player.userData.sword) player.userData.sword.rotation.z = -Math.PI / 5;
        }, 200);
    }

    // Process combat
    const swordHits = processSwordSlash(playerController, enemies, createHitParticles);
    const bashHits = processShieldBash(playerController, enemies, createHitParticles);
    
    [...swordHits, ...bashHits].forEach(hit => {
        applyHit(hit.enemy, hit);
    });

    // Update enemies
    updateEnemies(dt, edges);

    // Update particles
    updateParticles(dt);

    // Spawn enemies
    spawnEnemies(dt);

    // Update HUD
    updateHUD();

    // Check game over
    if (playerController.health <= 0) {
        gameOver();
    }

    // Score increases over time
    playerStats.score += Math.floor(dt * 10);
}

function updateEnemies(dt, edges) {
    enemies.forEach((enemy, index) => {
        if (enemy.userData.stunned > 0) {
            enemy.userData.stunned -= dt;
            return;
        }

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, enemy.position);
        direction.y = 0;
        direction.normalize();

        const speed = enemy.userData.speed * (1 + gameTimer * 0.005) * dt;
        enemy.position.add(direction.multiplyScalar(speed));

        const angle = Math.atan2(direction.x, direction.z);
        enemy.rotation.y = angle + Math.PI;

        // Check collision with player
        const distance = player.position.distanceTo(enemy.position);
        if (distance < 2.5) {
            const isBlocking = edges?.shieldHeld || playerController.isShieldBashing;
            if (!isBlocking) {
                playerController.health -= enemy.userData.damage * dt;
                
                const knockback = direction.multiplyScalar(-3);
                player.position.add(knockback);
            } else {
                applyHit(enemy, { damage: 10 * playerController.powerMult * dt, stun: 0.1 });
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

function spawnEnemies(dt) {
    enemySpawnTimer += dt;
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

function killEnemy(enemy, index) {
    playerStats.kills++;
    playerStats.score += enemy.userData.points;

    // Increase multipliers
    playerController.speedMult = Math.min(1.0 + playerStats.kills * 0.08, 5.0);
    playerController.powerMult = Math.min(1.0 + playerStats.kills * 0.4, 20.0);

    createDeathParticles(enemy.position);

    scene.remove(enemy);
    enemies.splice(index, 1);
}

function updateHUD() {
    const minutes = Math.floor(gameTimer / 60);
    const seconds = Math.floor(gameTimer % 60);
    document.getElementById('timer').textContent = 
        `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('kills').textContent = `Kills: ${playerStats.kills}`;
    document.getElementById('score').textContent = `Score: ${Math.floor(playerStats.score)}`;
    
    const healthPercent = Math.max(0, (playerController.health / playerController.maxHealth) * 100);
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = 
        `HP: ${Math.max(0, Math.floor(playerController.health))}/${playerController.maxHealth}`;
    
    document.getElementById('speed-mult').textContent = `⚡ Speed: x${playerController.speedMult.toFixed(1)}`;
    document.getElementById('power-mult').textContent = `💪 Power: x${playerController.powerMult.toFixed(1)}`;

    // Update ability HUD
    const abilityInfo = abilityManager.getAbilityInfo();
    ['leaf', 'dragon', 'wind'].forEach(type => {
        const elem = document.getElementById(`ability-${type}`);
        const info = abilityInfo[type];
        const timeElem = elem.querySelector('.ability-time');
        
        elem.classList.remove('active', 'cooldown');
        
        if (abilityInfo.active === type) {
            elem.classList.add('active');
            timeElem.textContent = `${Math.ceil(info.timeLeft)}s`;
        } else if (info.cooldownLeft > 0) {
            elem.classList.add('cooldown');
            timeElem.textContent = `CD: ${Math.ceil(info.cooldownLeft)}s`;
        } else {
            timeElem.textContent = 'Ready';
        }
    });
}

function gameOver() {
    gameState = 'gameover';

    const minutes = Math.floor(gameTimer / 60);
    const seconds = Math.floor(gameTimer % 60);

    document.getElementById('final-time').textContent = 
        `Time Survived: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('final-score').textContent = `Final Score: ${Math.floor(playerStats.score)}`;
    document.getElementById('final-kills').textContent = `Total Kills: ${playerStats.kills}`;
    document.getElementById('final-speed').textContent = `Max Speed: x${playerController.speedMult.toFixed(1)}`;
    document.getElementById('final-power').textContent = `Max Power: x${playerController.powerMult.toFixed(1)}`;

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.remove('hidden');

    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

