// Main INF-MAN Game Engine & Controller

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('infman_highscore') || '0', 10);
    this.level = 1;
    this.lives = 3;
    this.dotsEaten = 0;

    this.map = new GameMap();
    this.pacman = new PacMan();
    this.fruit = new Fruit();

    this.ghosts = [
      new Ghost(GHOST_BLINKY, 13, 11, { col: 25, row: -2 }, 0),
      new Ghost(GHOST_PINKY, 13, 14, { col: 2, row: -2 }, 120),
      new Ghost(GHOST_INKY, 11, 14, { col: 27, row: 31 }, 240),
      new Ghost(GHOST_CLYDE, 15, 14, { col: 0, row: 31 }, 360)
    ];

    this.ghostEatMultiplier = 1;
    this.globalGhostMode = STATE_CHASE;
    this.modeTimer = 0;

    this.state = 'READY'; // READY, PLAYING, PAUSED, PACMAN_DIED, LEVEL_COMPLETE, GAME_OVER
    this.stateTimer = 0;
    this.pelletPulse = true;
    this.pelletTimer = 0;

    this.initUI();
    this.initInput();
    this.initCustomModal();

    AssetManager.init();
    this.updateScoreUI();
    this.renderLivesUI();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initUI() {
    document.getElementById('btn-start').onclick = () => this.startGame();
    document.getElementById('btn-pause').onclick = () => this.togglePause();
    document.getElementById('btn-sound').onclick = () => {
      AudioEngine.enabled = !AudioEngine.enabled;
      document.getElementById('btn-sound').innerText = `SOUND: ${AudioEngine.enabled ? 'ON' : 'OFF'}`;
    };
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      AudioEngine.init();

      if (['ArrowUp', 'KeyW'].includes(e.code)) this.pacman.setNextDir(DIR_UP);
      else if (['ArrowDown', 'KeyS'].includes(e.code)) this.pacman.setNextDir(DIR_DOWN);
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) this.pacman.setNextDir(DIR_LEFT);
      else if (['ArrowRight', 'KeyD'].includes(e.code)) this.pacman.setNextDir(DIR_RIGHT);
      else if (e.code === 'Space') this.togglePause();
    });
  }

  initCustomModal() {
    const modal = document.getElementById('custom-modal');
    document.getElementById('btn-customize').onclick = () => {
      this.updateModalPreviews();
      modal.classList.add('active');
    };
    document.getElementById('modal-close').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-save-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-reset-all').onclick = () => {
      AssetManager.resetAllAssets();
      this.updateModalPreviews();
    };

    // File input handlers
    const keys = ['pacman', 'blinky', 'pinky', 'inky', 'clyde', 'frightened', 'fruit'];
    keys.forEach(key => {
      const fileInput = document.getElementById(`file-${key}`);
      if (fileInput) {
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              AssetManager.setCustomAsset(key, event.target.result);
              this.updateModalPreviews();
            };
            reader.readAsDataURL(file);
          }
        };
      }
    });
  }

  updateModalPreviews() {
    const keys = ['pacman', 'blinky', 'pinky', 'inky', 'clyde', 'frightened', 'fruit'];
    keys.forEach(key => {
      const img = document.getElementById(`preview-${key}`);
      if (img) {
        img.src = AssetManager.customAssets[key] || AssetManager.images[key].src;
      }
    });
  }

  startGame() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.resetLevel();
    this.state = 'PLAYING';
    document.getElementById('overlay').style.display = 'none';
    this.updateScoreUI();
    this.renderLivesUI();
  }

  resetLevel() {
    this.map.reset();
    this.pacman.reset();
    this.fruit.active = false;
    this.dotsEaten = 0;
    this.ghosts.forEach(g => g.reset());
    this.globalGhostMode = STATE_CHASE;
    this.modeTimer = 0;
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('overlay').style.display = 'flex';
      document.getElementById('overlay-title').innerText = 'PAUSED';
      document.getElementById('overlay-sub').innerText = 'Press Start or Space to Resume';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('overlay').style.display = 'none';
    }
  }

  updateScoreUI() {
    document.getElementById('score-val').innerText = this.score.toString().padStart(2, '0');
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('infman_highscore', this.highScore.toString());
    }
    document.getElementById('highscore-val').innerText = this.highScore.toString().padStart(2, '0');
    document.getElementById('level-val').innerText = this.level.toString();
  }

  renderLivesUI() {
    const container = document.getElementById('lives-container');
    container.innerHTML = '';
    for (let i = 0; i < this.lives - 1; i++) {
      const img = document.createElement('img');
      img.src = AssetManager.customAssets.pacman || AssetManager.images.pacman.src;
      img.style.width = '20px';
      img.style.height = '20px';
      container.appendChild(img);
    }
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // Power pellet flashing
    this.pelletTimer++;
    if (this.pelletTimer % 15 === 0) {
      this.pelletPulse = !this.pelletPulse;
    }

    // Update Pac-Man
    this.pacman.update(this.map);

    // Pac-Man Dot & Pellet Consumption
    const pacTile = this.pacman.getTile();
    if (pacTile.col >= 0 && pacTile.col < MAP_COLS && pacTile.row >= 0 && pacTile.row < MAP_ROWS) {
      const currentTile = this.map.grid[pacTile.row][pacTile.col];
      if (currentTile === 2) {
        // Dot
        this.map.grid[pacTile.row][pacTile.col] = 0;
        this.score += 10;
        this.dotsEaten++;
        AudioEngine.playDot();
        this.updateScoreUI();
        this.checkFruitSpawn();
      } else if (currentTile === 3) {
        // Power Pellet
        this.map.grid[pacTile.row][pacTile.col] = 0;
        this.score += 50;
        this.dotsEaten++;
        AudioEngine.playPowerPellet();
        this.ghostEatMultiplier = 1;
        this.ghosts.forEach(g => g.setFrightened(400)); // Frightened for ~6.6s
        this.updateScoreUI();
        this.checkFruitSpawn();
      }
    }

    // Check Fruit collision
    if (this.fruit.active) {
      this.fruit.update();
      const fruitCol = 13;
      const fruitRow = 17;
      if (pacTile.col === fruitCol && pacTile.row === fruitRow) {
        this.score += this.fruit.points;
        this.fruit.active = false;
        AudioEngine.playEatFruit();
        this.updateScoreUI();
      }
    }

    // Check Level Complete
    if (this.dotsEaten >= this.map.totalDots) {
      this.state = 'LEVEL_COMPLETE';
      this.stateTimer = 120;
      return;
    }

    // Update Ghosts
    const blinky = this.ghosts.find(g => g.type === GHOST_BLINKY);
    this.ghosts.forEach(ghost => {
      ghost.update(this.map, this.pacman, blinky, this.globalGhostMode);

      // Collision check with Pac-Man
      const dist = Math.hypot(ghost.x - this.pacman.x, ghost.y - this.pacman.y);
      if (dist < 12) {
        if (ghost.state === STATE_FRIGHTENED) {
          ghost.state = STATE_EATEN;
          this.score += 200 * this.ghostEatMultiplier;
          this.ghostEatMultiplier *= 2;
          AudioEngine.playEatGhost();
          this.updateScoreUI();
        } else if (ghost.state !== STATE_EATEN) {
          // Pac-Man Dies
          this.state = 'PACMAN_DIED';
          this.pacman.alive = false;
          AudioEngine.playDeath();
          this.stateTimer = 90;
        }
      }
    });
  }

  checkFruitSpawn() {
    if (this.dotsEaten === 70 || this.dotsEaten === 170) {
      this.fruit.spawn(this.level);
    }
  }

  loop() {
    if (this.state === 'PLAYING') {
      this.update();
    } else if (this.state === 'PACMAN_DIED') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.lives--;
        this.renderLivesUI();
        if (this.lives > 0) {
          this.pacman.reset();
          this.ghosts.forEach(g => g.reset());
          this.state = 'PLAYING';
        } else {
          this.state = 'GAME_OVER';
          document.getElementById('overlay').style.display = 'flex';
          document.getElementById('overlay-title').innerText = 'GAME OVER';
          document.getElementById('overlay-sub').innerText = `Final Score: ${this.score}`;
        }
      }
    } else if (this.state === 'LEVEL_COMPLETE') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.level++;
        this.resetLevel();
        this.state = 'PLAYING';
      }
    }

    this.draw();
    requestAnimationFrame(this.loop);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Map
    this.map.draw(this.ctx, this.pelletPulse);

    // Draw Fruit
    this.fruit.draw(this.ctx);

    // Draw Pac-Man
    this.pacman.draw(this.ctx);

    // Draw Ghosts
    this.ghosts.forEach(ghost => ghost.draw(this.ctx));
  }
}

// Global Clear function for modal buttons
function clearCustomAsset(key) {
  AssetManager.clearCustomAsset(key);
  if (window.game) window.game.updateModalPreviews();
}

// Initialize Game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
