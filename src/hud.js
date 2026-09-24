export class HUDManager {
  constructor() {
    this.hudElement = document.getElementById('hud');
    this.hullBar = document.getElementById('hull-bar');
    this.hullText = document.getElementById('hull-text');
    this.shieldBar = document.getElementById('shield-bar');
    this.shieldText = document.getElementById('shield-text');
    this.speedVal = document.getElementById('speed-val');
    this.boostBar = document.getElementById('boost-bar');
    this.scoreVal = document.getElementById('score-val');
    this.comboMultiplier = document.getElementById('combo-multiplier');
    this.lockBracket = document.getElementById('target-lock-bracket');
    this.lockDistText = document.getElementById('lock-dist-text');
    this.missileCount = document.getElementById('missile-count');
    this.viewModeText = document.getElementById('view-mode-text');
    this.alertsContainer = document.getElementById('combat-alerts');

    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');
    this.radarRadius = 78;
    this.radarRange = 850;
  }

  show() {
    this.hudElement.classList.remove('hud-hidden');
  }

  hide() {
    this.hudElement.classList.add('hud-hidden');
  }

  update(ship, weapons, enemies, rings, asteroids, camera, score, combo, lockedTarget) {
    const hullPct = Math.max(0, Math.round((ship.hull / ship.maxHull) * 100));
    this.hullBar.style.width = `${hullPct}%`;
    this.hullText.textContent = hullPct;

    const shieldPct = Math.max(0, Math.round((ship.shield / ship.maxShield) * 100));
    this.shieldBar.style.width = `${shieldPct}%`;
    this.shieldText.textContent = shieldPct;

    this.speedVal.textContent = Math.round(ship.currentSpeed * 2.2);
    const boostPct = Math.max(0, Math.round((ship.boostEnergy / ship.maxBoost) * 100));
    this.boostBar.style.width = `${boostPct}%`;

    this.scoreVal.textContent = score.toString().padStart(5, '0');
    this.comboMultiplier.textContent = `x${combo.toFixed(1)}`;

    this.missileCount.textContent = weapons.missileAmmo;
    this.viewModeText.textContent = ship.cameraMode === 'chase' ? '3RD-PERSON CHASE' : '1ST-PERSON COCKPIT';

    if (lockedTarget && !lockedTarget.isDead) {
      const screenPos = lockedTarget.mesh.position.clone().project(camera);
      if (screenPos.z < 1) {
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        this.lockBracket.style.left = `${x}px`;
        this.lockBracket.style.top = `${y}px`;
        this.lockBracket.classList.remove('hidden');

        const dist = Math.round(ship.mesh.position.distanceTo(lockedTarget.mesh.position));
        this.lockDistText.textContent = dist;
      } else {
        this.lockBracket.classList.add('hidden');
      }
    } else {
      this.lockBracket.classList.add('hidden');
    }

    this.drawRadar(ship, enemies, rings);
  }

  drawRadar(ship, enemies, rings) {
    const ctx = this.radarCtx;
    const cx = 80;
    const cy = 80;
    const r = this.radarRadius;

    ctx.clearRect(0, 0, 160, 160);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, 150);
    ctx.moveTo(10, cy);
    ctx.lineTo(150, cy);
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();

    const playerPos = ship.mesh.position;
    const forward = ship.getForward();
    const forwardAngle = Math.atan2(forward.x, -forward.z);

    const toRadarCoords = (worldPos) => {
      const dx = worldPos.x - playerPos.x;
      const dz = worldPos.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > this.radarRange) return null;

      const angle = Math.atan2(dx, -dz) - forwardAngle;
      const radarDist = (dist / this.radarRange) * (r * 0.92);

      return {
        x: cx + Math.sin(angle) * radarDist,
        y: cy - Math.cos(angle) * radarDist
      };
    };

    ctx.fillStyle = '#00ffaa';
    for (const ring of rings) {
      if (ring.passed) continue;
      const coords = toRadarCoords(ring.group.position);
      if (coords) {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#ff3344';
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const coords = toRadarCoords(enemy.mesh.position);
      if (coords) {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  showAlert(text, type = 'boost') {
    const alert = document.createElement('div');
    alert.className = `alert-msg alert-${type}`;
    alert.textContent = text;
    this.alertsContainer.appendChild(alert);

    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 1800);
  }
}
