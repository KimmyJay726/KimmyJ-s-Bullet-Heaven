// src/scenes/PauseOverlay.js
export default class PauseOverlay extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseOverlay' });
  }

  create(data) {
    const { returnTo } = data;

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);

    this.add.text(width / 2, height / 2 - 20, 'Paused', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 30, 'Press ESC to resume', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 🎵 Pause all currently playing sounds
    this.sound.pauseAll();

    // Resume with ESC or click
    this.resumeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.resumeKey.once('down', () => this.resume(returnTo));
    this.input.once('pointerdown', () => this.resume(returnTo));
  }

  resume(targetKey) {
    // 🎵 Resume all paused sounds
    this.sound.resumeAll();

    this.scene.stop();            // remove overlay
    this.scene.resume(targetKey); // resume main scene
  }

  shutdown() {
    this.resumeKey?.destroy();
  }
}
