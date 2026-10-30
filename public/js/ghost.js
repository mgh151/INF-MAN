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
    this.speed = 2.0; // Standard speed matching 16px tile grid
    this.dir = DIR_UP;
    this.state = this.houseTimer > 0 ? STATE_HOUSE : STATE_SCATTER;
    this.timer = this.houseTimer;
    this.frightenedTimer = 0;
  }

  setFrightened(duration) {
    if (this.state !== STATE_EATEN && this.state !== STATE_HOUSE) {
      this.state = STATE_FRIGHTENED;
      this.frightenedTimer = duration;
      // Reverse direction when entering frightened state
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
    if (this.state === STATE_EATEN) return { col: 13, row: 14 }; // Ghost House Center Inside

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

  // Bounding box collision helper for ghosts
  isValidGhostPosition(x, y, map) {
    const padding = 1;
    const corners = [
      { x: x + padding, y: y + padding },
      { x: x + TILE_SIZE - 1 - padding, y: y + padding },
      { x: x + padding, y: y + TILE_SIZE - 1 - padding },
      { x: x + TILE_SIZE - 1 - padding, y: y + TILE_SIZE - 1 - padding }
    ];

    for (const p of corners) {
      const col = Math.floor(p.x / TILE_SIZE);
      const row = Math.floor(p.y / TILE_SIZE);

      if (col < 0 || col >= MAP_COLS) continue; // tunnel
      if (row < 0 || row >= MAP_ROWS) return false;

      if (this.state === STATE_EATEN || this.state === STATE_HOUSE) {
        if (map.isGhostHouseDoor(col, row) || map.grid[row]?.[col] === 5) continue;
      }

      if (map.isWall(col, row) || map.isGhostHouseDoor(col, row)) {
        return false;
      }
    }
    return true;
  }

  getValidDirections(map) {
    const directions = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
    const curTile = this.getTile();

    const allowed = directions.filter(d => {
      // Avoid 180-degree turn unless dead-end
      if (d.x === -this.dir.x && d.y === -this.dir.y) return false;

      const checkCol = curTile.col + d.x;
      const checkRow = curTile.row + d.y;

      if (this.state === STATE_EATEN || this.state === STATE_HOUSE) {
        if (map.isGhostHouseDoor(checkCol, checkRow) || map.grid[checkRow]?.[checkCol] === 5) return true;
      }

      return !map.isWall(checkCol, checkRow) && !map.isGhostHouseDoor(checkCol, checkRow);
    });

    // Fallback if dead end: allow reversing direction
    if (allowed.length === 0) {
      return directions.filter(d => {
        const checkCol = curTile.col + d.x;
        const checkRow = curTile.row + d.y;
        if (this.state === STATE_EATEN || this.state === STATE_HOUSE) {
          if (map.isGhostHouseDoor(checkCol, checkRow) || map.grid[checkRow]?.[checkCol] === 5) return true;
        }
        return !map.isWall(checkCol, checkRow) && !map.isGhostHouseDoor(checkCol, checkRow);
      });
    }

    return allowed;
  }

  update(map, pacman, blinky, globalMode) {
    if (this.state === STATE_HOUSE) {
      this.timer--;
      if (this.timer <= 0 && this.frightenedTimer <= 0) {
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

    const curSpeed = this.speed; // Uniform speed on grid

    // Decision logic at tile intersection center
    const isAtTileCenter = (this.x % TILE_SIZE === 0) && (this.y % TILE_SIZE === 0);

    if (isAtTileCenter) {
      if (this.state === STATE_EATEN) {
        const myTile = this.getTile();
        if (myTile.col === 13 && (myTile.row === 14 || myTile.row === 13)) {
          this.x = 13 * TILE_SIZE;
          this.y = 14 * TILE_SIZE;
          this.state = STATE_HOUSE;
          this.timer = Math.max(0, this.frightenedTimer);
          return;
        }
      }

      const validDirs = this.getValidDirections(map);
      if (validDirs.length > 0) {
        if (this.state === STATE_FRIGHTENED) {
          this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
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

    // Attempt step forward
    const nextX = this.x + this.dir.x * curSpeed;
    const nextY = this.y + this.dir.y * curSpeed;

    if (this.isValidGhostPosition(nextX, nextY, map)) {
      this.x = nextX;
      this.y = nextY;
    } else {
      // Hit a wall or corner obstruction: snap cleanly to tile and recalculate direction immediately
      this.x = Math.round(this.x / TILE_SIZE) * TILE_SIZE;
      this.y = Math.round(this.y / TILE_SIZE) * TILE_SIZE;

      const validDirs = this.getValidDirections(map);
      if (validDirs.length > 0) {
        this.dir = validDirs[0];
      }
    }

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
