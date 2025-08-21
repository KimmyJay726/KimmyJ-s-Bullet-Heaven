import MainMenu from "./scenes/MainMenu.js";
import BossSelectScene from './scenes/BossSelectScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import Level    from "./scenes/Level.js";
import PauseOverlay from './scenes/PauseOverlay.js';
import Preload  from "./scenes/Preload.js";


window.addEventListener('load', function () {

  const game = new Phaser.Game({
    width: 1280,
    height: 720,
    type: Phaser.AUTO,
    backgroundColor: "#242424",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: true,
        gravity: { x: 0, y: 0 }
      }
    }
  });

  // Register scenes; Boot is auto‐started (third arg = true)
  game.scene.add("Preload",  Preload);
  game.scene.add("BossSelectScene", BossSelectScene);
  game.scene.add("MainMenu", MainMenu);
  game.scene.add("LoadingScene", LoadingScene);
  game.scene.add("Level",    Level);
  game.scene.add("PauseOverlay", PauseOverlay);
  game.scene.add("Boot",     Boot, true);
});

// Boot is defined inline here; you can also extract to src/scenes/Boot.js
class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Always‐needed assets (e.g. UI skins, small fonts, loading bar images)
    this.load.pack("pack", "assets/preload-asset-pack.json");
  }

  create() {
    // Chain into your Preload scene
    this.scene.start("Preload");
  }
}
