export default class Level extends Phaser.Scene {
  
  constructor() {
    super("Level");

    /* START-USER-CTR-CODE */
    // Movement stats
    this.playerVelocity     = 200;    // world units/sec
    this.playerAcceleration = 1200;   // units/sec²
    this.dragAmount         = 1200;   // units/sec²

    // Spin settings
    this.spinSpeedIdle = 120;          // deg/sec when completely still
    this.spinSpeedMax  = 360;         // deg/sec at full top speed

	// Color-cycle speed in degrees of hue per second
    this.colorCycleSpeed = 90;  
    
    /* END-USER-CTR-CODE */
  }

  editorCreate() {
    // Input
    this.leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.upKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.downKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    // Player sprite
    this.player = this.physics.add.sprite(639, 550, "Player")
      .setScale(0.125)
      // make sure pivot is centered
      .setOrigin(0.5, 0.603);

    // Physics
    this.player.body
      .setDrag(this.dragAmount, this.dragAmount)
      .setMaxVelocity(this.playerVelocity, this.playerVelocity);

    this.events.emit("scene-awake");
  }

  create() {
    this.editorCreate();
  }

 update(time, delta) {
    // — your existing accel + spin + bounds code —
    // 1) Acceleration (unchanged)
    let accX = 0;
    let accY = 0;
    if (this.leftKey.isDown && !this.rightKey.isDown)  accX = -this.playerAcceleration;
    else if (this.rightKey.isDown && !this.leftKey.isDown) accX = this.playerAcceleration;
    if (this.upKey.isDown && !this.downKey.isDown)    accY = -this.playerAcceleration;
    else if (this.downKey.isDown && !this.upKey.isDown)  accY = this.playerAcceleration;
    this.player.setAcceleration(accX, accY);

    // 2) Spin based on speed (unchanged)
    const speed      = this.player.body.velocity.length();
    const speedRatio = Phaser.Math.Clamp(speed / this.playerVelocity, 0, 1);
    const spinRate   = Phaser.Math.Linear(this.spinSpeedIdle, this.spinSpeedMax, speedRatio);
    this.player.setAngularVelocity(spinRate);

    // 3) Bounds clamp (unchanged)
    const halfW = this.player.displayWidth  / 2;
    const halfH = this.player.displayHeight / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x, 50 + halfW, this.game.config.width  - 50 - halfW);
    this.player.y = Phaser.Math.Clamp(this.player.y, 50 + halfH, this.game.config.height - 50 - halfH);

    // 4) Color-cycle: compute hue [0..1], convert to RGB, tint sprite
    //    `time` is total ms since scene start.
    const hue      = ((time * this.colorCycleSpeed) / 1000 % 360) / 360;
    const rgbColor = Phaser.Display.Color.HSVToRGB(hue, 0.1, 1);
    this.player.setTint(rgbColor.color);
  }
}
