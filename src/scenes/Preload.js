export default class Preload extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    // Load everything else for MainMenu + Level
    // e.g.:
    // this.load.image("Player", "assets/player.png");
    // this.load.audio("hitSfx", "assets/Laser2.wav");
    // Boss1.preload(this);
    // …and so on
    this.load.pack("pack", "assets/preload-asset-pack.json");
  }

  create() {
    // Once all assets are in, drop into your main menu
    this.scene.start("MainMenu");
  }
}
