import SettingsOverlay from './SettingsOverlay.js';

export default class PauseOverlay extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseOverlay' });
  }

create(data) {
    const { returnTo, boss } = data;
    const { width, height } = this.scale;

    // Background dimmer (click to resume)
    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.resume(returnTo, boss));

    // Title
    this.add
      .text(width / 2, height / 2 - 100, 'Paused', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    // Hint
    this.add
      .text(width / 2, height / 2 - 50, 'Press ESC to resume', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#fff'
      })
      .setOrigin(0.5);

    // Buttons
    const makeButton = (y, label, bg, bgHover, onClick) => {
      const btn = this.add
        .text(width / 2, y, label, {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#fff',
          backgroundColor: bg,
          padding: { left: 16, right: 16, top: 8, bottom: 8 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setStyle({ backgroundColor: bgHover }))
        .on('pointerout', () => btn.setStyle({ backgroundColor: bg }))
        .on('pointerdown', (pointer, lx, ly, event) => {
          event?.stopPropagation(); // prevent background click from resuming
          onClick();
        });
      return btn;
    };

    // Adjusted button positions
    makeButton(height / 2, 'Settings', '#ff9800', '#f57c00', () => this.goToSettings(returnTo));
    makeButton(height / 2 + 50, 'Restart', '#1e88e5', '#1565c0', () => this.restart(returnTo));
    makeButton(height / 2 + 100, 'Main Menu', '#43a047', '#2e7d32', () => this.goToMainMenu(returnTo));

    // Pause audio and boss
    this.sound.pauseAll();
    boss?.pauseBossFight();

    // Keys
    this.resumeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.resumeKey.once('down', () => this.resume(returnTo, boss));

    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.restartKey.once('down', () => this.restart(returnTo));

    this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.menuKey.once('down', () => this.goToMainMenu(returnTo));

    // Auto-pause on tab blur
    this._onVisibilityChange = () => {
      if (document.hidden && !this.scene.isActive('PauseOverlay')) {
        this.scene.pause(returnTo);
        this.scene.launch('PauseOverlay', { returnTo, boss });
      }
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  resume(targetKey, boss) {
    this.sound.resumeAll();
    boss?.resumeBossFight();
    this.scene.stop(); // stop overlay
    this.scene.resume(targetKey);
  }

  restart(targetKey) {
    // Fresh restart of the target scene
    this.sound.stopAll();
    this.scene.stop(); // stop overlay
    if (this.scene.isActive(targetKey) || this.scene.isPaused(targetKey)) {
      this.scene.stop(targetKey);
    }
    this.scene.start(targetKey);
  }

  goToMainMenu(targetKey) {
    // Leave gameplay and open main menu
    this.sound.stopAll();
    if (this.scene.isActive(targetKey) || this.scene.isPaused(targetKey)) {
      this.scene.stop(targetKey);
    }
    this.scene.stop(); // stop overlay
    this.scene.start('MainMenu');
  }

  goToSettings(targetKey) {
    this.scene.launch('SettingsOverlay', { returnTo: 'PauseOverlay' });
  }

  shutdown() {
    this.resumeKey?.destroy();
    this.restartKey?.destroy();
    this.menuKey?.destroy();
    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
    }
  }
}