import type Phaser from "phaser";

/** Soft dark backing so pale platforms read against a bright sky. */
export function backPlatform(scene: Phaser.Scene, x: number, top: number, width: number) {
  return scene.add.image(x, top + 16, "glow").setTint(0x14204a).setAlpha(0.55).setDisplaySize(width * 1.35, 70).setDepth(11.5);
}
