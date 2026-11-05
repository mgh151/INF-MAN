// Asset Manager with Saved Gallery & Mouth Cut Line Support
const AssetManager = {
  // Currently active selected assets (dataUrl or null for default)
  customAssets: {
    pacman: null,
    blinky: null,
    pinky: null,
    inky: null,
    clyde: null,
    frightened: null,
    fruit: null
  },

  // Custom mouth cut line position (0.0 to 1.0 ratio from top of image, default 0.5)
  mouthCutLine: 0.5,

  // Saved image gallery library per category: { pacman: [dataUrl1, dataUrl2], blinky: [...], ... }
  gallery: {
    pacman: [],
    blinky: [],
    pinky: [],
    inky: [],
    clyde: [],
    frightened: [],
    fruit: []
  },

  images: {
    pacman: null,
    blinky: null,
    pinky: null,
    inky: null,
    clyde: null,
    frightened: null,
    fruit: null
  },

  init() {
    this.loadFromStorage();
    this.generateDefaultImages();
  },

  loadFromStorage() {
    try {
      const storedActive = localStorage.getItem('infman_custom_assets');
      if (storedActive) {
        this.customAssets = { ...this.customAssets, ...JSON.parse(storedActive) };
      }
      const storedGallery = localStorage.getItem('infman_asset_gallery');
      if (storedGallery) {
        this.gallery = { ...this.gallery, ...JSON.parse(storedGallery) };
      }
      const storedCutLine = localStorage.getItem('infman_mouth_cut_line');
      if (storedCutLine !== null) {
        this.mouthCutLine = parseFloat(storedCutLine);
      }

      // Auto-migrate: Ensure any active selected custom assets exist in gallery library
      const keys = ['pacman', 'blinky', 'pinky', 'inky', 'clyde', 'frightened', 'fruit'];
      keys.forEach(k => {
        if (!this.gallery[k]) this.gallery[k] = [];
        if (this.customAssets[k] && !this.gallery[k].includes(this.customAssets[k])) {
          this.gallery[k].push(this.customAssets[k]);
        }
      });
      this.saveToStorage();
    } catch (e) {
      console.warn('Failed to load custom assets from storage:', e);
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem('infman_custom_assets', JSON.stringify(this.customAssets));
      localStorage.setItem('infman_asset_gallery', JSON.stringify(this.gallery));
      localStorage.setItem('infman_mouth_cut_line', this.mouthCutLine.toString());
    } catch (e) {
      console.warn('Failed to save custom assets to storage:', e);
    }
  },

  setMouthCutLine(ratio) {
    this.mouthCutLine = Math.max(0.1, Math.min(0.9, ratio));
    this.saveToStorage();
  },

  addAndSelectCustomAsset(key, dataUrl) {
    if (!this.gallery[key]) this.gallery[key] = [];
    // Avoid duplicate entries in gallery
    if (!this.gallery[key].includes(dataUrl)) {
      this.gallery[key].push(dataUrl);
    }
    this.customAssets[key] = dataUrl;
    this.saveToStorage();
    this.updateImage(key);
  },

  selectAsset(key, dataUrl) {
    this.customAssets[key] = dataUrl;
    this.saveToStorage();
    this.updateImage(key);
  },

  removeAssetFromGallery(key, dataUrl) {
    if (this.gallery[key]) {
      this.gallery[key] = this.gallery[key].filter(url => url !== dataUrl);
    }
    if (this.customAssets[key] === dataUrl) {
      this.customAssets[key] = null;
    }
    this.saveToStorage();
    this.updateImage(key);
  },

  clearCustomAsset(key) {
    this.customAssets[key] = null;
    this.saveToStorage();
    this.updateImage(key);
  },

  resetAllAssets() {
    this.customAssets = {
      pacman: null,
      blinky: null,
      pinky: null,
      inky: null,
      clyde: null,
      frightened: null,
      fruit: null
    };
    // Note: Do not erase this.gallery so user library uploads are preserved across resets
    this.saveToStorage();
    this.generateDefaultImages();
  },

  updateImage(key) {
    if (this.customAssets[key]) {
      const img = new Image();
      img.src = this.customAssets[key];
      this.images[key] = img;
    } else {
      this.images[key] = this.createDefaultCanvasImage(key);
    }
  },

  generateDefaultImages() {
    const keys = ['pacman', 'blinky', 'pinky', 'inky', 'clyde', 'frightened', 'fruit'];
    keys.forEach(key => {
      if (this.customAssets[key]) {
        const img = new Image();
        img.src = this.customAssets[key];
        this.images[key] = img;
      } else {
        this.images[key] = this.createDefaultCanvasImage(key);
      }
    });
  },

  createDefaultCanvasImage(key) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (key === 'pacman') {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.lineTo(16, 16);
      ctx.fill();
    } else if (key === 'fruit') {
      // Draw Cherry
      ctx.fillStyle = '#ff0033';
      ctx.beginPath();
      ctx.arc(10, 22, 6, 0, Math.PI * 2);
      ctx.arc(22, 20, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00cc44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 16);
      ctx.quadraticCurveTo(16, 6, 20, 6);
      ctx.moveTo(22, 14);
      ctx.quadraticCurveTo(20, 6, 20, 6);
      ctx.stroke();
    } else if (key === 'frightened') {
      // Blue Scared Ghost
      ctx.fillStyle = '#0000ff';
      ctx.beginPath();
      ctx.arc(16, 12, 12, Math.PI, 0, false);
      ctx.lineTo(28, 26);
      ctx.lineTo(24, 22);
      ctx.lineTo(20, 26);
      ctx.lineTo(16, 22);
      ctx.lineTo(12, 26);
      ctx.lineTo(8, 22);
      ctx.lineTo(4, 26);
      ctx.lineTo(4, 12);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffcccc';
      ctx.fillRect(10, 10, 3, 3);
      ctx.fillRect(19, 10, 3, 3);
      // Wavy Mouth
      ctx.strokeStyle = '#ffcccc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, 20);
      ctx.lineTo(12, 17);
      ctx.lineTo(16, 20);
      ctx.lineTo(20, 17);
      ctx.lineTo(24, 20);
      ctx.stroke();
    } else {
      // Ghosts
      const colors = {
        blinky: '#ff0000',
        pinky: '#ffb8ff',
        inky: '#00ffff',
        clyde: '#ffb852'
      };
      ctx.fillStyle = colors[key] || '#ffffff';
      ctx.beginPath();
      ctx.arc(16, 12, 12, Math.PI, 0, false);
      ctx.lineTo(28, 26);
      ctx.lineTo(24, 22);
      ctx.lineTo(20, 26);
      ctx.lineTo(16, 22);
      ctx.lineTo(12, 26);
      ctx.lineTo(8, 22);
      ctx.lineTo(4, 26);
      ctx.lineTo(4, 12);
      ctx.fill();

      // White eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(11, 11, 4, 0, Math.PI * 2);
      ctx.arc(21, 11, 4, 0, Math.PI * 2);
      ctx.fill();

      // Blue pupils
      ctx.fillStyle = '#0000ff';
      ctx.beginPath();
      ctx.arc(12, 11, 2, 0, Math.PI * 2);
      ctx.arc(22, 11, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }
};
