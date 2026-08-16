// Minecraft-style Voxel Game in Three.js

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 500, 1000);

const canvas = document.getElementById('canvas');
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;

// Game constants
const BLOCK_SIZE = 1;
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 8;
const WORLD_HEIGHT = 128;
const SEA_LEVEL = 64;

// Block types
const BLOCKS = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    OAK_LOG: 6,
    OAK_LEAVES: 7,
    BEDROCK: 8,
    GRAVEL: 9
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

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 200, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -256;
directionalLight.shadow.camera.right = 256;
directionalLight.shadow.camera.top = 256;
directionalLight.shadow.camera.bottom = -256;
scene.add(directionalLight);

// Player
const player = {
    position: new THREE.Vector3(CHUNK_SIZE * BLOCK_SIZE / 2, SEA_LEVEL + 10, CHUNK_SIZE * BLOCK_SIZE / 2),
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 0.3,
    sprintSpeed: 0.5,
    jumpPower: 0.7,
    isJumping: false,
    onGround: false,
    rotation: { x: 0, y: 0 }
};

camera.position.copy(player.position);
camera.position.y += 1.6; // Eye height

// Input
const keys = {};
const mouse = { x: 0, y: 0, clicked: false, rightClicked: false };

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5' || 
        e.key === '6' || e.key === '7' || e.key === '8' || e.key === '9') {
        selectedBlock = parseInt(e.key) - 1;
        updateInventoryUI();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    const deltaX = e.movementX || 0;
    const deltaY = e.movementY || 0;
    
    player.rotation.y -= deltaX * 0.005;
    player.rotation.x -= deltaY * 0.005;
    
    if (player.rotation.x > Math.PI / 2) player.rotation.x = Math.PI / 2;
    if (player.rotation.x < -Math.PI / 2) player.rotation.x = -Math.PI / 2;
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
document.addEventListener('click', () => canvas.requestPointerLock());

// World data
const world = {}; // chunks[chunkKey] = blockData
const meshes = {}; // meshes[chunkKey] = Three.js mesh

// Block selection
let selectedBlock = BLOCKS.GRASS;
const blockTypes = [BLOCKS.GRASS, BLOCKS.DIRT, BLOCKS.STONE, BLOCKS.SAND, BLOCKS.OAK_LOG, BLOCKS.OAK_LEAVES, BLOCKS.WATER, BLOCKS.GRAVEL, BLOCKS.BEDROCK];

// Perlin noise for terrain generation
function noise(x, y) {
    return Math.sin(x * 0.01) * Math.cos(y * 0.01) * Math.sin((x + y) * 0.005) * 0.5 + 0.5;
}

function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

function perlin2d(x, y, scale = 1) {
    x *= scale;
    y *= scale;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    
    const n00 = noise(xi, yi);
    const n10 = noise(xi + 1, yi);
    const n01 = noise(xi, yi + 1);
    const n11 = noise(xi + 1, yi + 1);
    
    const u = smoothstep(xf);
    const v = smoothstep(yf);
    
    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
}

function getTerrainHeight(x, z) {
    let height = SEA_LEVEL;
    let amplitude = 32;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < 4; i++) {
        height += perlin2d(x, z, frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    
    return Math.floor(height);
}

function getChunkKey(x, z) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    return `${chunkX},${chunkZ}`;
}

function getBlock(x, y, z) {
    if (y < 0 || y >= WORLD_HEIGHT) return BLOCKS.AIR;
    
    const chunkKey = getChunkKey(x, z);
    if (!world[chunkKey]) return BLOCKS.AIR;
    
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const index = localX + localZ * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
    
    return world[chunkKey][index] || BLOCKS.AIR;
}

function setBlock(x, y, z, block) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    
    const chunkKey = getChunkKey(x, z);
    if (!world[chunkKey]) return;
    
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const index = localX + localZ * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
    
    world[chunkKey][index] = block;
    
    // Rebuild chunk
    rebuildChunk(chunkKey);
    
    // Rebuild adjacent chunks
    if (localX === 0) rebuildChunk(getChunkKey(x - 1, z));
    if (localX === CHUNK_SIZE - 1) rebuildChunk(getChunkKey(x + 1, z));
    if (localZ === 0) rebuildChunk(getChunkKey(x, z - 1));
    if (localZ === CHUNK_SIZE - 1) rebuildChunk(getChunkKey(x, z + 1));
}

function generateChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    if (world[chunkKey]) return;
    
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldZ = chunkZ * CHUNK_SIZE + z;
            const terrainHeight = getTerrainHeight(worldX, worldZ);
            
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                let block = BLOCKS.AIR;
                
                if (y === 0) {
                    block = BLOCKS.BEDROCK;
                } else if (y < terrainHeight - 3) {
                    block = BLOCKS.STONE;
                } else if (y < terrainHeight - 1) {
                    block = BLOCKS.DIRT;
                } else if (y === terrainHeight - 1) {
                    block = BLOCKS.GRASS;
                } else if (y <= SEA_LEVEL && y > terrainHeight) {
                    block = BLOCKS.WATER;
                }
                
                blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = block;
            }
        }
    }
    
    world[chunkKey] = blocks;
}

function rebuildChunk(chunkKey) {
    if (!world[chunkKey]) return;
    
    // Remove old mesh
    if (meshes[chunkKey]) {
        scene.remove(meshes[chunkKey]);
        meshes[chunkKey].geometry.dispose();
        meshes[chunkKey].material.dispose();
        delete meshes[chunkKey];
    }
    
    const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const indices = [];
    
    let vertexIndex = 0;
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                const block = world[chunkKey][x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
                
                if (block === BLOCKS.AIR || block === BLOCKS.WATER) continue;
                
                const wx = chunkX * CHUNK_SIZE + x;
                const wy = y;
                const wz = chunkZ * CHUNK_SIZE + z;
                const color = BLOCK_COLORS[block] || 0xffffff;
                const r = (color >> 16) & 255;
                const g = (color >> 8) & 255;
                const b = color & 255;
                
                // Create cube
                const cubeVertices = [
                    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
                    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]
                ];
                
                const cubeIndices = [
                    0, 1, 2, 0, 2, 3,
                    4, 6, 5, 4, 7, 6,
                    0, 4, 5, 0, 5, 1,
                    2, 6, 7, 2, 7, 3,
                    0, 3, 7, 0, 7, 4,
                    1, 5, 6, 1, 6, 2
                ];
                
                // Check faces visibility
                const faces = [
                    getBlock(wx, wy, wz - 1) === BLOCKS.AIR,
                    getBlock(wx, wy, wz + 1) === BLOCKS.AIR,
                    getBlock(wx - 1, wy, wz) === BLOCKS.AIR,
                    getBlock(wx + 1, wy, wz) === BLOCKS.AIR,
                    getBlock(wx, wy - 1, wz) === BLOCKS.AIR,
                    getBlock(wx, wy + 1, wz) === BLOCKS.AIR
                ];
                
                const faceIndices = [
                    [0, 1, 2, 0, 2, 3],
                    [4, 6, 5, 4, 7, 6],
                    [0, 4, 5, 0, 5, 1],
                    [2, 6, 7, 2, 7, 3],
                    [0, 3, 7, 0, 7, 4],
                    [1, 5, 6, 1, 6, 2]
                ];
                
                for (let i = 0; i < 6; i++) {
                    if (faces[i]) {
                        for (let j = 0; j < 6; j++) {
                            const v = cubeVertices[cubeIndices[faceIndices[i][j]]];
                            vertices.push(wx + v[0], wy + v[1], wz + v[2]);
                            colors.push(r / 255, g / 255, b / 255);
                            indices.push(vertexIndex++);
                        }
                    }
                }
            }
        }
    }
    
    if (vertices.length > 0) {
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: true,
            roughness: 0.8,
            metalness: 0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshes[chunkKey] = mesh;
    }
}

function updateChunks() {
    const playerChunkX = Math.floor(player.position.x / (CHUNK_SIZE * BLOCK_SIZE));
    const playerChunkZ = Math.floor(player.position.z / (CHUNK_SIZE * BLOCK_SIZE));
    
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
            const chunkX = playerChunkX + dx;
            const chunkZ = playerChunkZ + dz;
            const chunkKey = `${chunkX},${chunkZ}`;
            
            if (!world[chunkKey]) {
                generateChunk(chunkX, chunkZ);
            }
            
            if (!meshes[chunkKey]) {
                rebuildChunk(chunkKey);
            }
        }
    }
}

// Raycasting for block placement/destruction
const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();

function raycastBlock() {
    direction.set(0, 0, -1).applyEuler(new THREE.Euler(player.rotation.x, player.rotation.y, 0));
    raycaster.set(camera.position, direction);
    
    let closestHit = null;
    let closestDistance = Infinity;
    
    // Check blocks around player
    for (let dx = -20; dx <= 20; dx++) {
        for (let dy = -20; dy <= 20; dy++) {
            for (let dz = -20; dz <= 20; dz++) {
                const x = Math.floor(player.position.x) + dx;
                const y = Math.floor(player.position.y) + dy;
                const z = Math.floor(player.position.z) + dz;
                
                if (getBlock(x, y, z) === BLOCKS.AIR) continue;
                
                const blockPos = new THREE.Vector3(x, y, z);
                const dist = camera.position.distanceTo(blockPos);
                
                if (dist < 10 && dist < closestDistance) {
                    // More detailed raycast
                    const minCorner = blockPos.clone().addScalar(-0.5);
                    const maxCorner = blockPos.clone().addScalar(0.5);
                    
                    const box = new THREE.Box3(minCorner, maxCorner);
                    if (raycaster.ray.intersectsBox(box)) {
                        closestHit = { x, y, z };
                        closestDistance = dist;
                    }
                }
            }
        }
    }
    
    return closestHit;
}

function updatePlayerPhysics() {
    const moveSpeed = keys['shift'] ? player.sprintSpeed : player.speed;
    const forward = new THREE.Vector3(0, 0, -moveSpeed);
    const right = new THREE.Vector3(moveSpeed, 0, 0);
    
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    
    if (keys['w']) player.velocity.add(forward);
    if (keys['s']) player.velocity.sub(forward);
    if (keys['d']) player.velocity.add(right);
    if (keys['a']) player.velocity.sub(right);
    
    // Gravity
    if (!player.onGround) {
        player.velocity.y -= 0.1;
    }
    
    // Jump
    if (keys[' '] && player.onGround) {
        player.velocity.y = player.jumpPower;
        player.onGround = false;
    }
    
    // Apply velocity with drag
    player.velocity.x *= 0.9;
    player.velocity.z *= 0.9;
    if (player.onGround) player.velocity.y = 0;
    
    player.position.add(player.velocity);
    
    // Collision detection
    player.onGround = false;
    const playerRadius = 0.3;
    const checkPoints = [
        new THREE.Vector3(0, -1.6, 0),
        new THREE.Vector3(0.2, -1.6, 0),
        new THREE.Vector3(-0.2, -1.6, 0),
        new THREE.Vector3(0, -1.6, 0.2),
        new THREE.Vector3(0, -1.6, -0.2)
    ];
    
    for (const offset of checkPoints) {
        const checkPos = player.position.clone().add(offset);
        if (getBlock(Math.floor(checkPos.x), Math.floor(checkPos.y), Math.floor(checkPos.z)) !== BLOCKS.AIR) {
            player.onGround = true;
            if (player.velocity.y < 0) player.velocity.y = 0;
            break;
        }
    }
    
    // Boundary collision
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const checkX = Math.floor(player.position.x + dx * playerRadius);
            const checkZ = Math.floor(player.position.z + dz * playerRadius);
            const checkY = Math.floor(player.position.y);
            
            if (getBlock(checkX, checkY, checkZ) !== BLOCKS.AIR) {
                player.position.x = Math.round(player.position.x);
                player.velocity.x = 0;
            }
            if (getBlock(checkX, checkY, checkZ) !== BLOCKS.AIR) {
                player.position.z = Math.round(player.position.z);
                player.velocity.z = 0;
            }
        }
    }
    
    // Update camera
    camera.position.copy(player.position);
    camera.position.y += 1.6;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.rotation.y;
    camera.rotation.x = player.rotation.x;
}

function updateInventoryUI() {
    const hud = document.getElementById('hud');
    hud.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot' + (i === selectedBlock ? ' selected' : '');
        
        const blockType = blockTypes[i];
        const blockNames = ['Grass', 'Dirt', 'Stone', 'Sand', 'Log', 'Leaves', 'Water', 'Gravel', 'Bedrock'];
        
        slot.innerHTML = `<div>${blockNames[i]}<br>${i + 1}</div>`;
        hud.appendChild(slot);
    }
}

function updateCoordinates() {
    const coordDiv = document.getElementById('coords');
    const x = Math.floor(player.position.x);
    const y = Math.floor(player.position.y);
    const z = Math.floor(player.position.z);
    coordDiv.textContent = `Pos: ${x} / ${y} / ${z}`;
}

function handleBlockInteraction() {
    const hit = raycastBlock();
    
    if (hit) {
        if (mouse.clicked) {
            setBlock(hit.x, hit.y, hit.z, BLOCKS.AIR);
            mouse.clicked = false;
        }
        
        if (mouse.rightClicked) {
            const direction = camera.position.clone().sub(new THREE.Vector3(hit.x, hit.y, hit.z)).normalize();
            const placeX = Math.floor(hit.x + direction.x * 1.5);
            const placeY = Math.floor(hit.y + direction.y * 1.5);
            const placeZ = Math.floor(hit.z + direction.z * 1.5);
            
            setBlock(placeX, placeY, placeZ, blockTypes[selectedBlock]);
            mouse.rightClicked = false;
        }
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main game loop
function animate() {
    requestAnimationFrame(animate);
    
    updatePlayerPhysics();
    updateChunks();
    updateInventoryUI();
    updateCoordinates();
    handleBlockInteraction();
    
    renderer.render(scene, camera);
}

// Initialize game
updateInventoryUI();
animate();