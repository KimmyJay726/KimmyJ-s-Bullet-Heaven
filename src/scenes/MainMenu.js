export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');

    // Each boss now has a key + path (can be .png, .svg, etc.)
    this.availableBosses = [
      { key: 'Boss1', path: 'assets/Star.png' },
      { key: 'Boss2', path: 'assets/Trinity.svg' }
      // Add more bosses here
    ];

    this.bgm = null;
  }

  preload() {
    this.load.image('menuBg', 'assets/BulletHeavenBackground.png');
    this.load.audio('menuBGM', 'assets/MenuMusic.mp3');

    // Preload boss images
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
    }

    if (!this.sound.get('menuBGM')) {
      this.bgm = this.sound.add('menuBGM', { loop: true, volume: 0.5 });
      this.bgm.play();
    }

    this.add
      .text(width / 2, 150, 'The Fine Game of Nil', {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.createMenuButton(
      width / 2,
      height / 2 - 10,
      'START RUN',
      () => {
        const bossType =
          Phaser.Utils.Array.GetRandom(this.availableBosses)?.key || 'Boss1';
        this.bgm.stop();
        this.scene.start('LoadingScene', { bossType });
      }
    );

    this.createMenuButton(
      width / 2,
      height / 2 + 70,
      'BOSS SELECT',
      () => {
        this.scene.start('BossSelectScene', {
          availableBosses: this.availableBosses
        });
      }
    );
  }

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
}
