export default class Boss1 extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'Boss1') {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ----- Pause bookkeeping -----
    this.isPaused = false;
    this.trackedTimers = new Set(); // any delayedCall/addEvent you want frozen
    this.stateTimer = null;
    this.stateStartTime = 0;
    this.stateDuration = 0;
    this.remainingStateTime = 0;
    this.nextStateIndex = 0;
    this._savedVelocity = new Phaser.Math.Vector2();
    this._savedAngular = 0;

    // If your game uses a separate pause overlay that calls scene.pause(),
    // these keep the boss in sync with that global pause/resume.
    scene.events.on('pause', this.onScenePause, this);
    scene.events.on('resume', this.onSceneResume, this);

    // (Optional) Local ESC toggle; remove if you centralize pause elsewhere.
    this.escapeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => {
      if (this.isPaused) this.resumeBossFight();
      else this.pauseBossFight();
    });

    // basic setup
    this.setOrigin(0.5);
    this.setScale(0.125);

    // core parameters
    this.speed = 100;
    this.spinSpeed = 90;

    // states
    this.states = [
      { key: 'START',  duration:  4500, enter: this.enterStart },
      { key: 'PHASE1', duration: 44000, enter: this.enterPhase1 },
      { key: 'PHASE2', duration:  7800, enter: this.enterPhase2, exit: this.exitPhase2 },
      { key: 'PHASE3', duration: 14600, enter: this.enterPhase3, exit: this.exitPhase3 },
      { key: 'PHASE4', duration: 15600, enter: this.enterPhase4, exit: this.exitPhase4 },
      { key: 'PHASE5', duration: 20000, enter: this.enterPhase5, exit: this.exitPhase5 },
      { key: 'PHASE6', duration:  7000, enter: this.enterPhase6, exit: this.exitPhase6 },
      { key: 'PHASE7', duration:  6100, enter: this.enterPhase7, exit: this.exitPhase7 },
      { key: 'PHASE8', duration: 20000, enter: this.enterPhase8, exit: this.exitPhase8 },
      { key: 'PHASE9', duration: 20000, enter: this.enterPhase9, exit: this.exitPhase9 }
    ];
    this.currentState = 0;

    // repeating shoot event (tracked so it pauses/resumes cleanly)
    this.shootEvent = this.trackTimer(this.scene.time.addEvent({
      delay: 1800,
      callback: this.shootFan,
      callbackScope: this,
      loop: true
    }));

    // start
    this.scheduleState(0);

    // bullets...
    this.bossBullets  = scene.physics.add.group();
    this.wallBullets  = scene.physics.add.group({ immovable: true, allowGravity: false });
    this.starBullets  = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'StarBullet' });
    this.angelBullets = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'AngelBullet' });
  }

  static preload(scene) {
    scene.load.image('Boss1', 'assets/Star.png');
    scene.load.image('Bullet', 'assets/bossbullet.png');
    scene.load.image('WallBullet', 'assets/wallbullet.svg');
    scene.load.image('StarBullet', 'assets/starshard.svg');
    scene.load.image('AngelBullet', 'assets/angelbullet.svg');
  }

  // ----- Helper to track any timer/delayedCall you create -----
  trackTimer(evt) {
    this.trackedTimers.add(evt);
    return evt;
  }

  // ----- State scheduling (pause-safe) -----
  scheduleState(i) {
    const START_INDEX = 0;
    if (!Number.isInteger(i) || !this.states[i]) {
      return this.scheduleState(4); // your chosen fallback
    }

    if (this.stateTimer) {
      this.stateTimer.remove(false);
      this.stateTimer = null;
    }

    const { key, duration, enter } = this.states[i];
    this.currentState = i;
    this.stateName = key;

    // Enter state
    enter.call(this, key);

    // Compute next index now and store it for resume
    const rawNext = (key === 'PHASE9') ? this.phase3Index : i + 1;
    const nextIndex = Phaser.Math.Wrap(rawNext, 0, this.states.length);
    this.nextStateIndex = nextIndex;

    // Bookkeeping for pause-safe timing
    this.stateStartTime = this.scene.time.now;
    this.stateDuration  = duration;
    this.remainingStateTime = duration;

    // Create the transition timer
    this.stateTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => this.scheduleState(nextIndex)
    });
  }

  // ----- Pause / resume that freeze all timers and physics -----
  pauseBossFight() {
    if (this.isPaused) return;
    this.isPaused = true;

    // Capture remaining time for the current state and rebuild later
    if (this.stateTimer) {
      const now = this.scene.time.now;
      const elapsed = Math.max(0, now - this.stateStartTime);
      this.remainingStateTime = Math.max(0, this.stateDuration - elapsed);
      this.stateTimer.remove(false);
      this.stateTimer = null;
    }

    // Pause repeating and auxiliary timers
    if (this.shootEvent) this.shootEvent.paused = true;
    for (const t of this.trackedTimers) {
      if (!t.hasDispatched) t.paused = true;
    }

    // Freeze motion/spin
    this._savedVelocity.copy(this.body.velocity);
    this._savedAngular = this.body.angularVelocity || 0;
    this.body.setVelocity(0, 0);
    this.setAngularVelocity(0);
    this.body.moves = false;

    // Optional: pause entire scene + audio (comment out if using overlay for this)
    // this.scene.sound.pauseAll();
    // this.scene.scene.pause();
  }

  resumeBossFight() {
    if (!this.isPaused) return;
    this.isPaused = false;

    // Recreate the state transition timer with remaining time
    if (this.remainingStateTime > 0) {
      this.stateStartTime = this.scene.time.now;
      this.stateDuration = this.remainingStateTime;
      const delay = this.remainingStateTime;
      this.remainingStateTime = 0;

      this.stateTimer = this.scene.time.addEvent({
        delay,
        callback: () => this.scheduleState(this.nextStateIndex)
      });
    }

    // Resume timers
    if (this.shootEvent) this.shootEvent.paused = false;
    for (const t of this.trackedTimers) {
      if (!t.hasDispatched) t.paused = false;
    }

    // Restore motion/spin
    this.body.moves = true;
    this.body.setVelocity(this._savedVelocity.x, this._savedVelocity.y);
    this.setAngularVelocity(this._savedAngular);

    // Optional: resume scene + audio (comment out if using overlay for this)
    // this.scene.scene.resume();
    // this.scene.sound.resumeAll();
  }

  // If the scene is paused externally (e.g., overlay), keep the state machine in sync.
  onScenePause() { this.pauseBossFight(); }
  onSceneResume() { this.resumeBossFight(); }




    // -------------------------
    // State entry callbacks
    // -------------------------

    enterStart() {
        this.stateName = 'START';
        this.body.setCollideWorldBounds(false);
        this.shootEvent.paused = true;

        // 1) Fire off the movement
        this.scene.physics.moveTo(this, 640, 100, this.speed);

        // 2) Compute how long it will take to get there
        const distance = Phaser.Math.Distance.Between(this.x, this.y, 640, 100);
        const travelTime = (distance / this.speed) * 1000; // in ms

        // 3) Schedule a stop exactly when it arrives
        this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0, 0);
            this.setPosition(640, 100); // snap to exact target

        });
    }

    // inside your state class…


    enterPhase1() {

        this.stateName = 'PHASE1';
        this.shootEvent.paused = false;


        // assume you store your player on the scene as `this.scene.player`
        this.player = this.scene.player;


    }

    shootFan() {
        const fanAngle = 60;
        const bulletCnt = 5;
        const speed = 400;
        const errorMargin = 5;

        const baseDeg = Phaser.Math.RadToDeg(
            Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y)
        );

        const step = fanAngle / (bulletCnt - 1);

        for (let i = 0; i < bulletCnt; i++) {
            const idealDeg = baseDeg - fanAngle / 2 + step * i;
            const finalDeg = idealDeg + Phaser.Math.FloatBetween(-errorMargin, errorMargin);

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
                (b.width - b.displayWidth) / 2,
                (b.height - b.displayHeight) / 2
            );

            // launch it
            this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);
        }
    }




    exitPhase1() {
        // stop shooting when leaving PHASE1


    }

    // inside your state class…

    // inside src/gameobjects/Boss1.js

    enterPhase2() {

        this.stateName = 'PHASE2';
        this.shootEvent.paused = false;
        this.spinSpeed = -180; 

        const {
            width,
            height
        } = this.scene.scale;
        const spacing = 32; // px between spawns
        const wallDelay = 1800; // ms between each wall side
        const bulletInterval = 100; // ms between each shot
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
  
    }

    // -------------------------
    // PHASE3: Bullet Flurry
    // -------------------------
    enterPhase3() {
        this.stateName = 'PHASE3';
        this.player = this.scene.player;
        this.spinSpeed = 180; 

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


    }


    // -------------------------
    // PHASE4: random vertical streams
    // -------------------------
    enterPhase4() {
        this.stateName = 'PHASE4';
        this.spinSpeed = 120; 

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

                if (this.stateName !== 'PHASE4') {
                    return;
                }
                const xPos = Phaser.Math.Between(0, width);
                const yPos = height + 10; // just off‐screen

                const b = this.bossBullets.get(xPos, yPos, 'AngelBullet');
                if (!b) return;

                b
                    .setActive(true)
                    .setVisible(true)
                    .setScale(0.125)
                    .setAngle(90); // point sprite upward

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

    }

    // -----------------------
    // PHASE5: Center + Edge-Bullets
    // -----------------------

    enterPhase5() {
        this.stateName = 'PHASE5';
        this.player = this.scene.player;
        this.shootEvent.paused = true; // optional: pause fan shot
        this.spinSpeed = -90; 

        // move to center
        const {
            width,
            height
        } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;
        this.scene.physics.moveTo(this, cx, cy, this.speed);

        // compute travel time
        const dist = Phaser.Math.Distance.Between(this.x, this.y, cx, cy);
        const travelTime = (dist / this.speed) * 1000;

        // once arrived, jam at center & start edge-spawns
        this.scene.time.delayedCall(travelTime, () => {


            this.body.setVelocity(0);
            this.setPosition(cx, cy);

            this.edgeBulletEvent = this.scene.time.addEvent({
                delay: 75, // spawn every 0.5s
                loop: true,
                callback: this.spawnEdgeBullet,
                callbackScope: this
            });
        });
    }

    spawnEdgeBullet() {

        if (this.stateName !== 'PHASE5') {
            return;
        }
        const {
            width,
            height
        } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;

        // pick random edge
        const side = Phaser.Math.Between(0, 3);
        let x, y;
        switch (side) {
            case 0:
                x = Phaser.Math.Between(0, width);
                y = 0;
                break;
            case 1:
                x = width;
                y = Phaser.Math.Between(0, height);
                break;
            case 2:
                x = Phaser.Math.Between(0, width);
                y = height;
                break;
            default:
                x = 0;
                y = Phaser.Math.Between(0, height);
                break;
        }

        // angle and get bullet
        const angle = Phaser.Math.RadToDeg(
            Phaser.Math.Angle.Between(x, y, cx, cy)
        );
        const b = this.bossBullets.get(x, y, 'Bullet');
        if (!b) return;

        b
            .setActive(true)
            .setVisible(true)
            .setScale(0.1)
            .setAngle(angle);
        b.body.reset(x, y);
        this.scene.physics.velocityFromAngle(angle, 100, b.body.velocity);

        // circle hitbox
        const r = b.displayWidth / 2;
        b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);

        // compute travel time (ms) and schedule destroy
        const dist = Phaser.Math.Distance.Between(x, y, cx, cy);
        const timeMs = (dist / 100) * 1000;
        this.scene.time.delayedCall(timeMs, () => {
            if (b.active) {
                b.destroy(); // or: this.bossBullets.killAndHide(b);
            }
        });
    }

    exitPhase5() {

        if (this.edgeBulletEvent) {
            this.edgeBulletEvent.remove(false);
            this.edgeBulletEvent = null;
        }
    }

    enterPhase6() {
        this.stateName = 'PHASE6';
        this.shootEvent.paused = true; // if you want all other shooting off
        this.spinSpeed = -90; 

        // compute center coords
        const {
            width,
            height
        } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;

        // slide boss to center
        this.scene.physics.moveTo(this, cx, cy, this.speed);

        // once he arrives, zero‐out velocity to stand still
        const dist = Phaser.Math.Distance.Between(this.x, this.y, cx, cy);
        const travelTime = (dist / this.speed) * 1000; // ms

        this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0, 0);
            this.setPosition(cx, cy);
            // optional: trigger an idle animation or visual cue here
        });
    }

    exitPhase6() {

        // no timers to clear—boss just stays still
    }

    enterPhase7() {
        this.stateName = 'PHASE7';
        this.body.setCollideWorldBounds(false);
        this.shootEvent.paused = true;
        this.spinSpeed = 90; 

        // 1) Fire off the movement
        this.scene.physics.moveTo(this, 640, 100, this.speed);

        // 2) Compute how long it will take to get there
        const distance = Phaser.Math.Distance.Between(this.x, this.y, 640, 100);
        const travelTime = (distance / this.speed) * 1000; // in ms

        // 3) Schedule a stop exactly when it arrives
        this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0, 0);
            this.setPosition(640, 100); // snap to exact target

        });
    }


    enterPhase8() {
        this.stateName = 'PHASE8';
        this.player = this.scene.player;
        this.shootEvent.paused = false; // Enable Fanshot
        this.spinSpeed = 180; 

        // enable wall bounce
        this.body
            .setCollideWorldBounds(true)
            .setBounce(1);

        // define a faster speed for Phase8 (e.g. double the base speed)
        const phase8Speed = this.speed * 2;

        // pick a random direction at that higher speed
        const angleRad = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const vx = Math.cos(angleRad) * phase8Speed;
        const vy = Math.sin(angleRad) * phase8Speed;
        this.body.setVelocity(vx, vy);

        // start the tight flurry (unchanged)
        this.phase8Timer = this.scene.time.addEvent({
            delay: 120,
            loop: true,
            callback: () => this.shootPhase8Bullet(300, 20),
            callbackScope: this
        });
    }



    shootPhase8Bullet(speed, errorMargin) {
        if (this.stateName !== 'PHASE8') {
            return;
        }

        // aim + random spread
        const baseRad = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        const baseDeg = Phaser.Math.RadToDeg(baseRad);
        const finalDeg = baseDeg + Phaser.Math.FloatBetween(-errorMargin, errorMargin);

        const b = this.bossBullets.get(this.x, this.y, 'Bullet');
        if (!b) return;

        b.setActive(true)
            .setVisible(true)
            .setScale(0.1)
            .setAngle(finalDeg);

        // tighten hit-circle
        const r = b.displayWidth / 2;
        b.body.setCircle(r,
            (b.width - b.displayWidth) / 2,
            (b.height - b.displayHeight) / 2
        );

        // fire out
        this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);

        // auto-kill in 3s
        this.scene.time.delayedCall(3000, () => {
            if (b.active) {
                b.destroy();
            }
        });
    }



    exitPhase8() {
        // stop shooting
        if (this.phase8Timer) {
            this.phase8Timer.remove(false);
            this.phase8Timer = null;
        }

        // disable bounce
        this.body
            .setCollideWorldBounds(false)
            .setBounce(0);

        this.stateName = null;
    }


    enterPhase9() {
    this.stateName = 'PHASE9';
    this.player    = this.scene.player;

    // Bounce off world bounds
    this.body
      .setCollideWorldBounds(true)
      .setBounce(1);

    // Start chasing the player
    this.scene.physics.moveToObject(this, this.player, this.speed);

    // Schedule a fan of bullets every 1 second
    this.phase9FanEvent = this.scene.time.addEvent({
      delay:         900,
      loop:          true,
      callback:      this.shootFan,
      callbackScope: this
    });
  }

  exitPhase9() {
    // Stop movement
    this.body.setVelocity(0, 0);

    // Remove the fan‐shot timer
    if (this.phase9FanEvent) {
      this.phase9FanEvent.remove(false);
      this.phase9FanEvent = null;
    }
  }

  // Pause all boss-related events
pauseBossFight() {
    this.isPaused = true;

    // Pause shooting and state transitions
    if (this.shootEvent) this.shootEvent.paused = true;
    if (this.stateTimer) this.stateTimer.paused = true;

    // Freeze boss movement
    this.body.moves = false;

    // Pause the whole scene if you want (optional)
    // this.scene.scene.pause();

    console.log('Boss fight paused');
}

// Resume them
resumeBossFight() {
    this.isPaused = false;

    if (this.shootEvent) this.shootEvent.paused = false;
    if (this.stateTimer) this.stateTimer.paused = false;

    this.body.moves = true;

    // Resume scene if paused
    // this.scene.scene.resume();

    console.log('Boss fight resumed');
}


    // -------------------------
    // Phaser update loop
    // -------------------------
    update(time, delta) {
        // always rotate for some visual flair
        this.angle += this.spinSpeed * (delta / 1000);

        if (this.stateName === 'PHASE9') {
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