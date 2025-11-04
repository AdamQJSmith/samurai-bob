# Bug Fixes - November 4, 2025

## Critical Crash Fix

### Issue: `edges is not defined` Error
**Location**: `game.js` line 1071  
**Symptom**: Game crashes on start with console error
**Root Cause**: `updateEnemies()` function was trying to access `edges` variable that was defined in parent scope

**Fix Applied**:
```javascript
// Before
function updateEnemies(dt) {
  // ... code ...
  if (!playerController.isShieldBashing && !edges?.shieldHeld) {
    // edges is undefined here!
  }
}

// After
function updateEnemies(dt, edges) {  // Added edges parameter
  // ... code ...
  const isBlocking = edges?.shieldHeld || playerController.isShieldBashing;
  if (!isBlocking) {
    // Now edges is properly passed in
  }
}
```

**Why This Happened**: The `edges` variable was defined locally in `fixedUpdate()` but `updateEnemies()` was called without receiving it as a parameter.

---

## Compatibility Fixes

### Issue: THREE.MathUtils Not Found
**Symptom**: `Cannot read properties of undefined (reading 'degToRad')`  
**Root Cause**: Three.js r150 uses `THREE.Math` not `THREE.MathUtils`

**Fix Applied**:
Replaced all instances:
```javascript
// Before
THREE.MathUtils.degToRad(37)
THREE.MathUtils.clamp(value, min, max)

// After
37 * Math.PI / 180
Math.max(min, Math.min(max, value))
```

**Files Fixed**:
- `src/camera/WoWCameraRig.js`
- `src/player/PlayerController.js`

---

### Issue: ES6 Module Imports
**Symptom**: "Failed to load" error in browser  
**Root Cause**: Tried to import THREE from vendor file, but it's loaded as global script

**Fix Applied**:
```javascript
// Before
import * as THREE from '../../vendor/three.min.js';
export class WoWCameraRig { ... }

// After
export class WoWCameraRig { ... }
// THREE accessed as global window.THREE
```

**Files Fixed**:
- All files in `/src` directory
- THREE is available globally, no import needed

---

### Issue: ES6 Modules Require HTTP Server
**Symptom**: Modules won't load when opening `file:///index.html`  
**Root Cause**: Browser security prevents ES6 module loading from file:// protocol

**Fix Applied**:
Started local Python HTTP server:
```bash
python3 -m http.server 8000
```

**Access Game At**: `http://localhost:8000/index.html`

**Why**: ES6 `import`/`export` requires HTTP(S) protocol to work

---

## Fixed Timestep Verification

### Current Implementation
```javascript
const FIXED_DT = 1/60;  // 60 Hz
let accumulator = 0;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.1);
  accumulator += dt;
  
  while (accumulator >= FIXED_DT) {
    fixedUpdate(FIXED_DT);  // ← Always exactly 1/60 second
    accumulator -= FIXED_DT;
  }
  
  cameraRig.update(dt);     // ← Variable for smooth interpolation
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

**Status**: ✅ Correct
- Physics runs at fixed 60 Hz
- Camera interpolation uses variable dt for smoothness
- Max frame cap at 100ms prevents spiral of death

---

## Remaining Known Issues

### Post-Processing Not Implemented
**Status**: Placeholder only  
**Why**: Requires additional Three.js module imports:
- `EffectComposer`
- `RenderPass`
- `OutlinePass`
- `BokehPass`

**Current**: Basic renderer.render()  
**Future**: Would need to import from `three/examples/jsm/postprocessing/`

**Workaround**: Game looks good without post-processing, can add later

---

### Ability Visuals Are Basic
**Status**: Functional but simple  
**Current Implementation**:
- Leaf Form: Green plane geometries
- Dragon Form: Orange sphere particles
- Wind Orb: No visual (placeholder)

**Why**: Focused on gameplay mechanics first, visuals can be enhanced incrementally

---

## Testing Status

### ✅ Verified Working
- [x] Game loads without crashes
- [x] Player movement with WASD
- [x] Jump with SPACE
- [x] Camera rotation (both mouse buttons)
- [x] Camera zoom (scroll wheel)
- [x] Attack with left click
- [x] Shield with right click
- [x] Ability activation (keys 1, 2, 3)
- [x] Enemy spawning and AI
- [x] Combat damage and knockback
- [x] HUD updates

### 🔧 Needs User Testing
- [ ] Movement feel (is acceleration/friction tuned right?)
- [ ] Jump height (variable height working smoothly?)
- [ ] Camera smoothness (too laggy or too snappy?)
- [ ] Shield combos (bash, backflip, ground pound responsive?)
- [ ] Ability timing (8s duration, 20s cooldown feel good?)

---

## Performance Notes

### Current Performance
- **FPS**: Targets 60 FPS, physics capped at 60 Hz
- **Particle count**: ~100 max (leaf form)
- **Enemy count**: Scales over time
- **Draw calls**: Minimal, low-poly art style

### If Performance Issues Occur
1. Reduce leaf particles from 100 to 50 in `Abilities.js`
2. Lower shadow map resolution from 2048 to 1024
3. Disable fog if needed
4. Reduce enemy spawn rate

---

## How to Report Issues

If you find bugs:
1. Open browser console (F12)
2. Copy any red error messages
3. Note what you were doing when it happened
4. Check git commit `f3d3142` for this version

---

*Bug fixes documented November 4, 2025*
*Game version: Post-SM64 Movement Update*

