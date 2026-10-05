import Phaser from "phaser";
import { Audio } from "../audio/AudioManager";
import type { Player } from "./Player";

/** Unique ID for each power-up type. */
export type PowerUpId =
  | "heart"
  | "star"
  | "shield"
  | "speed"
  | "power_sword"
  | "magnet"
  | "slow_time"
  | "extra_heart";

/** Definition of a power-up: how it looks, how long it lasts, what it does. */
export interface PowerUpDef {
  id: PowerUpId;
  /** Sprite texture key. */
  texture: string;
  /** Display size in px. */
  size: number;
  /** Duration in ms (0 = instant/permanent). */
  duration: number;
  /** Toast message shown on pickup. */
  toast: string;
  /** Sound effect key. */
  sfx: string;
}

export const POWERUP_DEFS: Record<PowerUpId, PowerUpDef> = {
  heart: { id: "heart", texture: "heart", size: 36, duration: 0, toast: "", sfx: "heart_pickup" },
  star: { id: "star", texture: "power_star", size: 44, duration: 8000, toast: "STAR POWER! Invincible!", sfx: "heart_pickup" },
  shield: { id: "shield", texture: "power_shield", size: 44, duration: 10000, toast: "SHIELD! Protected!", sfx: "heart_pickup" },
  speed: { id: "speed", texture: "power_speed", size: 44, duration: 8000, toast: "SPEED BOOST!", sfx: "heart_pickup" },
  power_sword: { id: "power_sword", texture: "power_sword", size: 44, duration: 10000, toast: "POWER SWORD!", sfx: "heart_pickup" },
  magnet: { id: "magnet", texture: "power_magnet", size: 44, duration: 12000, toast: "MAGNET! Coins come to you!", sfx: "heart_pickup" },
  slow_time: { id: "slow_time", texture: "power_slow", size: 44, duration: 6000, toast: "TIME SLOW!", sfx: "heart_pickup" },
  extra_heart: { id: "extra_heart", texture: "heart_extra", size: 36, duration: 0, toast: "EXTRA HEART!", sfx: "heart_pickup" },
};

/** Active temporary buff on the player. */
export interface ActiveBuff {
  id: PowerUpId;
  expiresAt: number;
}

/**
 * Modular power-up manager. Handles pickup detection, activation,
 * duration/expiration, visual feedback, and cleanup.
 *
 * Usage:
 *   const powerups = new PowerUpManager(scene, player);
 *   powerups.spawn("shield", x, y);  // drop a power-up in the world
 *   // in update(): powerups.update(time);
 */
export class PowerUpManager {
  private scene: Phaser.Scene;
  private player: Player;
  private pickups: { sprite: Phaser.GameObjects.Sprite; baseY: number; id: PowerUpId; taken: boolean }[] = [];
  private buffs = new Map<PowerUpId, ActiveBuff>();

  /** Callbacks for game-specific effects. Set by GameScene. */
  onActivate: (id: PowerUpId, player: Player) => void = () => {};
  onExpire: (id: PowerUpId, player: Player) => void = () => {};

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  /** Spawn a power-up pickup at world position. */
  spawn(id: PowerUpId, x: number, y: number) {
    const def = POWERUP_DEFS[id];
    if (!this.scene.textures.exists(def.texture)) return;
    const sprite = this.scene.add.sprite(x, y, def.texture).setDepth(50);
    sprite.setDisplaySize(def.size, def.size);
    // Bobbing animation
    this.scene.tweens.add({
      targets: sprite, y: y - 8, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    this.scene.tweens.add({
      targets: sprite, angle: 360, duration: 3000, repeat: -1,
    });
    this.pickups.push({ sprite, baseY: y, id, taken: false });
  }

  /** Check for player overlap with pickups. Call every frame. */
  update(time: number) {
    // Expire buffs
    for (const [id, buff] of this.buffs) {
      if (time > buff.expiresAt) {
        this.buffs.delete(id);
        this.onExpire(id, this.player);
      }
    }

    // Check pickups
    const pb = this.player.bounds();
    for (const p of this.pickups) {
      if (p.taken) continue;
      const def = POWERUP_DEFS[p.id];
      const r = new Phaser.Geom.Rectangle(
        p.sprite.x - def.size / 2, p.sprite.y - def.size / 2, def.size, def.size
      );
      if (Phaser.Geom.Rectangle.Overlaps(pb, r)) {
        p.taken = true;
        this.collect(p.id, p.sprite);
      }
    }
    this.pickups = this.pickups.filter((p) => !p.taken);
  }

  private collect(id: PowerUpId, sprite: Phaser.GameObjects.Sprite) {
    const def = POWERUP_DEFS[id];
    // Pickup animation
    this.scene.tweens.killTweensOf(sprite);
    this.scene.tweens.add({
      targets: sprite, scale: sprite.scale * 2, alpha: 0, duration: 300,
      onComplete: () => sprite.destroy(),
    });
    Audio.sfx(def.sfx as never);
    // Activate
    if (def.duration > 0) {
      this.buffs.set(id, { id, expiresAt: this.scene.time.now + def.duration });
    }
    this.onActivate(id, this.player);
  }

  /** Check if a buff is currently active. */
  has(id: PowerUpId): boolean {
    return this.buffs.has(id);
  }

  /** Clear all buffs (e.g., on player death or level restart). */
  clearAll() {
    for (const [id] of this.buffs) {
      this.onExpire(id, this.player);
    }
    this.buffs.clear();
  }

  /** Destroy all pickup sprites (e.g., on scene shutdown). */
  destroy() {
    for (const p of this.pickups) {
      this.scene.tweens.killTweensOf(p.sprite);
      p.sprite.destroy();
    }
    this.pickups = [];
    this.buffs.clear();
  }
}
