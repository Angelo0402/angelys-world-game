/**
 * machine.ts — one tiny explicit state-machine helper for the whole repo (v75).
 *
 * A machine is a transition table plus owned timers. It exists so a feature's
 * states, transitions and guards live in ONE place that can be read, tested
 * and reset — instead of booleans and free-floating `delayedCall`s scattered
 * across a scene (the SPECIAL meter was the first: its re-trigger guard was
 * a boolean that `init()` never cleared, so restarting mid-burst left
 * SPECIAL permanently dead).
 *
 * Rules of the helper:
 * - `send(event)` runs the transition's action, then resolves the target.
 *   A target may be a function of the state the event came from, so a table
 *   can stay exact when the target depends on live data (e.g. the meter's
 *   charge after a CHARGE action).
 * - A transition whose target IS the current state is a self-transition:
 *   the state (and its owned timers) are left alone and no enter/exit hooks
 *   run. This matters: a CHARGE arriving mid-burst must NOT cancel the
 *   burst's own 1600 ms timer.
 * - `after(ms, fn)` timers are owned by the machine. They are cancelled when
 *   the machine leaves a state for a DIFFERENT state, and on `reset()`.
 * - `reset()` is a TOTAL reset: cancel owned timers, run `onReset`, back to
 *   the initial state. It does not run exit hooks (a reset is a hard reset,
 *   not a graceful transition).
 * - A `send()` that cannot fire (no transition, or a failed guard) is
 *   reported through `onInvalid` (default: `console.debug`) and returns
 *   false — never a silent no-op, never a crash.
 *
 * Same behavior as the code it replaces is the caller's job: the table must
 * encode exactly what the old flags did — same states, same transitions,
 * same guards, same timings.
 */

/** Where a transition lands: a fixed state, or a function of the state the
 * event came from (resolved after the action runs). */
export type TransitionTarget<S extends string> = S | ((from: S) => S);

export interface Transition<S extends string> {
  target: TransitionTarget<S>;
  guard?: () => boolean;
  action?: () => void;
}

export interface MachineStateDef<S extends string, E extends string> {
  on?: Partial<Record<E, Transition<S>>>;
  enter?: () => void;
  exit?: () => void;
}

export interface MachineDef<S extends string, E extends string> {
  initial: S;
  states: { [K in S]: MachineStateDef<S, E> };
  /** Total-reset work beyond cancelling timers (e.g. destroy owned sprites,
   * drain a meter). Runs on `reset()`, from any state. */
  onReset?: () => void;
  onInvalid?: (from: S, event: E) => void;
}

/** The only clock surface the machine needs — a Phaser Clock satisfies this
 * structurally, and a fake clock can stand in for tests. */
export interface MachineTimer {
  remove(dispatchCallback?: boolean): void;
}

export interface MachineClock {
  delayedCall(delay: number, callback: () => void): MachineTimer;
}

export class Machine<S extends string, E extends string> {
  private def: MachineDef<S, E>;
  private clock: MachineClock;
  private state: S;
  private timers = new Set<MachineTimer>();

  constructor(def: MachineDef<S, E>, clock: MachineClock) {
    this.def = def;
    this.clock = clock;
    this.state = def.initial;
  }

  get current(): S {
    return this.state;
  }

  /** Fire an event. Returns false (and reports) when the event cannot fire
   * from the current state. The action runs before the target is resolved,
   * so a function target sees the state the action produced. */
  send(event: E): boolean {
    const from = this.state;
    const transition = this.def.states[from].on?.[event];
    if (!transition || (transition.guard && !transition.guard())) {
      this.invalid(from, event);
      return false;
    }
    transition.action?.();
    const target = typeof transition.target === "function" ? transition.target(from) : transition.target;
    if (target === from) return true;
    this.def.states[from].exit?.();
    this.cancelTimers();
    this.state = target;
    this.def.states[target].enter?.();
    return true;
  }

  /** A timer owned by the machine: cancelled on a real state change and on
   * `reset()`. Fires at most once. */
  after(ms: number, fn: () => void): void {
    let timer: MachineTimer | undefined;
    timer = this.clock.delayedCall(ms, () => {
      if (timer) this.timers.delete(timer);
      fn();
    });
    this.timers.add(timer);
  }

  /** Total reset: cancel owned timers, run `onReset`, back to the initial
   * state. Safe to call from any state, including the initial one. */
  reset(): void {
    this.cancelTimers();
    this.def.onReset?.();
    this.state = this.def.initial;
  }

  private cancelTimers(): void {
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
  }

  private invalid(from: S, event: E): void {
    if (this.def.onInvalid) {
      this.def.onInvalid(from, event);
      return;
    }
    // Debug-level only: a blocked re-trigger is normal play (mashing the
    // button mid-burst), not an error.
    console.debug(`[machine] ignored ${event} in ${from}`);
  }
}
