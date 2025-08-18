export default class PauseOverlay extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseOverlay' });
  }

  create(data) {
    const { returnTo, boss } = data;
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);
    this.add.text(width / 2, height / 2 - 20, 'Paused', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 30, 'Press ESC to resume', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);

    this.sound.pauseAll();
    boss?.pauseBossFight();

    this.resumeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.resumeKey.once('down', () => this.resume(returnTo, boss));
    this.input.once('pointerdown', () => this.resume(returnTo, boss));

    // Auto-pause on tab blur
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.scene.isPaused(returnTo)) {
        this.scene.pause(returnTo);
        this.scene.launch('PauseOverlay', { returnTo, boss });
      }
    });
  }

  resume(targetKey, boss) {
    this.sound.resumeAll();
    boss?.resumeBossFight();
    this.scene.stop();
    this.scene.resume(targetKey);
  }

  shutdown() {
    this.resumeKey?.destroy();
  }
}
