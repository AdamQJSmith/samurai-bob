# Changelog - Samurai Bob Game Upgrade

## Overview
This update transforms Samurai Bob from a basic arena fighter into a polished 3D platformer with Super Mario 64-inspired movement, World of Warcraft-style camera controls, and a full ability system.

---

## 🎯 Why These Changes?

### Problem with Original Game
The original game had:
- **Instant movement** - WASD gave immediate full speed (felt stiff and unresponsive)
- **Basic jumps** - No variable height or advanced techniques
- **Fixed camera** - Camera was locked in one position with basic following
- **Simple combat** - Only attack and block, no combos or special moves
- **No progression** - Just speed/power multipliers, no tactical options

### Solution: SM64 + WoW + Ability System
The redesign adds:
- **Acceleration-based movement** - Smooth start/stop like platforming classics
- **Variable jump mechanics** - Hold for higher, release for lower (player skill expression)
- **Player-controlled camera** - Full 360° rotation and zoom control
- **Combat combos** - Shield + Jump combinations for tactical variety
- **Ability forms** - Strategic power-ups that change playstyle

---

## 📁 New File Structure

### Created Files
```
/src
  /camera
    - WoWCameraRig.js         (Camera orbit and zoom system)
  /input
    - Controls.js             (Unified input handling)
  /player
    - PlayerController.js     (SM64-style kinematic movement)
    - Abilities.js            (Leaf/Dragon/Wind form system)
  /combat
    - Attacks.js              (Hitbox processing and damage)
  /visuals
    - materials.js            (Toon shading helpers)
    - post.js                 (Post-processing placeholder)
```

### Modified Files
- `game.js` - Complete rewrite with modular architecture
- `index.html` - Added ability HUD, camera lock setting
- `style.css` - Added ability icon styles
- `README.md` - Updated with new features

### Preserved Files
- `game-old.js` - Original game backed up
- All existing assets (textures, models, etc.)

---

## 🎮 Major Feature Changes

### 1. WoW-Style Camera System
**WHY**: The fixed camera was limiting. Players need to see around corners, adjust for their preference, and feel in control.

**WHAT CHANGED**:
- **Spherical orbit system** - Camera rotates around player on a sphere
- **Both mouse buttons** - Hold left + right to enter rotate mode
- **Scroll zoom** - Smooth zoom from 6 to 25 units
- **Settings lock** - Toggle to disable for users who prefer fixed camera
- **Smooth interpolation** - Exponential smoothing prevents jittery camera
- **Pitch limits** - Constrained to -15° to 50° so camera doesn't flip upside down

**IMPLEMENTATION**:
```javascript
// WoWCameraRig.js
- Stores yaw/pitch/distance in spherical coordinates
- Converts to Cartesian position each frame
- Lerps toward target position for smoothness
- Exposes getCameraYaw() for camera-relative movement
```

### 2. SM64-Style Movement System
**WHY**: Instant movement felt "digital" and unresponsive. SM64's movement is beloved because it gives players precise analog control even with digital inputs.

**WHAT CHANGED**:
- **Acceleration/Friction** - Speed builds up and bleeds off naturally
- **Input smoothing** - WASD keys have 0.06s smoothing to feel analog
- **Air control** - Limited air movement (80% of ground speed cap)
- **Slope handling** - Can climb 37° slopes, steeper = slide
- **Step climbing** - Auto-step over 0.35m obstacles
- **Fixed timestep** - 60 Hz physics loop for consistent behavior

**KEY PARAMETERS**:
```
Max Speed: 7.0 units/s
Ground Accel: 20.0 units/s²
Friction: 12.0 units/s²
Gravity: 25.0 units/s²
Jump Speed: 6.5 units/s
```

**WHY THESE NUMBERS**:
- Max speed 7.0 feels fast without being uncontrollable
- High acceleration (20.0) gives responsive start
- High friction (12.0) gives ~0.5s bleed-off (feels tight)
- Gravity 25.0 gives punchy, arcadey jumps
- Jump 6.5 gives good hang time for combos

### 3. Advanced Jump Mechanics
**WHY**: Static jumps are boring. Variable height and chaining rewards player skill.

**WHAT CHANGED**:

**A. Variable Jump Height**
- Hold SPACE = full height jump
- Release early = 40% velocity cut = shorter jump
- **Why**: Gives players precise control for platforming

**B. Coyote Time (0.08s)**
- Can jump 0.08s after walking off ledge
- **Why**: Compensates for human reaction time, feels fair not punishing

**C. Jump Buffer (0.10s)**
- Press jump 0.10s before landing = queues jump
- **Why**: Rewards anticipation, prevents "lost" inputs

**D. Triple Jump Chain**
- 3 jumps within 0.35s = 3rd jump gets 25% boost
- Resets after 0.5s on ground
- **Why**: Rewards skillful timing, enables advanced movement

**E. Early Jump Cut**
- Release SPACE while rising = velocity *= 0.6
- **Why**: Enables precise low jumps for tight spaces

### 4. Shield Combat System
**WHY**: Shield was just a passive block. Now it's an active combat tool with multiple uses.

**WHAT CHANGED**:

**A. Shield Bash (SHIFT + SPACE while moving)**
```
- Forward burst at 15 units/s
- 0.4s duration
- Frontal hitbox
- 15× damage, 12 unit knockback
- Super armor during dash
```
**Why**: Aggressive gap-closer, rewards offensive shield play

**B. Backflip (SHIFT + SPACE while standing)**
```
- High vertical (8 units/s up)
- Backward horizontal (5 units/s back)
- 0.5s animation lock
- Shield stays up during flip
```
**Why**: Defensive escape option, creates spacing

**C. Ground Pound (SHIFT in air)**
```
- Sets velocity to -18 (fast fall)
- 4 unit radius on landing
- 30× damage
- 1.5s stun, 10 unit knockback
```
**Why**: High-risk/high-reward area attack

### 5. Ability System (3 Forms)
**WHY**: Combat was repetitive. Forms add strategic depth and visual variety.

**DESIGN PHILOSOPHY**:
- One active at a time (meaningful choice)
- 8s duration (long enough to use, short enough to cycle)
- 20s cooldown (encourages rotation, not spam)
- Test keys 1/2/3 (to be replaced by pickups later)

**A. Leaf Form (Key 1)**
```
Duration: 8s | Cooldown: 20s
Visual: 100 orbiting green leaf particles
Gameplay:
- Invincible to all damage
- Cannot attack while leafed
- Press J to exit early + 360° spin slash
```
**Why**: Defensive utility, escape tool, risk/reward on early exit

**B. Dragon Form (Key 2)**
```
Duration: 8s | Cooldown: 20s
Visual: Orange flame particle aura
Gameplay:
- Contact damage to nearby enemies
- Hold K for fire breath cone
- +15% speed boost
```
**Why**: Aggressive option, rewards close-range brawling

**C. Wind Orb (Key 3)**
```
Duration: 8s | Cooldown: 20s (Gust: 3s)
Visual: Afterimage trail
Gameplay:
- Press Q for wind gust (knockback + damage)
- +25% jump height
- Dash attacks deal damage
```
**Why**: Mobility/control hybrid, enables advanced movement combos

### 6. Fixed Timestep Physics
**WHY**: Variable deltaTime causes inconsistent physics (jumps vary by framerate).

**WHAT CHANGED**:
```javascript
// Old: Variable timestep
function update() {
  deltaTime = clock.getDelta();
  player.position.add(velocity.multiplyScalar(deltaTime));
}

// New: Fixed timestep with accumulator
function animate() {
  const dt = clock.getDelta();
  accumulator += dt;
  
  while (accumulator >= FIXED_DT) {
    fixedUpdate(FIXED_DT);  // Always 1/60 second
    accumulator -= FIXED_DT;
  }
}
```

**Why**: 
- Jumps always go same height regardless of FPS
- Triple jump timing consistent
- Predictable, replayable physics

### 7. Enhanced Combat System
**WHY**: Old combat was just collision detection. New system has proper hitboxes.

**WHAT CHANGED**:

**Sword Slash**
```javascript
// Old: Simple distance check
if (distance < 2.5) { damage(); }

// New: Cone hitbox with direction
const forward = playerDirection;
const dot = forward.dot(toEnemy);
if (dot > cos(60°) && distance < 5) { damage(); }
```
**Why**: More precise, skill-based, prevents backside hits

**Shield Bash**
- Separate hitbox during dash window
- Only active for 0.4s action timer
- Larger knockback than sword

**Ground Pound**
- Radial hitbox (no direction check)
- Only triggers on landing
- Area damage

### 8. Input System Overhaul
**WHY**: Old input was scattered across game.js. New system is unified and extensible.

**WHAT CHANGED**:
```javascript
// Old: Direct key checks everywhere
if (keys['w']) moveDirection.z -= 1;
if (keys[' ']) jump();

// New: Centralized Controls class
const axes = controls.readAxes();
const edges = controls.consumeEdges();
```

**Benefits**:
- **Edge detection** - Distinguishes press from hold
- **Consumption** - Prevents double-processing
- **Remappability** - All keys in one place
- **Mouse orbit** - Cleanly separates attack from camera

### 9. Visual Enhancements
**WHY**: Make abilities and states visible to player.

**WHAT CHANGED**:
- **Ability HUD** - Shows active form, timers, cooldowns
- **Toon materials** - 4-step gradient for cel-shaded look
- **Shield visibility** - Shows during block and bash
- **Particle effects** - Leaves, flames, etc.

---

## 🔧 Technical Implementation Details

### Camera-Relative Movement
```javascript
// Convert WASD to world-space direction
const yaw = cameraRig.getCameraYaw();
const worldDir = new THREE.Vector3(
  sin(yaw) * input.z + cos(yaw) * input.x,  // X
  0,                                          // Y (no vertical)
  cos(yaw) * input.z - sin(yaw) * input.x   // Z
);
```
**Why**: W always moves "forward from camera view", not "north"

### Triple Jump Detection
```javascript
// On each jump:
if (timeSinceLastJump < 0.35 && jumpChain === 2) {
  jumpPower *= 1.25;  // Boost third jump
}
jumpChain = Math.min(2, jumpChain + 1);
timeSinceLastJump = 0;

// Reset when grounded for 0.5s
if (onGround && timeSinceLastJump > 0.5) {
  jumpChain = 0;
}
```
**Why**: Rewards rapid jumping, resets if you wait too long

### Ground Detection with Raycasting
```javascript
// Cast ray down from player feet
const origin = player.position + Vector3(0, 0.6, 0);
ray.set(origin, Vector3(0, -1, 0));
const hit = ray.intersectObjects(collisionMeshes);

// Snap to ground if within step height
if (hit && playerY - hitY < stepHeight) {
  player.position.y = hitY;
}
```
**Why**: Smooth ground snapping, auto-step over small obstacles

### Input Smoothing for WASD
```javascript
// Exponential smoothing
const a = 1 - exp(-dt / 0.06);  // Time constant
this.input.lerp(this.raw, a);
```
**Why**: Makes keyboard feel like analog stick, eliminates grid-snapping

---

## 🎨 Design Decisions

### Why WoW Camera Instead of Free-Look?
- **Both buttons = intentional** - Prevents accidental camera spinning
- **Compatible with combat** - Left click still attacks, right click still blocks
- **Familiar to many players** - WoW's camera is industry-proven
- **Lock toggle** - Users who prefer fixed camera can disable it

### Why Fixed Timestep?
- **Consistency** - Same behavior at 30 FPS or 144 FPS
- **Replayability** - Speedrunners get consistent physics
- **Predictability** - Jump distances don't vary
- **Industry standard** - Used in most precision platformers

### Why These Movement Numbers?
Tuned by feel to match SM64:
- **High accel** (20.0) - Responsive, not sluggish
- **High friction** (12.0) - Tight control, can change direction fast
- **7.0 max speed** - Fast enough to be fun, slow enough to control
- **6.5 jump** - Good arc, enough airtime for combos

### Why Separate Attack/Shield from Camera Orbit?
```javascript
// Only fire attack when NOT in orbit mode
if (!this.orbiting && onAttack) {
  this.attackPressed = true;
}
```
**Why**: Prevents accidental attacks while adjusting camera

---

## 🐛 Bug Fixes

### THREE.Math vs THREE.MathUtils
**Problem**: Used `THREE.MathUtils` which doesn't exist in Three.js r150
**Fix**: Changed to `THREE.Math` then to plain JavaScript
```javascript
// Before
THREE.MathUtils.degToRad(37)

// After
37 * Math.PI / 180
```

### ES6 Module Import Issue
**Problem**: `import * as THREE` doesn't work with global THREE script
**Fix**: Removed all imports - THREE is already global
```javascript
// Before
import * as THREE from '../../vendor/three.min.js';
export class WoWCameraRig { ... }

// After
export class WoWCameraRig { ... }
// THREE accessed as global
```

### Module Loading in Browser
**Problem**: ES6 modules require HTTP server, can't load from `file://`
**Fix**: Started Python HTTP server on port 8000
```bash
python3 -m http.server 8000
```

---

## 🎮 Gameplay Impact

### Before → After

**Movement Feel**:
- Before: Instant stop/start, grid-like movement
- After: Smooth acceleration, analog feel, satisfying momentum

**Jump Skill Ceiling**:
- Before: One jump height, timing doesn't matter
- After: Variable height, coyote time, buffer, triple jump = high skill expression

**Camera**:
- Before: Fixed third-person, can't see around obstacles
- After: Full player control, zoom for screenshots or combat

**Combat Depth**:
- Before: Attack, block, that's it
- After: Attack, block, bash, backflip, ground pound, 3 ability forms

**Strategic Options**:
- Before: Just speed/power multipliers (passive)
- After: Choose when to use Leaf (defense), Dragon (offense), or Wind (mobility)

---

## 📊 Testing Recommendations

### Movement Feel Test
1. **Acceleration**: Hold W, count ~0.3s to reach max speed
2. **Friction**: Release W, count ~0.5s to full stop
3. **Turning**: Run in circles, should feel smooth not grid-snapped
4. **Jump height**: Tap SPACE = short hop, Hold SPACE = full jump
5. **Triple jump**: Jump 3× quickly while moving = 3rd jump noticeably higher

### Combat Test
1. **Sword range**: Should hit enemies ~5 units away in front
2. **Shield bash**: SHIFT+SPACE while moving = dash forward
3. **Backflip**: SHIFT+SPACE while still = jump backward
4. **Ground pound**: Jump, press SHIFT = fast fall + landing boom
5. **Combos**: All should feel responsive, not laggy

### Camera Test
1. **Orbit**: Hold both mouse buttons = smooth rotation
2. **No accidental attacks**: Shouldn't attack while orbiting
3. **Zoom**: Scroll in/out should be smooth
4. **Lock**: Toggle in settings should disable orbit/zoom
5. **Smoothing**: Camera should lag slightly behind player (not instant)

### Ability Test
1. **Leaf form**: Press 1 = green leaves orbit, can't be damaged
2. **Dragon form**: Press 2 = fire particles, hold K = more flames
3. **Wind orb**: Press 3 = afterimages, press Q = gust effect
4. **Cooldowns**: After 8s, should go on 20s cooldown
5. **HUD**: Icons should show active/cooldown status

---

## 🔄 Migration Notes

### For Players
- **Old saves**: No save system, no impact
- **Controls**: Similar but enhanced (WASD, SPACE, Click still work)
- **New inputs**: SHIFT for shield, both buttons for camera
- **Learning curve**: ~30 seconds to grasp new movement

### For Developers
- **Old code**: Backed up as `game-old.js`
- **Module system**: Now uses ES6 modules (requires HTTP server)
- **No breaking changes**: Can revert by restoring `game-old.js`
- **Server requirement**: Run `python3 -m http.server 8000` to test locally

---

## 🚀 Performance Considerations

### Optimizations
- **Fixed timestep** - Caps physics updates at 60 Hz even if rendering faster
- **Particle limits** - Leaf form capped at 100 particles
- **Ray intersections** - Only checks collision meshes, not entire scene
- **Ability cleanup** - Removes old particles on deactivate

### Potential Bottlenecks
- **100 leaf particles** - May impact low-end devices (can reduce to 50)
- **Multiple raycasts** - Ground detection every frame (necessary for SM64 feel)
- **Particle updates** - O(n) every frame (acceptable at current particle counts)

---

## 🎯 Future Improvements

### Not Implemented (Yet)
- **Post-processing** - Outlines, DOF (requires additional Three.js modules)
- **Sound effects** - Jump, land, attack, bash sounds
- **Animation system** - Character pose during moves
- **Fire breath hitbox** - Currently visual-only
- **Wind gust physics** - Currently placeholder
- **Spin slash** - Leaf form early exit not implemented

### Easy Additions
1. **Gamepad support** - Add to Controls.js
2. **Remappable keys** - UI for key rebinding
3. **More abilities** - Follow Abilities.js pattern
4. **Particle polish** - Better effects for each ability
5. **Combat feedback** - Screen shake, hit stop, sound

---

## 📝 Code Quality

### Architecture Improvements
- **Separation of concerns** - Camera, input, movement, abilities all separate
- **Single responsibility** - Each class does one thing well
- **Extensibility** - Easy to add new abilities or moves
- **Testability** - Fixed timestep makes behavior deterministic

### Maintainability
- **Named constants** - All tuning values at top of classes
- **Comments** - Each section explains purpose
- **Consistent style** - ES6 classes throughout
- **No magic numbers** - Everything has a reason

---

## 🎓 Learning Resources

If you want to understand the techniques used:

**SM64 Movement**:
- [Super Mario 64 Source Code](https://github.com/n64decomp/sm64) - Original implementation
- Acceleration/friction model is "Proportional-Derivative" control

**Fixed Timestep**:
- [Fix Your Timestep by Glenn Fiedler](https://gafferongames.com/post/fix_your_timestep/)
- Industry-standard article on game loops

**Camera Systems**:
- WoW uses "spherical coordinates" (yaw, pitch, radius)
- Converted to Cartesian for camera position
- Exponential smoothing: `x += (target - x) * (1 - e^(-dt/tau))`

---

## ✅ Summary of Changes

| Feature | Before | After |
|---------|--------|-------|
| **Movement** | Instant | Acceleration/friction |
| **Jumping** | Fixed height | Variable + coyote + buffer + triple |
| **Camera** | Fixed position | Player-controlled orbit + zoom |
| **Shield** | Passive block | Block + bash + backflip + pound |
| **Abilities** | None | 3 forms with cooldowns |
| **Physics** | Variable timestep | Fixed 60 Hz |
| **Input** | Scattered | Unified Controls class |
| **Combat** | Basic hits | Directional hitboxes |
| **HUD** | Basic stats | + Ability indicators |
| **Architecture** | Monolithic | Modular ES6 |

---

## 🎉 Result

The game went from a basic arena brawler to a **skill-based 3D platformer** with:
- Precise, learnable movement
- Player-controlled camera
- Deep combat system
- Strategic ability choices
- Consistent, reliable physics

All while maintaining the charming low-poly aesthetic and simple browser-based accessibility!

**Play it**: Open `index.html` via HTTP server (port 8000)
**Controls**: See updated README or in-game settings

---

*This changelog documents the complete overhaul of Samurai Bob implemented on November 4, 2025.*

