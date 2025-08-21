// src/scenes/Level.js
import Boss1 from '../objects/Boss1.js';
import Boss2 from '../objects/Boss2.js';
import Player from '../objects/Player.js';

export default class Level extends Phaser.Scene {
  constructor() {
    super('Level');

    this.playerConfig = {
      playerVelocity: 300,
      dashSpeed: 600,
      dashDuration: 200,
      dashCooldown: 15000,
      spinSpeedIdle: 120,
      spinSpeedMax: 360,
      colorCycleSpeed: 90
    };
  }

  preload() {
    // Keep lightweight assets here. Boss music is now preloaded in LoadingScene.
    Player.preload(this);
    Boss1.preload(this);
    Boss2.preload(this);

    this.load.audio('hitSfx', 'assets/Laser2.wav');
    this.load.image('background', 'assets/InGameBackground.png');
  }

 create(data) {
  this.bossType = data.bossType || 'Boss1';

  // Input keys
  const keys = {
    leftKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
    upKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    rightKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    downKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
    dashKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
  };

  // Background
  this.add.image(this.scale.width / 2, this.scale.height / 2, 'background')
      .setOrigin(0.5).setDepth(-1);

  // Player
  this.player = new Player(this, 639, 550, keys, this.playerConfig);

  // Per-boss timing
  const bossSpawnDelayMap = { Boss1: 1, Boss2: 2500 };
  const musicStartDelayMap = { Boss1: 3000, Boss2: 5000 }; // independent from spawn

  // Schedule music independently
  const musicDelay = musicStartDelayMap[this.bossType] ?? 3000;
  this.time.delayedCall(musicDelay, () => {
    const musicKey = this.bossType === 'Boss2' ? 'boss2Music' : 'boss1Music';
    this.sound.play(musicKey, { loop: true, volume: 0.4 });
  });

  // Boss intro → spawn after its own delay
  this.time.delayedCall(2000, () => {
    this.showBossIntro(this.bossType, () => {
      const spawnDelay = bossSpawnDelayMap[this.bossType] ?? 0;
      this.time.delayedCall(spawnDelay, () => {
        this.spawnBoss(this.bossType);
      });
    });
  });

    // Pause
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseKey.on('down', () => {
      if (this.scene.isActive(this.sys.settings.key) && !this.scene.isActive('PauseOverlay')) {
        this.launchPauseOverlay();
      }
    });

    // Auto pause on tab blur
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.scene.isActive(this.sys.settings.key) && !this.scene.isActive('PauseOverlay')) {
          this.launchPauseOverlay();
        }
      }
    });
  }

  showBossIntro(bossType, onComplete) {
  const bossNameMap = {
    Boss1: 'ARCHANGEL APPROACHING',
    Boss2: 'PRINCIPALITY APPROACHING'
  };
  const label = bossNameMap[bossType] || 'UNKNOWN FOE';

  // Per-boss intro timing (ms)
  const introTimingMap = {
    // Tighter intro
    Boss1: { fadeIn: 500, hold: 750, fadeOut: 250 },
    // Longer, more dramatic intro
    Boss2: { fadeIn: 500, hold: 1000, fadeOut: 500 }
  };
  const { fadeIn, hold, fadeOut } = introTimingMap[bossType] || { fadeIn: 500, hold: 1000, fadeOut: 500 };

  // Dark overlay
  const overlay = this.add
    .rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.75
    )
    .setDepth(10)
    .setAlpha(0);

  // Boss name text — upper middle
  const text = this.add
    .text(this.scale.width / 2, this.scale.height / 4, label, {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: '#ff4444'
    })
    .setOrigin(0.5)
    .setDepth(11)
    .setAlpha(0);

  // Fade in → hold → fade out (custom per boss)
  this.tweens.add({
    targets: [overlay, text],
    alpha: 1,
    duration: fadeIn,
    ease: 'Power2',
    onComplete: () => {
      this.time.delayedCall(hold, () => {
        this.tweens.add({
          targets: [overlay, text],
          alpha: 0,
          duration: fadeOut,
          ease: 'Power2',
          onComplete: () => {
            overlay.destroy();
            text.destroy();
            if (onComplete) onComplete();
          }
        });
      });
    }
  });
}


  spawnBoss(type) {
    if (type === 'Boss2') {
      this.boss = new Boss2(this, 640, 0);
    } else {
      this.boss = new Boss1(this, 640, 0);
    }

    // Collisions
    this.physics.add.overlap(this.player, this.boss, () => this.player.takeDamage(), null, this);
    this.physics.add.overlap(this.player, this.boss.bossBullets, () => this.player.takeDamage(), null, this);
    this.physics.add.overlap(this.player, this.boss.wallBullets, () => this.player.takeDamage(), null, this);
    this.physics.add.overlap(this.player, this.boss.starBullets, () => this.player.takeDamage(), null, this);
    this.physics.add.overlap(this.player, this.boss.angelBullets, () => this.player.takeDamage(), null, this);
  }

  launchPauseOverlay() {
    this.scene.pause();
    this.sound.pauseAll();

    if (this.boss && this.boss.body) {
      this.boss.pauseBossFight();
    }

    this.scene.launch('PauseOverlay', { returnTo: this.sys.settings.key, boss: this.boss });
  }

  update(time, delta) {
    if (this.player) this.player.update(time, delta);
    if (this.boss) this.boss.update(time, delta);
  }
}
