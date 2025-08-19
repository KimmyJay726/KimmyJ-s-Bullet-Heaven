export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
    this.availableBosses = ['Boss1', 'Boss2'];
    this.selectPanel = null;
  }

  preload() {
    // Load your menu background (optional)
    this.load.image('menuBg', 'assets/BulletHeavenBackground.png');

    // Load the BGM audio file
    this.load.audio('menuBGM', 'assets/MenuMusic.mp3');
  }

  create() {
    const { width, height } = this.cameras.main;

    // Optional background image
    if (this.textures.exists('menuBg')) {
      this.add.image(width / 2, height / 2, 'menuBg').setOrigin(0.5);
    }

    // Play the BGM, loop it, and set a comfortable volume
    this.bgm = this.sound.add('menuBGM', { loop: true, volume: 0.5 });
    this.bgm.play();

    // Title
    this.add
      .text(width / 2, 150, 'Bullet Heaven', {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    // Start Run: picks a random boss and starts the Level
    this.createMenuButton(
      width / 2,
      height / 2 - 10,
      'START RUN',
      () => {
        const bossType =
          Phaser.Utils.Array.GetRandom(this.availableBosses) || 'Boss1';
        this.bgm.stop();
        this.scene.start('LoadingScene', { bossType });
      }
    );

    // Boss Select: opens a small overlay to pick a specific boss
    this.createMenuButton(
      width / 2,
      height / 2 + 70,
      'BOSS SELECT',
      () => this.openBossSelect()
    );
  }

  /**
   * Helper to create a text-based interactive menu button
   */
  createMenuButton(x, y, label, onClick) {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn
      .on('pointerover', () => btn.setStyle({ color: '#f8e71c' }))
      .on('pointerout', () => btn.setStyle({ color: '#ffffff' }))
      .on('pointerdown', onClick);

    return btn;
  }

  openBossSelect() {
    if (this.selectPanel) return; // prevent duplicate panels

    const { width, height } = this.cameras.main;
    const panelWidth = Math.floor(width * 0.7);
    const panelHeight = Math.floor(height * 0.55);

    // Block input behind the panel
    const dim = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
      .setInteractive();

    // Panel container
    const panelBg = this.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x111111, 0.9)
      .setStrokeStyle(2, 0xffffff);

    const title = this.add
      .text(width / 2, height / 2 - panelHeight / 2 + 60, 'Select Boss', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    // Boss buttons
    const gap = 80;
    const bossButtons = [];

    const makeBossBtn = (label, bossType, yOffset) => {
      const btn = this.add
        .text(width / 2, height / 2 + yOffset, label, {
          fontFamily: 'Arial',
          fontSize: '40px',
          color: '#ffffff'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn
        .on('pointerover', () => btn.setStyle({ color: '#f8e71c' }))
        .on('pointerout', () => btn.setStyle({ color: '#ffffff' }))
        .on('pointerdown', () => {
          this.closeBossSelect();
          this.bgm.stop();
          this.scene.start('LoadingScene', { bossType });
        });

      bossButtons.push(btn);
      return btn;
    };

    if (this.availableBosses.includes('Boss1')) {
      makeBossBtn('Boss 1', 'Boss1', -20);
    }
    if (this.availableBosses.includes('Boss2')) {
      makeBossBtn('Boss 2', 'Boss2', -20 + gap);
    }

    // Back/Close button
    const backBtn = this.add
      .text(width / 2, height / 2 + panelHeight / 2 - 50, 'BACK', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#cccccc'
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn
      .on('pointerover', () => backBtn.setStyle({ color: '#f8e71c' }))
      .on('pointerout', () => backBtn.setStyle({ color: '#cccccc' }))
      .on('pointerdown', () => this.closeBossSelect());

    // Group all panel elements so we can cleanly destroy them
    this.selectPanel = [dim, panelBg, title, backBtn, ...bossButtons];
  }

  closeBossSelect() {
    if (!this.selectPanel) return;
    this.selectPanel.forEach((obj) => obj.destroy());
    this.selectPanel = null;
  }
}
