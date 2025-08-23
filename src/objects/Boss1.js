export default class Boss1 extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'Boss1') {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.isPaused = false;
        this.isDestroyed = false; // Flag to safely stop updates after victory
        this.trackedTimers = new Set();
        this.stateTimer = null;
        this.stateStartTime = 0;
        this.stateDuration = 0;
        this.remainingStateTime = 0;
        this.nextStateIndex = 0;
        this._savedVelocity = new Phaser.Math.Vector2();
        this._savedAngular = 0;
        this.phase8Passes = 0;
        this.phase9Completed = false; // New flag to track Phase 9 completion
        this.shootEvent = null; // We will now manage this manually
        this.shootEventRemainingDelay = 0; // New property to store the remaining delay

        scene.events.on('pause', this.onScenePause, this);
        scene.events.on('resume', this.onSceneResume, this);

        this.setOrigin(0.5).setScale(0.125);
        this.speed = 100;
        this.spinSpeed = 90;

        this.bossBullets = scene.physics.add.group();
        this.wallBullets = scene.physics.add.group({
            immovable: true,
            allowGravity: false
        });
        this.starBullets = scene.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            defaultKey: 'StarBullet'
        });
        this.angelBullets = scene.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            defaultKey: 'AngelBullet'
        });

        this.states = [
            { key: 'START', duration: 4000, enter: this.enterStart, exit: this.exitStart },
            { key: 'PHASE1', duration: 43600, enter: this.enterPhase1, exit: this.exitPhase1 },
            { key: 'PHASE2', duration: 7800, enter: this.enterPhase2, exit: this.exitPhase2 },
            { key: 'PHASE3', duration: 14600, enter: this.enterPhase3, exit: this.exitPhase3 },
            { key: 'PHASE4', duration: 15600, enter: this.enterPhase4, exit: this.exitPhase4 },
            { key: 'PHASE5', duration: 20000, enter: this.enterPhase5, exit: this.exitPhase5 },
            { key: 'PHASE6', duration: 7000, enter: this.enterPhase6, exit: this.exitPhase6 },
            { key: 'PHASE7', duration: 6100, enter: this.enterPhase7, exit: this.exitPhase7 },
            { key: 'PHASE8', duration: 20000, enter: this.enterPhase8, exit: this.exitPhase8 },
            { key: 'PHASE9', duration: 20000, enter: this.enterPhase9, exit: this.exitPhase9 },
            { key: 'FINAL', duration: 999999, enter: this.enterFinal, exit: this.exitFinal },
        ];

        this.scheduleState(0);
        this.once('destroy', this._cleanup, this);
    }

    static preload(scene) {
        scene.load.image('Boss1', 'assets/Star.png');
        scene.load.image('BossAngry', 'assets/Star2.png');
        scene.load.image('BossHappy', 'assets/Star3.png');
        scene.load.image('Bullet', 'assets/bossbullet.png');
        scene.load.image('WallBullet', 'assets/wallbullet.svg');
        scene.load.image('StarBullet', 'assets/starshard.svg');
        scene.load.image('AngelBullet', 'assets/angelbullet.svg');
    }

    trackTimer(evt) {
        if (evt) this.trackedTimers.add(evt);
        return evt;
    }

    scheduleState(i) {
        const currentStateDef = this.states[this.currentState];
        if (currentStateDef && typeof currentStateDef.exit === 'function') {
            currentStateDef.exit.call(this);
        }

        if (!Number.isInteger(i) || !this.states[i]) {
            console.warn(`Invalid state index ${i}. Falling back to state 0.`);
            i = 0;
        }

        if (this.stateTimer) {
            this.stateTimer.remove(false);
            this.stateTimer = null;
        }

        const {
            key,
            duration,
            enter
        } = this.states[i];
        this.currentState = i;
        this.stateName = key;

        if (typeof enter === 'function') enter.call(this, key);

        // If the previous state was Phase 9, change the global shootEvent callback
        if (currentStateDef && currentStateDef.key === 'PHASE9') {
            if (this.shootEvent) {
                this.shootEvent.callback = this.shootFanTwice;
            }
        }

        this.nextStateIndex = (i + 1) % this.states.length;
        if (key === 'PHASE9') {
            this.nextStateIndex = 4;
        }

        if (key === 'PHASE8') {
            this.phase8Passes++;
            if (this.phase8Passes >= 2) {
                this.nextStateIndex = this.states.findIndex(state => state.key === 'FINAL');
            } else {
                this.nextStateIndex = 9;
            }
        }
        
        // Check if the current state is FINAL. If so, do not set a new state timer.
        if (key === 'FINAL') {
            return;
        }

        const now = (this.scene && this.scene.time) ? this.scene.time.now : 0;
        this.stateStartTime = now;
        this.stateDuration = duration;
        this.remainingStateTime = duration;

        if (this.scene && this.scene.time) {
            this.stateTimer = this.scene.time.addEvent({
                delay: duration,
                callback: () => this.scheduleState(this.nextStateIndex)
            });
            this.trackTimer(this.stateTimer);
        }
    }

    pauseBossFight() {
        if (this.isPaused) return;
        this.isPaused = true;

        if (this.stateTimer) {
            const now = (this.scene && this.scene.time) ? this.scene.time.now : this.stateStartTime;
            const elapsed = now - this.stateStartTime;
            this.remainingStateTime = Math.max(0, this.stateDuration - elapsed);
            this.stateTimer.remove(false);
            this.stateTimer = null;
        }
        
        // Save the remaining delay of the shootEvent timer and remove it
        if (this.shootEvent && !this.shootEvent.paused) {
            this.shootEventRemainingDelay = this.shootEvent.getRemaining();
            this.shootEvent.remove();
            this.shootEvent = null;
        }

        // Pause all other tracked timers
        for (const t of this.trackedTimers) {
            if (t) t.paused = true;
        }
        
        if (this.body) {
            this._savedVelocity.copy(this.body.velocity);
            this._savedAngular = this.body.angularVelocity || 0;
            this.body.setVelocity(0, 0);
            if (this.setAngularVelocity) this.setAngularVelocity(0);
            this.body.moves = false;
        }
    }

    resumeBossFight() {
        if (!this.isPaused) return;
        this.isPaused = false;

        if (this.remainingStateTime > 0 && this.scene && this.scene.time) {
            this.stateStartTime = this.scene.time.now;
            const delay = this.remainingStateTime;
            this.remainingStateTime = 0;
            this.stateTimer = this.scene.time.addEvent({
                delay,
                callback: () => this.scheduleState(this.nextStateIndex)
            });
            this.trackTimer(this.stateTimer);
        }

        // Re-create the shootEvent timer with the remaining delay
        if (!this.shootEvent && this.shootEventRemainingDelay > 0) {
            const currentPhase = this.states[this.currentState];
            let callback = this.shootFan;
            let delay = 1800; // Default delay
            
            if (currentPhase.key === 'PHASE9') {
                callback = this.shootFanTwice;
                delay = 1200;
            }
            
            this.shootEvent = this.trackTimer(this.scene.time.addEvent({
                delay: this.shootEventRemainingDelay,
                callback: callback,
                callbackScope: this,
                loop: true
            }));
        }

        // Resume other tracked timers
        for (const t of this.trackedTimers) {
            if (t) t.paused = false;
        }

        if (this.body) {
            this.body.moves = true;
            this.body.setVelocity(this._savedVelocity.x, this._savedVelocity.y);
            if (this.setAngularVelocity) this.setAngularVelocity(this._savedAngular);
        }
    }

    onScenePause() {
        if (!this.active) return;
        this.pauseBossFight();
    }

    onSceneResume() {
        if (!this.active) return;
        this.resumeBossFight();
    }

    preUpdate(time, delta) {
        // NEW: Check if the boss is marked for destruction
        if (this.isDestroyed) {
            return;
        }
        
        super.preUpdate(time, delta);
        if (this.isPaused || !this.body) return;

        // This logic should be moved to the update() loop for the FINAL phase
        if (this.stateName === 'FINAL' && this.player && this.player.active) {
            // This line is likely causing the error and should be removed from preUpdate.
            // It's also inconsistent with your new FINAL phase behavior.
            // this.scene.physics.moveToObject(this, this.player, this.speed * 1.5);
        }
    }

    _cleanup() {
        if (this.scene && this.scene.events) {
            this.scene.events.off('pause', this.onScenePause, this);
            this.scene.events.off('resume', this.onSceneResume, this);
        }
        for (const t of this.trackedTimers) {
            if (t) t.remove(false);
        }
        this.trackedTimers.clear();
        this.stateTimer = null;
        this.shootEvent = null;

        const groups = [this.bossBullets, this.wallBullets, this.starBullets, this.angelBullets];
        for (const g of groups) {
            if (g && g.clear) g.clear(true, true);
            if (g && g.destroy) g.destroy();
        }
        this.bossBullets = this.wallBullets = this.starBullets = this.angelBullets = null;
    }

    destroy(fromScene) {
        this._cleanup();
        super.destroy(fromScene);
    }

    // -------------------------
    // State entry callbacks
    // -------------------------

    enterStart() {
        this.stateName = 'START';
        this.body.setCollideWorldBounds(false);

        this.scene.physics.moveTo(this, 640, 100, this.speed);
        const distance = Phaser.Math.Distance.Between(this.x, this.y, 640, 100);
        const travelTime = (distance / this.speed) * 1000;

        this.trackTimer(this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0, 0);
            this.setPosition(640, 100);
        }));
    }

    exitStart() {}

    enterPhase1() {
        this.stateName = 'PHASE1';
        this.player = this.scene.player;
        
        // Re-create the shootEvent timer for this phase
        this.shootEvent = this.trackTimer(this.scene.time.addEvent({
            delay: 1800,
            callback: this.shootFan,
            callbackScope: this,
            loop: true
        }));
    }

    // The single fan bullet shot
    shootFan() {
        const fanAngle = 60;
        const bulletCnt = 5;
        const speed = 400;
        const errorMargin = 5;

        if (!this.player || typeof this.player.x !== 'number' || typeof this.player.y !== 'number') {
            return;
        }

        const baseDeg = Phaser.Math.RadToDeg(
            Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y)
        );

        const step = fanAngle / (bulletCnt - 1);

        if (!this.starBullets || typeof this.starBullets.get !== 'function') {
            console.warn('starBullets group is missing or invalid');
            return;
        }

        for (let i = 0; i < bulletCnt; i++) {
            const idealDeg = baseDeg - fanAngle / 2 + step * i;
            const finalDeg = idealDeg + Phaser.Math.FloatBetween(-errorMargin, errorMargin);
            const b = this.starBullets.get(this.x, this.y);
            if (!b) continue;

            b.setActive(true).setVisible(true).setScale(0.05).setAngle(finalDeg);
            if (b.body) {
                b.body.reset(this.x, this.y);
                const r = b.displayWidth / 2;
                b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);
                this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);
            }
        }
    }

    exitPhase1() {
        if (this.shootEvent) {
            this.shootEvent.remove();
            this.shootEvent = null;
        }
    }

    enterPhase2() {
        this.stateName = 'PHASE2';
        this.spinSpeed = -180;

        const {
            width,
            height
        } = this.scene.scale;
        const spacing = 32;
        const wallDelay = 1800;
        const bulletInterval = 100;
        const spawnOffset = 10;
        const speed = 200;

        const sides = ['top', 'right', 'bottom', 'left'];
        sides.forEach((side, sideIdx) => {
            this.trackTimer(this.scene.time.delayedCall(wallDelay * sideIdx, () => {
                const max = (side === 'top' || side === 'bottom') ? width : height;
                const positions = [];
                for (let i = 0; i <= max; i += spacing) {
                    positions.push(i);
                }

                if (side === 'bottom' || side === 'left') {
                    positions.reverse();
                }

                positions.forEach((pos, i) => {
                    this.trackTimer(this.scene.time.delayedCall(bulletInterval * i, () => {
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
                        this._spawnWallBullet(x, y, angleDeg, speed, spawnOffset, side);
                    }));
                });
            }));
        });
    }

    _spawnWallBullet(x, y, angleDeg, speed, offset, side) {
        const spike = this.wallBullets.get(x, y, 'WallBullet');
        if (!spike) return;

        spike.setActive(true).setVisible(true).setScale(1).setAngle(angleDeg);
        this.scene.physics.velocityFromAngle(angleDeg, speed, spike.body.velocity);

        const bodyWidth = spike.displayWidth;
        const bodyHeight = spike.displayHeight;

        spike.body.setSize(bodyWidth, bodyHeight);

        if (side === 'top') {
            spike.body.setOffset(0, bodyHeight - 25);
        } else if (side === 'bottom') {
            spike.body.setOffset(0, -bodyHeight + 25);
        } else {
            spike.body.setOffset(0, 0);
        }

        const travelTime = (offset / speed) * 1000;
        this.trackTimer(this.scene.time.delayedCall(travelTime, () => {
            spike.body.setVelocity(0);
            spike.body.immovable = true;
        }));
    }

    exitPhase2() {}

    enterPhase3() {
        this.stateName = 'PHASE3';
        this.player = this.scene.player;
        this.spinSpeed = 180;
        
        // Re-create the shootEvent timer for this phase
        this.shootEvent = this.trackTimer(this.scene.time.addEvent({
            delay: 1800,
            callback: this.shootFan,
            callbackScope: this,
            loop: true
        }));

        // Boss does not bounce in this phase
        this.body.setCollideWorldBounds(false).setBounce(0);
        this.body.setVelocity(0, 0);

        const interval = 100;
        const speed = 300;
        const errorMargin = 45;

        this.flurryEvent = this.trackTimer(this.scene.time.addEvent({
            delay: interval,
            loop: true,
            callback: () => this.shootFlurryBullet(speed, errorMargin),
            callbackScope: this
        }));
    }

    shootFlurryBullet(speed, errorMargin) {
        if (this.stateName !== 'PHASE3') return;
        const baseRad = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        const baseDeg = Phaser.Math.RadToDeg(baseRad);
        const errorDeg = Phaser.Math.FloatBetween(-errorMargin, errorMargin);
        const finalDeg = baseDeg + errorDeg;
        const b = this.bossBullets.get(this.x, this.y, 'Bullet');
        if (!b) return;

        b.setActive(true).setVisible(true).setScale(0.1).setAngle(finalDeg);
        const r = b.displayWidth / 2;
        b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);
        this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);
        this.trackTimer(this.scene.time.delayedCall(3000, () => {
            if (b.active) b.destroy();
        }));
    }

    exitPhase3() {
        if (this.flurryEvent) {
            this.flurryEvent.remove(false);
            this.flurryEvent = null;
        }
        if (this.shootEvent) {
            this.shootEvent.remove();
            this.shootEvent = null;
        }
    }

    enterPhase4() {
        this.stateName = 'PHASE4';
        this.spinSpeed = 120;
        
        // Re-create the shootEvent timer for this phase
        this.shootEvent = this.trackTimer(this.scene.time.addEvent({
            delay: 1800,
            callback: this.shootFan,
            callbackScope: this,
            loop: true
        }));
        
        const {
            width,
            height
        } = this.scene.scale;
        const speed = 300;
        const spawnRate = 150;

        // Conditional bouncing behavior
        if (this.phase9Completed) {
            this.body
                .setCollideWorldBounds(true)
                .setBounce(1);
        } else {
            this.body
                .setCollideWorldBounds(false)
                .setBounce(0);
        }

        this.phase4Event = this.trackTimer(this.scene.time.addEvent({
            delay: spawnRate,
            callback: () => {
                if (this.stateName !== 'PHASE4') return;
                const xPos = Phaser.Math.Between(0, width);
                const yPos = height + 10;
                const b = this.angelBullets.get(xPos, yPos, 'AngelBullet');
                if (!b) return;
                b.setActive(true).setVisible(true).setScale(0.125).setAngle(90);
                const r = b.displayWidth / 2;
                b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);
                b.body.setVelocity(0, -speed);
                b.checkWorldBounds = true;
                b.outOfBoundsKill = true;
            },
            callbackScope: this,
            loop: true
        }));
    }

    exitPhase4() {
        if (this.phase4Event) {
            this.phase4Event.remove(false);
            this.phase4Event = null;
        }
        if (this.shootEvent) {
            this.shootEvent.remove();
            this.shootEvent = null;
        }
    }

    enterPhase5() {
        this.stateName = 'PHASE5';
        this.player = this.scene.player;
        this.spinSpeed = -90;
        this.body.setCollideWorldBounds(false).setBounce(0);

        const {
            width,
            height
        } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;
        this.scene.physics.moveTo(this, cx, cy, this.speed);
        const dist = Phaser.Math.Distance.Between(this.x, this.y, cx, cy);
        const travelTime = (dist / this.speed) * 1000;

        this.trackTimer(this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0);
            this.setPosition(cx, cy);

            this.edgeBulletEvent = this.trackTimer(this.scene.time.addEvent({
                delay: 75,
                loop: true,
                callback: this.spawnEdgeBullet,
                callbackScope: this
            }));
        }));
    }

    spawnEdgeBullet() {
        if (this.stateName !== 'PHASE5') return;
        const {
            width,
            height
        } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;
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

        const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x, y, cx, cy));
        const b = this.bossBullets.get(x, y, 'Bullet');
        if (!b) return;

        b.setActive(true).setVisible(true).setScale(0.1).setAngle(angle);
        b.body.reset(x, y);
        this.scene.physics.velocityFromAngle(angle, 100, b.body.velocity);
        const r = b.displayWidth / 2;
        b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);
        const dist = Phaser.Math.Distance.Between(x, y, cx, cy);
        const timeMs = (dist / 100) * 1000;
        this.trackTimer(this.scene.time.delayedCall(timeMs, () => {
            if (b.active) b.destroy();
        }));
    }

    exitPhase5() {
        if (this.edgeBulletEvent) {
            this.edgeBulletEvent.remove(false);
            this.edgeBulletEvent = null;
        }
    }

    enterPhase6() {
        this.stateName = 'PHASE6';
        this.spinSpeed = -90;

        const {
            width,
            height
        } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;

        this.scene.physics.moveTo(this, cx, cy, this.speed);
        const dist = Phaser.Math.Distance.Between(this.x, this.y, cx, cy);
        const travelTime = (dist / this.speed) * 1000;

        this.trackTimer(this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0, 0);
            this.setPosition(cx, cy);
        }));
    }

    exitPhase6() {}

    enterPhase7() {
        this.stateName = 'PHASE7';
        this.body.setCollideWorldBounds(false);
        this.spinSpeed = 90;

        // Re-create the shootEvent timer for this phase
        this.shootEvent = this.trackTimer(this.scene.time.addEvent({
            delay: 1800,
            callback: this.shootFan,
            callbackScope: this,
            loop: true
        }));

        this.scene.physics.moveTo(this, 640, 100, this.speed);
        const distance = Phaser.Math.Distance.Between(this.x, this.y, 640, 100);
        const travelTime = (distance / this.speed) * 1000;

        this.trackTimer(this.scene.time.delayedCall(travelTime, () => {
            this.body.setVelocity(0, 0);
            this.setPosition(640, 100);
        }));
    }

    exitPhase7() {
        if (this.shootEvent) {
            this.shootEvent.remove();
            this.shootEvent = null;
        }
    }

    enterPhase8() {
        this.stateName = 'PHASE8';
        this.player = this.scene.player;
        this.spinSpeed = 180;
        
        // Re-create the shootEvent timer for this phase
        this.shootEvent = this.trackTimer(this.scene.time.addEvent({
            delay: 1800,
            callback: this.shootFan,
            callbackScope: this,
            loop: true
        }));

        // Always set bounce in this phase
        this.body.setCollideWorldBounds(true).setBounce(1);
        
        // Start moving randomly at the beginning of the phase
        // CHANGED: Increased the velocity for a faster bounce.
        this.body.setVelocity(Phaser.Math.Between(-300, 300), Phaser.Math.Between(-300, 300));

        this.phase8Timer = this.trackTimer(this.scene.time.addEvent({
            delay: 120,
            loop: true,
            callback: () => this.shootPhase8Bullet(300, 20),
            callbackScope: this
        }));
    }

    shootPhase8Bullet(speed, errorMargin) {
        if (this.stateName !== 'PHASE8') return;

        const baseRad = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        const baseDeg = Phaser.Math.RadToDeg(baseRad);
        const finalDeg = baseDeg + Phaser.Math.FloatBetween(-errorMargin, errorMargin);

        const b = this.bossBullets.get(this.x, this.y, 'Bullet');
        if (!b) return;

        b.setActive(true).setVisible(true).setScale(0.1).setAngle(finalDeg);
        const r = b.displayWidth / 2;
        b.body.setCircle(r, (b.width - b.displayWidth) / 2, (b.height - b.displayHeight) / 2);
        this.scene.physics.velocityFromAngle(finalDeg, speed, b.body.velocity);
        this.trackTimer(this.scene.time.delayedCall(3000, () => {
            if (b.active) b.destroy();
        }));
    }

    exitPhase8() {
        if (this.phase8Timer) {
            this.phase8Timer.remove(false);
            this.phase8Timer = null;
        }
        if (this.shootEvent) {
            this.shootEvent.remove();
            this.shootEvent = null;
        }
        // Retain bouncing behavior from this phase to the next.
        this.body.setCollideWorldBounds(false).setBounce(0);
    }

    enterPhase9() {
        this.stateName = 'PHASE9';
        this.player = this.scene.player;
        this.spinSpeed = 180;

        // Re-create the shootEvent timer for this phase, with a shorter delay and new callback
        this.shootEvent = this.trackTimer(this.scene.time.addEvent({
            delay: 1200,
            callback: this.shootFanTwice,
            callbackScope: this,
            loop: true
        }));

        this.setTintFill(0xffffff);
        this.trackTimer(this.scene.time.delayedCall(100, () => {
            this.clearTint();
            this.setTexture('BossAngry');
        }));

        this.body.setCollideWorldBounds(true).setBounce(1);
        this.scene.physics.moveToObject(this, this.player, this.speed * 2);
    }
    
    // A new method to fire the fan bullet twice
    shootFanTwice() {
        // First shot
        this.shootFan();
        // Odd interval for second shot
        this.trackTimer(this.scene.time.delayedCall(Phaser.Math.Between(100, 300), () => {
            this.shootFan();
        }));
    }

    exitPhase9() {
        if (this.shootEvent) {
            this.shootEvent.remove();
            this.shootEvent = null;
        }
        // Retain velocity so the boss continues bouncing.
        this.phase9Completed = true;
    }
    
    // New FINAL phase entry callback
enterFinal() {
    this.stateName = 'FINAL';
    this.player = this.scene.player;

    // Stops all bullet attacks before cleanup
    if (this.shootEvent) {
        this.shootEvent.remove();
        this.shootEvent = null;
    }
    if (this.flurryEvent) {
        this.flurryEvent.remove(false);
        this.flurryEvent = null;
    }

    // Now, perform a targeted cleanup to remove other extraneous timers.
    for (const t of this.trackedTimers) {
        // Exclude the main shootEvent from being removed
        if (t !== this.shootEvent) {
            if (t) t.remove(false);
        }
    }
    this.trackedTimers.clear();
    
    // Sets the boss to spin slower and counter-clockwise
    this.spinSpeed = -180;
    
    // Removes the angry texture and tint
    this.setTexture('BossHappy');
    this.setTintFill(0xffffff);
    this.trackTimer(this.scene.time.delayedCall(250, () => this.clearTint()));

    // Sets the boss to move to the top middle of the screen
    this.body.setCollideWorldBounds(false).setBounce(0);
    const { width } = this.scene.scale;
    const targetX = width / 2;
    const targetY = 100;
    this.scene.physics.moveTo(this, targetX, targetY, this.speed);
    
    // Remove wall bullets one by one
    const bullets = this.wallBullets.getChildren();
    bullets.forEach((bullet, index) => {
        this.trackTimer(this.scene.time.delayedCall(index * 50, () => {
            if (bullet && bullet.active) {
                bullet.destroy();
            }
        }));
    });

    // Schedule the boss's exit and victory screen after 10 seconds
    this.trackTimer(this.scene.time.delayedCall(10000, () => {
        // Stop the boss's spinning
        this.spinSpeed = 0;
        this.setAngularVelocity(0);

        // Make the boss fly upwards
        this.body.setVelocityY(-this.speed * 2);

        // Call a method to display the victory screen
        this.trackTimer(this.scene.time.delayedCall(1500, () => {
            this.displayVictoryScreen();
        }));
    }));
    
    // NEW: Manual BGM fade out
    if (this.scene.bgm && this.scene.bgm.isPlaying) {
      this.trackTimer(this.scene.time.addEvent({
        delay: 50, // Update volume every 50ms
        repeat: 200, // 200 * 50ms = 10 seconds total duration
        callback: () => {
          this.scene.bgm.volume = Math.max(0, this.scene.bgm.volume - 0.005); // Decrease volume by a small amount
          if (this.scene.bgm.volume === 0) {
            this.scene.bgm.stop();
          }
        },
        callbackScope: this
      }));
    }
}

// New FINAL phase exit callback
    exitFinal() {
        if (this.flurryEvent) {
            this.flurryEvent.remove(false);
            this.flurryEvent = null;
        }
        this.spinSpeed = 90;
    }

    update(time, delta) {
        // NEW: Check if the boss is marked for destruction
        if (this.isDestroyed) {
            return;
        }

        this.angle += this.spinSpeed * (delta / 1000);

        if (this.stateName === 'PHASE9' && this.player && this.player.active) {
            this.scene.physics.moveToObject(this, this.player, this.speed * 2);
        }

        // Stops the boss's movement when it reaches its target in FINAL phase
        if (this.stateName === 'FINAL' && this.body && this.body.velocity.x !== 0 && this.body.velocity.y !== 0) {
            const targetX = this.scene.scale.width / 2;
            const targetY = 100;
            if (Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY) < 5) {
                this.body.setVelocity(0, 0);
                this.setPosition(targetX, targetY);
            }
        }
    }

    // NEW: Add a method to display the victory screen
    displayVictoryScreen() {
        const { width, height } = this.scene.scale;

        // Clear all tracked timers before destroying the boss
        for (const t of this.trackedTimers) {
            if (t) t.remove(false);
        }
        this.trackedTimers.clear();

        // Display the victory text
        this.scene.add.text(width / 2, height / 2, 'VICTORY!', {
            fontSize: '64px',
            fill: '#00ff00',
            align: 'center'
        }).setOrigin(0.5);

        // NEW: Mark the boss for destruction and disable its physics body
        this.isDestroyed = true;
        if (this.body) {
            this.body.enable = false;
        }

        // Postpone the destruction to the next game frame
        // to prevent the race condition.
        this.scene.time.delayedCall(1, () => {
            this.destroy();
        });
    }
}
