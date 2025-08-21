export default class Boss2 extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'Boss2') {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5).setScale(0.15);
    this.speed       = 120;
    this.spinSpeed   = 60;
    this.hp          = 500;
    this.isPaused    = false;
    this.isDead      = false;

    this.trackedTimers = new Set();
    this.stateTimer    = null;

    this.bossBullets  = scene.physics.add.group();
    this.wallBullets  = scene.physics.add.group({ immovable: true, allowGravity: false });
    this.starBullets  = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'StarBullet' });
    this.angelBullets = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'AngelBullet' });
    this.sideBullets  = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'SideBullet' });

    // Centralized Side Bullet settings
    this.SIDE_BULLET = {
      speedIntro: 200,
      speedNormal: 350,
      delayIntro: 600,
      delayNormal: 285.7,
      hitboxWidthFactor: 0.7,
      hitboxHeightFactor: 1.5
    };

    this.states = [
      { key: 'INTRO',   duration: 34500, enter: this.enterIntro },
      { key: 'PHASE1',  duration: 10000, enter: this.enterPhase1 },
      { key: 'PHASE2',  duration: 12000, enter: this.enterPhase2 },
      { key: 'PHASE3',  duration: 8000,  enter: this.enterPhase3 },
    ];

    // Single repeating timer for side bullets
    this.sideBulletTimer = this.trackTimer(
      scene.time.addEvent({
        delay: this.SIDE_BULLET.delayIntro,
        callback: this.spawnSideBullets,
        callbackScope: this,
        loop: true
      })
    );

    this.scheduleState(0);

    scene.events.on('pause', this.onScenePause, this);
    scene.events.on('resume', this.onSceneResume, this);

    this.once('destroy', this._cleanup, this);
  }

  static preload(scene) {
    scene.load.image('Boss2', 'assets/Trinity.svg'); 
    scene.load.image('Boss2Bullet', 'assets/swordbullet.svg');
    scene.load.image('SideBullet', 'assets/crossbullet.svg');
  }

  trackTimer(evt) { if (evt) this.trackedTimers.add(evt); return evt; }

  scheduleState(i) {
    if (!this.states[i]) return;
    if (this.stateTimer) this.stateTimer.remove(false);
    const { duration, enter } = this.states[i];
    this.currentState = i;
    if (typeof enter === 'function') enter.call(this);
    const nextIndex = (i + 1) % this.states.length;
    this.stateTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => this.scheduleState(nextIndex)
    });
    this.trackTimer(this.stateTimer);
  }

  updateSideBulletSettings(isIntro) {
    const speed = isIntro ? this.SIDE_BULLET.speedIntro : this.SIDE_BULLET.speedNormal;
    const delay = isIntro ? this.SIDE_BULLET.delayIntro : this.SIDE_BULLET.delayNormal;

    if (this.sideBulletTimer) {
      this.sideBulletTimer.delay = delay;
    }

    this.sideBullets.getChildren().forEach(bullet => {
      if (bullet.active) bullet.setVelocityY(speed);
    });
  }

  // === STATE LOGIC ===
  enterIntro() {
    this.setVisible(false);
    this.body.enable = false;

    const { width, height } = this.scene.scale;
    const corners = [
      { x: 0, y: 0,        vx: 150, vy: 150, spin: 180 },
      { x: width, y: 0,    vx: -150, vy: 150, spin: -180 },
      { x: 0, y: height,   vx: 150, vy: -150, spin: -180 },
      { x: width, y: height, vx: -150, vy: -150, spin: 180 }
    ];

    corners.forEach(corner => {
      const bullet = this.bossBullets.create(corner.x, corner.y, 'Boss2Bullet');
      bullet.setScale(0.5);
      bullet.setCollideWorldBounds(true);
      bullet.setBounce(1);
      bullet.body.setSize(bullet.width * 0.6, bullet.height * 0.6, true);
      bullet.setVelocity(corner.vx, corner.vy);
      bullet.setAngularVelocity(corner.spin);
      bullet.body.onWorldBounds = true;
      bullet.body.world.on('worldbounds', (body) => {
        if (body.gameObject === bullet) {
          const jitterX = Phaser.Math.Between(-20, 20);
          const jitterY = Phaser.Math.Between(-20, 20);
          bullet.setVelocity(
            Math.sign(bullet.body.velocity.x) * (150 + jitterX),
            Math.sign(bullet.body.velocity.y) * (150 + jitterY)
          );
        }
      });
    });

    this.updateSideBulletSettings(true);
  }

  enterPhase1() {
    this.setVisible(true);
    this.body.enable = true;
    this.setVelocity(0, 0);
    this.bossBullets.clear(true, true);

    this.updateSideBulletSettings(false);
  }

  enterPhase2() {
    this.setAngularVelocity(this.spinSpeed);
    this.updateSideBulletSettings(false);
  }

  enterPhase3() {
    this.fireSpecial();
    this.updateSideBulletSettings(false);
  }

  spawnSideBullets() {
    if (this.isPaused || this.isDead) return;
    const { width } = this.scene.scale;
    const isIntro = this.states[this.currentState]?.key === 'INTRO';
    const bulletSpeed = isIntro ? this.SIDE_BULLET.speedIntro : this.SIDE_BULLET.speedNormal;

    const createBullet = (x, flipRight) => {
      const b = this.sideBullets.create(x, 0);
      b.setScale(0.25).setAngle(90);
      b.body.setSize(
        b.width * this.SIDE_BULLET.hitboxWidthFactor,
        b.height * this.SIDE_BULLET.hitboxHeightFactor,
        true
      );
      const offsetX = b.body.width / 2;
      b.x = flipRight ? width - offsetX : offsetX;
      b.setVelocityY(bulletSpeed);
    };

    createBullet(0, false);
    createBullet(width, true);
  }

  takeDamage(amount = 1) {
    if (this.isDead) return;
    this.hp -= amount;
    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
    this.scene.sound.play('boss2DeathSfx', { volume: 1 });
    this.bossBullets.clear(true, true);
    this.wallBullets.clear(true, true);
    this.starBullets.clear(true, true);
    this.angelBullets.clear(true, true);
    this.sideBullets.clear(true, true);
    this._cleanup();
    this.destroy();
  }

  onScenePause() { if (this.active) this.isPaused = true; }
  onSceneResume() { if (this.active) this.isPaused = false; }

  _cleanup() {
    if (this.scene && this.scene.events) {
      this.scene.events.off('pause', this.onScenePause, this);
      this.scene.events.off('resume', this.onSceneResume, this);
    }
    for (const t of this.trackedTimers) if (t) t.remove(false);
    this.trackedTimers.clear();
  }
}
