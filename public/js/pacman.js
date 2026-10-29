// Pac-Man Entity Class
const DIR_UP = { x: 0, y: -1, angle: 1.5 * Math.PI };
const DIR_DOWN = { x: 0, y: 1, angle: 0.5 * Math.PI };
const DIR_LEFT = { x: -1, y: 0, angle: Math.PI };
const DIR_RIGHT = { x: 1, y: 0, angle: 0 };

class PacMan {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 13.5 * TILE_SIZE; // Tile (13, 23) spawn
    this.y = 23 * TILE_SIZE;
    this.speed = 2; // Pixels per frame
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

  canMove(dir, map) {
    const nextX = this.x + dir.x * this.speed;
    const nextY = this.y + dir.y * this.speed;

    // Center check
    const col = Math.floor((nextX + 8) / TILE_SIZE);
    const row = Math.floor((nextY + 8) / TILE_SIZE);

    // Tunnel wrap check
    if (col < 0 || col >= MAP_COLS) return true;

    // Corner alignment check
    if (dir.x !== 0 && Math.abs((this.y) % TILE_SIZE) > 4) return false;
    if (dir.y !== 0 && Math.abs((this.x) % TILE_SIZE) > 4) return false;

    return !map.isWall(col, row) && !map.isGhostHouseDoor(col, row);
  }

  update(map) {
    if (!this.alive) return;

    // Try changing to requested next direction if possible
    if (this.nextDir !== this.dir && this.canMove(this.nextDir, map)) {
      // Align to tile grid when turning
      if (this.nextDir.x !== 0) this.y = Math.round(this.y / TILE_SIZE) * TILE_SIZE;
      if (this.nextDir.y !== 0) this.x = Math.round(this.x / TILE_SIZE) * TILE_SIZE;
      this.dir = this.nextDir;
    }

    if (this.canMove(this.dir, map)) {
      this.x += this.dir.x * this.speed;
      this.y += this.dir.y * this.speed;

      // Tunnel wrapping
      if (this.x < -8) this.x = (MAP_COLS - 1) * TILE_SIZE;
      else if (this.x > (MAP_COLS - 0.5) * TILE_SIZE) this.x = -8;

      // Animate mouth
      this.mouthAngle += this.mouthSpeed;
      if (this.mouthAngle >= this.mouthMax || this.mouthAngle <= this.mouthMin) {
        this.mouthSpeed = -this.mouthSpeed;
      }
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
