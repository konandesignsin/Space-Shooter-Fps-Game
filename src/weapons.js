import * as THREE from 'three';

export class WeaponSystem {
  constructor(scene, audio, particles) {
    this.scene = scene;
    this.audio = audio;
    this.particles = particles;

    this.playerLasers = [];
    this.enemyLasers = [];
    this.missiles = [];

    this.fireRate = 0.11;
    this.lastFireTime = 0;
    this.alternateWing = false;

    this.maxMissiles = 4;
    this.missileAmmo = 4;
    this.missileReloadTimer = 0;
    this.missileReloadTime = 9.0;
    this.missileCooldown = 0.8;
    this.lastMissileTime = 0;

    this.laserGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.0, 6);
    this.laserGeo.rotateX(Math.PI / 2);

    this.playerLaserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.enemyLaserMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });

    this.missileGeo = new THREE.ConeGeometry(0.35, 2.2, 6);
    this.missileGeo.rotateX(-Math.PI / 2);
    this.missileMat = new THREE.MeshStandardMaterial({
      color: 0x2b384e,
      roughness: 0.3,
      metalness: 0.8
    });

    this.missileThrusterMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
  }

  firePlayerLaser(ship) {
    const now = performance.now() / 1000;
    if (now - this.lastFireTime < this.fireRate) return false;
    this.lastFireTime = now;

    const cannons = ship.getCannonWorldPositions();
    const spawnPos = this.alternateWing ? cannons.right : cannons.left;
    this.audio.playLaser(this.alternateWing);
    this.alternateWing = !this.alternateWing;

    const mesh = new THREE.Mesh(this.laserGeo, this.playerLaserMat);
    mesh.position.copy(spawnPos);
    mesh.quaternion.copy(ship.mesh.quaternion);

    const dir = ship.getForward();
    const speed = 720;
    const velocity = dir.clone().multiplyScalar(speed);

    this.playerLasers.push({
      mesh: mesh,
      velocity: velocity,
      dir: dir,
      age: 0,
      lifespan: 1.8,
      damage: 35
    });

    this.scene.add(mesh);
    return true;
  }

  fireEnemyLaser(enemyPos, targetPos) {
    const dir = targetPos.clone().sub(enemyPos).normalize();

    const mesh = new THREE.Mesh(this.laserGeo, this.enemyLaserMat);
    mesh.position.copy(enemyPos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);

    const speed = 400;
    const velocity = dir.clone().multiplyScalar(speed);

    this.enemyLasers.push({
      mesh: mesh,
      velocity: velocity,
      dir: dir,
      age: 0,
      lifespan: 2.5,
      damage: 15
    });

    this.scene.add(mesh);
  }

  fireMissile(ship, target) {
    const now = performance.now() / 1000;
    if (this.missileAmmo <= 0 || now - this.lastMissileTime < this.missileCooldown) return false;

    this.missileAmmo--;
    this.lastMissileTime = now;
    this.audio.playMissileLaunch();

    const group = new THREE.Group();
    const body = new THREE.Mesh(this.missileGeo, this.missileMat);
    group.add(body);

    const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), this.missileThrusterMat);
    thruster.position.set(0, 0, 1.2);
    group.add(thruster);

    const spawnPos = new THREE.Vector3(0, -1.2, -1.5).applyQuaternion(ship.mesh.quaternion).add(ship.mesh.position);
    group.position.copy(spawnPos);
    group.quaternion.copy(ship.mesh.quaternion);

    const forward = ship.getForward();
    const initialVel = forward.multiplyScalar(ship.currentSpeed + 50);

    this.missiles.push({
      group: group,
      velocity: initialVel,
      target: target,
      speed: 380,
      turnRate: 3.5,
      age: 0,
      lifespan: 4.5,
      damage: 120
    });

    this.scene.add(group);
    return true;
  }

  update(delta, ship, enemies, asteroids, onEnemyHit, onPlayerHit) {
    if (this.missileAmmo < this.maxMissiles) {
      this.missileReloadTimer += delta;
      if (this.missileReloadTimer >= this.missileReloadTime) {
        this.missileAmmo++;
        this.missileReloadTimer = 0;
      }
    }

    for (let i = this.playerLasers.length - 1; i >= 0; i--) {
      const laser = this.playerLasers[i];
      laser.age += delta;
      laser.mesh.position.addScaledVector(laser.velocity, delta);

      let hit = false;
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        const dist = laser.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < enemy.radius + 1.2) {
          hit = true;
          this.particles.createLaserHit(laser.mesh.position, laser.dir.clone().negate());
          onEnemyHit(enemy, laser.damage, laser.mesh.position);
          break;
        }
      }

      if (!hit) {
        for (const ast of asteroids) {
          const dist = laser.mesh.position.distanceTo(ast.mesh.position);
          if (dist < ast.radius) {
            hit = true;
            this.particles.createLaserHit(laser.mesh.position, laser.dir.clone().negate());
            break;
          }
        }
      }

      if (hit || laser.age >= laser.lifespan) {
        this.scene.remove(laser.mesh);
        this.playerLasers.splice(i, 1);
      }
    }

    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const laser = this.enemyLasers[i];
      laser.age += delta;
      laser.mesh.position.addScaledVector(laser.velocity, delta);

      const dist = laser.mesh.position.distanceTo(ship.mesh.position);
      if (dist < 4.0) {
        this.particles.createLaserHit(laser.mesh.position, laser.dir.clone().negate());
        this.audio.playHitDamage();
        onPlayerHit(laser.damage);
        this.scene.remove(laser.mesh);
        this.enemyLasers.splice(i, 1);
        continue;
      }

      if (laser.age >= laser.lifespan) {
        this.scene.remove(laser.mesh);
        this.enemyLasers.splice(i, 1);
      }
    }

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.age += delta;

      if (m.target && !m.target.isDead) {
        const toTarget = m.target.mesh.position.clone().sub(m.group.position).normalize();
        const currentDir = new THREE.Vector3(0, 0, -1).applyQuaternion(m.group.quaternion);
        const newDir = currentDir.lerp(toTarget, m.turnRate * delta).normalize();
        m.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), newDir);
        m.velocity.copy(newDir).multiplyScalar(m.speed);
      }

      m.group.position.addScaledVector(m.velocity, delta);

      let detonated = false;
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        const dist = m.group.position.distanceTo(enemy.mesh.position);
        if (dist < enemy.radius + 3.0) {
          detonated = true;
          this.audio.playExplosion(true);
          this.particles.createExplosion(m.group.position, 60, true);
          onEnemyHit(enemy, m.damage, m.group.position);
          break;
        }
      }

      if (!detonated) {
        for (const ast of asteroids) {
          const dist = m.group.position.distanceTo(ast.mesh.position);
          if (dist < ast.radius + 2.0) {
            detonated = true;
            this.audio.playExplosion(false);
            this.particles.createExplosion(m.group.position, 40, false);
            break;
          }
        }
      }

      if (detonated || m.age >= m.lifespan) {
        this.scene.remove(m.group);
        this.missiles.splice(i, 1);
      }
    }
  }

  reset() {
    for (const l of this.playerLasers) this.scene.remove(l.mesh);
    for (const l of this.enemyLasers) this.scene.remove(l.mesh);
    for (const m of this.missiles) this.scene.remove(m.group);
    this.playerLasers = [];
    this.enemyLasers = [];
    this.missiles = [];
    this.missileAmmo = this.maxMissiles;
    this.missileReloadTimer = 0;
  }
}
