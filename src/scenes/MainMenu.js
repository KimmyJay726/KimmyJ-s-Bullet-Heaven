export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  preload() {
    // Optional: preload a background or button sprite
    this.load.image('menuBg', 'assets/menuBackground.png');
  }

  create() {
    // Background (optional)
    if (this.textures.exists('menuBg')) {
      this.add
        .image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'menuBg')
        .setOrigin(0.5);
    }

    // Start button
    const startBtn = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        'START',
        { fontFamily: 'Arial', fontSize: '48px', color: '#ffffff' }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Button hover styling
    startBtn
      .on('pointerover', () => startBtn.setStyle({ color: '#f8e71c' }))
      .on('pointerout',  () => startBtn.setStyle({ color: '#ffffff' }))
      .on('pointerdown', () => {
        this.scene.start('Level');
      });
  }
}
