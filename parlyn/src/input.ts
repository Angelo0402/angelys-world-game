export class Input {
  x = 0;
  jump = false;
  jumpPressed = false;
  attack = false;
  attackPressed = false;
  swapPressed = false;
  pausePressed = false;
  confirmPressed = false;
  backPressed = false;
  touch = false;

  private keys = new Set<string>();
  private prevJump = false;
  private prevAttack = false;
  private prevSwap = false;
  private prevPause = false;
  private prevConfirm = false;
  private stick = 0;
  private held = { jump: false, attack: false };

  constructor() {
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", () => this.keys.clear());
  }

  bindHud(root: HTMLElement) {
    const stick = root.querySelector<HTMLElement>("#stick");
    const knob = root.querySelector<HTMLElement>("#knob");
    if (stick && knob) {
      const move = (ev: PointerEvent) => {
        const r = stick.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        const max = r.width * 0.32;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (dx / len) * Math.min(len, max);
        const ny = (dy / len) * Math.min(len, max);
        knob.style.transform = `translate(${nx}px, ${ny}px)`;
        this.stick = Math.max(-1, Math.min(1, dx / max));
        this.touch = true;
      };
      const end = () => {
        knob.style.transform = "translate(0,0)";
        this.stick = 0;
      };
      stick.addEventListener("pointerdown", (e) => {
        stick.setPointerCapture(e.pointerId);
        move(e);
      });
      stick.addEventListener("pointermove", (e) => {
        if (stick.hasPointerCapture(e.pointerId)) move(e);
      });
      stick.addEventListener("pointerup", end);
      stick.addEventListener("pointercancel", end);
    }
    const hold = (sel: string, key: "jump" | "attack") => {
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) return;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        this.held[key] = true;
        this.touch = true;
      };
      const up = () => {
        this.held[key] = false;
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", up);
    };
    hold("#btn-jump", "jump");
    hold("#btn-atk", "attack");
    root.querySelector("#btn-swap")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.swapPressed = true;
      this.touch = true;
    });
    root.querySelector("#btn-pause")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.pausePressed = true;
      this.touch = true;
    });
  }

  poll() {
    const left = this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A");
    const right = this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D");
    let x = this.stick;
    if (left) x = -1;
    if (right) x = 1;
    this.x = x;
    this.jump = this.held.jump || this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has("W") || this.keys.has(" ");
    this.attack = this.held.attack || this.keys.has("j") || this.keys.has("J") || this.keys.has("k") || this.keys.has("K");
    const swap = this.keys.has("q") || this.keys.has("Q") || this.keys.has("e") || this.keys.has("E") || this.keys.has("l") || this.keys.has("L");
    const pause = this.keys.has("Escape") || this.keys.has("p") || this.keys.has("P");
    const confirm = this.keys.has("Enter") || this.keys.has(" ");
    const back = this.keys.has("Escape") || this.keys.has("Backspace");
    this.jumpPressed = this.jump && !this.prevJump;
    this.attackPressed = this.attack && !this.prevAttack;
    this.swapPressed = this.swapPressed || (swap && !this.prevSwap);
    this.pausePressed = this.pausePressed || (pause && !this.prevPause);
    this.confirmPressed = confirm && !this.prevConfirm;
    this.backPressed = back && !this.prevPause;
    this.prevJump = this.jump;
    this.prevAttack = this.attack;
    this.prevSwap = swap;
    this.prevPause = pause;
    this.prevConfirm = confirm;
  }

  consume() {
    this.swapPressed = false;
    this.pausePressed = false;
  }

  private onKey = (e: KeyboardEvent) => {
    this.keys.add(e.key);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  };
  private onUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };
}
