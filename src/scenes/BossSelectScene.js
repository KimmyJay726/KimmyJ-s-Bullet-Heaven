export default class BossSelectScene extends Phaser.Scene {
  constructor() {
    super('BossSelectScene');
    this.availableBosses = [];
    this.currentPage = 0;
    this.itemsPerPage = 25;
    this.gridCols = 5;
    this.gridRows = 5;
    this.pageContainer = null;
    this.pageText = null;
    this.rotatingIcons = []; // store all icons for update rotation
  }

  init(data) {
    this.availableBosses = data?.availableBosses || [];
  }

  preload() {
    if (!this.textures.exists('menuBg')) {
      this.load.image('menuBg', 'assets/BulletHeavenBackground.png');
    }
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

    this.add.text(width / 2, 60, 'Select Boss', {
      fontFamily: 'Arial',
      fontSize: '52px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const backBtn = this.add.text(60, 40, 'BACK', {
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

    // Large boss name at bottom center
    this.bossNameText = this.add.text(width / 2, height - 60, '', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#ffffff'
    }).setOrigin(0.5).setVisible(false);

    this.pageContainer = this.add.container(0, 0);
    this.renderPage(this.currentPage);

    const totalPages = Math.max(1, Math.ceil(this.availableBosses.length / this.itemsPerPage));
    if (totalPages > 1) {
      const prev = this.add.text(width / 2 - 120, height - 40, '< Prev', {
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

      const next = this.add.text(width / 2 + 120, height - 40, 'Next >', {
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

      this.pageText = this.add.text(width / 2, height - 40, `Page 1 / ${totalPages}`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#aaaaaa'
      }).setOrigin(0.5);

      this.events.on('changed-page', (pageIdx) => {
        this.pageText.setText(`Page ${pageIdx + 1} / ${totalPages}`);
      });
    }
  }

  renderPage(pageIdx) {
    const { width, height } = this.cameras.main;
    this.pageContainer.removeAll(true);
    this.rotatingIcons = [];

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

      const { node, baseScale, isImage } = this.createBossNode(key, x, y, cellW, cellH);

      this.pageContainer.add(node);
      this.rotatingIcons.push(node);

      node
        .on('pointerover', () => {
          if (isImage && node.setTint) node.setTint(0xf8e71c);
          this.tweens.add({
            targets: node,
            scale: baseScale * 1.15,
            duration: 150,
            ease: 'Sine.easeOut'
          });
          this.bossNameText.setText(key).setVisible(true);
        })
        .on('pointerout', () => {
          if (isImage && node.clearTint) node.clearTint();
          this.tweens.add({
            targets: node,
            scale: baseScale,
            duration: 150,
            ease: 'Sine.easeInOut'
          });
          this.bossNameText.setVisible(false);
        })
        .on('pointerdown', () => {
          const menuBgm = this.sound.get('menuBGM');
          if (menuBgm) menuBgm.stop();
          this.scene.start('LoadingScene', { bossType: key });
        });
    });

    this.events.emit('changed-page', pageIdx);
  }

  createBossNode(key, x, y, cellW, cellH) {
    const isImage = this.textures.exists(key);
    let node;
    let baseScale = 1;

    if (isImage) {
      node = this.add.image(x, y, key).setOrigin(0.5);
      const img = this.textures.get(key).getSourceImage();
      const maxW = cellW * 0.75;
      const maxH = cellH * 0.6;
      baseScale = Math.min(maxW / img.width, maxH / img.height);
      node.setScale(baseScale);
      node.setInteractive({ useHandCursor: true });
    } else {
      const w = cellW * 0.6;
      const h = cellH * 0.5;
      node = this.add.rectangle(x, y, w, h, 0x333344)
        .setStrokeStyle(2, 0x8888aa)
        .setOrigin(0.5);
      baseScale = 1;
      node.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains
      );
      node.input.cursor = 'pointer';
    }

    node.setData('baseScale', baseScale);
    return { node, baseScale, isImage };
  }

  update(time, delta) {
    // Rotate all icons slowly
    this.rotatingIcons.forEach(icon => {
      icon.angle += 0.05 * delta; // adjust speed here
    });
  }
}
