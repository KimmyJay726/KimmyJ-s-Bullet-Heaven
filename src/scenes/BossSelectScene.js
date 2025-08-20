export default class BossSelectScene extends Phaser.Scene {


  constructor() {
    super('BossSelectScene');
    this.availableBosses = [];
    this.currentPage = 0;
    this.itemsPerPage = 25; // 5x5 grid
    this.gridCols = 5;
    this.gridRows = 5;
    this.pageContainer = null;
    this.pageText = null;
  }

  init(data) {
    // Expecting [{ key: 'Boss1', path: 'assets/bosses/Boss1.png' }, ...]
    this.availableBosses = data?.availableBosses || [];
  }

  preload() {
    if (!this.textures.exists('menuBg')) {
      this.load.image('menuBg', 'assets/BulletHeavenBackground.png');
    }

    // Load each boss image regardless of extension
    this.availableBosses.forEach(({ key, path }) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, path);
      }
    });
  }

  create() {
    const { width, height } = this.cameras.main;

    if (this.textures.exists('menuBg')) {
      this.add.image(width / 2, height / 2, 'menuBg').setOrigin(0.5);
    } else {
      this.cameras.main.setBackgroundColor(0x101018);
    }

    this.add
      .text(width / 2, 60, 'Select Boss', {
        fontFamily: 'Arial',
        fontSize: '52px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    // Back button
    const backBtn = this.add
      .text(60, 40, 'BACK', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#cccccc'
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setStyle({ color: '#f8e71c' }))
      .on('pointerout', () => backBtn.setStyle({ color: '#cccccc' }))
      .on('pointerdown', () => {
        this.scene.start('MainMenu');
      });

    this.pageContainer = this.add.container(0, 0);
    this.renderPage(this.currentPage);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(this.availableBosses.length / this.itemsPerPage));
    if (totalPages > 1) {
      const prev = this.add
        .text(width / 2 - 120, height - 40, '< Prev', {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => prev.setStyle({ color: '#f8e71c' }))
        .on('pointerout', () => prev.setStyle({ color: '#ffffff' }))
        .on('pointerdown', () => {
          this.currentPage = (this.currentPage - 1 + totalPages) % totalPages;
          this.renderPage(this.currentPage);
        });

      const next = this.add
        .text(width / 2 + 120, height - 40, 'Next >', {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => next.setStyle({ color: '#f8e71c' }))
        .on('pointerout', () => next.setStyle({ color: '#ffffff' }))
        .on('pointerdown', () => {
          this.currentPage = (this.currentPage + 1) % totalPages;
          this.renderPage(this.currentPage);
        });

      this.pageText = this.add
        .text(width / 2, height - 40, `Page 1 / ${totalPages}`, {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#aaaaaa'
        })
        .setOrigin(0.5);

      this.events.on('changed-page', (pageIdx) => {
        this.pageText.setText(`Page ${pageIdx + 1} / ${totalPages}`);
      });
    }
  }

  renderPage(pageIdx) {
    const { width, height } = this.cameras.main;
    this.pageContainer.removeAll(true);

    const startIndex = pageIdx * this.itemsPerPage;
    const slice = this.availableBosses.slice(startIndex, startIndex + this.itemsPerPage);

    const marginTop = 120;
    const marginBottom = 80;
    const marginSides = 80;
    const gridW = width - marginSides * 2;
    const gridH = height - marginTop - marginBottom;
    const cellW = gridW / this.gridCols;
    const cellH = gridH / this.gridRows;

    slice.forEach(({ key }, i) => {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      const x = marginSides + col * cellW + cellW / 2;
      const y = marginTop + row * cellH + cellH / 2;

      let node;
      if (this.textures.exists(key)) {
        node = this.add.image(x, y, key).setOrigin(0.5);
        const img = this.textures.get(key).getSourceImage();
        const maxW = cellW * 0.75;
        const maxH = cellH * 0.6;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        node.setScale(scale);
      } else {
        node = this.add
          .rectangle(x, y - 10, cellW * 0.6, cellH * 0.5, 0x333344)
          .setStrokeStyle(2, 0x8888aa);
        const missing = this.add
          .text(x, y - 10, key, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff'
          })
          .setOrigin(0.5);
        this.pageContainer.add(missing);
      }

      node.setInteractive({ useHandCursor: true })
        .on('pointerover', () => node.setTint(0xf8e71c))
        .on('pointerout', () => node.clearTint())
        .on('pointerdown', () => {
          const menuBgm = this.sound.get('menuBGM');
          if (menuBgm) menuBgm.stop();
          this.scene.start('LoadingScene', { bossType: key });
        });

      const label = this.add
        .text(x, y + cellH * 0.28, key, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      this.pageContainer.add(node);
      this.pageContainer.add(label);
    });

    this.events.emit('changed-page', pageIdx);
  }
}
