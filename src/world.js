import * as THREE from 'three';

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.asteroids = [];
    this.rings = [];
    this.spaceDust = null;
    this.spaceDustGeo = null;

    this.initSkybox();
    this.initSpaceDust();
    this.initAsteroidField();
    this.initSpeedRings();
  }

  initSkybox() {
    const starCount = 6000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 3500 + Math.random() * 4000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        starColors[i * 3] = 0.5; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.7) {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.2; starColors[i * 3 + 2] = 0.8;
      } else {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starPoints);

    const planetGeo = new THREE.SphereGeometry(600, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x1a2340,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x0a1024,
      emissiveIntensity: 0.6
    });
    this.planet = new THREE.Mesh(planetGeo, planetMat);
    this.planet.position.set(-2500, 1200, -4000);
    this.scene.add(this.planet);

    const ringGeo = new THREE.RingGeometry(800, 1400, 64);
    ringGeo.rotateX(Math.PI / 2.3);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const planetRing = new THREE.Mesh(ringGeo, ringMat);
    this.planet.add(planetRing);
  }

  initSpaceDust() {
    const count = 1500;
    this.spaceDustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.dustRadius = 400;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.dustRadius * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * this.dustRadius * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.dustRadius * 2;
    }

    this.spaceDustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 1.8,
      transparent: true,
      opacity: 0.6
    });

    this.spaceDust = new THREE.Points(this.spaceDustGeo, mat);
    this.scene.add(this.spaceDust);
  }

  initAsteroidField() {
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x242d3d,
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true
    });

    const asteroidCount = 130;
    const baseGeo = new THREE.DodecahedronGeometry(1, 1);

    for (let i = 0; i < asteroidCount; i++) {
      const geo = baseGeo.clone();
      const posAttr = geo.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        const vx = posAttr.getX(j);
        const vy = posAttr.getY(j);
        const vz = posAttr.getZ(j);
        const noise = 0.8 + Math.random() * 0.4;
        posAttr.setXYZ(j, vx * noise, vy * noise, vz * noise);
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, asteroidMat);
      const scale = 12 + Math.random() * 65;
      mesh.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);

      const angle = Math.random() * Math.PI * 2;
      const distance = 300 + Math.random() * 2200;
      const height = (Math.random() - 0.5) * 600;

      mesh.position.set(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );

      this.asteroids.push({
        mesh: mesh,
        radius: scale * 1.1,
        rotSpeed: rotSpeed
      });

      this.scene.add(mesh);
    }
  }

  initSpeedRings() {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      wireframe: false
    });

    const ringCount = 16;
    let currentPos = new THREE.Vector3(0, 0, -200);
    let currentDir = new THREE.Vector3(0, 0, -1);

    for (let i = 0; i < ringCount; i++) {
      const ringGroup = new THREE.Group();

      const torusGeo = new THREE.TorusGeometry(26, 1.4, 8, 24);
      const torusMesh = new THREE.Mesh(torusGeo, ringMat);
      ringGroup.add(torusMesh);

      const fieldGeo = new THREE.CircleGeometry(25, 16);
      const fieldMat = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
      ringGroup.add(fieldMesh);

      ringGroup.position.copy(currentPos);
      ringGroup.lookAt(currentPos.clone().add(currentDir));

      this.rings.push({
        group: ringGroup,
        radius: 26,
        passed: false,
        cooldown: 0
      });

      this.scene.add(ringGroup);

      const turnAngle = (Math.random() - 0.5) * 0.6;
      currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);
      currentDir.y += (Math.random() - 0.5) * 0.2;
      currentDir.normalize();

      currentPos.add(currentDir.clone().multiplyScalar(320));
    }
  }

  update(delta, playerPos, playerSpeed) {
    if (this.planet) this.planet.rotation.y += 0.02 * delta;
    if (this.starPoints) this.starPoints.rotation.y += 0.005 * delta;

    for (const ast of this.asteroids) {
      ast.mesh.rotation.x += ast.rotSpeed.x * delta;
      ast.mesh.rotation.y += ast.rotSpeed.y * delta;
      ast.mesh.rotation.z += ast.rotSpeed.z * delta;
    }

    const time = performance.now() * 0.003;
    for (const r of this.rings) {
      r.group.rotation.z += 0.8 * delta;
      if (r.cooldown > 0) {
        r.cooldown -= delta;
        if (r.cooldown <= 0) {
          r.passed = false;
          r.group.children[0].material.color.setHex(0x00ffaa);
        }
      } else {
        const pulse = 0.8 + Math.sin(time + r.group.position.x) * 0.2;
        r.group.scale.set(pulse, pulse, 1);
      }
    }

    if (this.spaceDust && this.spaceDustGeo) {
      const posAttr = this.spaceDustGeo.attributes.position;
      const halfR = this.dustRadius;

      for (let i = 0; i < posAttr.count; i++) {
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        if (x - playerPos.x > halfR) x -= halfR * 2;
        if (x - playerPos.x < -halfR) x += halfR * 2;
        if (y - playerPos.y > halfR) y -= halfR * 2;
        if (y - playerPos.y < -halfR) y += halfR * 2;
        if (z - playerPos.z > halfR) z -= halfR * 2;
        if (z - playerPos.z < -halfR) z += halfR * 2;

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }
  }

  checkRingPass(playerPos, onPassCallback) {
    for (const r of this.rings) {
      if (r.passed) continue;
      const dist = playerPos.distanceTo(r.group.position);
      if (dist < r.radius) {
        r.passed = true;
        r.cooldown = 8.0;
        r.group.children[0].material.color.setHex(0xffee00);
        onPassCallback(r.group.position);
      }
    }
  }

  checkAsteroidCollision(playerPos, playerRadius = 3.5) {
    for (const ast of this.asteroids) {
      const dist = playerPos.distanceTo(ast.mesh.position);
      if (dist < ast.radius + playerRadius) {
        return {
          collision: true,
          normal: playerPos.clone().sub(ast.mesh.position).normalize(),
          asteroid: ast
        };
      }
    }
    return { collision: false };
  }
}
