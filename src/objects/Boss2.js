export default class Boss2 extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'Boss2') {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Always initialise before use
    this._worldBoundHandlers = [];

    this.setOrigin(0.5).setScale(0.15);
    this.speed       = 120;
    this.spinSpeed   = 60;
    this.hp          = 500;
    this.isPaused    = false;
    this.isDead      = false;

    this._savedVelocity = new Phaser.Math.Vector2();
    this._savedAngular  = 0;

    this.trackedTimers = new Set();
    this.stateTimer    = null;

    this.bossBullets  = scene.physics.add.group();
    this.wallBullets  = scene.physics.add.group({ immovable: true, allowGravity: false });
    this.starBullets  = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'StarBullet' });
    this.angelBullets = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'AngelBullet' });
    this.sideBullets  = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: 'SideBullet' });

    this.SIDE_BULLET = {
      speedIntro: 200,
      speedNormal: 350,
      delayIntro: 600,
      delayNormal: 285.7,
      hitboxWidthFactor: 0.7,
      hitboxHeightFactor: 1.5
    };

    this.states = [
      { key: 'INTRO',   duration: 31500, enter: this.enterIntro },
      { key: 'PHASE1',  duration: 10000, enter: this.enterPhase1 },
      { key: 'PHASE2',  duration: 12000, enter: this.enterPhase2 },
      { key: 'PHASE3',  duration: 8000,  enter: this.enterPhase3 },
    ];

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

    // Hook into scene shutdown/destroy for cleanup
    scene.events.once('shutdown', this._cleanup, this);
    scene.events.once('destroy', this._cleanup, this);

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
    if (this.sideBulletTimer) this.sideBulletTimer.delay = delay;
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

      const handler = (body) => {
        if (body.gameObject === bullet) {
          const jitterX = Phaser.Math.Between(-20, 20);
          const jitterY = Phaser.Math.Between(-20, 20);
          bullet.setVelocity(
            Math.sign(bullet.body.velocity.x) * (150 + jitterX),
            Math.sign(bullet.body.velocity.y) * (150 + jitterY)
          );
        }
      };
      bullet.body.world.on('worldbounds', handler);
      this._worldBoundHandlers.push({ world: bullet.body.world, handler });
    });

    this.updateSideBulletSettings(true);
  }

  enterPhase1() {
    this.setVisible(true);
    this.body.enable = true;
    this.setVelocity(0, 0);
    this.bossBullets.clear(true, true);

    this.updateSideBulletSettings(false);

    const player = this.scene.player;
    if (player && player.active) {
      const px = player.x;
      const py = player.y;

      this.sideBullets.getChildren().forEach(bullet => {
        if (!bullet.active) return;

        const dx = px - bullet.x;
        const dy = py - bullet.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude > 0) {
          const speed = this.SIDE_BULLET.speedNormal;
          const vx = (dx / magnitude) * speed;
          const vy = (dy / magnitude) * speed;

          bullet.setVelocity(vx, vy);
          const angleDeg = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
          bullet.setAngle(angleDeg);
        }
      });
    }
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
    const { width, height } = this.scene.scale;
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

      b.update = () => {
        if (b.y - b.height / 2 > height) {
          b.destroy();
        }
      };
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

    if (this.scene && this.scene.sound) {
      this.scene.sound.play('boss2DeathSfx', { volume: 1 });
    }

    // Clear bullets
    if (this.bossBullets) this.bossBullets.clear(true, true);
    if (this.wallBullets) this.wallBullets.clear(true, true);
    if (this.starBullets) this.starBullets.clear(true, true);
    if (this.angelBullets) this.angelBullets.clear(true, true);
    if (this.sideBullets) this.sideBullets.clear(true, true);

    this._cleanup();
    this.destroy(); // marks active = false
  }

  // === NEW PAUSE/RESUME METHODS ===
  pauseBossFight() {
    if (this.isPaused) return;
    this.isPaused = true;

    if (this.stateTimer) this.stateTimer.paused = true;
    if (this.sideBulletTimer) this.sideBulletTimer.paused = true;
    for (const t of this.trackedTimers) {
      if (t && !t.hasDispatched) t.paused = true;
    }

    if (this.body) {
      this._savedVelocity.copy(this.body.velocity);
      this._savedAngular = this.body.angularVelocity || 0;
      this.body.setVelocity(0, 0);
      this.setAngularVelocity(0);
      this.body.moves = false;
    }
  }

  resumeBossFight() {
    if (!this.isPaused) return;
    this.isPaused = false;

    if (this.stateTimer) this.stateTimer.paused = false;
    if (this.sideBulletTimer) this.sideBulletTimer.paused = false;
    for (const t of this.trackedTimers) {
      if (t && !t.hasDispatched) t.paused = false;
    }

    if (this.body) {
      this.body.moves = true;
      this.body.setVelocity(this._savedVelocity.x, this._savedVelocity.y);
      this.setAngularVelocity(this._savedAngular);
    }
  }

  onScenePause() { if (this.active) this.pauseBossFight(); }
  onSceneResume() { if (this.active) this.resumeBossFight(); }

  _cleanup() {
    // Remove worldbounds listeners
    if (this._worldBoundHandlers && this._worldBoundHandlers.length) {
      this._worldBoundHandlers.forEach(({ world, handler }) => {
        if (world && typeof handler === 'function') {
          world.off('worldbounds', handler);
        }
      });
      this._worldBoundHandlers.length = 0;
    }

    // Remove scene events
    if (this.scene && this.scene.events) {
      this.scene.events.off('pause', this.onScenePause, this);
      this.scene.events.off('resume', this.onSceneResume, this);
    }

    // Remove timers
    for (const t of this.trackedTimers) {
      if (t) t.remove(false);
    }
    this.trackedTimers.clear();

    // Destroy physics groups
    if (this.bossBullets) this.bossBullets.destroy(true);
    if (this.wallBullets) this.wallBullets.destroy(true);
    if (this.starBullets) this.starBullets.destroy(true);
    if (this.angelBullets) this.angelBullets.destroy(true);
    if (this.sideBullets) this.sideBullets.destroy(true);
  }

  update() {
    // Guard against scene being gone
    if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
    if (!this.sideBullets) return;

    this.sideBullets.getChildren().forEach(bullet => {
      if (bullet.update) bullet.update();
    });
  }
}

