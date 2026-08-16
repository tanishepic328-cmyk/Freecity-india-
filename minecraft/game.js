// Minecraft-style Voxel Game in Three.js

let scene, camera, renderer, canvas;

function initGame() {
    try {
        canvas = document.getElementById('canvas');
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0x87ceeb, 200, 400);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        
        setupLighting();
        setupInput();
        startGameLoop();
        
        console.log("✓ Game initialized successfully");
    } catch (e) {
        console.error("Game initialization error:", e);
    }
}

// Game constants
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

const player = {
    position: new THREE.Vector3(8, 40, 8),
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 0.2,
    sprintSpeed: 0.4,
    jumpPower: 0.6,
    onGround: false,
    rotation: { x: 0, y: 0 }
};

const keys = {};
const mouse = { clicked: false, rightClicked: false };
const world = {};
const meshes = {};
let selectedBlock = BLOCKS.GRASS;
const blockTypes = [BLOCKS.GRASS, BLOCKS.DIRT, BLOCKS.STONE, BLOCKS.SAND, BLOCKS.OAK_LOG, BLOCKS.OAK_LEAVES, BLOCKS.WATER, BLOCKS.GRAVEL, BLOCKS.BEDROCK];

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);
}

function setupInput() {
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
        player.rotation.y -= e.movementX * 0.005;
        player.rotation.x -= e.movementY * 0.005;
        player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.rotation.x));
    });
    
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0) mouse.clicked = true;
        if (e.button === 2) mouse.rightClicked = true;
    });
    
    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) mouse.clicked = false;
        if (e.button === 2) mouse.rightClicked = false;
    });
    
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('click', () => canvas.requestPointerLock());
}

// Simple noise function
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
                
                // Simple cube rendering
                const positions = [
                    [wx-0.5, wy-0.5, wz-0.5], [wx+0.5, wy-0.5, wz-0.5], [wx+0.5, wy+0.5, wz-0.5], [wx-0.5, wy+0.5, wz-0.5],
                    [wx-0.5, wy-0.5, wz+0.5], [wx+0.5, wy-0.5, wz+0.5], [wx+0.5, wy+0.5, wz+0.5], [wx-0.5, wy+0.5, wz+0.5]
                ];
                
                const faces = [
                    [0,1,2,0,2,3], [4,6,5,4,7,6], [0,4,5,0,5,1],
                    [2,6,7,2,7,3], [0,3,7,0,7,4], [1,5,6,1,6,2]
                ];
                
                for (const face of faces) {
                    for (const pi of face) {
                        const p = positions[pi];
                        verts.push(p[0], p[1], p[2]);
                        cols.push((c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255);
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

function updateChunks() {
    const px = Math.floor(player.position.x / CHUNK_SIZE);
    const pz = Math.floor(player.position.z / CHUNK_SIZE);
    
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
            const key = `${px+dx},${pz+dz}`;
            if (!world[key]) generateChunk(px+dx, pz+dz);
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
    
    // Simple collision
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
}

function raycastBlock() {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.rotation.x, player.rotation.y, 0));
    for (let i = 1; i < 8; i++) {
        const p = camera.position.clone().add(dir.clone().multiplyScalar(i));
        if (getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) !== BLOCKS.AIR) {
            return { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
        }
    }
    return null;
}

function updateBlock() {
    const hit = raycastBlock();
    if (!hit) return;
    
    if (mouse.clicked) {
        setBlock(hit.x, hit.y, hit.z, BLOCKS.AIR);
        mouse.clicked = false;
    }
    if (mouse.rightClicked) {
        const dir = camera.position.clone().sub(new THREE.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)).normalize();
        const nx = hit.x + (dir.x > 0 ? 1 : -1);
        const ny = hit.y + (dir.y > 0 ? 1 : -1);
        const nz = hit.z + (dir.z > 0 ? 1 : -1);
        setBlock(nx, Math.max(1, ny), nz, selectedBlock);
        mouse.rightClicked = false;
    }
}

function updateInventoryUI() {
    const hud = document.getElementById('hud');
    hud.innerHTML = '';
    const names = ['Grass', 'Dirt', 'Stone', 'Sand', 'Log', 'Leaves', 'Water', 'Gravel', 'Bedrock'];
    
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot' + (blockTypes[i] === selectedBlock ? ' selected' : '');
        slot.innerHTML = `<div>${names[i]}<br>${i + 1}</div>`;
        hud.appendChild(slot);
    }
}

function updateCoordinates() {
    document.getElementById('coords').textContent = 
        `X: ${Math.floor(player.position.x)} Y: ${Math.floor(player.position.y)} Z: ${Math.floor(player.position.z)}`;
}

function startGameLoop() {
    function animate() {
        requestAnimationFrame(animate);
        updatePlayer();
        updateChunks();
        updateBlock();
        updateCoordinates();
        renderer.render(scene, camera);
    }
    animate();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}