export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, inputKeys, config) {
    super(scene, x, y, 'Player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Config
    this.velocity     = config.playerVelocity;
    this.dashSpeed    = config.dashSpeed;
    this.dashDuration = config.dashDuration;
    this.dashCooldown = config.dashCooldown;
    this.spinIdle     = config.spinSpeedIdle;
    this.spinMax      = config.spinSpeedMax;
    this.colorSpeed   = config.colorCycleSpeed;

    // Inputs
    this.keys = inputKeys;
    this.wasd = scene.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });
    this.space = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Display and physics
    this.baseScale = 0.125;
    this.setScale(this.baseScale).setOrigin(0.5, 0.603);
    this.body.setMaxVelocity(this.velocity, this.velocity);

    // Dash state
    this.canDash       = true;
    this.isDashing     = false;
    this.dashTimer     = 0;
    this.cooldownTimer = 0;
    this.dashDir       = new Phaser.Math.Vector2();
    this.isInvincible  = false;
    this.lastMoveDir   = new Phaser.Math.Vector2(1, 0);
    this.dashReadyPlayed = false;


    // FX
    this.dashEmitter = null;
    this._dashFxOn   = false;

    // Health
    this.maxHp          = 100;
    this.hp             = this.maxHp;
    this.lastDamageTime = 0;
    this.regenTimer     = 0;
    this.regenDelay     = 5000;
    this.regenInterval  = 1000;

    // Death
    this.isDead = false;

    //Costumes
    this.currentCostume = 'Player'; // start with normal


    
  }

  static preload(scene) {
    scene.load.image('Player', 'assets/player.svg');
    scene.load.image('PlayerCooldown', 'assets/player_cooldown.png'); // <-- NEW costume
    scene.load.audio('gameOverMusic', 'assets/Halcyon.mp3');
    scene.load.audio('playerDeathSfx', 'assets/PlayerDeath.mp3');
    scene.load.audio('dashReadySfx', 'assets/Coin.mp3'); // <-- NEW

    // Create a tiny particle texture for dash FX if not present
    if (!scene.textures.exists('dashParticle')) {
      const g = scene.add.graphics();
      g.fillStyle(0xffff66, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('dashParticle', 8, 8);
      g.destroy();
    }
  }


  update(time, delta) {
    if (this.isDead) {
      this.setVelocity(0, 0);
      this.setAngularVelocity(0);
      return;
    }

    // Merge arrow keys + WASD
    const { leftKey, rightKey, upKey, downKey } = this.keys;
    const rightDown = (rightKey && rightKey.isDown) || this.wasd.right.isDown;
    const leftDown  = (leftKey  && leftKey.isDown)  || this.wasd.left.isDown;
    const downDown  = (downKey  && downKey.isDown)  || this.wasd.down.isDown;
    const upDown    = (upKey    && upKey.isDown)    || this.wasd.up.isDown;

    const inputVec = new Phaser.Math.Vector2(
      (rightDown ? 1 : 0) - (leftDown ? 1 : 0),
      (downDown ? 1 : 0)  - (upDown ? 1 : 0)
    );

    // Remember last non-zero direction
    if (inputVec.lengthSq() > 0) {
      this.lastMoveDir.copy(inputVec).normalize();
    }

    // Trigger dash
    if (!this.isDashing && this.canDash && Phaser.Input.Keyboard.JustDown(this.space)) {
      this.isDashing    = true;
      this.canDash      = false;
      this.dashTimer    = 0;
      this.isInvincible = true;

      const dir = (inputVec.lengthSq() > 0) ? inputVec.clone().normalize() : this.lastMoveDir.clone();
      if (dir.lengthSq() === 0) dir.set(1, 0);
      this.dashDir.copy(dir);

      this._startDashFX();
    }

    // Movement
    let vel = new Phaser.Math.Vector2();

    if (this.isDashing) {
      vel.copy(this.dashDir).scale(this.dashSpeed);
      this.dashTimer += delta;
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing     = false;
        this.isInvincible  = false;
        this.cooldownTimer = 0;
        this._stopDashFX();
      }
    } else {
      if (inputVec.lengthSq()) {
        vel.copy(inputVec).normalize().scale(this.velocity);
      }
      if (!this.canDash) {
      this.cooldownTimer += delta;
      if (this.cooldownTimer >= this.dashCooldown) {
        this.canDash = true;

        // Play dash ready sound once
        if (!this.dashReadyPlayed && this.scene.sound) {
          this.scene.sound.play('dashReadySfx', { volume: 0.6 });
          this.dashReadyPlayed = true;
        }
      }
      } else {
        // Reset flag when dash is used again
        this.dashReadyPlayed = false;
}

    }

    this.setVelocity(vel.x, vel.y);

    // Spin based on speed
    const speed = this.body.velocity.length();
    const ratio = Phaser.Math.Clamp(speed / this.velocity, 0, 1);
    const spin  = Phaser.Math.Linear(this.spinIdle, this.spinMax, ratio);
    this.setAngularVelocity(spin);

    // Bounds clamp
    const halfW = this.displayWidth / 2;
    const halfH = this.displayHeight / 2;
    const gw = this.scene.game.config.width;
    const gh = this.scene.game.config.height;
    this.x = Phaser.Math.Clamp(this.x, 50 + halfW, gw - 50 - halfW);
    this.y = Phaser.Math.Clamp(this.y, 50 + halfH, gh - 50 - halfH);

   // Visual states
  // Visual states
if (this.isDashing) {
  this.setTexture('Player'); // always normal while dashing
  this.setTint(0xffff66);
} else if (!this.canDash) {
  // Freeze color cycle
  if (this.lastHue !== undefined) {
    const rgbColor = Phaser.Display.Color.HSVToRGB(this.lastHue, 0.1, 1);
    this.setTint(rgbColor.color);
  }

  // Switch to cooldown costume if not already
  if (this.currentCostume !== 'PlayerCooldown') {
    this.setTexture('PlayerCooldown');
    this.currentCostume = 'PlayerCooldown';
  }

  this.setScale(this.baseScale);
  if (this.dashEmitter && this._dashFxOn) this.dashEmitter.stop();
  this._dashFxOn = false;
} else {
  // Dash ready — resume color cycle
  const hue = ((time * this.colorSpeed) / 1000 % 360) / 360;
  this.lastHue = hue;
  const rgbColor = Phaser.Display.Color.HSVToRGB(hue, 0.1, 1);
  this.setTint(rgbColor.color);

  // Switch back to normal costume if needed
  if (this.currentCostume !== 'Player') {
    this.setTexture('Player');
    this.currentCostume = 'Player';
  }

  this.setScale(this.baseScale);
  if (this.dashEmitter && this._dashFxOn) this.dashEmitter.stop();
  this._dashFxOn = false;
}



    // Health regen
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
    if (this.isDead || this.isInvincible) return;

    this.lastDamageTime = this.scene.time.now;
    this.regenTimer = 0;
    this.hp = Phaser.Math.Clamp(this.hp - amount, 0, this.maxHp);
    this.setAlpha(this.hp / this.maxHp);

    // Play your hit SFX if loaded
    if (this.scene.sound && this.scene.sound.play) {
      this.scene.sound.play('hitSfx');
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.setTint(0xff0000);
      this.setVelocity(0, 0);
      this.setAngularVelocity(0);

      // Stop dash FX if any
      this._stopDashFX();

      // Stop existing music/tracks
      this.scene.sound.stopAll();

      // Play death SFX first, then start Game Over music when it completes
      const deathSfx = this.scene.sound.add('playerDeathSfx');
      deathSfx.once(Phaser.Sound.Events.COMPLETE, () => {
        this.scene.sound.play('gameOverMusic', { loop: false, volume: 0.4 });
      });
      deathSfx.play({ volume: 1 });

      // Pause boss if provided
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
    this.scene.sound.stopByKey('playerDeathSfx');

    this.scene.scene.restart();
  }

  _goToMainMenu() {
    if (this.scene._gameOverUI) {
      this.scene._gameOverUI.destroy(true);
      this.scene._gameOverUI = null;
    }
    this.scene._gameOverShown = false;

    // Stop death music
    this.scene.sound.stopByKey('gameOverMusic');
    this.scene.sound.stopByKey('playerDeathSfx');

    // Switch to MainMenu scene
    this.scene.scene.start('MainMenu');
  }

  // ===== Dash FX helpers (Phaser 3.60+) =====
  _startDashFX() {
    // Tint + slight scale up
    this.setTint(0xffff66);
    this.setScale(this.baseScale * 1.12);

    // Create emitter once using Phaser 3.60+ API (emitter is the GameObject)
    if (!this.dashEmitter) {
      this.dashEmitter = this.scene.add.particles(0, 0, 'dashParticle', {
        lifespan: 200,
        speed: { min: 60, max: 140 },
        angle: { min: 160, max: 200 },
        quantity: 2,
        frequency: 20,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.9, end: 0 }
      });
      this.dashEmitter.startFollow(this);
    } else {
      this.dashEmitter.start();
    }

    this._dashFxOn = true;
  }

  _stopDashFX() {
    this.setScale(this.baseScale);
    if (this.dashEmitter) this.dashEmitter.stop();
    this._dashFxOn = false;
  }
}
