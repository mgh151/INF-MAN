// Fruit Bonus Item Class with Ms. Pac-Man Bouncing Path Movement
const FRUIT_TYPES = [
  { name: 'Cherry', points: 100, color: '#ff0033' },
  { name: 'Strawberry', points: 300, color: '#ff3366' },
  { name: 'Peach', points: 500, color: '#ff9933' },
  { name: 'Apple', points: 700, color: '#cc0000' },
  { name: 'Melon', points: 1000, color: '#33cc33' },
  { name: 'Galaxian Starship', points: 2000, color: '#ffff00' },
  { name: 'Bell', points: 3000, color: '#ffcc00' },
  { name: 'Key', points: 5000, color: '#00ffff' }
];

class Fruit {
  constructor() {
    this.active = false;
    this.timer = 0;
    this.points = 100;
    this.currentFruit = FRUIT_TYPES[0];

    this.x = 0;
    this.y = 14 * TILE_SIZE;
    this.speed = 1.0;
    this.dir = DIR_RIGHT;
    this.bounceOffset = 0;
    this.bounceTimer = 0;
  }

  getFruitForLevel(level) {
    if (level === 1) return FRUIT_TYPES[0]; // Cherry (100)
    if (level === 2) return FRUIT_TYPES[1]; // Strawberry (300)
    if (level === 3 || level === 4) return FRUIT_TYPES[2]; // Peach (500)
    if (level === 5 || level === 6) return FRUIT_TYPES[3]; // Apple (700)
    if (level === 7 || level === 8) return FRUIT_TYPES[4]; // Melon (1000)
    if (level === 9 || level === 10) return FRUIT_TYPES[5]; // Galaxian (2000)
    if (level === 11 || level === 12) return FRUIT_TYPES[6]; // Bell (3000)
    return FRUIT_TYPES[7]; // Key (5000) for Level 13+
  }

  getTile() {
    return {
      col: Math.floor((this.x + 8) / TILE_SIZE),
      row: Math.floor((this.y + 8) / TILE_SIZE)
    };
  }

  spawn(level) {
    this.active = true;
    this.timer = 1200; // Active for up to ~20 seconds as it wanders
    this.currentFruit = this.getFruitForLevel(level);
    this.points = this.currentFruit.points;

    // Spawn at left tunnel entrance (col -1, row 14)
    this.x = -1 * TILE_SIZE;
    this.y = 14 * TILE_SIZE;
    this.dir = DIR_RIGHT;
    this.bounceTimer = 0;
  }

  getValidDirections(map) {
    const directions = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
    const curTile = this.getTile();

    const allowed = directions.filter(d => {
      // Don't reverse direction 180deg unless dead end
      if (d.x === -this.dir.x && d.y === -this.dir.y) return false;

      const checkCol = curTile.col + d.x;
      const checkRow = curTile.row + d.y;

      // Allow tunnel
      if (checkCol < 0 || checkCol >= MAP_COLS) return true;

      // Fruit cannot enter ghost house
      return !map.isWall(checkCol, checkRow) && !map.isGhostHouseDoor(checkCol, checkRow) && map.grid[checkRow]?.[checkCol] !== 5;
    });

    if (allowed.length === 0) {
      return directions.filter(d => {
        const checkCol = curTile.col + d.x;
        const checkRow = curTile.row + d.y;
        if (checkCol < 0 || checkCol >= MAP_COLS) return true;
        return !map.isWall(checkCol, checkRow) && !map.isGhostHouseDoor(checkCol, checkRow) && map.grid[checkRow]?.[checkCol] !== 5;
      });
    }

    return allowed;
  }

  update(map) {
    if (!this.active) return;

    this.timer--;
    if (this.timer <= 0) {
      this.active = false;
      return;
    }

    // Ms. Pac-Man style bouncing animation
    this.bounceTimer += 0.2;
    this.bounceOffset = Math.abs(Math.sin(this.bounceTimer)) * -4;

    // Path decision at tile center
    const isAtTileCenter = (this.x % TILE_SIZE === 0) && (this.y % TILE_SIZE === 0);

    if (isAtTileCenter) {
      const curTile = this.getTile();
      // If fruit wanders across to right tunnel exit, exit active state
      if (curTile.col >= MAP_COLS && this.dir.x > 0) {
        this.active = false;
        return;
      }

      const validDirs = this.getValidDirections(map);
      if (validDirs.length > 0) {
        // Random wander pathing through maze intersections
        this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    }

    // Step forward
    this.x += this.dir.x * this.speed;
    this.y += this.dir.y * this.speed;
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    // Render at current position with bouncing offset
    ctx.translate(this.x + 8, this.y + 8 + this.bounceOffset);

    const customImg = AssetManager.images.fruit;
    if (AssetManager.customAssets.fruit && customImg && customImg.complete && customImg.naturalWidth !== 0) {
      ctx.drawImage(customImg, -10, -10, 20, 20);
    } else {
      // Procedural Vector Fruit rendering by fruit type
      const f = this.currentFruit;
      if (f.name === 'Cherry') {
        ctx.fillStyle = '#ff0033';
        ctx.beginPath();
        ctx.arc(-3, 3, 4, 0, Math.PI * 2);
        ctx.arc(4, 1, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00cc44';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-3, -1);
        ctx.quadraticCurveTo(0, -6, 3, -6);
        ctx.moveTo(4, -3);
        ctx.quadraticCurveTo(2, -6, 3, -6);
        ctx.stroke();
      } else if (f.name === 'Strawberry') {
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(-8, 2, -6, -4);
        ctx.lineTo(6, -4);
        ctx.quadraticCurveTo(8, 2, 0, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -1, 1.5, 1.5);
        ctx.fillRect(2, 1, 1.5, 1.5);
        ctx.fillRect(-3, 3, 1.5, 1.5);

        ctx.fillStyle = '#00cc44';
        ctx.fillRect(-4, -6, 8, 2);
      } else if (f.name === 'Peach') {
        ctx.fillStyle = '#ff9933';
        ctx.beginPath();
        ctx.arc(0, 1, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00cc44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(3, -9);
        ctx.stroke();
      } else if (f.name === 'Apple') {
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(-3, 1, 5, 0, Math.PI * 2);
        ctx.arc(3, 1, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#663300';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, -8);
        ctx.stroke();
      } else if (f.name === 'Melon') {
        ctx.fillStyle = '#33cc33';
        ctx.beginPath();
        ctx.arc(0, 1, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#006600';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(4, 6);
        ctx.moveTo(4, -4);
        ctx.lineTo(-4, 6);
        ctx.stroke();
      } else if (f.name === 'Galaxian Starship') {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 6);
        ctx.lineTo(0, 2);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-2, -2, 4, 4);
      } else if (f.name === 'Bell') {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-2, -6);
        ctx.lineTo(2, -6);
        ctx.lineTo(6, 4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-2, 4, 4, 3);
      } else {
        // Key
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-1.5, 0, 3, 8);
        ctx.fillRect(1.5, 4, 3, 2);
      }
    }

    ctx.restore();
  }
}
