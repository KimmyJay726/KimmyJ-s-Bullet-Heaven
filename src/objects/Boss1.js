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
        this.states = [{
                key: 'START',
                duration: 4500,
                enter: this.enterStart
            },
            {
                key: 'PHASE1',
                duration: 44000,
                enter: this.enterPhase1
            },
            {
                key: 'PHASE2',
                duration: 7800,
                enter: this.enterPhase2,
                exit: this.exitPhase2
            },
            {
                key: 'PHASE3',
                duration: 14600,
                enter: this.enterPhase3,
                exit: this.exitPhase3
            },
            {
                key: 'PHASE4',
                duration: 10000,
                enter: this.enterPhase4,
                exit: this.exitPhase4
            },
            {
                key: 'BOUNCE',
                duration: 5000,
                enter: this.enterBounce
            },
            {
                key: 'CHASE',
                duration: 5000,
                enter: this.enterChase
            },
            {
                key: 'SHOOT',
                duration: 5000,
                enter: this.enterShoot
            }
        ];
        this.currentState = 0;

        // kick off the first state immediately
        this.scheduleState(0);

        //Bullet Group
        this.bossBullets = scene.physics.add.group();

        this.wallBullets = scene.physics.add.group({
            immovable: true, // can’t be knocked around
            allowGravity: false,
        });

        this.starBullets = scene.physics.add.group({
           classType: Phaser.Physics.Arcade.Image,
          defaultKey: 'StarBullet',
          maxSize: 100,
          runChildUpdate: false
        });




    }

    // preload your assets
    static preload(scene) {
        scene.load.image('Boss1', 'assets/Star.png');
        scene.load.image('Bullet', 'assets/bossbullet.png'); // for the SHOOT state
        scene.load.image('WallBullet', 'assets/wallbullet.svg');
        scene.load.image('StarBullet', 'assets/starshard.svg');

    }

    // schedules and enters the state at index `i`
    scheduleState(i) {
        // clear any existing timers
        if (this.stateTimer) {
            this.stateTimer.remove(false);
        }

        this.currentState = i;
        const {
            key,
            duration,
            enter
        } = this.states[i];

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
            this.setPosition(600, 100); // snap to exact target
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
            delay: 1800, // every 1 second
            callback: this.shootFan,
            callbackScope: this,
            loop: true
        });
    }

    shootFan() {
    const fanAngle   = 60;
    const bulletCnt  = 5;
    const speed      = 400;
    const errorMargin = 5;

    const baseDeg = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y)
    );

    const step = fanAngle / (bulletCnt - 1);

    for (let i = 0; i < bulletCnt; i++) {
      const idealDeg  = baseDeg - fanAngle/2 + step * i;
      const finalDeg  = idealDeg + Phaser.Math.FloatBetween(-errorMargin, errorMargin);

      // grab one from the starBullets pool
      const b = this.starBullets.get(this.x, this.y);
      if (!b) {
        // pool exhausted
        continue;
      }

      // reset its physics body & visibility
      b
        .setActive(true)
        .setVisible(true)
        .setScale(0.05)
        .setAngle(finalDeg);

      // reposition the body
      b.body.reset(this.x, this.y);

      // tighten hit circle
      const r = b.displayWidth / 2;
      b.body.setCircle(r,
        (b.width  - b.displayWidth) / 2,
        (b.height - b.displayHeight) / 2
      );

      // launch it
      this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);
    }
  }




    exitPhase1() {
        // stop shooting when leaving PHASE1
      
        this.stateName = 'STOP';
    }

    // inside your state class…

    // inside src/gameobjects/Boss1.js

    enterPhase2() {
        this.stateName = 'PHASE2';

        const {
            width,
            height
        } = this.scene.scale;
        const spacing = 32; // px between spawns
        const wallDelay = 1800; // ms between each wall side
        const bulletInterval = 50; // ms between each shot
        const spawnOffset = 10; // px offscreen
        const speed = 200; // slide-in speed

        const sides = ['top', 'right', 'bottom', 'left'];
        sides.forEach((side, sideIdx) => {
            this.scene.time.delayedCall(wallDelay * sideIdx, () => {
                // build X or Y positions along that wall
                const max = (side === 'top' || side === 'bottom') ? width : height;
                const positions = [];
                for (let i = 0; i <= max; i += spacing) {
                    positions.push(i);
                }

                // reverse order on bottom and left
                if (side === 'bottom' || side === 'left') {
                    positions.reverse();
                }

                // fire them one at a time
                positions.forEach((pos, i) => {
                    this.scene.time.delayedCall(bulletInterval * i, () => {
                        let x, y, angleDeg;
                        switch (side) {
                            case 'top':
                                x = pos;
                                y = -spawnOffset;
                                angleDeg = 90;
                                break;
                            case 'bottom':
                                x = pos;
                                y = height + spawnOffset;
                                angleDeg = -90;
                                break;
                            case 'left':
                                x = -spawnOffset;
                                y = pos;
                                angleDeg = 0;
                                break;
                            case 'right':
                                x = width + spawnOffset;
                                y = pos;
                                angleDeg = 180;
                                break;
                        }
                        this._spawnWallBullet(x, y, angleDeg, speed, spawnOffset);
                    });
                });
            });
        });
    }


    _spawnWallBullet(x, y, angleDeg, speed, offset, side) {
        const spike = this.wallBullets.get(x, y, 'WallBullet');
        if (!spike) return;

        spike
            .setActive(true)
            .setVisible(true)
            .setScale(1)
            .setAngle(angleDeg);

        // slide it in
        this.scene.physics.velocityFromAngle(angleDeg, speed, spike.body.velocity);

        // — ADJUST HITBOX FOR ROOF & FLOOR —
        const bodyWidth = spike.displayWidth;
        const bodyHeight = spike.displayHeight + 50;

        // set body size to match sprite
        spike.body.setSize(bodyWidth, bodyHeight);

        if (side === 'top') {
            // push the hitbox downward by its own height
            spike.body.setOffset(0, bodyHeight);
        } else if (side === 'bottom') {
            // pull the hitbox upward so it hugs the bottom edge
            spike.body.setOffset(0, -bodyHeight);
        }
        // for left/right walls you can leave offset at (0,0) or adjust X if needed

        // once it’s crossed `offset` px, jam it on the edge
        const travelTime = (offset / speed) * 1000;
        this.scene.time.delayedCall(travelTime, () => {
            spike.body.setVelocity(0);
            spike.body.immovable = true;
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

    // -------------------------
    // PHASE3: Bullet Flurry
    // -------------------------
    enterPhase3() {
        this.stateName = 'PHASE3';
        this.player = this.scene.player;

        // fire a flurry: every 100ms, shoot one slightly off‐course bullet
        const interval = 100; // ms between shots
        const speed = 300; // bullet speed
        const errorMargin = 45; // ± degrees random spread

        this.flurryEvent = this.scene.time.addEvent({
            delay: interval,
            loop: true,
            callback: () => this.shootFlurryBullet(speed, errorMargin),
            callbackScope: this
        });
    }

    shootFlurryBullet(speed, errorMargin) {

        if (this.stateName !== 'PHASE3') {
          return;
        }
        // angle toward player + little random miss
        const baseRad = Phaser.Math.Angle.Between(
            this.x, this.y,
            this.player.x, this.player.y
        );
        const baseDeg = Phaser.Math.RadToDeg(baseRad);
        const errorDeg = Phaser.Math.FloatBetween(-errorMargin, errorMargin);
        const finalDeg = baseDeg + errorDeg;

        const b = this.bossBullets.get(this.x, this.y, 'Bullet');
        if (!b) return;

        b
            .setActive(true)
            .setVisible(true)
            .setScale(0.1)
            .setAngle(finalDeg);

        // tighten hit-circle around the sprite
        const r = b.displayWidth / 2;
        b.body.setCircle(r,
            (b.width - b.displayWidth) / 2,
            (b.height - b.displayHeight) / 2
        );

        // send it off
        this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);

        // auto-kill after 3s to avoid memory buildup
        this.scene.time.delayedCall(3000, () => {
            b.destroy();
        });
    }

    exitPhase3() {
 
    this.stateName = 'STOP';
}


    // -------------------------
    // PHASE4: random vertical streams
    // -------------------------
    enterPhase4() {
        this.stateName = 'PHASE4';

        const {
            width,
            height
        } = this.scene.scale;
        const speed = 300; // upward bullet speed
        const spawnRate = 150; // ms between each bullet

        // every `spawnRate` ms, spawn a bullet at a random x along the bottom
        this.phase4Event = this.scene.time.addEvent({
            delay: spawnRate,
            callback: () => {
                const xPos = Phaser.Math.Between(0, width);
                const yPos = height + 10; // just off‐screen

                const b = this.bossBullets.get(xPos, yPos, 'Bullet');
                if (!b) return;

                b
                    .setActive(true)
                    .setVisible(true)
                    .setScale(0.1)
                    .setAngle(-90); // point sprite upward

                // circle hitbox
                const r = b.displayWidth / 2;
                b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);

                // shoot straight up
                b.body.setVelocity(0, -speed);

                // optional: automatically cull when off‐screen
                b.checkWorldBounds = true;
                b.outOfBoundsKill = true;
            },
            callbackScope: this,
            loop: true
        });
    }

    exitPhase4() {
        // stop spawning bullets
        if (this.phase4Event) {
            this.phase4Event.remove(false);
        }
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
        const b = this.bossBullets.create(this.x, this.y, 'Bullet');
        b.setScale(0.1);

        const angleRad = Phaser.Math.Angle.Between(
            this.x, this.y,
            this.scene.player.x, this.scene.player.y
        );
        b.setRotation(angleRad);

        const radius = b.displayWidth / 2;
        b.body.setCircle(radius, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);

        this.scene.physics.velocityFromRotation(angleRad, 200, b.body.velocity);

        this.scene.time.delayedCall(3000, () => b.destroy());
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