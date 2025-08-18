export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  preload() {
    // Load your menu background (optional)
    this.load.image('menuBg', 'assets/BulletHeavenBackground.png');

    // Load the BGM audio file
    this.load.audio('menuBGM', 'assets/MenuMusic.mp3');
  }

  create() {
    // Optional background image
    if (this.textures.exists('menuBg')) {
      this.add
        .image(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          'menuBg'
        )
        .setOrigin(0.5);
    }

    // Play the BGM, loop it, and set a comfortable volume
    this.bgm = this.sound.add('menuBGM', { loop: true, volume: 0.5 });
    this.bgm.play();

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

    // Pointer effects
    startBtn
      .on('pointerover', () => startBtn.setStyle({ color: '#f8e71c' }))
      .on('pointerout',  () => startBtn.setStyle({ color: '#ffffff' }))
      .on('pointerdown', () => {
        // Stop BGM before switching scenes
        this.bgm.stop();
        this.scene.start('Level');
      });
  }
}
