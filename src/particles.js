import * as THREE from 'three';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

    this.cyanMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 2.2,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.magentaMat = new THREE.PointsMaterial({
      color: 0xff00aa,
      size: 2.6,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.yellowMat = new THREE.PointsMaterial({
      color: 0xffee00,
      size: 3.0,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
  }

  createExplosion(position, count = 45, isMajor = false) {
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);

    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const speed = (isMajor ? 40 : 25) + Math.random() * (isMajor ? 60 : 35);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      velocities.push(new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi)
      ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = (Math.random() > 0.5 ? this.yellowMat : this.magentaMat).clone();
    mat.size = isMajor ? 5.5 : 3.8;

    const points = new THREE.Points(geo, mat);
    explosionGroup.add(points);
    this.scene.add(explosionGroup);

    this.particles.push({
      group: explosionGroup,
      geo: geo,
      mat: mat,
      velocities: velocities,
      age: 0,
      lifespan: isMajor ? 1.4 : 0.85
    });
  }

  createLaserHit(position, normal) {
    const count = 14;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const vel = normal.clone()
        .multiplyScalar(15 + Math.random() * 20)
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ));
      velocities.push(vel);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = this.cyanMat.clone();
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      group: points,
      geo: geo,
      mat: mat,
      velocities: velocities,
      age: 0,
      lifespan: 0.35
    });
  }

  createRingSparkles(position) {
    const count = 30;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const speed = 20 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.5) * speed,
        Math.sin(angle) * speed
      ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = this.yellowMat.clone();
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      group: points,
      geo: geo,
      mat: mat,
      velocities: velocities,
      age: 0,
      lifespan: 0.75
    });
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;

      if (p.age >= p.lifespan) {
        this.scene.remove(p.group);
        p.geo.dispose();
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.age / p.lifespan;
      p.mat.opacity = 1 - progress;

      const posAttr = p.geo.attributes.position;
      for (let j = 0; j < p.velocities.length; j++) {
        const vel = p.velocities[j];
        posAttr.setXYZ(
          j,
          posAttr.getX(j) + vel.x * delta,
          posAttr.getY(j) + vel.y * delta,
          posAttr.getZ(j) + vel.z * delta
        );
        vel.multiplyScalar(Math.pow(0.92, delta * 60));
      }
      posAttr.needsUpdate = true;
    }
  }
}
