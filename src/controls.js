export class FlightControls {
  constructor(canvas) {
    this.canvas = canvas;

    this.state = {
      pitch: 0,
      yaw: 0,
      roll: 0,
      throttle: true,
      boost: false,
      fireLaser: false,
      fireMissile: false,
      toggleCam: false,
      toggleMute: false,
      restart: false
    };

    this.keys = {};
    this.mouse = {
      x: 0,
      y: 0,
      sensitivity: 0.0022,
      active: false
    };

    this.virtualPitch = 0;
    this.virtualYaw = 0;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.state.fireLaser = true;
      if (e.button === 2) {
        e.preventDefault();
        this.state.fireMissile = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.state.fireLaser = false;
      if (e.button === 2) this.state.fireMissile = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    if (e.code === 'KeyC') this.state.toggleCam = true;
    if (e.code === 'KeyM') this.state.toggleMute = true;
    if (e.code === 'KeyR') this.state.restart = true;
    if (e.code === 'KeyF') this.state.fireMissile = true;
    if (e.code === 'Space') this.state.fireLaser = true;
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.code === 'Space') this.state.fireLaser = false;
    if (e.code === 'KeyF') this.state.fireMissile = false;
  }

  onMouseMove(e) {
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    this.virtualPitch += dy * this.mouse.sensitivity;
    this.virtualYaw -= dx * this.mouse.sensitivity;

    this.virtualPitch = Math.max(-1, Math.min(1, this.virtualPitch));
    this.virtualYaw = Math.max(-1, Math.min(1, this.virtualYaw));
  }

  update(delta) {
    let pitch = 0;
    let yaw = 0;
    let roll = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) pitch -= 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) pitch += 1.0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      yaw += 0.8;
      roll += 1.2;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      yaw -= 0.8;
      roll -= 1.2;
    }
    if (this.keys['KeyQ']) roll += 1.5;
    if (this.keys['KeyE']) roll -= 1.5;

    pitch += this.virtualPitch;
    yaw += this.virtualYaw;

    this.virtualPitch *= Math.pow(0.08, delta);
    this.virtualYaw *= Math.pow(0.08, delta);

    this.state.pitch = Math.max(-1.5, Math.min(1.5, pitch));
    this.state.yaw = Math.max(-1.5, Math.min(1.5, yaw));
    this.state.roll = Math.max(-2.0, Math.min(2.0, roll));

    this.state.boost = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
  }

  consumeToggleCam() {
    const val = this.state.toggleCam;
    this.state.toggleCam = false;
    return val;
  }

  consumeToggleMute() {
    const val = this.state.toggleMute;
    this.state.toggleMute = false;
    return val;
  }

  consumeRestart() {
    const val = this.state.restart;
    this.state.restart = false;
    return val;
  }

  consumeFireMissile() {
    const val = this.state.fireMissile;
    this.state.fireMissile = false;
    return val;
  }
}
