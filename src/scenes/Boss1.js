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

    // movement
    this.speed = 100;
    this.body
      .setVelocity(this.speed, this.speed)
      .setCollideWorldBounds(true)
      .setBounce(1);
  }

  // asset loader
  static preload(scene) {
    scene.load.image('Boss1', 'assets/Star.png');
  }

  // per-frame logic (optional)
  update(time, delta) {
    // example: rotate at 90 degrees/sec
    this.angle += 90 * (delta / 1000);
  }
}
