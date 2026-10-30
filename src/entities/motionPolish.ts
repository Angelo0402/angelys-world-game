/**
 * CharacterMotionPolish — reusable body-motion layer for ANY character.
 *
 * Scale ONLY. It never touches physics, velocities, hitboxes, or animation
 * choice. Any sprite — finished or placeholder — gets the same treatment:
 * breathing at idle, footstep bob tied to distance travelled (so the body
 * never slides), stretch on launch, squash on land, jump, and stop, and a
 * clean base scale whenever the character is not in its normal state (so no
 * squash ever sticks across an attack, hurt, or death).
 *
 * The caller owns the triggers: call land()/jump()/stop() on the matching
 * gameplay events, then compute() every frame it syncs the sprite.
 * Windows are in game time (scene.time.now), same clock as the caller's.
 */
export interface MotionSample {
  grounded: boolean;
  /** Absolute horizontal speed. */
  speedX: number;
  velY: number;
  /** World x, for the distance-tied footstep bob. */
  x: number;
  /** True only in the character's normal, non-swim state. */
  active: boolean;
}

export class MotionPolish {
  private landUntil = -1000;
  private jumpUntil = -1000;
  private stopUntil = -1000;

  /** Landing event: 150ms squash. */
  land(time: number): void {
    this.landUntil = time + 150;
  }

  /** Jump launch event: 130ms squash before the stretch. */
  jump(time: number): void {
    this.jumpUntil = time + 130;
  }

  /** Braking to a full stop: 150ms settle squash. */
  stop(time: number): void {
    this.stopUntil = time + 150;
  }

  compute(time: number, s: MotionSample, attackScale?: { sx: number; sy: number } | null): { sx: number; sy: number } {
    // Attack phases override the base motion: the attack poses carry the
    // action, Phaser only adds a subtle compression / stretch / settle.
    if (attackScale) return { ...attackScale };
    let sx = 1;
    let sy = 1;
    if (s.active) {
      if (s.grounded && s.speedX < 10) {
        // Idle breathing: two sines so the timing never looks mechanical.
        sy = 1 + 0.02 * Math.sin(time / 480) + 0.008 * Math.sin(time / 293);
        sx = 1 - 0.01 * Math.sin(time / 480);
      } else if (s.grounded && s.speedX >= 10) {
        // Footstep bob tied to distance, not to frame count.
        const ph = Math.abs(Math.sin(s.x * 0.045));
        sy = 1 - 0.025 * ph;
        sx = 1 + 0.015 * ph;
      } else if (!s.grounded) {
        if (s.velY < -100) {
          sy = 1.05;
          sx = 0.97;
        } else if (s.velY > 200) {
          sy = 1.02;
          sx = 0.99;
        }
      }
      // Event windows override the base motion (last write wins, same as
      // the original inline code: jump, then land, then stop).
      if (time < this.jumpUntil) {
        sy = 0.93;
        sx = 1.05;
      }
      if (time < this.landUntil) {
        sy = 0.93;
        sx = 1.06;
      }
      if (time < this.stopUntil) {
        sy = 0.93;
        sx = 1.06;
      }
    }
    return { sx, sy };
  }
}
