import { SPRITES, type SpriteKey } from "../../src/assets/sprites.gen";
import { wx, wy } from "./coords";
import { PlayRenderer, Node2_5D } from "./PlayRenderer";

type Anim = { start: number; end: number; fps: number; repeat: number; h: number };

export class Actor {
  readonly node: InstanceType<typeof Node2_5D>;
  x: number;
  y: number;
  z: number;
  facing: 1 | -1 = 1;
  sheet: SpriteKey;
  anim = "";
  dead = false;
  private frame = 0;
  private acc = 0;
  private cols = 1;
  private rows = 1;
  private heightPx: number;
  private renderer: PlayRenderer;

  constructor(renderer: PlayRenderer, sheet: SpriteKey, x: number, y: number, heightPx: number, z = 0) {
    this.renderer = renderer;
    this.sheet = sheet;
    this.x = x;
    this.y = y;
    this.z = z;
    this.heightPx = heightPx;
    const meta = SPRITES[sheet];
    const grid = renderer.sheetGrid(meta.file, meta.frameWidth, meta.frameHeight);
    this.cols = grid.cols;
    this.rows = grid.rows;
    const first = Object.values(meta.anims)[0] as Anim;
    const displayH = heightPx / 80;
    const displayW = displayH * (meta.frameWidth / Math.max(1, first?.h ?? meta.frameHeight));
    this.node = new Node2_5D({
      type: "Billboard2_5D",
      name: sheet,
      position: { x: wx(x), y: wy(y), z },
    });
    this.node.metadata = {
      width: displayW,
      height: displayH,
      texture: meta.file,
      originX: meta.originX,
      originY: meta.originY,
      sheet: { cols: this.cols, rows: this.rows, frame: 0 },
    };
    renderer.addNode(this.node);
    const idle = "idle" in meta.anims ? "idle" : Object.keys(meta.anims)[0];
    this.play(idle);
    this.sync();
  }

  play(name: string, restart = false) {
    const anims = SPRITES[this.sheet].anims as Record<string, Anim>;
    if (!anims[name]) {
      name = anims.idle ? "idle" : Object.keys(anims)[0];
    }
    if (this.anim === name && !restart) return;
    this.anim = name;
    const a = anims[name];
    this.frame = a.start;
    this.acc = 0;
    this.renderer.setSheetFrame(this.node.id, this.frame, this.cols, this.rows, this.facing < 0);
  }

  has(name: string) {
    return name in (SPRITES[this.sheet].anims as Record<string, Anim>);
  }

  tick(dt: number) {
    const a = (SPRITES[this.sheet].anims as Record<string, Anim>)[this.anim];
    if (!a) return;
    this.acc += dt;
    const step = 1 / Math.max(1, a.fps);
    while (this.acc >= step) {
      this.acc -= step;
      this.frame++;
      if (this.frame > a.end) {
        this.frame = a.repeat === 0 ? a.end : a.start;
      }
    }
    this.renderer.setSheetFrame(this.node.id, this.frame, this.cols, this.rows, this.facing < 0);
    this.sync();
  }

  animDone() {
    const a = (SPRITES[this.sheet].anims as Record<string, Anim>)[this.anim];
    return !!a && a.repeat === 0 && this.frame >= a.end;
  }

  sync() {
    this.node.position.x = wx(this.x);
    this.node.position.y = wy(this.y);
    this.node.position.z = this.z;
    this.renderer.sync(this.node);
  }

  setPos(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.sync();
  }

  destroy() {
    this.renderer.removeNode(this.node.id);
  }
}

export function makeProp(
  renderer: PlayRenderer,
  file: string,
  x: number,
  y: number,
  wPx: number,
  hPx: number,
  z = 0,
  originY = 1,
) {
  const node = new Node2_5D({
    type: "Sprite2_5D",
    name: file,
    position: { x: wx(x), y: wy(y), z },
  });
  node.metadata = {
    width: wPx / 80,
    height: hPx / 80,
    texture: file,
    originX: 0.5,
    originY,
    depthWrite: true,
  };
  renderer.addNode(node);
  return node;
}
