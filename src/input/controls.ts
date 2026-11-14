import Phaser from "phaser";
import { Gamepad } from "./gamepad";

/** Touch controls in the HUD write here; the game scene reads it alongside the keyboard and controller. */
export const touchState = {
  axis: 0,
  /** PRUEBA ch11: joystick vertical (-1 up .. +1 down), same dead-zone/ramp as axis. */
  axisY: 0,
  jumpHeld: false,
  jumpQueued: false,
  attackQueued: false,
  swapQueued: false,
  specialQueued: false,
};

export function resetTouch() {
  touchState.axis = 0;
  touchState.axisY = 0;
  touchState.jumpHeld = false;
  touchState.jumpQueued = false;
  touchState.attackQueued = false;
  touchState.swapQueued = false;
  touchState.specialQueued = false;
}

export interface FrameInput {
  axis: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  /** PRUEBA ch11: ladder climb — UP/W (or pad up / touch JUMP held / joystick up). */
  upHeld: boolean;
  /** PRUEBA ch11: ladder climb down — S/DOWN (or pad down / joystick down). */
  downHeld: boolean;
  attackPressed: boolean;
  swapPressed: boolean;
  specialPressed: boolean;
  pausePressed: boolean;
}

export const NO_INPUT: FrameInput = { axis: 0, jumpPressed: false, jumpHeld: false, upHeld: false, downHeld: false, attackPressed: false, swapPressed: false, specialPressed: false, pausePressed: false };

export class KeyboardInput {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys("LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,J,K,R,ESC,P,Q,L,E") as Record<string, Phaser.Input.Keyboard.Key>;
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
      // PRUEBA ch11 ladder: holding JUMP on touch also climbs up (HUD has
      // JUMP + ACTION only — no separate up button). Joystick up/down climbs
      // the ladder both ways (Angelo 2026-11-13, voz): hold up to climb the
      // whole ladder, hold down to come back down.
      upHeld: k.UP.isDown || k.W.isDown || Gamepad.upHeld || touchState.jumpHeld || touchState.axisY < -0.25,
      downHeld: k.DOWN.isDown || k.S.isDown || Gamepad.downHeld || touchState.axisY > 0.25,
      attackPressed: kbAttack || Gamepad.attackPressed || touchState.attackQueued,
      swapPressed: JD(k.Q) || JD(k.L) || JD(k.E) || Gamepad.swapPressed || touchState.swapQueued,
      specialPressed: JD(k.R) || touchState.specialQueued,
      pausePressed: JD(k.ESC) || JD(k.P) || Gamepad.pausePressed,
    };
    touchState.jumpQueued = false;
    touchState.attackQueued = false;
    touchState.swapQueued = false;
    touchState.specialQueued = false;
    return out;
  }
}
