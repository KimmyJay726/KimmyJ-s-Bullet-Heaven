// src/scenes/Level.js
import Boss1 from '../objects/Boss1.js';
import Player from '../objects/Player.js';

export default class Level extends Phaser.Scene {
    constructor() {
        super('Level');

        this.playerConfig = {
            playerVelocity: 300,
            dashSpeed: 600,
            dashDuration: 200,
            dashCooldown: 1000,
            spinSpeedIdle: 120,
            spinSpeedMax: 360,
            colorCycleSpeed: 90
        };
    }

    preload() {
        Player.preload(this);
        Boss1.preload(this);

        this.load.audio('hitSfx', 'assets/Laser2.wav');
        this.load.audio('boss1Music', 'assets/03-IMAGE-MATERIAL-2.mp3');
        this.load.image('background', 'assets/InGameBackground.png');
    }

    create() {
        // Input
        const keys = {
            leftKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            upKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            rightKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            downKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            dashKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
        };

        // Background
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background')
            .setOrigin(0.5).setDepth(-1);

        // Player
        this.player = new Player(this, 639, 550, keys, this.playerConfig);

        // Boss after delay
        this.time.delayedCall(3000, () => {
            this.sound.play('boss1Music', { loop: true, volume: 0.4 });
            this.boss = new Boss1(this, 640, 0);

            this.physics.add.overlap(this.player, this.boss, () => this.player.takeDamage(), null, this);
            this.physics.add.overlap(this.player, this.boss.bossBullets, () => this.player.takeDamage(), null, this);
            this.physics.add.overlap(this.player, this.boss.wallBullets, () => this.player.takeDamage(), null, this);
            this.physics.add.overlap(this.player, this.boss.starBullets, () => this.player.takeDamage(), null, this);
            this.physics.add.overlap(this.player, this.boss.angelBullets, () => this.player.takeDamage(), null, this);
        });

        // ESC key for pause overlay
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.pauseKey.on('down', () => {
            // Only trigger if THIS scene is active and overlay not already open
            if (this.scene.isActive(this.sys.settings.key) && !this.scene.isActive('PauseOverlay')) {
                this.launchPauseOverlay();
            }
        });

        // Auto‑pause on tab blur
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.scene.isActive(this.sys.settings.key) && !this.scene.isActive('PauseOverlay')) {
                    this.launchPauseOverlay();
                }
            }
        });
    }

    launchPauseOverlay() {
    this.scene.pause(); // pauses THIS scene
    this.sound.pauseAll();

    if (this.boss && this.boss.body) {
        this.boss.pauseBossFight();
    }

    this.scene.launch('PauseOverlay', { returnTo: this.sys.settings.key, boss: this.boss });
    }


    update(time, delta) {
        if (this.player) this.player.update(time, delta);
        if (this.boss) this.boss.update(time, delta);
    }
}
