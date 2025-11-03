# ⚔️ Samurai Bob - Arena Battle

A fun, action-packed browser game where you play as Samurai Bob fighting endless waves of enemies!

## 🎮 How to Play

Simply open `index.html` in your web browser and start playing!

## 🕹️ Controls

### Basic Movement
- **Arrow Keys** (↑↓←→) - Move Samurai Bob
- **Space** - Jump (can triple jump!)
- **B** - Sword Attack
- **Z** - Raise Shield (hold to block)

### Advanced Moves
- **Z + Forward** - Shield Bash (powerful forward attack)
- **Z + Space** (standing still) - Shield Backflip
- **Z** (in air) - Shield Smash (ground pound with shield)

### Power-Up Abilities
When you collect a power-up, use these keys:
- **L** - Leaf Transform (invincible leaf form)
- **F** - Dragon Fire Breath (when you have Dragon power)
- **W** - Wind Blast (push enemies back)

## 🌟 Features

### Progressive Difficulty
- **Speed Multiplier**: Increases up to 5x with each kill
- **Power Multiplier**: Increases up to 20x with each kill
- **Faster Enemy Spawns**: More enemies appear as time goes on
- **Stronger Enemies**: Enemy health and speed increase over time

### Power-Ups (Appear Every 10 Seconds)

#### 🍃 Leaf Power
- Turn into invincible leaves
- Enemies can't hurt you
- Lasts 10 seconds

#### 🐲 Dragon Power
- Enemies die on touch
- Press **F** to breathe fire
- Massive damage output
- Lasts 10 seconds

#### 💨 Wind Orb
- Higher jump ability
- Press **W** to blow powerful wind
- Pushes enemies away
- Semi-transparent appearance
- Lasts 10 seconds

### HUD Display
- ⏱️ **Timer** - How long you've survived
- 🎯 **Score** - Accumulates over time and with kills
- ❤️ **Health** - Your current health (starts at 100)
- ⚡ **Speed Multiplier** - Current speed boost
- 💪 **Power Multiplier** - Current damage boost
- 🗡️ **Kills** - Total enemies defeated

## 🎯 Game Mechanics

### Combat System
- **Sword Attack**: Front-facing melee attack
- **Shield Bash**: Dash forward with shield damage
- **Shield Block**: Prevents damage while holding Z
- **Shield Smash**: Aerial ground pound attack

### Enemy Types (6 Different!)

#### 🔴 Grunt (Red)
- **Health**: 50 + scaling
- **Speed**: Medium (2)
- **Damage**: Low (2)
- **Points**: 50

#### 🔵 Speedy (Blue)
- **Health**: 30 + scaling  
- **Speed**: Very Fast (4.5)
- **Damage**: Low (1)
- **Points**: 75

#### ⚫ Tank (Gray)
- **Health**: 120 + scaling
- **Speed**: Slow (1.2)
- **Damage**: High (4)
- **Points**: 150

#### 🟣 Assassin (Purple)
- **Health**: 40 + scaling
- **Speed**: Fast (3.5)
- **Damage**: Medium (3)
- **Points**: 100

#### 🟠 Brute (Orange)
- **Health**: 80 + scaling
- **Speed**: Medium-Fast (2.5)
- **Damage**: Medium (3)
- **Points**: 125

#### 🔴 Boss (Dark Red)
- **Health**: 200 + scaling
- **Speed**: Medium (2)
- **Damage**: Very High (5)
- **Points**: 500
- **Spawns**: Only in late game (after 2 minutes)

### Scoring
- **Survival**: +1 point per frame
- **Kills**: +100 points per enemy defeated
- **Time Bonuses**: Score increases the longer you survive

## 🏆 Strategy Tips

1. **Keep Moving**: Standing still makes you an easy target
2. **Use Shield Wisely**: Block when surrounded
3. **Power-Up Priority**: 
   - Early game: Dragon for quick kills
   - Mid game: Wind for crowd control
   - Late game: Leaf for survival
4. **Shield Bash**: Great for escaping when cornered
5. **Triple Jump**: Use mobility to avoid damage
6. **Farm Multipliers**: The more kills, the stronger you become!

## 🎨 Visual Features

- Colorful gradient backgrounds
- Particle effects for attacks and hits
- Health bars on enemies
- Smooth animations
- Dynamic power-up indicators
- Glowing effects for special abilities

## 🛠️ Technical Details

- Built with vanilla JavaScript (no frameworks!)
- HTML5 Canvas for rendering
- 60 FPS gameplay
- Responsive design
- Clean code separation (HTML, CSS, JS)
- **Web Audio API** for retro-style sound effects
- **LocalStorage** for persistent high score tracking
- **6 unique enemy types** with different behaviors
- **Advanced scoring system** with multipliers

## 📊 Game Stats Tracked

- Survival time
- Total score
- Enemies killed
- Maximum speed reached
- Maximum power reached
- **High scores saved permanently** (Top 10)
- Date of each high score
- Detailed stats per run

## 🔊 Sound Effects

All sounds generated in real-time using Web Audio API:
- ⚔️ **Sword Slash** - Swoosh sound when attacking
- 🛡️ **Shield Block** - Metallic clang when shielding
- 💥 **Shield Bash** - Heavy impact sound
- 🦘 **Jump** - Bouncy jump sound
- 💔 **Enemy Hit** - Impact feedback
- ☠️ **Enemy Death** - Defeat sound with tone drop
- 😢 **Player Hurt** - Damage feedback
- ✨ **Power-up Collect** - Ascending victory notes
- 🔥 **Fire Breath** - Roaring flame sound
- 💨 **Wind Blast** - Whooshing air sound
- 😭 **Game Over** - Sad descending tones
- 🏆 **New High Score** - Victory fanfare

## 🎬 Game Over

When your health reaches 0:
- View your final stats
- See total survival time
- Check your final score
- Review your kill count
- **View Top 10 High Scores**
- See if you made the leaderboard!
- Get "NEW HIGH SCORE!" banner if you're #1
- Click "Play Again" to restart!

### High Scores
- Saves your top 10 runs automatically
- Tracks score, kills, time, and date
- Persists across browser sessions
- Shows detailed stats for each entry

## 🚀 Future Enhancements (Ideas)

- More enemy types
- Boss battles every few minutes
- Additional power-ups
- Combo system
- Leaderboard (local storage)
- Sound effects and music
- More arena variations
- Special weapons

## 💡 Pro Tips

- **Combo Kills**: Chain kills quickly for style points!
- **Shield Cancel**: Release Z right after blocking for faster attacks
- **Jump Attacks**: Attack while jumping for aerial combat
- **Corner Strategy**: Use arena corners to funnel enemies
- **Power-Up Stacking**: Plan ahead for when power-ups will appear

---

## 🎮 Have Fun!

Try to beat your high score and see how long you can survive! 

**Good luck, Samurai Bob!** ⚔️🛡️

