// Ghost AI & Entity Logic
const GHOST_BLINKY = 'blinky';
const GHOST_PINKY = 'pinky';
const GHOST_INKY = 'inky';
const GHOST_CLYDE = 'clyde';

const STATE_CHASE = 'CHASE';
const STATE_SCATTER = 'SCATTER';
const STATE_FRIGHTENED = 'FRIGHTENED';
const STATE_EATEN = 'EATEN';
const STATE_HOUSE = 'HOUSE';

class Ghost {
  constructor(type, startCol, startRow, scatterTarget, houseTimer) {
    this.type = type;
    this.startCol = startCol;
    this.startRow = startRow;
    this.scatterTarget = scatterTarget; // {col, row} corner
    this.houseTimer = houseTimer; // frame delay before leaving house
    this.reset();
  }

  reset() {
    this.x = this.startCol * TILE_SIZE;
    this.y = this.startRow * TILE_SIZE;
    this.speed = 2.0; // 2.0 divides TILE_SIZE (16) perfectly
    this.dir = DIR_UP;
    this.state = this.houseTimer > 0 ? STATE_HOUSE : STATE_SCATTER;
    this.timer = this.houseTimer;
    this.frightenedTimer = 0;
  }

  setFrightened(duration) {
    if (this.state !== STATE_EATEN && this.state !== STATE_HOUSE) {
      this.state = STATE_FRIGHTENED;
      this.frightenedTimer = duration;
      // Reverse direction on frightened
      this.dir = { x: -this.dir.x, y: -this.dir.y, angle: (this.dir.angle + Math.PI) % (Math.PI * 2) };
    }
  }

  getTile() {
    return {
      col: Math.floor((this.x + 8) / TILE_SIZE),
      row: Math.floor((this.y + 8) / TILE_SIZE)
    };
  }

  getTargetTile(pacman, blinky) {
    if (this.state === STATE_SCATTER) return this.scatterTarget;
    if (this.state === STATE_EATEN) return { col: 13, row: 11 }; // Ghost House Entrance

    const pacTile = pacman.getTile();

    if (this.type === GHOST_BLINKY) {
      return pacTile;
    } else if (this.type === GHOST_PINKY) {
      return { col: pacTile.col + pacman.dir.x * 4, row: pacTile.row + pacman.dir.y * 4 };
    } else if (this.type === GHOST_INKY) {
      const ahead = { col: pacTile.col + pacman.dir.x * 2, row: pacTile.row + pacman.dir.y * 2 };
      const blinkyTile = blinky ? blinky.getTile() : { col: 13, row: 11 };
      return {
        col: ahead.col + (ahead.col - blinkyTile.col),
        row: ahead.row + (ahead.row - blinkyTile.row)
      };
    } else if (this.type === GHOST_CLYDE) {
      const myTile = this.getTile();
      const dist = Math.hypot(myTile.col - pacTile.col, myTile.row - pacTile.row);
      return dist > 8 ? pacTile : this.scatterTarget;
    }

    return pacTile;
  }

  getValidDirections(map) {
    const directions = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
    const myTile = this.getTile();

    return directions.filter(d => {
      // Don't allow 180 turn unless required
      if (d.x === -this.dir.x && d.y === -this.dir.y) return false;

      const nextCol = myTile.col + d.x;
      const nextRow = myTile.row + d.y;

      if (this.state === STATE_EATEN || this.state === STATE_HOUSE) {
        if (map.isGhostHouseDoor(nextCol, nextRow)) return true;
      }

      return !map.isWall(nextCol, nextRow) && !map.isGhostHouseDoor(nextCol, nextRow);
    });
  }

  update(map, pacman, blinky, globalMode) {
    if (this.state === STATE_HOUSE) {
      this.timer--;
      if (this.timer <= 0) {
        this.x = 13 * TILE_SIZE;
        this.y = 11 * TILE_SIZE;
        this.state = globalMode;
        this.dir = DIR_LEFT;
      }
      return;
    }

    if (this.state === STATE_FRIGHTENED) {
      this.frightenedTimer--;
      if (this.frightenedTimer <= 0) {
        this.state = globalMode;
      }
    } else if (this.state !== STATE_EATEN) {
      this.state = globalMode;
    }

    const curSpeed = this.state === STATE_FRIGHTENED ? 1.0 : (this.state === STATE_EATEN ? 4.0 : this.speed);

    // Alignment check to decide tile turn
    const isAtTileCenter = (this.x % TILE_SIZE === 0) && (this.y % TILE_SIZE === 0);

    if (isAtTileCenter) {
      if (this.state === STATE_EATEN) {
        const myTile = this.getTile();
        if (myTile.col === 13 && (myTile.row === 11 || myTile.row === 12)) {
          this.state = globalMode;
        }
      }

      const validDirs = this.getValidDirections(map);
      if (validDirs.length > 0) {
        if (this.state === STATE_FRIGHTENED) {
          // Random choice when frightened
          this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
          // Choose direction that minimizes distance to target
          const target = this.getTargetTile(pacman, blinky);
          let bestDir = validDirs[0];
          let minDistance = Infinity;

          const myTile = this.getTile();
          validDirs.forEach(d => {
            const nextCol = myTile.col + d.x;
            const nextRow = myTile.row + d.y;
            const dist = Math.hypot(nextCol - target.col, nextRow - target.row);
            if (dist < minDistance) {
              minDistance = dist;
              bestDir = d;
            }
          });
          this.dir = bestDir;
        }
      }
    }

    // Move
    this.x += this.dir.x * curSpeed;
    this.y += this.dir.y * curSpeed;

    // Tunnel Wrap
    if (this.x < -8) this.x = (MAP_COLS - 1) * TILE_SIZE;
    else if (this.x > (MAP_COLS - 0.5) * TILE_SIZE) this.x = -8;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + 8, this.y + 8);

    let imgKey = this.type;
    if (this.state === STATE_FRIGHTENED) {
      imgKey = 'frightened';
    }

    const img = AssetManager.images[imgKey];
    if (this.state === STATE_EATEN) {
      // Draw Eaten Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, -2, 3, 0, Math.PI * 2);
      ctx.arc(4, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0000ff';
      ctx.beginPath();
      ctx.arc(-4 + this.dir.x * 1, -2 + this.dir.y * 1, 1.5, 0, Math.PI * 2);
      ctx.arc(4 + this.dir.x * 1, -2 + this.dir.y * 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (img && img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, -10, -10, 20, 20);
    } else {
      // Fallback ghost rendering
      const colors = { blinky: '#ff0000', pinky: '#ffb8ff', inky: '#00ffff', clyde: '#ffb852' };
      ctx.fillStyle = this.state === STATE_FRIGHTENED ? '#0000ff' : colors[this.type];
      ctx.beginPath();
      ctx.arc(0, -2, 8, Math.PI, 0, false);
      ctx.lineTo(8, 8);
      ctx.lineTo(-8, 8);
      ctx.fill();
    }

    ctx.restore();
  }
}
