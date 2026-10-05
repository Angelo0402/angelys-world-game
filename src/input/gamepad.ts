import Phaser from "phaser";

/** Standard-mapping button indices (Xbox layout; PlayStation pads map to the same slots). */
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8,
  MENU: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

export type NavDir = "up" | "down" | "left" | "right";

const DEADZONE = 0.28;
const NAV_THRESHOLD = 0.6;
const NAV_REPEAT_MS = 220;
const BUTTONS = 17;

/**
 * Reads every connected pad into one standard-layout state. Pads the browser cannot map
 * (mapping "", e.g. Firefox on Linux/macOS) report the Xbox layout with View/Menu on
 * 6/7, triggers on axes 2/5 and the D-pad as a hat on axes 6/7 (or a single axis 9).
 */
function readPad(p: Gamepad, held: boolean[], stick: { x: number; y: number }) {
  const btn = (i: number) => {
    const b = p.buttons[i];
    return !!b && (b.pressed || b.value > 0.5);
  };
  const ax = (i: number) => p.axes[i] ?? 0;
  const set = (i: number, on: boolean) => {
    if (on) held[i] = true;
  };
  if (Math.abs(ax(0)) > Math.abs(stick.x)) stick.x = ax(0);
  if (Math.abs(ax(1)) > Math.abs(stick.y)) stick.y = ax(1);

  if (p.mapping === "standard" || p.buttons.length >= BUTTONS) {
    for (let i = 0; i < Math.min(p.buttons.length, BUTTONS); i++) set(i, btn(i));
    return;
  }
  for (const i of [PAD.A, PAD.B, PAD.X, PAD.Y, PAD.LB, PAD.RB]) set(i, btn(i));
  set(PAD.VIEW, btn(6));
  set(PAD.MENU, btn(7));
  if (p.axes.length > 5) {
    set(PAD.LT, ax(2) > 0.3);
    set(PAD.RT, ax(5) > 0.3);
  }
  if (p.axes.length > 7) {
    set(PAD.LEFT, ax(6) < -0.5);
    set(PAD.RIGHT, ax(6) > 0.5);
    set(PAD.UP, ax(7) < -0.5);
    set(PAD.DOWN, ax(7) > 0.5);
  }
  if (p.axes.length > 9 && Math.abs(ax(9)) <= 1) {
    // Hat switch: -1 up, then clockwise in steps of 2/7; ~1.28 means centred.
    const h = Math.round((ax(9) + 1) * 3.5);
    set(PAD.UP, h === 0 || h === 1 || h === 7);
    set(PAD.RIGHT, h >= 1 && h <= 3);
    set(PAD.DOWN, h >= 3 && h <= 5);
    set(PAD.LEFT, h >= 5 && h <= 7);
  }
}

const NOT_A_PAD = /headset|headphone|audio|void|arctis|kraken|cloud|speaker|mouse|keyboard|webcam/i;
const PAD_NAME = /xbox|xinput|controller|gamepad|joystick|dualshock|dualsense|wireless receiver/i;

/**
 * Headsets and other HID devices (e.g. a Corsair VOID receiver) show up as gamepads with
 * a few buttons. Trust standard-mapped pads unless the name says audio; otherwise require
 * a real stick and face buttons.
 */
function isController(p: Gamepad) {
  const id = p.id || "";
  if (NOT_A_PAD.test(id) && !PAD_NAME.test(id.replace(/wireless receiver/i, ""))) return false;
  if (p.mapping === "standard") return p.buttons.length >= 10;
  return p.axes.length >= 2 && p.buttons.length >= 6;
}

class GamepadInput {
  connected = false;
  name = "";
  axis = 0;
  /** False where the browser blocks the Gamepad API (insecure http:// origins). */
  readonly supported = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
  private held: boolean[] = [];
  private prev: boolean[] = [];
  private navHeld: NavDir | null = null;
  private navNext = 0;
  private navFired: NavDir | null = null;
  private listeners = new Set<(on: boolean) => void>();

  install(game: Phaser.Game) {
    // Edge on Xbox drives a mouse cursor with the controller unless asked not to.
    const nav = navigator as Navigator & { gamepadInputEmulation?: string };
    if ("gamepadInputEmulation" in nav) nav.gamepadInputEmulation = "gamepad";
    game.events.on(Phaser.Core.Events.PRE_STEP, (time: number) => this.poll(time));
    window.addEventListener("gamepadconnected", () => this.poll(performance.now()));
    window.addEventListener("gamepaddisconnected", () => this.poll(performance.now()));
  }

  onConnectionChange(fn: (on: boolean) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private pads(): Gamepad[] {
    if (!this.supported) return [];
    let list: (Gamepad | null)[] = [];
    try {
      list = Array.from(navigator.getGamepads());
    } catch {
      return [];
    }
    return list.filter((p): p is Gamepad => !!p && p.connected && isController(p));
  }

  private poll(time: number) {
    const pads = this.pads();
    const was = this.connected;
    this.connected = pads.length > 0;
    this.name = pads.map((p) => p.id).join(", ");
    if (was !== this.connected) this.listeners.forEach((fn) => fn(this.connected));

    this.prev = this.held;
    this.held = [];
    const stick = { x: 0, y: 0 };
    for (const p of pads) readPad(p, this.held, stick);

    const sx = stick.x;
    const sy = stick.y;
    let axis = Math.abs(sx) > DEADZONE ? Math.sign(sx) * Math.min(1, ((Math.abs(sx) - DEADZONE) / (1 - DEADZONE)) * 1.25) : 0;
    if (this.isDown(PAD.LEFT)) axis = -1;
    if (this.isDown(PAD.RIGHT)) axis = 1;
    this.axis = axis;

    let dir: NavDir | null = null;
    if (this.isDown(PAD.UP) || sy < -NAV_THRESHOLD) dir = "up";
    else if (this.isDown(PAD.DOWN) || sy > NAV_THRESHOLD) dir = "down";
    else if (this.isDown(PAD.LEFT) || sx < -NAV_THRESHOLD) dir = "left";
    else if (this.isDown(PAD.RIGHT) || sx > NAV_THRESHOLD) dir = "right";
    this.navFired = null;
    if (dir && (dir !== this.navHeld || time >= this.navNext)) {
      this.navFired = dir;
      this.navNext = time + (dir !== this.navHeld ? NAV_REPEAT_MS * 1.6 : NAV_REPEAT_MS);
    }
    this.navHeld = dir;
  }

  isDown(b: number) {
    return !!this.held[b];
  }

  justPressed(b: number) {
    return !!this.held[b] && !this.prev[b];
  }

  anyJustPressed() {
    return this.held.some((h, i) => h && !this.prev[i]);
  }

  /** Menu direction for this frame, with key-repeat while held. */
  nav(): NavDir | null {
    return this.navFired;
  }

  get jumpPressed() {
    return this.justPressed(PAD.A);
  }

  get jumpHeld() {
    return this.isDown(PAD.A);
  }

  get attackPressed() {
    return this.justPressed(PAD.X) || this.justPressed(PAD.B) || this.justPressed(PAD.RT) || this.justPressed(PAD.RB);
  }

  get swapPressed() {
    return this.justPressed(PAD.Y) || this.justPressed(PAD.LB);
  }

  get pausePressed() {
    return this.justPressed(PAD.MENU) || this.justPressed(PAD.VIEW);
  }
}

export const Gamepad = new GamepadInput();
