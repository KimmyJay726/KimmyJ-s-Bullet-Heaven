// Boss2.js
export default class Boss2 extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'Boss2') {
    super(scene, x, y, texture);

    // Add to scene + physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Basic attributes
    this.setOrigin(0.5).setScale(0.15);
    this.speed       = 120;  // movement speed
    this.spinSpeed   = 60;   // degrees/sec rotation
    this.hp          = 500;  // health
    this.isPaused    = false;
    this.isDead      = false;

    // Timers
    this.trackedTimers = new Set();
    this.stateTimer    = null;

    // Bullet groups
    this.mainBullets   = scene.physics.add.group();
    this.specialBullets= scene.physics.add.group();

    // States for attack patterns
    this.states = [
      { key: 'INTRO',   duration: 3000,  enter: this.enterIntro },
      { key: 'PHASE1',  duration: 10000, enter: this.enterPhase1 },
      { key: 'PHASE2',  duration: 12000, enter: this.enterPhase2 },
      { key: 'PHASE3',  duration: 8000,  enter: this.enterPhase3 },
    ];

    // Event: Shoot periodically
    this.shootEvent = this.trackTimer(scene.time.addEvent({
      delay: 1500,
      callback: this.shootMain,
      callbackScope: this,
      loop: true
    }));

    // Start AI
    this.scheduleState(0);

    // Scene pause/resume hooks
    scene.events.on('pause', this.onScenePause, this);
    scene.events.on('resume', this.onSceneResume, this);

    // Cleanup when destroyed
    this.once('destroy', this._cleanup, this);
  }

  static preload(scene) {
    scene.load.image('Boss2', 'assets/Trinity.svg'); 
    scene.load.image('Boss2Bullet', 'assets/boss2bullet.png'); //
    scene.load.image('Boss2Special', 'assets/boss2special.png'); //
    scene.load.audio('boss2DeathSfx', 'assets/Boss2Death.mp3'); //
  }

  trackTimer(evt) {
    if (evt) this.trackedTimers.add(evt);
    return evt;
  }

  scheduleState(i) {
    if (!this.states[i]) return;
    if (this.stateTimer) this.stateTimer.remove(false);

    const { key, duration, enter } = this.states[i];
    this.currentState = i;
    if (typeof enter === 'function') enter.call(this);

    const nextIndex = (i + 1) % this.states.length;
    this.stateTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => this.scheduleState(nextIndex)
    });
    this.trackTimer(this.stateTimer);
  }

  // === STATE LOGIC ===
  enterIntro() {
    // Example: slowly drift in
    this.setVelocity(0, 50);
  }

  enterPhase1() {
    // Basic attack pattern
    this.setVelocity(0, 0);
  }

  enterPhase2() {
    // Maybe rotate and fire rapidly
    this.setAngularVelocity(this.spinSpeed);
  }

  enterPhase3() {
    // Special attack
    this.fireSpecial();
  }

  // === ATTACKS ===
  shootMain() {
    if (this.isPaused || this.isDead) return;

    const bullet = this.mainBullets.create(this.x, this.y, 'Boss2Bullet');
    bullet.setVelocityY(200);
  }

  fireSpecial() {
    if (this.isPaused || this.isDead) return;

    const bullet = this.specialBullets.create(this.x, this.y, 'Boss2Special');
    this.scene.physics.moveTo(bullet, this.scene.player.x, this.scene.player.y, 250);
  }

  // === DAMAGE ===
  takeDamage(amount = 1) {
    if (this.isDead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);

    this.scene.sound.play('boss2DeathSfx', { volume: 1 });

    // Cleanup bullets
    this.mainBullets.clear(true, true);
    this.specialBullets.clear(true, true);

    this._cleanup();
    this.destroy();
  }

  // === PAUSE/RESUME ===
  onScenePause() { if (this.active) this.isPaused = true; }
  onSceneResume() { if (this.active) this.isPaused = false; }

  // === CLEANUP ===
  _cleanup() {
    if (this.scene && this.scene.events) {
      this.scene.events.off('pause', this.onScenePause, this);
      this.scene.events.off('resume', this.onSceneResume, this);
    }
    for (const t of this.trackedTimers) if (t) t.remove(false);
    this.trackedTimers.clear();
  }
}
