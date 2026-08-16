# Minecraft - Voxel Edition

A fully functional Minecraft-style voxel game built with Three.js.

## Features

✅ **Full 3D Voxel World**
- Procedural terrain generation with Perlin noise
- Multiple biome-like terrain variations
- Infinite world generation

✅ **Gameplay Mechanics**
- Block placement and destruction
- First-person camera with smooth movement
- Jumping and sprinting
- Collision detection and physics
- Gravity system

✅ **Block Types** (9 different types)
- Grass Block
- Dirt
- Stone
- Sand
- Water
- Oak Log
- Oak Leaves
- Gravel
- Bedrock

✅ **Visual Features**
- Dynamic lighting and shadows
- Fog for distance rendering
- Color-coded blocks
- Smooth terrain
- Crosshair targeting system

✅ **User Interface**
- Inventory hotbar (1-9 keys)
- Coordinate display
- Real-time FPS rendering
- Instructions on screen

## Controls

- **WASD** - Move around
- **Space** - Jump
- **Shift** - Sprint
- **Left Click** - Destroy blocks
- **Right Click** - Place blocks
- **1-9** - Select block type
- **Mouse** - Look around (click to capture mouse)
- **Esc** - Release mouse

## How to Play

1. Open `index.html` in a modern web browser
2. Click anywhere in the game to capture mouse input
3. Use WASD to move and Space to jump
4. Use mouse to look around
5. Select a block type with number keys (1-9)
6. Left-click to destroy blocks, right-click to place them

## Technical Details

- **Engine**: Three.js (WebGL)
- **Rendering**: Chunked mesh generation for performance
- **Terrain**: Procedural generation with Perlin noise
- **Physics**: Custom collision detection
- **Lighting**: Three.js standard materials with shadows

## Performance

- Renders 8-chunk radius around player
- Chunk mesh caching for optimal performance
- Dynamic mesh rebuilding on block changes
- Optimized face culling (only visible faces rendered)

## Browser Requirements

- Modern browser with WebGL support
- JavaScript enabled
- Recommended: Chrome, Firefox, Safari, or Edge (latest versions)

Enjoy your voxel adventure!