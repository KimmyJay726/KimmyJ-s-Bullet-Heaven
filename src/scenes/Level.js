// src/scenes/Level.js
import Boss1 from '../scenes/Boss1.js';

export default class Level extends Phaser.Scene {
  constructor() {
    super('Level');

    // Movement
    this.playerVelocity  = 300;
    this.dashSpeed       = 600;
    this.dashDuration    = 200;   // ms
    this.dashCooldown    = 1000;  // ms

    // Spin & color
    this.spinSpeedIdle   = 120;
    this.spinSpeedMax    = 360;
    this.colorCycleSpeed = 90;
  }

  preload() {
    this.load.image('Player', 'assets/player.png');
    Boss1.preload(this);
    this.load.audio('hitSfx', 'assets/Laser2.wav');
    this.load.audio('boss1Music', 'assets/03-IMAGE-MATERIAL-2.mp3');
	this.load.image('background', 'assets/BulletHeavenBackground.png');

  }

  create() {
    // Input
    this.leftKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.upKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.rightKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.downKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.dashKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // Dash state
    this.canDash      = true;
    this.isDashing    = false;
    this.dashTimer    = 0;
    this.cooldownTimer= 0;
    this.dashDir      = new Phaser.Math.Vector2();

    // Sounds
    this.hitSfx     = this.sound.add('hitSfx');
    this.boss1Music = this.sound.add('boss1Music', { loop: true, volume: 0.4 });
	
	// Images
	this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'background')
	.setOrigin(0.5, 0.5)
	.setDepth(-1); // Ensures it's behind other objects


    // Player
    this.player = this.physics.add
      .sprite(639, 550, 'Player')
      .setScale(0.125)
      .setOrigin(0.5, 0.603);

    this.player.body.setMaxVelocity(this.playerVelocity, this.playerVelocity);

    // Health & regen
    this.player.maxHp          = 100;
    this.player.hp             = this.player.maxHp;
    this.player.lastDamageTime = 0;
    this.player.regenTimer     = 0;
    this.player.regenDelay     = 5000;
    this.player.regenInterval  = 1000;

    // Boss spawn
    this.time.delayedCall(3000, () => {
      this.boss1Music.play();
      this.boss = new Boss1(this, 600, 0);
      // existing overlaps
	this.physics.add.overlap(
		this.player,
		this.boss,
		this.onPlayerHitBoss,
		null,
		this
	);

	this.physics.add.overlap(
		this.player,
		this.boss.bossBullets,
		this.onPlayerHitBullet,
		null,
		this
	);

	// ← new: wallBullets should also hurt the player
	this.physics.add.overlap(
		this.player,
		this.boss.wallBullets,
		this.onPlayerHitWallBullet,
		null,
		this
	);
		});
	}

  update(time, delta) {
    // Build raw input vector
    const inputVec = new Phaser.Math.Vector2(
      this.rightKey.isDown - this.leftKey.isDown,
      this.downKey.isDown  - this.upKey.isDown
    );

    // Dash initiation
    if (!this.isDashing && this.canDash && Phaser.Input.Keyboard.JustDown(this.dashKey) && inputVec.lengthSq() > 0) {
      this.isDashing    = true;
      this.canDash      = false;
      this.dashTimer    = 0;
      this.dashDir.copy(inputVec).normalize();
    }

    let velocity = new Phaser.Math.Vector2();

    // During dash: override velocity
    if (this.isDashing) {
      velocity.copy(this.dashDir).scale(this.dashSpeed);

      this.dashTimer += delta;
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing    = false;
        this.cooldownTimer= 0;
      }

    } else {
      // Normal movement (normalized for diagonals)
      if (inputVec.lengthSq() > 0) {
        velocity.copy(inputVec).normalize().scale(this.playerVelocity);
      }

      // Dash cooldown
      if (!this.canDash) {
        this.cooldownTimer += delta;
        if (this.cooldownTimer >= this.dashCooldown) {
          this.canDash = true;
        }
      }
    }

    // Apply velocity
    this.player.setVelocity(velocity.x, velocity.y);

    // Spin based on speed
    const speed      = this.player.body.velocity.length();
    const ratio      = Phaser.Math.Clamp(speed / this.playerVelocity, 0, 1);
    const spinRate   = Phaser.Math.Linear(this.spinSpeedIdle, this.spinSpeedMax, ratio);
    this.player.setAngularVelocity(spinRate);

    // Clamp to bounds
    const halfW = this.player.displayWidth  / 2;
    const halfH = this.player.displayHeight / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x, 50 + halfW, this.game.config.width  - 50 - halfW);
    this.player.y = Phaser.Math.Clamp(this.player.y, 50 + halfH, this.game.config.height - 50 - halfH);

    // Color cycle
    const hue      = ((time * this.colorCycleSpeed) / 1000 % 360) / 360;
    const rgbColor = Phaser.Display.Color.HSVToRGB(hue, 0.1, 1);
    this.player.setTint(rgbColor.color);

    // Health regeneration
    if (this.player.hp < this.player.maxHp) {
      const sinceHit = time - this.player.lastDamageTime;
      if (sinceHit > this.player.regenDelay) {
        this.player.regenTimer += delta;
        if (this.player.regenTimer >= this.player.regenInterval) {
          this.player.regenTimer -= this.player.regenInterval;
          this.player.hp = Phaser.Math.Clamp(this.player.hp + 1, 0, this.player.maxHp);
          this.player.setAlpha(this.player.hp / this.player.maxHp);
        }
      }
    }

    if (this.boss) {
      this.boss.update(time, delta);
    }
  }

  onPlayerHitBoss(player, boss) {
    this.hitSfx.play();
    player.lastDamageTime = this.time.now;
    player.regenTimer     = 0;

    if (player.hp > 0) {
      player.hp--;
      player.setAlpha(player.hp / player.maxHp);
    }

    if (player.hp <= 0) {
      player.setTint(0xff0000);
      this.time.delayedCall(500, () => this.scene.restart());
    }
  }

  onPlayerHitBullet(player, bullet) {
    bullet.destroy();
    this.hitSfx.play();
    player.lastDamageTime = this.time.now;
    player.regenTimer     = 0;

    if (player.hp > 0) {
      player.hp--;
      player.setAlpha(player.hp / player.maxHp);
    }

    if (player.hp <= 0) {
      player.setTint(0xff0000);
      this.time.delayedCall(500, () => this.scene.restart());
    }
  }

  onPlayerHitWallBullet(player, wallBullet) {
  this.hitSfx.play();

  // reset regen timers
  player.lastDamageTime = this.time.now;
  player.regenTimer     = 0;

  // subtract HP
  if (player.hp > 0) {
    player.hp--;
    player.setAlpha(player.hp / player.maxHp);
  }

  // check for death
  if (player.hp <= 0) {
    player.setTint(0xff0000);
    this.time.delayedCall(500, () => this.scene.restart());
  }
}

}
