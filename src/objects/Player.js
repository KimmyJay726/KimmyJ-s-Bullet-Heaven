// src/objects/Player.js

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
    this.canDash      = true;
    this.isDashing    = false;
    this.dashTimer    = 0;
    this.cooldownTimer= 0;
    this.dashDir      = new Phaser.Math.Vector2();

    // Health & regen
    this.maxHp          = 100;
    this.hp             = this.maxHp;
    this.lastDamageTime = 0;
    this.regenTimer     = 0;
    this.regenDelay     = 5000;
    this.regenInterval  = 1000;
  }

  static preload(scene) {
    scene.load.image('Player', 'assets/player.svg');
  }

  update(time, delta) {
    // 1) Raw input
    const { leftKey, rightKey, upKey, downKey, dashKey } = this.keys;
    const inputVec = new Phaser.Math.Vector2(
      rightKey.isDown - leftKey.isDown,
      downKey.isDown  - upKey.isDown
    );

    // 2) Dash initiation
    if (!this.isDashing && this.canDash && Phaser.Input.Keyboard.JustDown(dashKey) && inputVec.lengthSq()) {
      this.isDashing = true;
      this.canDash   = false;
      this.dashTimer = 0;
      this.dashDir.copy(inputVec).normalize();
    }

    // 3) Compute velocity
    let vel = new Phaser.Math.Vector2();

    if (this.isDashing) {
      vel.copy(this.dashDir).scale(this.dashSpeed);
      this.dashTimer += delta;
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing    = false;
        this.cooldownTimer= 0;
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

    // 4) Spin based on speed
    const speed = this.body.velocity.length();
    const ratio = Phaser.Math.Clamp(speed / this.velocity, 0, 1);
    const spin  = Phaser.Math.Linear(this.spinIdle, this.spinMax, ratio);
    this.setAngularVelocity(spin);

    // 5) Clamp to game bounds
    const halfW = this.displayWidth  / 2;
    const halfH = this.displayHeight / 2;
    this.x = Phaser.Math.Clamp(this.x, 50 + halfW, this.scene.game.config.width  - 50 - halfW);
    this.y = Phaser.Math.Clamp(this.y, 50 + halfH, this.scene.game.config.height - 50 - halfH);

    // 6) Color cycle
    const hue      = ((time * this.colorSpeed) / 1000 % 360) / 360;
    const rgbColor = Phaser.Display.Color.HSVToRGB(hue, 0.1, 1);
    this.setTint(rgbColor.color);

    // 7) Health regen
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
    this.lastDamageTime = this.scene.time.now;
    this.regenTimer     = 0;
    this.hp = Phaser.Math.Clamp(this.hp - amount, 0, this.maxHp);
    this.setAlpha(this.hp / this.maxHp);

    this.scene.sound.play('hitSfx');

    if (this.hp <= 0) {
      this.setTint(0xff0000);
      this.scene.time.delayedCall(500, () => this.scene.restart());
    }
  }
}
