# ⚔️ Samurai Bob 3D - Battle Royale Arena

A **3D browser-based action game** where you play as Samurai Bob fighting endless waves of enemies in a Mario 64-style low-poly 3D world!

## 🎮 How to Play

Simply open `index.html` in your web browser (Chrome, Firefox, Safari, or Edge).

## 🕹️ Controls

### Movement
- **W/A/S/D** - Move Bob around the arena
- **SPACE** - Jump
- **MOUSE** - Look around (after clicking to lock pointer)

### Combat
- **LEFT CLICK** - Sword Attack (slash in front of you)
- **RIGHT CLICK** - Shield Block (hold to defend)

## 🌟 Features

### 3D Graphics
- **Low-poly art style** inspired by Nintendo 64 / Super Mario 64
- **Third-person camera** that follows Bob
- **Real-time 3D combat** with physics
- **Dynamic lighting and shadows**

### Battle Royale Mode
- **Endless enemy waves** - Survive as long as possible
- **Progressive difficulty** - Enemies get stronger and spawn faster
- **Power scaling** - Get faster and stronger with each kill

### Enemy Types
- 🔴 **Grunt** - Basic demon enemy
- 🔵 **Speedy** - Fast but weak
- ⚫ **Tank** - Slow but tough
- 🔴 **Boss** - Large powerful demon (spawns late game)

### Character Progression
- **Speed Multiplier** - Increases up to 5x (move faster with each kill)
- **Power Multiplier** - Increases up to 20x (deal more damage)
- Real-time HUD showing your stats

## 🎯 Game Mechanics

### Combat System
- **Sword attacks** hit enemies in a cone in front of you
- **Knockback system** - Send enemies flying
- **Stun mechanics** - Hit enemies get stunned briefly
- **Shield blocking** - Block damage and counter-attack

### Arena
- **Green platform** floating in the sky (like your reference picture!)
- **Boundaries** - Stay on the platform or fall off
- **3D environment** with mountains and clouds

## 🎨 Art Style

The game uses a **low-poly 3D aesthetic** similar to:
- Super Mario 64
- Nintendo 64 era games
- The Samurai Bob figure from your reference image

### Bob's Design
- Blue kimono
- Red pants
- Orange nose (distinctive feature!)
- Black topknot hair
- Wooden shield with cherry blossom design
- Silver katana sword

## 🛠️ Technical Details

- Built with **Three.js** (WebGL 3D graphics)
- Runs entirely in the browser
- No installation required
- Works on any modern browser
- Smooth 60 FPS gameplay

## 📊 Stats Tracked

- **Survival Time** - How long you lasted
- **Total Score** - Points earned
- **Enemies Killed** - Total kills
- **Speed Multiplier** - Maximum speed reached
- **Power Multiplier** - Maximum power reached

## 🚀 Tips for Success

1. **Keep moving** - Don't let enemies surround you
2. **Use your sword** - Attack early and often
3. **Block when needed** - Shield saves your life
4. **Jump to dodge** - Use mobility to your advantage
5. **Farm kills early** - Build your multipliers fast

## 🎬 Game Over

When your health reaches 0:
- View your final stats
- See how long you survived
- Click "Play Again" to restart

---

## 🔧 Development Notes

This is the **3D version** of Samurai Bob, built to match the low-poly aesthetic of the character design.

The `2d-version/` folder contains the original 2D prototype.

## ☁️ Quick Hosting (Shopify Internal)

This project can be hosted on Shopify Quick, which serves static files for Shopifolk only.

### Install Quick CLI

`npm i -g @shopify/quick`

### Local dev

`quick init`

`quick serve`

### Deploy

Deploy from the repo root. The directory must include `index.html`.

`quick deploy -f . samurai-bob-3d`

Live URL format: `https://samurai-bob-3d.quick.shopify.io`

---

**Have fun, Samurai Bob!** ⚔️🛡️

Try to beat your high score and see how long you can survive!

