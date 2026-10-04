import Phaser from "phaser";
import { Audio } from "./audio/AudioManager";
import { bootNative } from "./native";
import { Gamepad } from "./input/gamepad";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { SplashScene } from "./scenes/SplashScene";
import { TitleScene } from "./scenes/TitleScene";
import { CANVAS_H, CANVAS_W, patchTextResolution, startPerfGuard } from "./render";

patchTextResolution();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: CANVAS_W(),
  height: CANVAS_H(),
  backgroundColor: "#120d1f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: "game",
  },
  input: { activePointers: 4 },
  fps: { target: 60, smoothStep: true },
  physics: {
    default: "arcade",
    // Variable step keeps motion smooth on 60/90/120 Hz phone screens; a fixed 60 Hz
    // step without interpolation stutters whenever steps-per-frame alternates.
    arcade: { gravity: { x: 0, y: 1900 }, debug: false, fixedStep: false },
  },
  render: { antialias: true, roundPixels: false, powerPreference: "high-performance", batchSize: 2048 },
  audio: { disableWebAudio: false },
  scene: [BootScene, TitleScene, SplashScene, GameScene, HudScene],
});

Audio.init(game);
Gamepad.install(game);
startPerfGuard(game);
void bootNative();

declare global {
  interface Window {
    __game?: Phaser.Game;
  }
}
window.__game = game;
