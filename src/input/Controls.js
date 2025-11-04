export class Controls {
  constructor(canvas, {
    onRotate, onWheel,
    onAttack, onBlock,
  }) {
    this.canvas = canvas;
    this.leftDown = false;
    this.rightDown = false;
    this.orbiting = false;

    this.keys = new Set();
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.shieldPressed = false;
    this.shieldHeld = false;
    this.attackPressed = false;

    // Ability keys
    this.abilityKeys = { leaf: false, dragon: false, wind: false, fireBreath: false, gust: false };

    // Prevent context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Mouse buttons
    canvas.addEventListener('mousedown', e => {
      const wasOrbiting = this.orbiting;
      
      if (e.button === 0) {
        this.leftDown = true;
      }
      if (e.button === 2) {
        this.rightDown = true;
      }
      
      this.updateOrbit(onRotate);
      
      // Only fire attack/block if we're NOT entering orbit mode
      if (!this.orbiting) {
        if (e.button === 0) {
          this.attackPressed = true;
          console.log('Left click - Attack!');
          if (onAttack) onAttack();
        }
        if (e.button === 2) {
          this.shieldPressed = true;
          this.shieldHeld = true;
          console.log('Right click - Shield!');
          if (onBlock) onBlock(true);
        }
      } else {
        console.log('In orbit mode, clicks ignored');
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.leftDown = false;
      if (e.button === 2) {
        this.rightDown = false;
        this.shieldHeld = false;
        if (onBlock) onBlock(false);
      }
      this.updateOrbit(onRotate);
    });

    window.addEventListener('mousemove', e => {
      if (this.orbiting && onRotate) onRotate(e.movementX ?? 0, e.movementY ?? 0);
    });

    canvas.addEventListener('wheel', e => {
      if (onWheel) onWheel(e.deltaY);
    }, { passive: true });

    // Keyboard
    window.addEventListener('keydown', e => {
      const code = e.code;
      if (['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','KeyJ','KeyK','KeyQ','Digit1','Digit2','Digit3'].includes(code)) {
        e.preventDefault();
      }
      this.keys.add(code);
      
      if (code === 'Space') {
        this.jumpPressed = true;
        this.jumpHeld = true;
      }
      if (code === 'ShiftLeft') {
        this.shieldPressed = true;
        this.shieldHeld = true;
      }
      if (code === 'KeyJ') this.attackPressed = true;
      if (code === 'KeyK') this.abilityKeys.fireBreath = true;
      if (code === 'KeyQ') this.abilityKeys.gust = true;
      if (code === 'Digit1') this.abilityKeys.leaf = true;
      if (code === 'Digit2') this.abilityKeys.dragon = true;
      if (code === 'Digit3') this.abilityKeys.wind = true;
    }, { passive: false });

    window.addEventListener('keyup', e => {
      const code = e.code;
      this.keys.delete(code);
      
      if (code === 'Space') this.jumpHeld = false;
      if (code === 'ShiftLeft') this.shieldHeld = false;
      if (code === 'KeyK') this.abilityKeys.fireBreath = false;
    });

    // Pointer lock release
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.canvas) this.orbiting = false;
    });
  }

  updateOrbit(onRotate) {
    const wantOrbit = this.leftDown && this.rightDown;
    if (wantOrbit && !this.orbiting) {
      this.canvas.requestPointerLock?.();
      this.orbiting = true;
    } else if (!wantOrbit && this.orbiting) {
      document.exitPointerLock?.();
      this.orbiting = false;
      // Small nudge so a stuck delta does not linger
      if (onRotate) onRotate(0, 0);
    }
  }

  readAxes() {
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const z = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    return { x, z };
  }

  consumeEdges() {
    const result = {
      jumpPressed: this.jumpPressed,
      jumpHeld: this.jumpHeld,
      shieldPressed: this.shieldPressed,
      shieldHeld: this.shieldHeld,
      attackPressed: this.attackPressed,
      abilityKeys: { ...this.abilityKeys }
    };
    
    // Clear edge triggers
    this.jumpPressed = false;
    this.shieldPressed = false;
    this.attackPressed = false;
    this.abilityKeys.leaf = false;
    this.abilityKeys.dragon = false;
    this.abilityKeys.wind = false;
    this.abilityKeys.gust = false;
    
    return result;
  }
}

