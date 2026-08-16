// Minecraft-style Voxel Game in Three.js - Complete Edition

let scene, camera, renderer, canvas;
let world = {}, meshes = {};
let player = {}, keys = {}, mouse = {};
let selectedBlock = 1, frameCount = 0, lastTime = 0;
let raycaster, direction;

const BLOCK_SIZE = 1;
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 4;
const WORLD_HEIGHT = 64;
const SEA_LEVEL = 32;

const BLOCKS = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4,
    WATER: 5, OAK_LOG: 6, OAK_LEAVES: 7, BEDROCK: 8, GRAVEL: 9
};

const BLOCK_COLORS = {
    [BLOCKS.GRASS]: 0x5cb85c,
    [BLOCKS.DIRT]: 0x8b6f47,
    [BLOCKS.STONE]: 0x888888,
    [BLOCKS.SAND]: 0xf4a460,
    [BLOCKS.WATER]: 0x4287f5,
    [BLOCKS.OAK_LOG]: 0x8b4513,
    [BLOCKS.OAK_LEAVES]: 0x228b22,
    [BLOCKS.BEDROCK]: 0x1a1a1a,
    [BLOCKS.GRAVEL]: 0x999999
};

const BLOCK_NAMES = {
    1: 'Grass', 2: 'Dirt', 3: 'Stone', 4: 'Sand', 5: 'Water',
    6: 'Oak Log', 7: 'Oak Leaves', 8: 'Bedrock', 9: 'Gravel'
};

const blockTypes = [1, 2, 3, 4, 6, 7, 5, 9, 8];

function initGame() {
    try {
        // Setup Three.js
        canvas = document.getElementById('canvas');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0x87ceeb, 150, 300);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;

        // Setup lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(100, 150, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        scene.add(sun);

        // Player setup
        player = {
            position: new THREE.Vector3(8, 40, 8),
            velocity: new THREE.Vector3(0, 0, 0),
            speed: 0.2,
            sprintSpeed: 0.4,
            jumpPower: 0.6,
            onGround: false,
            rotation: { x: 0, y: 0 }
        };

        camera.position.copy(player.position);
        camera.position.y += 1.6;

        // Input setup
        keys = {};
        mouse = { clicked: false, rightClicked: false, x: 0, y: 0 };

        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if (e.key >= '1' && e.key <= '9') {
                selectedBlock = blockTypes[parseInt(e.key) - 1];
                updateInventoryUI();
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                player.rotation.y -= e.movementX * 0.005;
                player.rotation.x -= e.movementY * 0.005;
                player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rotation.x));
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === canvas) {
                if (e.button === 0) mouse.clicked = true;
                if (e.button === 2) mouse.rightClicked = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) mouse.clicked = false;
            if (e.button === 2) mouse.rightClicked = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('click', () => canvas.requestPointerLock());

        // Raycaster setup
        raycaster = new THREE.Raycaster();
        direction = new THREE.Vector3();

        // Window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Initialize UI
        updateInventoryUI();

        // Start game loop
        startGameLoop();
        console.log("✓ Game initialized successfully");
    } catch (e) {
        console.error("Game initialization error:", e);
        alert("Failed to initialize game: " + e.message);
    }
}

// ===== TERRAIN GENERATION =====
function noise(x, y) {
    return Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin((x + y) * 0.05) * 0.5;
}

function getTerrainHeight(x, z) {
    let h = SEA_LEVEL;
    h += noise(x * 0.02, z * 0.02) * 16;
    h += noise(x * 0.05, z * 0.05) * 8;
    return Math.floor(Math.max(5, Math.min(SEA_LEVEL + 10, h)));
}

function getChunkKey(x, z) {
    return `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`;
}

function getBlock(x, y, z) {
    if (y < 0 || y >= WORLD_HEIGHT) return BLOCKS.AIR;
    const key = getChunkKey(x, z);
    if (!world[key]) return BLOCKS.AIR;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return world[key][lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] || BLOCKS.AIR;
}

function setBlock(x, y, z, block) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const key = getChunkKey(x, z);
    if (!world[key]) return;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    world[key][lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = block;
    rebuildChunk(key);
}

function generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (world[key]) return;

    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            const h = getTerrainHeight(wx, wz);

            for (let y = 0; y < WORLD_HEIGHT; y++) {
                let b = BLOCKS.AIR;
                if (y === 0) b = BLOCKS.BEDROCK;
                else if (y < h - 2) b = BLOCKS.STONE;
                else if (y < h) b = BLOCKS.DIRT;
                else if (y === h) b = BLOCKS.GRASS;
                else if (y <= SEA_LEVEL) b = BLOCKS.WATER;

                blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = b;
            }
        }
    }

    world[key] = blocks;
}

// ===== MESH BUILDING =====
function rebuildChunk(key) {
    if (!world[key]) return;
    if (meshes[key]) {
        scene.remove(meshes[key]);
        meshes[key].geometry.dispose();
        meshes[key].material.dispose();
    }

    const [cx, cz] = key.split(',').map(Number);
    const geo = new THREE.BufferGeometry();
    const verts = [], cols = [], inds = [];
    let idx = 0;

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                const b = world[key][x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
                if (b === BLOCKS.AIR) continue;

                const wx = cx * CHUNK_SIZE + x;
                const wy = y;
                const wz = cz * CHUNK_SIZE + z;
                const c = BLOCK_COLORS[b] || 0xffffff;
                const r = ((c >> 16) & 255) / 255;
                const g = ((c >> 8) & 255) / 255;
                const bl = (c & 255) / 255;

                const positions = [
                    [wx - 0.5, wy - 0.5, wz - 0.5], [wx + 0.5, wy - 0.5, wz - 0.5],
                    [wx + 0.5, wy + 0.5, wz - 0.5], [wx - 0.5, wy + 0.5, wz - 0.5],
                    [wx - 0.5, wy - 0.5, wz + 0.5], [wx + 0.5, wy - 0.5, wz + 0.5],
                    [wx + 0.5, wy + 0.5, wz + 0.5], [wx - 0.5, wy + 0.5, wz + 0.5]
                ];

                const faces = [
                    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
                    [2, 6, 7, 2, 7, 3], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
                ];

                for (const face of faces) {
                    for (const pi of face) {
                        const p = positions[pi];
                        verts.push(p[0], p[1], p[2]);
                        cols.push(r, g, bl);
                        inds.push(idx++);
                    }
                }
            }
        }
    }

    if (verts.length > 0) {
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
        geo.setIndex(new THREE.BufferAttribute(new Uint32Array(inds), 1));

        const mat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        meshes[key] = mesh;
    }
}

// ===== GAME UPDATES =====
function updateChunks() {
    const px = Math.floor(player.position.x / CHUNK_SIZE);
    const pz = Math.floor(player.position.z / CHUNK_SIZE);

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
            const key = `${px + dx},${pz + dz}`;
            if (!world[key]) generateChunk(px + dx, pz + dz);
            if (!meshes[key]) rebuildChunk(key);
        }
    }
}

function updatePlayer() {
    const spd = keys['shift'] ? player.sprintSpeed : player.speed;
    const fwd = new THREE.Vector3(0, 0, -spd).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    const right = new THREE.Vector3(spd, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

    if (keys['w']) player.velocity.add(fwd);
    if (keys['s']) player.velocity.sub(fwd);
    if (keys['d']) player.velocity.add(right);
    if (keys['a']) player.velocity.sub(right);

    if (!player.onGround) player.velocity.y -= 0.08;
    if (keys[' '] && player.onGround) {
        player.velocity.y = player.jumpPower;
        player.onGround = false;
    }

    player.velocity.x *= 0.85;
    player.velocity.z *= 0.85;
    player.position.add(player.velocity);

    // Collision detection
    player.onGround = false;
    if (getBlock(Math.floor(player.position.x), Math.floor(player.position.y - 1.6), Math.floor(player.position.z)) !== BLOCKS.AIR) {
        player.onGround = true;
        player.velocity.y = Math.max(0, player.velocity.y);
    }

    camera.position.copy(player.position);
    camera.position.y += 1.6;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.rotation.y;
    camera.rotation.x = player.rotation.x;

    // Update UI coordinates
    document.getElementById('coords').textContent = `📍 X: ${Math.floor(player.position.x)} Y: ${Math.floor(player.position.y)} Z: ${Math.floor(player.position.z)}`;
}

// ===== BLOCK INTERACTIONS =====
function raycastBlock() {
    direction.set(0, 0, -1).applyEuler(new THREE.Euler(player.rotation.x, player.rotation.y, 0));
    for (let i = 1; i < 8; i++) {
        const p = camera.position.clone().add(direction.clone().multiplyScalar(i));
        if (getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) !== BLOCKS.AIR) {
            return { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z), dist: i };
        }
    }
    return null;
}

function updateBlockInteraction() {
    const hit = raycastBlock();

    if (hit) {
        // Update block preview
        const blockType = getBlock(hit.x, hit.y, hit.z);
        document.getElementById('block-name').textContent = BLOCK_NAMES[blockType] || 'Unknown';
        document.getElementById('block-distance').textContent = hit.dist.toFixed(1);

        if (mouse.clicked) {
            setBlock(hit.x, hit.y, hit.z, BLOCKS.AIR);
            mouse.clicked = false;
        }

        if (mouse.rightClicked) {
            const dir = camera.position.clone().sub(new THREE.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)).normalize();
            const nx = hit.x + (Math.abs(dir.x) > Math.abs(dir.z) ? (dir.x > 0 ? 1 : -1) : 0);
            const ny = hit.y + (Math.abs(dir.y) > 0.5 ? (dir.y > 0 ? 1 : -1) : 0);
            const nz = hit.z + (Math.abs(dir.z) > Math.abs(dir.x) ? (dir.z > 0 ? 1 : -1) : 0);
            setBlock(nx, Math.max(1, ny), nz, selectedBlock);
            mouse.rightClicked = false;
        }
    } else {
        document.getElementById('block-name').textContent = 'Air';
        document.getElementById('block-distance').textContent = '-';
    }
}

// ===== UI UPDATES =====
function updateInventoryUI() {
    const hud = document.getElementById('hud');
    hud.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        const blockType = blockTypes[i];
        slot.className = 'inventory-slot' + (blockType === selectedBlock ? ' selected' : '');
        slot.innerHTML = `<div><span class="inventory-slot-name">${BLOCK_NAMES[blockType]}</span><br><span class="inventory-slot-key">${i + 1}</span></div>`;
        hud.appendChild(slot);
    }

    document.getElementById('selected-block').textContent = BLOCK_NAMES[selectedBlock] || 'Unknown';
}

function updateStats() {
    const now = performance.now();
    frameCount++;

    if (now >= lastTime + 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastTime = now;
    }

    const chunkCount = Object.keys(meshes).length;
    document.getElementById('chunks').textContent = chunkCount;

    if (performance.memory) {
        const mb = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
        document.getElementById('memory').textContent = mb + ' MB';
    }
}

function handlePause() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const pauseMenu = document.getElementById('pause-menu');
            pauseMenu.classList.toggle('active');
            if (pauseMenu.classList.contains('active')) {
                document.exitPointerLock?.();
            } else {
                canvas.requestPointerLock?.();
            }
        }
    });
}

function startGameLoop() {
    lastTime = performance.now();
    handlePause();

    function animate() {
        requestAnimationFrame(animate);

        updatePlayer();
        updateChunks();
        updateBlockInteraction();
        updateStats();

        renderer.render(scene, camera);
    }

    animate();
}

// Start game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}