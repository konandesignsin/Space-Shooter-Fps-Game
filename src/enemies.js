import * as THREE from 'three';

export class EnemyManager {
  constructor(scene, audio, particles) {
    this.scene = scene;
    this.audio = audio;
    this.particles = particles;

    this.enemies = [];
    this.maxEnemies = 7;
    this.spawnTimer = 0;
    this.spawnInterval = 5.0;

    this.droneMat = new THREE.MeshStandardMaterial({
      color: 0x221111,
      roughness: 0.35,
      metalness: 0.85,
      flatShading: true
    });

    this.redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });

    this.initSquadron();
  }

  createDroneMesh() {
    const group = new THREE.Group();

    const hullGeo = new THREE.OctahedronGeometry(2.4, 0);
    hullGeo.scale(1, 0.45, 2.2);
    const hull = new THREE.Mesh(hullGeo, this.droneMat);
    group.add(hull);

    const eyeGeo = new THREE.BoxGeometry(1.2, 0.3, 0.4);
    const eye = new THREE.Mesh(eyeGeo, this.redGlowMat);
    eye.position.set(0, 0.2, -2.0);
    group.add(eye);

    const bladeGeo = new THREE.BoxGeometry(4.2, 0.15, 1.2);
    const wings = new THREE.Mesh(bladeGeo, this.droneMat);
    wings.position.set(0, 0, 0.2);
    wings.rotation.y = 0.2;
    group.add(wings);

    const tipGeo = new THREE.BoxGeometry(0.3, 0.3, 1.6);
    const rightTip = new THREE.Mesh(tipGeo, this.redGlowMat);
    rightTip.position.set(2.1, 0, 0.2);
    group.add(rightTip);

    const leftTip = new THREE.Mesh(tipGeo, this.redGlowMat);
    leftTip.position.set(-2.1, 0, 0.2);
    group.add(leftTip);

    const thrusterGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.2, 6);
    thrusterGeo.rotateX(Math.PI / 2);
    const thruster = new THREE.Mesh(thrusterGeo, this.redGlowMat);
    thruster.position.set(0, 0, 2.2);
    group.add(thruster);

    return group;
  }

  spawnDrone(spawnPos = null) {
    const mesh = this.createDroneMesh();

    if (spawnPos) {
      mesh.position.copy(spawnPos);
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = 400 + Math.random() * 500;
      const height = (Math.random() - 0.5) * 200;
      mesh.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      );
    }

    const enemy = {
      mesh: mesh,
      radius: 3.5,
      health: 80,
      maxHealth: 80,
      speed: 75 + Math.random() * 30,
      isDead: false,
      state: 'patrol',
      fireCooldown: 1.5 + Math.random() * 1.5,
      patrolTimer: Math.random() * 10,
      patrolCenter: mesh.position.clone()
    };

    this.enemies.push(enemy);
    this.scene.add(mesh);
  }

  initSquadron() {
    for (let i = 0; i < 5; i++) {
      this.spawnDrone();
    }
  }

  update(delta, playerPos, weapons) {
    this.spawnTimer += delta;
    if (this.enemies.length < this.maxEnemies && this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnDrone();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDead) continue;

      const distToPlayer = enemy.mesh.position.distanceTo(playerPos);
      const toPlayer = playerPos.clone().sub(enemy.mesh.position).normalize();

      if (distToPlayer < 700) {
        enemy.state = 'chase';
      } else {
        enemy.state = 'patrol';
      }

      if (enemy.state === 'chase') {
        const currentForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.mesh.quaternion);
        const newForward = currentForward.lerp(toPlayer, 2.8 * delta).normalize();
        enemy.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), newForward);

        let moveDir = newForward;
        if (distToPlayer < 60) {
          moveDir = newForward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3);
        }
        enemy.mesh.position.addScaledVector(moveDir, enemy.speed * delta);

        enemy.fireCooldown -= delta;
        const aimDot = currentForward.dot(toPlayer);
        if (aimDot > 0.85 && distToPlayer < 500 && enemy.fireCooldown <= 0) {
          weapons.fireEnemyLaser(enemy.mesh.position, playerPos);
          enemy.fireCooldown = 1.4 + Math.random() * 1.2;
        }
      } else {
        enemy.patrolTimer += delta * 0.4;
        const targetX = enemy.patrolCenter.x + Math.cos(enemy.patrolTimer) * 120;
        const targetZ = enemy.patrolCenter.z + Math.sin(enemy.patrolTimer) * 120;
        const targetPos = new THREE.Vector3(targetX, enemy.patrolCenter.y, targetZ);

        const dir = targetPos.clone().sub(enemy.mesh.position).normalize();
        enemy.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
        enemy.mesh.position.addScaledVector(dir, (enemy.speed * 0.6) * delta);
      }
    }
  }

  damageEnemy(enemy, amount, hitPos) {
    enemy.health -= amount;
    if (enemy.health <= 0 && !enemy.isDead) {
      enemy.isDead = true;
      this.audio.playExplosion(true);
      this.particles.createExplosion(enemy.mesh.position, 65, true);

      this.scene.remove(enemy.mesh);
      const index = this.enemies.indexOf(enemy);
      if (index !== -1) {
        this.enemies.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  getClosestEnemyAhead(playerPos, playerForward, maxAngle = Math.PI / 4) {
    let closest = null;
    let minDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const toEnemy = enemy.mesh.position.clone().sub(playerPos);
      const dist = toEnemy.length();
      toEnemy.normalize();

      const angle = playerForward.angleTo(toEnemy);
      if (angle < maxAngle && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  reset() {
    for (const e of this.enemies) {
      this.scene.remove(e.mesh);
    }
    this.enemies = [];
    this.initSquadron();
  }
}
