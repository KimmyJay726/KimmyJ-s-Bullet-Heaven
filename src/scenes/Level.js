// src/scenes/Level.js
import Boss1 from '../scenes/Boss1.js';

export default class Level extends Phaser.Scene {
  constructor() {
    super('Level');

    // player movement & spin stats...
    this.playerVelocity     = 300;
    this.playerAcceleration = 1200;
    this.dragAmount         = 1200;
    this.spinSpeedIdle      = 120;
    this.spinSpeedMax       = 360;
    this.colorCycleSpeed    = 90;
  }

  preload() {
    // load player art
    this.load.image('Player', 'assets/player.png');

    // load boss art
    Boss1.preload(this);
  }

  create() {
    // — Player setup (unchanged) —
    this.leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.upKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.downKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    this.player = this.physics.add
      .sprite(639, 550, 'Player')
      .setScale(0.125)
      .setOrigin(0.5, 0.603);
    this.player.body
      .setDrag(this.dragAmount, this.dragAmount)
      .setMaxVelocity(this.playerVelocity, this.playerVelocity);

    // — Delay spawn of Boss1 by 3000ms (3 seconds) —
    this.time.delayedCall(
      3000,
      () => {
        // instantiate boss
        this.boss = new Boss1(this, 400, 200);

        // collision handler
        this.physics.add.overlap(
          this.player,
          this.boss,
          this.onPlayerHitBoss,
          null,
          this
        );
      },
      [],
      this
    );
  }

  update(time, delta) {
    // — Player movement, spin, bounds, color-cycle (unchanged) —
    let accX = 0, accY = 0;
    if (this.leftKey.isDown && !this.rightKey.isDown)  accX = -this.playerAcceleration;
    else if (this.rightKey.isDown && !this.leftKey.isDown) accX = this.playerAcceleration;
    if (this.upKey.isDown   && !this.downKey.isDown)   accY = -this.playerAcceleration;
    else if (this.downKey.isDown && !this.upKey.isDown)    accY = this.playerAcceleration;
    this.player.setAcceleration(accX, accY);

    const speed      = this.player.body.velocity.length();
    const speedRatio = Phaser.Math.Clamp(speed / this.playerVelocity, 0, 1);
    const spinRate   = Phaser.Math.Linear(this.spinSpeedIdle, this.spinSpeedMax, speedRatio);
    this.player.setAngularVelocity(spinRate);

    const halfW = this.player.displayWidth  / 2;
    const halfH = this.player.displayHeight / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x, 50 + halfW, this.game.config.width  - 50 - halfW);
    this.player.y = Phaser.Math.Clamp(this.player.y, 50 + halfH, this.game.config.height - 50 - halfH);

    const hue      = ((time * this.colorCycleSpeed) / 1000 % 360) / 360;
    const rgbColor = Phaser.Display.Color.HSVToRGB(hue, 0.1, 1);
    this.player.setTint(rgbColor.color);

    // — Boss update (only if spawned) —
    if (this.boss) {
      this.boss.update(time, delta);
    }
  }

  onPlayerHitBoss(player, boss) {
    // flash red then restart
    player.setTint(0xff0000);
    this.time.delayedCall(200, () => this.scene.restart());
  }
}
