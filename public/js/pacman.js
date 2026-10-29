// Pac-Man Entity Class with Precise Tile Grid & Bounding Box Collision
const DIR_UP = { x: 0, y: -1, angle: 1.5 * Math.PI };
const DIR_DOWN = { x: 0, y: 1, angle: 0.5 * Math.PI };
const DIR_LEFT = { x: -1, y: 0, angle: Math.PI };
const DIR_RIGHT = { x: 1, y: 0, angle: 0 };

class PacMan {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 13 * TILE_SIZE; // Tile (13, 23)
    this.y = 23 * TILE_SIZE;
    this.speed = 2; // Pixels per frame (2 divides 16 evenly)
    this.dir = DIR_LEFT;
    this.nextDir = DIR_LEFT;
    this.mouthAngle = 0.2;
    this.mouthSpeed = 0.03;
    this.mouthMax = 0.35;
    this.mouthMin = 0.05;
    this.alive = true;
  }

  setNextDir(dir) {
    this.nextDir = dir;
  }

  // Check if a 16x16 bounding box at position (x, y) collides with any walls
  isValidPosition(x, y, map) {
    const padding = 1; // 1px inside boundary
    const corners = [
      { x: x + padding, y: y + padding },
      { x: x + TILE_SIZE - 1 - padding, y: y + padding },
      { x: x + padding, y: y + TILE_SIZE - 1 - padding },
      { x: x + TILE_SIZE - 1 - padding, y: y + TILE_SIZE - 1 - padding }
    ];

    for (const p of corners) {
      const col = Math.floor(p.x / TILE_SIZE);
      const row = Math.floor(p.y / TILE_SIZE);

      // Allow tunnel wrap
      if (col < 0 || col >= MAP_COLS) continue;
      if (row < 0 || row >= MAP_ROWS) return false;

      if (map.isWall(col, row) || map.isGhostHouseDoor(col, row)) {
        return false;
      }
    }
    return true;
  }

  update(map) {
    if (!this.alive) return;

    // 1. Try turning to buffered nextDir
    if (this.nextDir !== this.dir) {
      // Reversing direction (180 deg) is always allowed immediately
      if (this.dir.x === -this.nextDir.x && this.dir.y === -this.nextDir.y) {
        this.dir = this.nextDir;
      } else {
        // Perpendicular turn: check if aligned to corner intersection and path is open
        const cornerTolerance = 6;
        if (this.nextDir.y !== 0) {
          // Turning UP/DOWN: check alignment on X axis
          const snappedX = Math.round(this.x / TILE_SIZE) * TILE_SIZE;
          if (Math.abs(this.x - snappedX) <= cornerTolerance) {
            if (this.isValidPosition(snappedX, this.y + this.nextDir.y * this.speed, map)) {
              this.x = snappedX;
              this.dir = this.nextDir;
            }
          }
        } else if (this.nextDir.x !== 0) {
          // Turning LEFT/RIGHT: check alignment on Y axis
          const snappedY = Math.round(this.y / TILE_SIZE) * TILE_SIZE;
          if (Math.abs(this.y - snappedY) <= cornerTolerance) {
            if (this.isValidPosition(this.x + this.nextDir.x * this.speed, snappedY, map)) {
              this.y = snappedY;
              this.dir = this.nextDir;
            }
          }
        }
      }
    }

    // 2. Move in current direction if clear
    const nextX = this.x + this.dir.x * this.speed;
    const nextY = this.y + this.dir.y * this.speed;

    if (this.isValidPosition(nextX, nextY, map)) {
      this.x = nextX;
      this.y = nextY;

      // Tunnel wrapping
      if (this.x < -8) this.x = (MAP_COLS - 1) * TILE_SIZE;
      else if (this.x > (MAP_COLS - 0.5) * TILE_SIZE) this.x = -8;

      // Animate mouth
      this.mouthAngle += this.mouthSpeed;
      if (this.mouthAngle >= this.mouthMax || this.mouthAngle <= this.mouthMin) {
        this.mouthSpeed = -this.mouthSpeed;
      }
    } else {
      // Wall ahead: snap to nearest tile boundary to sit flush against wall without clipping
      if (this.dir.x !== 0) this.x = Math.round(this.x / TILE_SIZE) * TILE_SIZE;
      if (this.dir.y !== 0) this.y = Math.round(this.y / TILE_SIZE) * TILE_SIZE;
    }
  }

  getTile() {
    return {
      col: Math.floor((this.x + 8) / TILE_SIZE),
      row: Math.floor((this.y + 8) / TILE_SIZE)
    };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + 8, this.y + 8);

    const customImg = AssetManager.images.pacman;
    if (AssetManager.customAssets.pacman && customImg && customImg.complete && customImg.naturalWidth !== 0) {
      // Draw uploaded custom image, rotated to match direction
      ctx.rotate(this.dir.angle);
      ctx.drawImage(customImg, -10, -10, 20, 20);
    } else {
      // Draw classic mouth-animating yellow Pac-Man
      ctx.rotate(this.dir.angle);
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, 0, 10, this.mouthAngle * Math.PI, (2 - this.mouthAngle) * Math.PI);
      ctx.lineTo(0, 0);
      ctx.fill();
    }

    ctx.restore();
  }
}
