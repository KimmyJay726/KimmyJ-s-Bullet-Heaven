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

		// luciferPlacehold
		const luciferPlacehold = this.physics.add.sprite(644, 457, "LuciferPlacehold");
		luciferPlacehold.scaleX = 0.5;
		luciferPlacehold.scaleY = 0.5;
		luciferPlacehold.body.setSize(254, 198, false);
		this.luciferPlacehold = luciferPlacehold; // ADDED CRITICAL ASSIGNMENT

		// REMOVED SINGLE BULLET CREATION
		// ADDED PROJECTILES GROUP
		this.projectiles = this.physics.add.group({
			classType: Phaser.Physics.Arcade.Sprite,
			defaultKey: 'bullet',
			maxSize: 10
		});

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
		this.luciferPlacehold.setVelocity(0, 0);

		// Movement handling
		if (this.upKey.isDown) {
			this.luciferPlacehold.setVelocityY(-this.playerVelocity);
			this.updateLastDirection(0, -1);
		} else if (this.downKey.isDown) {
			this.luciferPlacehold.setVelocityY(this.playerVelocity);
			this.updateLastDirection(0, 1);
		}

		if (this.leftKey.isDown) {
			this.luciferPlacehold.setVelocityX(-this.playerVelocity);
			this.updateLastDirection(-1, 0);
		} else if (this.rightKey.isDown) {
			this.luciferPlacehold.setVelocityX(this.playerVelocity);
			this.updateLastDirection(1, 0);
		}

		// Boundary constraints
		this.luciferPlacehold.x = Phaser.Math.Clamp(
			this.luciferPlacehold.x, 
			50, 
			this.game.config.width - 50
		);
		this.luciferPlacehold.y = Phaser.Math.Clamp(
			this.luciferPlacehold.y, 
			50, 
			this.game.config.height - 50
		);

		// Shooting - CHANGED TO Z-KEY
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
		// Create bullet at player position offset by 30px in direction
		const x = this.luciferPlacehold.x + this.lastDirection.x * 30;
		const y = this.luciferPlacehold.y + this.lastDirection.y * 30;

		// Get bullet from pool
		const bullet = this.projectiles.get(x, y);
		
		if (bullet) {
			// Set bullet properties
			bullet.scaleX = 0.1;
			bullet.scaleY = 0.1;
			bullet.body.setSize(100, 100, true); // Adjusted collision size
			
			bullet.setActive(true)
				.setVisible(true)
				.setVelocity(
					this.lastDirection.x * this.bulletSpeed,
					this.lastDirection.y * this.bulletSpeed
				)
				.setLifespan(2000); // Auto-remove after 2 seconds
		}
	}
	/* END-USER-CODE */
}

/* END OF COMPILED CODE */