/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
// Add any additional imports here if needed
/* END-USER-IMPORTS */

export default class Level extends Phaser.Scene {

	constructor() {
		super("Level");

		/* START-USER-CTR-CODE */
		// Initialize shooting parameters
		this.lastDirection = { x: 0, y: -1 }; // Default shoot direction (up)
		this.lastShotTime = 0;
		this.shootCooldown = 500; // ms between shots
		this.bulletSpeed = 400;
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {
		// LeftKey
		const leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);

		// UpKey
		const upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

		// RightKey
		const rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

		// DownKey
		const downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

		// ZKey
		const zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

		// FIXED: Create physics-enabled player and assign to this.player
		this.player = this.physics.add.sprite(639, 550, "Player");
		this.player.scaleX = 0.25;
		this.player.scaleY = 0.25;

		this.leftKey = leftKey;
		this.upKey = upKey;
		this.rightKey = rightKey;
		this.downKey = downKey;
		this.zKey = zKey;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.Input.Keyboard.Key} */
	leftKey;
	/** @type {Phaser.Input.Keyboard.Key} */
	upKey;
	/** @type {Phaser.Input.Keyboard.Key} */
	rightKey;
	/** @type {Phaser.Input.Keyboard.Key} */
	downKey;
	/** @type {Phaser.Input.Keyboard.Key} */
	zKey;

	/* START-USER-CODE */
	playerVelocity = 200;
	playerHealth = 100;
	playerAttack = 10;
	score = 0;

	create() {
		this.editorCreate();
	}

	update() {
		// Reset velocity
		this.player.setVelocity(0, 0);

		// Movement handling
		if (this.upKey.isDown) {
			this.player.setVelocityY(-this.playerVelocity);
			this.updateLastDirection(0, -1);
		} else if (this.downKey.isDown) {
			this.player.setVelocityY(this.playerVelocity);
			this.updateLastDirection(0, 1);
		}

		if (this.leftKey.isDown) {
			this.player.setVelocityX(-this.playerVelocity);
			this.updateLastDirection(-1, 0);
		} else if (this.rightKey.isDown) {
			this.player.setVelocityX(this.playerVelocity);
			this.updateLastDirection(1, 0);
		}

		// Normalize diagonal movement
		if (this.player.body.velocity.x !== 0 && this.player.body.velocity.y !== 0) {
			this.player.body.velocity.normalize().scale(this.playerVelocity);
		}

		// Boundary constraints
		const halfWidth = this.player.displayWidth * this.player.scaleX / 2;
		const halfHeight = this.player.displayHeight * this.player.scaleY / 2;
		
		this.player.x = Phaser.Math.Clamp(
			this.player.x,
			50 + halfWidth,
			this.game.config.width - 50 - halfWidth
		);
		this.player.y = Phaser.Math.Clamp(
			this.player.y,
			50 + halfHeight,
			this.game.config.height - 50 - halfHeight
		);

		// Shooting
		if (this.zKey.isDown && this.time.now > this.lastShotTime + this.shootCooldown) {
			this.shoot();
			this.lastShotTime = this.time.now;
		}
	}

	updateLastDirection(x, y) {
		this.lastDirection.x = x;
		this.lastDirection.y = y;
	}

	shoot() {
		// Placeholder for shooting logic
		console.log("Shooting!", this.lastDirection);
	}
	/* END-USER-CODE */
}

/* END OF COMPILED CODE */