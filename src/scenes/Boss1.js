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
        { key: 'START', duration: 4500, enter: this.enterStart },
        { key: 'PHASE1', duration: 44000, enter: this.enterPhase1 },
        { key: 'PHASE2', duration: 7800, enter: this.enterPhase2 },
        { key: 'BOUNCE', duration: 5000, enter: this.enterBounce },
        { key: 'CHASE',  duration: 5000, enter: this.enterChase },
        { key: 'SHOOT',  duration: 5000, enter: this.enterShoot }
    ];
    this.currentState = 0;

    // kick off the first state immediately
    this.scheduleState(0);

    //Bullet Group
    this.bossBullets = scene.physics.add.group();

    this.wallBullets = scene.physics.add.group({
    immovable: true,      // can’t be knocked around
    allowGravity: false,
    });





  }

  // preload your assets
  static preload(scene) {
    scene.load.image('Boss1', 'assets/Star.png');
    scene.load.image('Bullet', 'assets/bossbullet.png'); // for the SHOOT state
    scene.load.image('WallBullet', 'assets/wallbullet.svg');

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

// inside your state class…


enterPhase1() {
  this.stateName = 'PHASE1';

  

  // assume you store your player on the scene as `this.scene.player`
  this.player = this.scene.player;

  // start the repeating shoot event
  this.shootEvent = this.scene.time.addEvent({
    delay: 1800,              // every 1 second
    callback: this.shootFan,
    callbackScope: this,
    loop: true
  });
}

shootFan() {
  const fanAngle    = 60;      // total spread in degrees
  const bulletCnt   = 5;
  const speed       = 400;
  const errorMargin = 5;       // max ± degrees of random error

  // compute the base aim toward player
  const baseRad = Phaser.Math.Angle.Between(
    this.x, this.y,
    this.player.x, this.player.y
  );
  const baseDeg = Phaser.Math.RadToDeg(baseRad);

  const step = fanAngle / (bulletCnt - 1);

  for (let i = 0; i < bulletCnt; i++) {
    // ideal fan angle
    const idealDeg = baseDeg - fanAngle / 2 + step * i;

    // add a random “miss” of up to ±errorMargin°
    const errorDeg = Phaser.Math.FloatBetween(-errorMargin, errorMargin);
    const finalDeg = idealDeg + errorDeg;

    const b = this.bossBullets.get(this.x, this.y, "Bullet");
    b.setScale(0.1);
    if (!b) continue;

    b.setActive(true);
    b.setVisible(true);
    // rotate sprite to travel direction
    b.setAngle(finalDeg);

    // shoot it
    this.scene.physics.velocityFromAngle(
      finalDeg,
      speed,
      b.body.velocity
    );
  }
}



exitPhase1() {
  // stop shooting when leaving PHASE1
  if (this.shootEvent) {
    this.shootEvent.remove(false);
  }
  this.stateName = 'STOP';
}

// inside your state class…

enterPhase2() {
  this.stateName = 'PHASE2';

  const { width, height } = this.scene.scale;
  const spacing        = 32;     // px between spawns
  const wallDelay      = 1800;   // ms between each wall side
  const bulletInterval = 100;    // ms between each shot
  const spawnOffset    = 10;     // px offscreen
  const speed          = 200;    // slide-in speed

  const sides = ['top', 'right', 'bottom', 'left'];
  sides.forEach((side, sideIdx) => {
    this.scene.time.delayedCall(wallDelay * sideIdx, () => {
      // build X or Y positions along that wall
      const max      = (side==='top'||side==='bottom') ? width : height;
      const positions = [];
      for (let i=0; i<=max; i+=spacing) positions.push(i);

      // fire them one at a time
      positions.forEach((pos, i) => {
        this.scene.time.delayedCall(bulletInterval * i, () => {
          let x, y, angleDeg;
          switch(side) {
            case 'top':
              x = pos; y = -spawnOffset; angleDeg = 90; break;
            case 'bottom':
              x = pos; y = height+spawnOffset; angleDeg = -90; break;
            case 'left':
              x = -spawnOffset; y = pos; angleDeg = 0; break;
            case 'right':
              x = width+spawnOffset; y = pos; angleDeg = 180; break;
          }
          this._spawnWallBullet(x, y, angleDeg, speed, spawnOffset);
        });
      });
    });
  });
}

_spawnWallBullet(x, y, angleDeg, speed, offset) {
  // pull from the wallBullets pool
  const b = this.wallBullets.get(x, y, 'WallBullet');
  if (!b) return;

  b
    .setActive(true)
    .setVisible(true)
    .setScale(1)
    .setAngle(angleDeg)

  // slide it in
  this.scene.physics.velocityFromAngle(angleDeg, speed, b.body.velocity);

  // once it’s crossed `offset` px, jam it on the edge
  const travelTime = (offset / speed) * 1000;
  this.scene.time.delayedCall(travelTime, () => {
    b.body.setVelocity(0);
    b.body.immovable = true;
  });
}



exitPhase2() {
/*
  if (this.bullets) {
    this.bullets.clear(true, true);
  }
  */
  this.stateName = 'STOP';
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
