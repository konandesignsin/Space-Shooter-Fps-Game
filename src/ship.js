import * as THREE from 'three';

export class PlayerShip {
  constructor(scene) {
    this.scene = scene;

    // Physical state
    this.mesh = new THREE.Group();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.maxSpeed = 160;
    this.boostSpeed = 340;
    this.currentSpeed = 70;
    this.acceleration = 60;
    this.damping = 0.98;

    // Rotation / Orientation
    this.pitchSpeed = 1.4;
    this.yawSpeed = 1.2;
    this.rollSpeed = 1.8;
    this.currentRoll = 0;
    this.targetRoll = 0;

    // Status
    this.maxHull = 100;
    this.hull = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRechargeRate = 12;
    this.lastDamageTime = 0;

    // Boost Capacitor
    this.maxBoost = 100;
    this.boostEnergy = 100;
    this.boostDrainRate = 35;
    this.boostRechargeRate = 22;
    this.isBoosting = false;

    // Camera settings
    this.cameraMode = 'chase';
    this.cameraOffset = new THREE.Vector3(0, 3.8, 12.5);
    this.cockpitOffset = new THREE.Vector3(0, 0.8, -0.2);

    this.createShipModel();
    this.scene.add(this.mesh);

    this.mesh.position.set(0, 0, 0);
  }

  createShipModel() {
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x223048,
      metalness: 0.9,
      roughness: 0.2
    });

    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00eeff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.65
    });

    // 1. Fuselage
    const bodyGeo = new THREE.ConeGeometry(1.4, 7.5, 5);
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, hullMat);
    bodyMesh.scale.set(1, 0.65, 1);
    this.mesh.add(bodyMesh);

    // 2. Cockpit Canopy
    const canopyGeo = new THREE.ConeGeometry(0.7, 3.2, 4);
    canopyGeo.rotateX(-Math.PI / 2);
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.position.set(0, 0.65, -0.6);
    this.mesh.add(canopyMesh);

    // 3. Swept Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(6.5, -2.5);
    wingShape.lineTo(5.8, -4.5);
    wingShape.lineTo(0, -3.2);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.18, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.06, bevelThickness: 0.06 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(-Math.PI / 2);

    const rightWing = new THREE.Mesh(wingGeo, armorMat);
    rightWing.position.set(0.6, -0.1, 1.2);
    this.mesh.add(rightWing);

    const leftWingGeo = wingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, armorMat);
    leftWing.position.set(-0.6, -0.1, 1.2);
    this.mesh.add(leftWing);

    // Wing Neon Strips
    const wingStripGeo = new THREE.BoxGeometry(0.12, 0.1, 4.2);
    const rightStrip = new THREE.Mesh(wingStripGeo, neonCyanMat);
    rightStrip.position.set(5.5, 0.05, -0.5);
    rightStrip.rotation.y = 0.35;
    this.mesh.add(rightStrip);

    const leftStrip = new THREE.Mesh(wingStripGeo, neonCyanMat);
    leftStrip.position.set(-5.5, 0.05, -0.5);
    leftStrip.rotation.y = -0.35;
    this.mesh.add(leftStrip);

    // 4. Twin Cannons
    const cannonGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.5, 8);
    cannonGeo.rotateX(-Math.PI / 2);

    this.leftCannon = new THREE.Mesh(cannonGeo, armorMat);
    this.leftCannon.position.set(-5.8, -0.05, -1.8);
    this.mesh.add(this.leftCannon);

    this.rightCannon = new THREE.Mesh(cannonGeo, armorMat);
    this.rightCannon.position.set(5.8, -0.05, -1.8);
    this.mesh.add(this.rightCannon);

    // Muzzle tips
    const muzzleGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const leftMuzzle = new THREE.Mesh(muzzleGeo, neonCyanMat);
    leftMuzzle.position.set(-5.8, -0.05, -3.1);
    this.mesh.add(leftMuzzle);

    const rightMuzzle = new THREE.Mesh(muzzleGeo, neonCyanMat);
    rightMuzzle.position.set(5.8, -0.05, -3.1);
    this.mesh.add(rightMuzzle);

    // 5. Twin Engines & Thruster Plumes
    const engineGeo = new THREE.CylinderGeometry(0.42, 0.55, 1.6, 8);
    engineGeo.rotateX(-Math.PI / 2);

    const leftEngine = new THREE.Mesh(engineGeo, armorMat);
    leftEngine.position.set(-0.9, 0, 3.2);
    this.mesh.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeo, armorMat);
    rightEngine.position.set(0.9, 0, 3.2);
    this.mesh.add(rightEngine);

    const plumeGeo = new THREE.ConeGeometry(0.38, 2.6, 8);
    plumeGeo.rotateX(Math.PI / 2);

    this.leftPlume = new THREE.Mesh(plumeGeo, neonMagentaMat);
    this.leftPlume.position.set(-0.9, 0, 4.4);
    this.mesh.add(this.leftPlume);

    this.rightPlume = new THREE.Mesh(plumeGeo, neonMagentaMat);
    this.rightPlume.position.set(0.9, 0, 4.4);
    this.mesh.add(this.rightPlume);

    this.thrusterLight = new THREE.PointLight(0xff00aa, 3, 20);
    this.thrusterLight.position.set(0, 0, 4.2);
    this.mesh.add(this.thrusterLight);
  }

  update(delta, input) {
    if (input.boost && this.boostEnergy > 0) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - this.boostDrainRate * delta);
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(this.maxBoost, this.boostEnergy + this.boostRechargeRate * delta);
    }

    const targetSpeed = this.isBoosting ? this.boostSpeed : (input.throttle ? this.maxSpeed : 85);
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, 3.5 * delta);

    const pitchDelta = input.pitch * this.pitchSpeed * delta;
    const yawDelta = input.yaw * this.yawSpeed * delta;
    const rollDelta = input.roll * this.rollSpeed * delta;

    this.mesh.rotateX(pitchDelta);
    this.mesh.rotateY(yawDelta);
    this.mesh.rotateZ(rollDelta);

    const targetBank = -input.yaw * 0.45;
    this.targetRoll = THREE.MathUtils.lerp(this.targetRoll, targetBank, 6.0 * delta);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    this.velocity.copy(forward).multiplyScalar(this.currentSpeed * delta);
    this.mesh.position.add(this.velocity);

    const plumeScale = this.isBoosting ? 2.2 + Math.random() * 0.4 : 1.0 + Math.random() * 0.15;
    this.leftPlume.scale.set(1, 1, plumeScale);
    this.rightPlume.scale.set(1, 1, plumeScale);
    this.thrusterLight.intensity = this.isBoosting ? 6 + Math.random() * 2 : 2.5;

    const now = performance.now();
    if (now - this.lastDamageTime > 3500 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRechargeRate * delta);
    }
  }

  takeDamage(amount) {
    this.lastDamageTime = performance.now();
    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield < 0) {
        this.hull += this.shield;
        this.shield = 0;
      }
    } else {
      this.hull -= amount;
    }
    this.hull = Math.max(0, this.hull);
    return this.hull <= 0;
  }

  addBoost(amount) {
    this.boostEnergy = Math.min(this.maxBoost, this.boostEnergy + amount);
    this.currentSpeed = this.boostSpeed * 1.2;
  }

  updateCamera(camera, delta) {
    if (this.cameraMode === 'cockpit') {
      const camPos = this.cockpitOffset.clone().applyQuaternion(this.mesh.quaternion).add(this.mesh.position);
      camera.position.copy(camPos);
      camera.quaternion.copy(this.mesh.quaternion);
    } else {
      const idealOffset = this.cameraOffset.clone().applyQuaternion(this.mesh.quaternion).add(this.mesh.position);
      const speedFactor = (this.currentSpeed - 70) / (this.boostSpeed - 70);
      const extraPull = new THREE.Vector3(0, 0.5 * speedFactor, 3.5 * speedFactor).applyQuaternion(this.mesh.quaternion);
      idealOffset.add(extraPull);

      camera.position.lerp(idealOffset, 12 * delta);

      const lookTarget = new THREE.Vector3(0, 1.2, -30).applyQuaternion(this.mesh.quaternion).add(this.mesh.position);
      camera.lookAt(lookTarget);

      const targetFov = this.isBoosting ? 82 : 65;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * delta);
      camera.updateProjectionMatrix();
    }
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === 'chase' ? 'cockpit' : 'chase';
    return this.cameraMode;
  }

  getForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
  }

  getCannonWorldPositions() {
    const leftWorld = new THREE.Vector3();
    const rightWorld = new THREE.Vector3();
    this.leftCannon.getWorldPosition(leftWorld);
    this.rightCannon.getWorldPosition(rightWorld);
    return { left: leftWorld, right: rightWorld };
  }

  reset() {
    this.mesh.position.set(0, 0, 0);
    this.mesh.quaternion.identity();
    this.velocity.set(0, 0, 0);
    this.hull = this.maxHull;
    this.shield = this.maxShield;
    this.boostEnergy = this.maxBoost;
    this.currentSpeed = 70;
  }
}
