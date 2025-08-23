export default class SettingsOverlay extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsOverlay' });
  }

  create(data) {
    const { returnTo } = data;
    const { width, height } = this.scale;

    // Background dimmer
    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.resume(returnTo));

    // Title
    this.add
      .text(width / 2, height / 2 - 70, 'Settings', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    // Back button
    const backButton = this.add
      .text(width / 2, height / 2 + 70, 'Back', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#fff',
        backgroundColor: '#607d8b',
        padding: { left: 16, right: 16, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backButton.setStyle({ backgroundColor: '#455a64' }))
      .on('pointerout', () => backButton.setStyle({ backgroundColor: '#607d8b' }))
      .on('pointerdown', () => this.resume(returnTo));

    // Volume label
    this.add.text(width / 2 - 100, height / 2, 'Volume:', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#fff'
    }).setOrigin(0.5);

    // Volume slider
    const sliderWidth = 200;
    const sliderX = width / 2 + 30;
    const sliderY = height / 2;
    const initialVolume = this.sound.volume;

    // The slider track
    this.add.rectangle(sliderX, sliderY, sliderWidth, 10, 0x666666).setOrigin(0.5);

    // The slider handle
    const handle = this.add.rectangle(sliderX - sliderWidth / 2 + initialVolume * sliderWidth, sliderY, 20, 20, 0xffffff)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    this.input.setDraggable(handle);
    this.input.on('drag', (pointer, gameObject, dragX) => {
      const newX = Phaser.Math.Clamp(dragX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
      gameObject.x = newX;
      const newVolume = (newX - (sliderX - sliderWidth / 2)) / sliderWidth;
      this.sound.volume = newVolume;
    });

    this.resumeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.resumeKey.once('down', () => this.resume(returnTo));
  }

  resume(targetKey) {
    this.scene.stop();
    this.scene.resume(targetKey);
  }

  shutdown() {
    this.resumeKey?.destroy();
  }
}