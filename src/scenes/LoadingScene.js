// src/scenes/LoadingScene.js
export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  init(data) {
    // Store boss type for Level
    this.bossType = data.bossType || 'Boss1';
  }

  preload() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Loading text
    this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Progress bar background + foreground
    const progressBg = this.add.rectangle(width / 2, height / 2, 400, 30, 0x555555);
    const progressBar = this.add.rectangle(width / 2 - 200, height / 2, 0, 30, 0xffffff).setOrigin(0, 0.5);

    // Hook into loading progress
    this.load.on('progress', (value) => {
      progressBar.width = 400 * value;
    });

    // Boss-specific assets — load images & audio together
    if (this.bossType === 'Boss2') {
      this.load.atlas('boss2Sprites', 'assets/boss2.png', 'assets/boss2.json');
      this.load.audio('boss2Music', 'assets/Boss2Theme.mp3');
    } else {
      this.load.atlas('boss1Sprites', 'assets/boss1.png', 'assets/boss1.json');
      this.load.audio('boss1Music', 'assets/03-IMAGE-MATERIAL-2.mp3');
    }

    // TODO: add any other heavy or shared assets here so they're cached too
  }

  create() {
    // All preload() assets are now fully cached — start Level instantly
    this.scene.start('Level', { bossType: this.bossType });
  }
}
