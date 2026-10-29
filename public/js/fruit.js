// Fruit Bonus Item Class
class Fruit {
  constructor() {
    this.x = 13.5 * TILE_SIZE; // Tile (13, 17) spawn below ghost house
    this.y = 17 * TILE_SIZE;
    this.active = false;
    this.timer = 0;
    this.points = 100;
  }

  spawn(level) {
    this.active = true;
    this.timer = 600; // Active for ~10 seconds at 60 FPS
    this.points = Math.min(100 * Math.pow(2, Math.min(level - 1, 4)), 3000);
  }

  update() {
    if (this.active) {
      this.timer--;
      if (this.timer <= 0) {
        this.active = false;
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x + 8, this.y + 8);

    const img = AssetManager.images.fruit;
    if (img && img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, -10, -10, 20, 20);
    } else {
      // Default Cherry
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
    }

    ctx.restore();
  }
}
