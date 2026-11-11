import { Machine } from "./machine";
import type { MachineClock, MachineDef, Transition } from "./machine";

/**
 * specialMachine.ts — the SPECIAL meter + homing-star burst as an explicit
 * state machine (v75). First conversion of the repo's implicit machines;
 * the pattern for the rest.
 *
 * States: "empty" | "charging" | "ready" | "bursting".
 * Events: CHARGE (a kill, or 10 boss damage) / TRIGGER (R key or HUD tap) /
 *   BURST_DONE (the 1600 ms re-trigger block ends) / RESET (level restart).
 *
 * Behavior preserved EXACTLY from the v74 flag version (GameScene.ts):
 * - Fill: kills and 10 boss damage per charge; `addCharge` toasts once on
 *   the transition to full and drives the HUD through `registry "special"`.
 * - Trigger guard: charge >= max AND not ending AND not in a cutscene AND
 *   the player alive. The old `specialBurstActive` boolean is GONE — the
 *   block is structural: TRIGGER has no transition out of "bursting", so a
 *   re-trigger mid-burst is impossible by construction.
 * - On trigger the meter drains at once; 8 stars spawn at the wand tip
 *   after 350 ms; the re-trigger block clears after 1600 ms.
 * - The meter CAN refill from star kills mid-burst (v74 comment): CHARGE
 *   is accepted in "bursting" and the state stays "bursting" — a
 *   self-transition, so the burst's own 1600 ms timer is NOT cancelled.
 * - Stars OUTLIVE the burst: BURST_DONE at 1600 ms only ends the block.
 *   Stars (spawned at 350 ms, 1500 ms life) keep flying until ~1850 ms,
 *   so the bursting exit hook destroys nothing — the stars are destroyed
 *   by `clearBurst`, which runs only on RESET.
 * - RESET is total: owned timers cancelled, live stars destroyed, meter
 *   drained, targets cleared, back to "empty". `GameScene.init()` sends it
 *   on every restart — this is the fix for the live v74 defect (init()
 *   reset the charge but never the burst guard or the stars, so a restart
 *   mid-burst left SPECIAL permanently un-triggerable).
 *
 * The table never touches scene fields directly: everything it needs comes
 * through `SpecialMachineHost` callbacks, so the table is testable without
 * Phaser and GameScene's privates stay private.
 */

export type SpecialState = "empty" | "charging" | "ready" | "bursting";
export type SpecialEvent = "CHARGE" | "TRIGGER" | "BURST_DONE" | "RESET";

export interface SpecialMachineHost {
  maxCharge: number;
  getCharge(): number;
  /** The non-meter half of the trigger guard: not ending, not in a
   * cutscene, player alive. (The meter half is `isFull`, below.) */
  canTrigger(): boolean;
  addCharge(n: number): void;
  startBurst(): void;
  spawnStars(): void;
  clearBurst(): void;
}

export function createSpecialMachine(host: SpecialMachineHost, clock: MachineClock): Machine<SpecialState, SpecialEvent> {
  let machine!: Machine<SpecialState, SpecialEvent>;

  const isFull = (): boolean => host.getCharge() >= host.maxCharge;

  /** Where a CHARGE lands: "ready" at full, "charging" while partial,
   * "empty" at zero — except mid-burst, where the meter refills under the
   * burst and the state must stay "bursting". */
  const chargeTarget = (from: SpecialState): SpecialState =>
    from === "bursting" ? "bursting" : isFull() ? "ready" : host.getCharge() > 0 ? "charging" : "empty";

  /** Where BURST_DONE lands once the 1600 ms block ends: the meter's real
   * charge decides — a burst whose stars refilled the meter to full lands
   * in "ready", not "empty". */
  const afterBurstTarget = (): SpecialState =>
    isFull() ? "ready" : host.getCharge() > 0 ? "charging" : "empty";

  const charge: Transition<SpecialState> = { target: chargeTarget, action: () => host.addCharge(1) };
  const trigger: Transition<SpecialState> = {
    target: "bursting",
    guard: () => isFull() && host.canTrigger(),
    action: () => host.startBurst(),
  };
  const reset: Transition<SpecialState> = { target: "empty", action: () => machine.reset() };

  const def: MachineDef<SpecialState, SpecialEvent> = {
    initial: "empty",
    states: {
      empty: { on: { CHARGE: charge, TRIGGER: trigger, RESET: reset } },
      charging: { on: { CHARGE: charge, TRIGGER: trigger, RESET: reset } },
      ready: { on: { CHARGE: charge, TRIGGER: trigger, RESET: reset } },
      bursting: {
        enter: () => {
          machine.after(350, () => host.spawnStars());
          machine.after(1600, () => machine.send("BURST_DONE"));
        },
        on: { CHARGE: charge, BURST_DONE: { target: afterBurstTarget }, RESET: reset },
      },
    },
    onReset: () => host.clearBurst(),
  };
  machine = new Machine(def, clock);
  return machine;
}
