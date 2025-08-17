// src/gameobjects/Boss1.js

export default class Boss1 extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'Boss1') {
    super(scene, x, y, texture);

    // add to scene and enable physics body
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // basic setup
    this.setOrigin(0.5);
    this.setScale(0.125);

    // core parameters
    this.speed = 100;

    // define your states in a fixed sequence, each with its duration and entry method
    this.states = [
        { key: 'START', duration: 50000, enter: this.enterStart },
        { key: 'BOUNCE', duration: 5000, enter: this.enterBounce },
        { key: 'CHASE',  duration: 5000, enter: this.enterChase },
        { key: 'SHOOT',  duration: 5000, enter: this.enterShoot }
    ];
    this.currentState = 0;

    // kick off the first state immediately
    this.scheduleState(0);

    //Bullet Group
    this.bossBullets = scene.physics.add.group();
  }

  // preload your assets
  static preload(scene) {
    scene.load.image('Boss1', 'assets/Star.png');
    scene.load.image('Bullet', 'assets/bossbullet.png'); // for the SHOOT state
  }

  // schedules and enters the state at index `i`
  scheduleState(i) {
    // clear any existing timers
    if (this.stateTimer) {
      this.stateTimer.remove(false);
    }

    this.currentState = i;
    const { key, duration, enter } = this.states[i];

    // invoke the entry logic for this state
    enter.call(this, key);

    // after `duration`, advance to the next state (wrap-around)
    this.stateTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => this.scheduleState((i + 1) % this.states.length)
    });
  }

  // -------------------------
  // State entry callbacks
  // -------------------------

  enterStart() {
  this.stateName = 'START';
  this.body.setCollideWorldBounds(false);

  // 1) Fire off the movement
  this.scene.physics.moveTo(this, 600, 100, this.speed);

  // 2) Compute how long it will take to get there
  const distance = Phaser.Math.Distance.Between(this.x, this.y, 600, 100);
  const travelTime = (distance / this.speed) * 1000; // in ms

  // 3) Schedule a stop exactly when it arrives
  this.scene.time.delayedCall(travelTime, () => {
    this.body.setVelocity(0, 0);
    this.setPosition(600, 100);    // snap to exact target
    this.stateName = 'STOP';
  });
}

  // bounce around the world bounds
  enterBounce() {
    this.stateName = 'BOUNCE';
    const vx = Phaser.Math.Between(-this.speed, this.speed);
    const vy = Phaser.Math.Between(-this.speed, this.speed);

    this.body
      .setVelocity(vx, vy)
      .setCollideWorldBounds(true)
      .setBounce(1);
  }

  // chase the player (requires scene.player to exist)
  enterChase() {
    this.stateName = 'CHASE';
    this.body.setCollideWorldBounds(false);
    this.scene.physics.moveTo(
      this,
      this.scene.player.x,
      this.scene.player.y,
      this.speed
    );
  }

  // stop and fire a volley of bullets
  enterShoot() {
    this.stateName = 'SHOOT';
    this.body.setVelocity(0);
    this.body.setCollideWorldBounds(false);

    // spray 10 bullets at 500ms intervals
    this.shootTimer = this.scene.time.addEvent({
      delay: 500,
      repeat: 9,
      callback: this.fireBullet,
      callbackScope: this
    });
  }

  /// inside src/gameobjects/Boss1.js

  // spawn and fire one bullet toward the player
  
  fireBullet() {
  // ← use the group instead of scene.physics.add.image
  const bullet = this.bossBullets.create(this.x, this.y, 'Bullet');
  bullet.setScale(0.1);

  const angleRad = Phaser.Math.Angle.Between(
    this.x, this.y,
    this.scene.player.x, this.scene.player.y
  );
  bullet.setRotation(angleRad);
  this.scene.physics.velocityFromRotation(angleRad, 200, bullet.body.velocity);

  this.scene.time.delayedCall(3000, () => bullet.destroy());
}


  // -------------------------
  // Phaser update loop
  // -------------------------
  update(time, delta) {
    // always rotate for some visual flair
    this.angle += 90 * (delta / 1000);

    if (this.stateName === 'CHASE') {
      // if the player moves, keep updating velocity toward them
      this.scene.physics.moveTo(
        this,
        this.scene.player.x,
        this.scene.player.y,
        this.speed
      );
    }
  }
}
