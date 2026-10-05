import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";

export function coverImage(scene: Phaser.Scene, key: string) {
  const img = scene.add.image(GAME_W / 2, GAME_H / 2, key);
  img.setScale(Math.max(GAME_W / img.width, GAME_H / img.height));
  return img;
}

/** Touch controls on touch devices, or anywhere with ?touch in the URL. */
export function useTouchUi(scene: Phaser.Scene) {
  return scene.sys.game.device.input.touch || new URLSearchParams(location.search).has("touch");
}

/** Fullscreen + landscape lock on Android; silently ignored where unsupported. */
export function requestFullscreenLandscape(scene: Phaser.Scene) {
  if (!scene.sys.game.device.input.touch) return;
  try {
    if (!scene.scale.isFullscreen) scene.scale.startFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation.lock?.("landscape").catch(() => undefined);
  } catch {
    // Fullscreen needs a user gesture and is unavailable in some WebViews.
  }
}
