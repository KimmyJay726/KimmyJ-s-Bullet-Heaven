export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, inputKeys, config) {
    super(scene, x, y, 'Player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Pull in config constants
    this.velocity     = config.playerVelocity;
    this.dashSpeed    = config.dashSpeed;
    this.dashDuration = config.dashDuration;
    this.dashCooldown = config.dashCooldown;
    this.spinIdle     = config.spinSpeedIdle;
    this.spinMax      = config.spinSpeedMax;
    this.colorSpeed   = config.colorCycleSpeed;

    // Input keys
    this.keys = inputKeys;

    // Scale & bounds
    this.setScale(0.125).setOrigin(0.5, 0.603);
    this.body.setMaxVelocity(this.velocity, this.velocity);

    // Dash state
    this.canDash       = true;
    this.isDashing     = false;
    this.dashTimer     = 0;
    this.cooldownTimer = 0;
    this.dashDir       = new Phaser.Math.Vector2();

    // Health & regen
    this.maxHp          = 100;
    this.hp             = this.maxHp;
    this.lastDamageTime = 0;
    this.regenTimer     = 0;
    this.regenDelay     = 5000;
    this.regenInterval  = 1000;

    // Death state
    this.isDead = false;
  }

  static preload(scene) {
    scene.load.image('Player', 'assets/player.svg');
    scene.load.audio('gameOverMusic', 'assets/Halcyon.mp3'); // 🎵 preload Game Over track
  }

  update(time, delta) {
    if (this.isDead) {
      this.setVelocity(0, 0);
      this.setAngularVelocity(0);
      return;
    }

    const { leftKey, rightKey, upKey, downKey, dashKey } = this.keys;
    const inputVec = new Phaser.Math.Vector2(
      rightKey.isDown - leftKey.isDown,
      downKey.isDown  - upKey.isDown
    );

    if (!this.isDashing && this.canDash && Phaser.Input.Keyboard.JustDown(dashKey) && inputVec.lengthSq()) {
      this.isDashing = true;
      this.canDash   = false;
      this.dashTimer = 0;
      this.dashDir.copy(inputVec).normalize();
    }

    let vel = new Phaser.Math.Vector2();

    if (this.isDashing) {
      vel.copy(this.dashDir).scale(this.dashSpeed);
      this.dashTimer += delta;
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing     = false;
        this.cooldownTimer = 0;
      }
    } else {
      if (inputVec.lengthSq()) {
        vel.copy(inputVec).normalize().scale(this.velocity);
      }
      if (!this.canDash) {
        this.cooldownTimer += delta;
        if (this.cooldownTimer >= this.dashCooldown) {
          this.canDash = true;
        }
      }
    }

    this.setVelocity(vel.x, vel.y);

    const speed = this.body.velocity.length();
    const ratio = Phaser.Math.Clamp(speed / this.velocity, 0, 1);
    const spin  = Phaser.Math.Linear(this.spinIdle, this.spinMax, ratio);
    this.setAngularVelocity(spin);

    const halfW = this.displayWidth / 2;
    const halfH = this.displayHeight / 2;
    this.x = Phaser.Math.Clamp(this.x, 50 + halfW, this.scene.game.config.width  - 50 - halfW);
    this.y = Phaser.Math.Clamp(this.y, 50 + halfH, this.scene.game.config.height - 50 - halfH);

    const hue      = ((time * this.colorSpeed) / 1000 % 360) / 360;
    const rgbColor = Phaser.Display.Color.HSVToRGB(hue, 0.1, 1);
    this.setTint(rgbColor.color);

    if (this.hp < this.maxHp) {
      const sinceHit = time - this.lastDamageTime;
      if (sinceHit > this.regenDelay) {
        this.regenTimer += delta;
        if (this.regenTimer >= this.regenInterval) {
          this.regenTimer  -= this.regenInterval;
          this.hp          = Phaser.Math.Clamp(this.hp + 1, 0, this.maxHp);
          this.setAlpha(this.hp / this.maxHp);
        }
      }
    }
  }

  takeDamage(amount = 1) {
    if (this.isDead) return;

    this.lastDamageTime = this.scene.time.now;
    this.regenTimer     = 0;
    this.hp = Phaser.Math.Clamp(this.hp - amount, 0, this.maxHp);
    this.setAlpha(this.hp / this.maxHp);

    this.scene.sound.play('hitSfx');

    if (this.hp <= 0) {
      this.isDead = true;
      this.setTint(0xff0000);
      this.setVelocity(0, 0);
      this.setAngularVelocity(0);

      // Stop existing music
      this.scene.sound.stopAll();

      // Play game over music
      this.scene.sound.play('gameOverMusic', { loop: false, volume: 0.6 });

      // Pause boss
      if (this.scene.boss && typeof this.scene.boss.pauseBossFight === 'function') {
        this.scene.boss.pauseBossFight();
      }

      // Show overlay
      this.showGameOverOverlay();
    }
  }

  showGameOverOverlay() {
  if (this.scene._gameOverShown) return;
  this.scene._gameOverShown = true;

  const cam = this.scene.cameras.main;
  const w = cam.width;
  const h = cam.height;

  const ui = this.scene.add.container(w / 2, h / 2).setDepth(9999);
  ui.setScrollFactor(0);

  const dim = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.6)
    .setOrigin(0.5)
    .setInteractive();

  const title = this.scene.add.text(0, -40, 'Game Over', {
    fontFamily: 'Arial',
    fontSize: '48px',
    color: '#fff',
    stroke: '#000',
    strokeThickness: 6
  }).setOrigin(0.5);

  const hint = this.scene.add.text(0, 110, 'Press R to Restart', {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#ccc'
  }).setOrigin(0.5);

  const restartBtn = this.scene.add.text(0, 20, 'Restart', {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: '#fff',
    backgroundColor: '#1e88e5',
    padding: { left: 16, right: 16, top: 8, bottom: 8 }
  }).setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#1565c0' }))
    .on('pointerout',  () => restartBtn.setStyle({ backgroundColor: '#1e88e5' }))
    .on('pointerdown', () => this._restartLevel());

  // 🎯 New Main Menu button
  const menuBtn = this.scene.add.text(0, 65, 'Main Menu', {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: '#fff',
    backgroundColor: '#43a047',
    padding: { left: 16, right: 16, top: 8, bottom: 8 }
  }).setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#2e7d32' }))
    .on('pointerout',  () => menuBtn.setStyle({ backgroundColor: '#43a047' }))
    .on('pointerdown', () => this._goToMainMenu());

  const rKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  rKey.once('down', () => this._restartLevel());

  ui.add([dim, title, restartBtn, menuBtn, hint]);
  this.scene._gameOverUI = ui;
}

_restartLevel() {
  if (this.scene._gameOverUI) {
    this.scene._gameOverUI.destroy(true);
    this.scene._gameOverUI = null;
  }
  this.scene._gameOverShown = false;

  // Stop death music
  this.scene.sound.stopByKey('gameOverMusic');

  this.scene.scene.restart();
}

// 🌟 New helper
_goToMainMenu() {
  if (this.scene._gameOverUI) {
    this.scene._gameOverUI.destroy(true);
    this.scene._gameOverUI = null;
  }
  this.scene._gameOverShown = false;

  // Stop death music
  this.scene.sound.stopByKey('gameOverMusic');

  // Switch to MainMenu scene
  this.scene.scene.start('MainMenu');
}


}
