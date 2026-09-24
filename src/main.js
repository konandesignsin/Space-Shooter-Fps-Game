import * as THREE from 'three';
import { GameRenderer } from './renderer.js';
import { FlightControls } from './controls.js';
import { PlayerShip } from './ship.js';
import { WorldManager } from './world.js';
import { EnemyManager } from './enemies.js';
import { WeaponSystem } from './weapons.js';
import { ParticleManager } from './particles.js';
import { AudioManager } from './audio.js';
import { HUDManager } from './hud.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.startOverlay = document.getElementById('start-overlay');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.btnStart = document.getElementById('btn-start');
    this.btnRestart = document.getElementById('btn-restart');

    this.gameState = 'START';
    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.kills = 0;
    this.ringsPassed = 0;

    this.clock = new THREE.Clock();

    this.renderer = new GameRenderer(this.canvas);
    this.controls = new FlightControls(this.canvas);
    this.particles = new ParticleManager(this.renderer.scene);
    this.audio = new AudioManager();
    this.hud = new HUDManager();

    this.ship = new PlayerShip(this.renderer.scene);
    this.world = new WorldManager(this.renderer.scene);
    this.weapons = new WeaponSystem(this.renderer.scene, this.audio, this.particles);
    this.enemies = new EnemyManager(this.renderer.scene, this.audio, this.particles);

    this.setupEvents();
    this.animate();
  }

  setupEvents() {
    this.btnStart.addEventListener('click', () => this.startGame());
    this.btnRestart.addEventListener('click', () => this.restartGame());

    this.canvas.addEventListener('click', () => {
      if (this.gameState === 'PLAYING') {
        if (!document.pointerLockElement) {
          this.canvas.requestPointerLock?.();
        }
      }
    });
  }

  startGame() {
    this.gameState = 'PLAYING';
    this.startOverlay.classList.add('hidden');
    this.hud.show();
    this.audio.init();
    this.canvas.requestPointerLock?.();
  }

  restartGame() {
    this.gameState = 'PLAYING';
    this.gameOverOverlay.classList.add('hidden');
    this.hud.show();

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.kills = 0;
    this.ringsPassed = 0;

    this.ship.reset();
    this.weapons.reset();
    this.enemies.reset();
    this.canvas.requestPointerLock?.();
  }

  gameOver() {
    this.gameState = 'GAMEOVER';
    this.hud.hide();
    document.exitPointerLock?.();

    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-kills').textContent = this.kills;
    document.getElementById('final-rings').textContent = this.ringsPassed;
    this.gameOverOverlay.classList.remove('hidden');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.gameState === 'PLAYING') {
      this.updateGame(delta);
    } else if (this.gameState === 'START') {
      const t = performance.now() * 0.0004;
      this.renderer.camera.position.set(Math.sin(t) * 22, 6, Math.cos(t) * 22);
      this.renderer.camera.lookAt(0, 0, 0);
    }

    this.renderer.render();
  }

  updateGame(delta) {
    this.controls.update(delta);

    if (this.controls.consumeToggleCam()) {
      this.ship.toggleCamera();
    }

    if (this.controls.consumeToggleMute()) {
      const isMuted = this.audio.toggleMute();
      this.hud.showAlert(isMuted ? 'AUDIO MUTED' : 'AUDIO UNMUTED', 'boost');
    }

    if (this.controls.consumeRestart()) {
      this.restartGame();
      return;
    }

    this.ship.update(delta, this.controls.state);
    this.ship.updateCamera(this.renderer.camera, delta);

    const throttleNorm = (this.ship.currentSpeed - 70) / (this.ship.boostSpeed - 70);
    this.audio.updateEngine(throttleNorm, this.ship.isBoosting);

    const lockedTarget = this.enemies.getClosestEnemyAhead(
      this.ship.mesh.position,
      this.ship.getForward()
    );

    if (this.controls.state.fireLaser) {
      this.weapons.firePlayerLaser(this.ship);
    }

    if (this.controls.consumeFireMissile()) {
      this.weapons.fireMissile(this.ship, lockedTarget);
    }

    this.weapons.update(
      delta,
      this.ship,
      this.enemies.enemies,
      this.world.asteroids,
      (enemy, dmg, hitPos) => {
        const destroyed = this.enemies.damageEnemy(enemy, dmg, hitPos);
        if (destroyed) {
          this.kills++;
          const pts = Math.round(1000 * this.combo);
          this.score += pts;
          this.combo = Math.min(5.0, this.combo + 0.3);
          this.comboTimer = 6.0;
          this.hud.showAlert(`TARGET DESTROYED +${pts}!`, 'kill');
        }
      },
      (dmg) => {
        const isDead = this.ship.takeDamage(dmg);
        this.hud.showAlert('SHIELD COMPROMISED -' + dmg, 'hit');
        if (isDead) {
          this.audio.playExplosion(true);
          this.particles.createExplosion(this.ship.mesh.position, 90, true);
          this.gameOver();
        }
      }
    );

    this.enemies.update(delta, this.ship.mesh.position, this.weapons);
    this.world.update(delta, this.ship.mesh.position, this.ship.currentSpeed);

    this.world.checkRingPass(this.ship.mesh.position, (ringPos) => {
      this.ringsPassed++;
      this.ship.addBoost(25);
      this.audio.playRingChime();
      this.particles.createRingSparkles(ringPos);

      const pts = Math.round(500 * this.combo);
      this.score += pts;
      this.combo = Math.min(5.0, this.combo + 0.5);
      this.comboTimer = 6.0;
      this.hud.showAlert(`HYPER-RING BOOST +${pts}!`, 'boost');
    });

    const astCollision = this.world.checkAsteroidCollision(this.ship.mesh.position);
    if (astCollision.collision) {
      this.ship.mesh.position.addScaledVector(astCollision.normal, 8);
      const dead = this.ship.takeDamage(35);
      this.audio.playExplosion(false);
      this.particles.createExplosion(this.ship.mesh.position, 30, false);
      this.hud.showAlert('HULL COLLISION DETECTED!', 'hit');
      if (dead) {
        this.gameOver();
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1.0;
      }
    }

    this.particles.update(delta);

    this.hud.update(
      this.ship,
      this.weapons,
      this.enemies.enemies,
      this.world.rings,
      this.world.asteroids,
      this.renderer.camera,
      this.score,
      this.combo,
      lockedTarget
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
