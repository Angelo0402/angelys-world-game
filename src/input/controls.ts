import Phaser from "phaser";
import { Gamepad } from "./gamepad";

/** Touch controls in the HUD write here; the game scene reads it alongside the keyboard and controller. */
export const touchState = {
  axis: 0,
  jumpHeld: false,
  jumpQueued: false,
  attackQueued: false,
  swapQueued: false,
};

export function resetTouch() {
  touchState.axis = 0;
  touchState.jumpHeld = false;
  touchState.jumpQueued = false;
  touchState.attackQueued = false;
  touchState.swapQueued = false;
}

export interface FrameInput {
  axis: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  swapPressed: boolean;
  pausePressed: boolean;
}

export const NO_INPUT: FrameInput = { axis: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, swapPressed: false, pausePressed: false };

export class KeyboardInput {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys("LEFT,RIGHT,UP,A,D,W,SPACE,J,K,ESC,P,Q,L,E") as Record<string, Phaser.Input.Keyboard.Key>;
  }

  read(): FrameInput {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    let axis = 0;
    if (k.LEFT.isDown || k.A.isDown) axis -= 1;
    if (k.RIGHT.isDown || k.D.isDown) axis += 1;
    if (axis === 0) axis = Gamepad.axis;
    if (axis === 0) axis = touchState.axis;
    const kbJump = JD(k.UP) || JD(k.W) || JD(k.SPACE);
    const kbAttack = JD(k.J) || JD(k.K);
    const out: FrameInput = {
      axis,
      jumpPressed: kbJump || Gamepad.jumpPressed || touchState.jumpQueued,
      jumpHeld: k.UP.isDown || k.W.isDown || k.SPACE.isDown || Gamepad.jumpHeld || touchState.jumpHeld,
      attackPressed: kbAttack || Gamepad.attackPressed || touchState.attackQueued,
      swapPressed: JD(k.Q) || JD(k.L) || JD(k.E) || Gamepad.swapPressed || touchState.swapQueued,
      pausePressed: JD(k.ESC) || JD(k.P) || Gamepad.pausePressed,
    };
    touchState.jumpQueued = false;
    touchState.attackQueued = false;
    touchState.swapQueued = false;
    return out;
  }
}
