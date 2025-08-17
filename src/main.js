// src/index.js (or wherever you’re instantiating Phaser.Game)

import MainMenu from "./scenes/MainMenu.js";
import Level    from "./scenes/Level.js";
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

  // register all your scenes
  game.scene.add("Preload",   Preload);
  game.scene.add("MainMenu",  MainMenu);
  game.scene.add("Level",     Level);
  // Boot is set to auto-start (third arg = true)
  game.scene.add("Boot",      Boot, true);
});

class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // load any “always‐there” assets (e.g. UI skins, minimal fonts)
    this.load.pack("pack", "assets/preload-asset-pack.json");
  }

  create() {
    // instead of kicking off Preload, go straight to MainMenu
	this.scene.start("Preload");
    this.scene.start("MainMenu");
  }
}
