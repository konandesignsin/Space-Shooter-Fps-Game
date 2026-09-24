export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    this.musicPlaying = true;
    this.musicTimer = null;
    this.currentStep = 0;
    this.bpm = 118;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngineSound();
      this.startMusic();
      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(160, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  updateEngine(throttleNorm, isBoosting) {
    if (!this.ctx || !this.engineOsc) return;

    const baseFreq = 55;
    const targetFreq = isBoosting ? 140 : baseFreq + throttleNorm * 45;
    const targetFilter = isBoosting ? 380 : 120 + throttleNorm * 120;
    const targetGain = isBoosting ? 0.16 : 0.06 + throttleNorm * 0.05;

    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, t, 0.1);
    this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : targetGain, t, 0.1);
  }

  playLaser(isRightWing = false) {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    if (pan) {
      pan.pan.setValueAtTime(isRightWing ? 0.25 : -0.25, t);
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playMissileLaunch() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.4);
  }

  playExplosion(isMajor = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = isMajor ? 1.2 : 0.6;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isMajor ? 400 : 600, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isMajor ? 0.4 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isMajor ? 110 : 80, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + duration * 0.5);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(isMajor ? 0.35 : 0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + duration);
    osc.start(t);
    osc.stop(t + duration * 0.5);
  }

  playRingChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.12, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.55);
    });
  }

  playHitDamage() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  startMusic() {
    if (!this.ctx) return;

    const scale = [73.42, 87.31, 98.00, 110.00, 130.81, 146.83];
    const bassPattern = [
      scale[0], scale[0], scale[0], scale[2],
      scale[1], scale[1], scale[3], scale[0],
      scale[4], scale[4], scale[3], scale[2],
      scale[1], scale[0], scale[2], scale[3]
    ];

    const stepInterval = (60 / this.bpm) / 4;

    const scheduleNext = () => {
      if (!this.musicPlaying || this.isMuted) {
        this.musicTimer = setTimeout(scheduleNext, stepInterval * 1000);
        return;
      }

      const t = this.ctx.currentTime;
      const noteFreq = bassPattern[this.currentStep % bassPattern.length];

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + stepInterval * 1.5);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepInterval * 1.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + stepInterval * 2);

      if (this.currentStep % 8 === 4) {
        this.playCyberSnare(t);
      }

      this.currentStep = (this.currentStep + 1) % 16;
      this.musicTimer = setTimeout(scheduleNext, stepInterval * 1000);
    };

    scheduleNext();
  }

  playCyberSnare(t) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
