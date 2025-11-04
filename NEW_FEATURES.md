# 🎮 Samurai Bob - New Features Implemented

## Overview
The game has been completely overhauled with SM64-style movement, WoW-style camera controls, new abilities, and enhanced combat!

---

## 🎥 WoW-Style Camera System

### Controls
- **Both Mouse Buttons (Left + Right)**: Hold both buttons and move mouse to rotate camera
- **Scroll Wheel**: Zoom in/out (min: 6 units, max: 25 units)
- **Settings Toggle**: Lock camera option in settings (persists in localStorage)

### Features
- Smooth exponential camera smoothing
- Configurable pitch limits (-15° to 50°)
- Pointer lock when both buttons held for precise control
- Camera yaw exposed for camera-relative movement

---

## 🏃 SM64-Style Movement System

### Core Movement
- **Acceleration & Friction**: Smooth start/stop like Super Mario 64
- **Max Run Speed**: 7.0 units/s (scales with speed multiplier)
- **Ground Accel**: 20.0 units/s²
- **Air Accel**: 6.0 units/s² (limited to 80% of max ground speed)
- **Friction**: 12.0 units/s² deceleration
- **Gravity**: 25.0 units/s²

### Jump Mechanics
- **Variable Jump Height**: Hold SPACE longer = higher jump, release early = lower jump
- **Coyote Time**: 0.08s grace period to jump after leaving ground
- **Jump Buffer**: 0.10s window to queue jump input before landing
- **Triple Jump Chain**: Three consecutive jumps, third jump gets 25% boost!
- **Dynamic Jump**: Cut velocity by 40% when releasing jump button mid-air

### Advanced Movement
- **Slope Handling**: 37° climb limit, steeper slopes cause sliding
- **Step Height**: 0.35m automatic step-up
- **Fixed Timestep**: 60 Hz physics updates for consistent movement

---

## 🛡️ Combat & Shield Mechanics

### Shield Actions
All triggered by combining SHIFT (or Right Mouse) with other inputs:

1. **Shield Block** (Hold SHIFT/Right Click)
   - Blocks incoming damage
   - Damages enemies on contact
   - Makes shield visible

2. **Shield Bash** (SHIFT + SPACE while moving forward)
   - Fast forward dash with shield
   - Deals 15× power multiplier damage
   - Large knockback on enemies
   - Brief super armor during dash

3. **Backflip** (SHIFT + SPACE while standing still)
   - High vertical jump with backward momentum
   - Shield stays up during flip
   - Evasive maneuver

4. **Ground Pound** (SHIFT in air)
   - Fast downward slam
   - Radial damage on landing (4 unit radius)
   - Deals 30× power multiplier damage
   - Heavy knockback

### Sword Attack (J or Left Click)
- Frontal 60° cone attack
- Range: 5 units
- Damage: 25× power multiplier
- Knockback and 1.0s stun
- 0.5s cooldown

---

## ✨ Ability System

Three forms with test keys (to be replaced with pickups later):

### 🍃 Leaf Form (Press 1)
- **Duration**: 8 seconds
- **Cooldown**: 20 seconds
- **Visual**: 100 orbiting leaf particles, player fades to 15% opacity
- **Gameplay**: 
  - Invincible to enemy damage
  - Movement unchanged
  - Cannot attack while in leaf form
  - Press J to exit early with spin slash (360° damage)

### 🐉 Dragon Form (Press 2)
- **Duration**: 8 seconds
- **Cooldown**: 20 seconds
- **Visual**: Flame particles around player
- **Gameplay**:
  - Contact damage to nearby enemies
  - Hold K for fire breath (short cone)
  - 15% speed boost
  - Flames persist briefly

### 💨 Wind Orb (Press 3)
- **Duration**: 8 seconds
- **Cooldown**: 20 seconds (Gust: 3s cooldown)
- **Visual**: Afterimage trail effect
- **Gameplay**:
  - Press Q for wind gust (knocks back enemies, deals damage)
  - Jump height increased by 25%
  - Forward dash on contact damage
  - Wind gust has separate 3s cooldown

---

## 🎨 Visual Enhancements

### Toon Shading
- 4-step gradient toon material
- Stepped lighting for cel-shaded look
- Applied to all characters and props

### Lighting
- Soft PCF shadows
- Three-point lighting setup
- Ambient + Hemisphere + Directional + Fill lights
- sRGB color space with ACES tone mapping

### HUD Improvements
- Real-time ability indicators (bottom right)
- Shows active ability with glow
- Cooldown timers
- "Ready" status when available

---

## ⌨️ Complete Control Scheme

### Movement
- **WASD**: Move (camera-relative)
- **SPACE**: Jump (hold for variable height)
- **SHIFT**: Shield block

### Combat
- **J** or **Left Click**: Sword attack
- **SHIFT + SPACE** (moving): Shield bash
- **SHIFT + SPACE** (still): Backflip
- **SHIFT** (in air): Ground pound

### Camera
- **Left + Right Mouse + Move**: Rotate camera
- **Scroll Wheel**: Zoom in/out

### Abilities (Test Keys)
- **1**: Activate Leaf Form
- **2**: Activate Dragon Form
- **3**: Activate Wind Orb
- **K**: Fire Breath (while in Dragon Form)
- **Q**: Wind Gust (while in Wind Orb)

---

## 🎯 Gameplay Features

### Progression System
- **Speed Multiplier**: +8% per kill, caps at 5.0×
- **Power Multiplier**: +40% per kill, caps at 20.0×
- Score increases over time
- Enemies scale with game time

### Enemy Types
- **Grunt**: Basic red demon (50 HP, 2 speed)
- **Speedy**: Fast blue demon (30 HP, 4.5 speed)
- **Tank**: Tough gray demon (120 HP, 1.2 speed)
- **Boss**: Large red demon (200 HP, 2 speed)

### Spawn System
- Progressive difficulty
- Spawn rate increases over time
- Enemy variety unlocks at time milestones:
  - 30s: Speedy enemies
  - 60s: Tank enemies
  - 120s: Boss enemies

---

## 🛠️ Technical Implementation

### Architecture
- **ES6 Modules**: Clean separation of concerns
- **Fixed Timestep**: 60 Hz physics loop with accumulator
- **Component System**: Camera, Controls, Player, Abilities, Combat modules
- **Collision Detection**: Raycasting for ground snapping
- **Input Buffering**: Edge-triggered and hold detection

### File Structure
```
/src
  /camera
    - WoWCameraRig.js
  /input
    - Controls.js
  /player
    - PlayerController.js
    - Abilities.js
  /combat
    - Attacks.js
  /visuals
    - materials.js
    - post.js
/game.js (main integration)
```

---

## 🎮 How to Play

1. Open `index.html` in a modern browser
2. Click "BATTLE ROYALE" to start
3. Use WASD to move, SPACE to jump
4. Left click or J to attack, Right click or SHIFT to block
5. Combine shield + jump for special moves
6. Press 1, 2, or 3 to test abilities
7. Hold both mouse buttons and move to rotate camera
8. Scroll to zoom

### Tips
- Build up triple jumps by jumping 3 times quickly while moving
- Use shield bash to close gaps and deal damage
- Ground pound for area damage
- Combine abilities with movement for tactical advantage
- Camera lock in settings if you prefer static camera

---

## 🔧 Settings

### Camera Lock
- Toggle in Settings menu
- Persists between sessions (localStorage)
- Disables both-button rotation and scroll zoom
- Useful if you prefer fixed camera angle

---

## 📝 Notes

- All ability test keys (1, 2, 3) are placeholders for future pickup system
- Fire breath (K) and Wind Gust (Q) only work while their respective forms are active
- The game maintains 60 FPS with fixed timestep physics
- Movement feels snappy and responsive like SM64
- Camera is smooth and never jittery

Enjoy the enhanced Samurai Bob experience! ⚔️🛡️

