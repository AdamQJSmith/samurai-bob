export class Controls {
  constructor(canvas, { onRotate, onWheel, onAttack, onBlock }) {
    this.canvas = canvas;
    this.onRotate = onRotate;
    this.onWheel  = onWheel;
    this.onAttack = onAttack;
    this.onBlock  = onBlock;

    this.leftDown = false;
    this.rightDown = false;
    this.orbiting = false;

    this.keys = new Set();
    this.jumpPressed = false;
    this.jumpHeld = false;

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    const enterOrbit = () => {
      if (this.orbiting) return;
      this.canvas.requestPointerLock?.();
      this.orbiting = true;
    };
    const exitOrbit = () => {
      if (!this.orbiting) return;
      document.exitPointerLock?.();
      this.orbiting = false;
    };

    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) this.leftDown  = true;
      if (e.button === 2) this.rightDown = true;

      const both = this.leftDown && this.rightDown;
      if (both) {
        enterOrbit();
        return; // do not fire attack or block on the same frame orbit begins
      }

      // single-button actions
      if (!this.orbiting) {
        if (e.button === 0 && this.onAttack) this.onAttack();
        if (e.button === 2 && this.onBlock)  this.onBlock(true);
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.leftDown  = false;
      if (e.button === 2) {
        this.rightDown = false;
        this.onBlock?.(false);
      }
      if (!(this.leftDown && this.rightDown)) exitOrbit();
    });

    window.addEventListener('mousemove', e => {
      if (this.orbiting) this.onRotate?.(e.movementX ?? 0, e.movementY ?? 0);
    });

    canvas.addEventListener('wheel', e => this.onWheel?.(e.deltaY), { passive: true });

    // Defensive resets if the window loses focus or cursor leaves the canvas
    window.addEventListener('blur', () => { this.leftDown = this.rightDown = false; exitOrbit(); });
    canvas.addEventListener('mouseleave', () => { this.leftDown = this.rightDown = false; exitOrbit(); });

    // keyboard
    window.addEventListener('keydown', e => {
      if (['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'Space') { this.jumpPressed = true; this.jumpHeld = true; }
      if (e.code === 'ShiftLeft') this.onBlock?.(true);
    }, { passive:false });

    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.jumpHeld = false;
      if (e.code === 'ShiftLeft') this.onBlock?.(false);
    });
  }

  readAxes() {
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const z = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    return { x, z };
  }

  consumeJumpEdge() {
    const pressed = this.jumpPressed;
    this.jumpPressed = false;
    return { jumpPressed: pressed, jumpHeld: this.jumpHeld };
  }
}
