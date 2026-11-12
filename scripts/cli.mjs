#!/usr/bin/env node
// Angely's World — scaffolding CLI (Phaser 4 branch).
// Creates levels and scenes with the project's own conventions, so Angelo
// never has to hand-edit config.ts / main.ts to add one.
//
//   npm run cli -- help
//   npm run cli -- list
//   npm run cli -- new-scene <Name>            e.g. new-scene Shop
//   npm run cli -- new-level <ch>-<st> "<name>" [options]
//   npm run cli -- new-chapter <id> "<name>" [options]
//   --dry-run   print what would change, write nothing
//
// new-level options (all optional):
//   --mode run|chase|climb|swim   --goal kills|gems|reach|boss
//   --need N   --terrain flat|hills|cliffs   --pieces hops,steps,spring
//   --weapon sword|bow|hammer|wand|ray   --tip "..."   --seed N
//   --boss   --flood   --splash <key>
// Defaults: mode run, goal kills, need 8, terrain flat,
// pieces hops,steps, seed = first free number from 157, tip = TODO.
//
// new-chapter options (all optional):
//   --background bgN   --music <track>   --enemies a,b,c   --splash splashN
//   --pit pit|lava   --grip N   --maxAlive N   --spawnEvery N
//   --ambient 0xRRGGBB,count
// Only chapters 1-11 exist (ChapterId union in config.ts). A chapter can
// only be created over a placeholder (empty enemies) — today that is 11.
//
// Zero dependencies. Edits are refused if the target already exists.
// After running, verify with: npm run build   (tsc + vite, must be clean)
// and test on the phone — the CLI checks syntax, not gameplay.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(ROOT, "src", "config.ts");
const MAIN = path.join(ROOT, "src", "main.ts");
const SCENES_DIR = path.join(ROOT, "src", "scenes");

const PIECE_KINDS = ["hops", "steps", "spikes", "spring", "crateWall", "movingBridge", "lift", "crumble", "target", "breakWall", "mines", "gate"];
const MODES = ["run", "chase", "climb", "swim"];
const GOALS = ["kills", "gems", "reach", "boss"];
const TERRAINS = ["flat", "hills", "cliffs"];
const WEAPONS = ["sword", "bow", "hammer", "wand", "ray"];

let dryRun = false;

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function read(p) {
  return readFileSync(p, "utf8");
}

function write(p, text, label) {
  if (dryRun) {
    console.log(`[dry-run] would write ${label}`);
    return;
  }
  writeFileSync(p, text);
  console.log(`wrote ${label}`);
}

// ---- arg parsing ---------------------------------------------------------
function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      dryRun = true;
    } else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        opts[a.slice(2, eq)] = a.slice(eq + 1);
      } else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) {
        opts[a.slice(2)] = argv[++i];
      } else {
        opts[a.slice(2)] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, opts };
}

function toPascal(name) {
  const clean = name.replace(/[^A-Za-z0-9]/g, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ---- list ----------------------------------------------------------------
function cmdList() {
  const cfg = read(CONFIG);
  const main = read(MAIN);
  console.log("Chapters:");
  for (const m of cfg.matchAll(/^  (\d+): \{\n    id: \d+,\n    name: "([^"]+)"/gm)) {
    console.log(`  ${m[1]}  ${m[2]}`);
  }
  console.log("Levels:");
  for (const m of cfg.matchAll(/\{ chapter: (\d+), stage: (\d+), name: "([^"]+)", mode: "([^"]+)", goal: "([^"]+)"/g)) {
    console.log(`  ${m[1]}-${m[2]}  ${m[3]}  (${m[4]}/${m[5]})`);
  }
  console.log("Scenes:");
  for (const m of main.matchAll(/import \{ (\w+Scene) \} from "\.\/scenes\/(\w+)";/g)) {
    console.log(`  ${m[1]}  (src/scenes/${m[2]}.ts)`);
  }
}

// ---- new-scene -----------------------------------------------------------
function sceneTemplate(className, key) {
  return `import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";

export class ${className} extends Phaser.Scene {
  constructor() {
    super("${key}");
  }

  create(): void {
    // TODO: build the scene here. Start it with: this.scene.start("${key}");
    this.add.text(GAME_W / 2, GAME_H / 2, "${key}", { fontSize: "48px", color: "#ffffff" }).setOrigin(0.5);
  }
}
`;
}

function cmdNewScene(name) {
  if (!name) fail("usage: new-scene <Name>   e.g. new-scene Shop");
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) fail("scene name must be letters/digits, starting with a letter");
  const key = toPascal(name);
  const className = `${key}Scene`;
  const file = path.join(SCENES_DIR, `${className}.ts`);
  if (existsSync(file)) fail(`${className}.ts already exists`);
  const main = read(MAIN);
  if (main.includes(`"${key}"`) || main.includes(className)) fail(`scene "${key}" is already registered`);

  write(file, sceneTemplate(className, key), `src/scenes/${className}.ts`);

  const importLine = `import { ${className} } from "./scenes/${className}";`;
  const anchor = 'import { CutsceneScene } from "./scenes/CutsceneScene";';
  if (!main.includes(anchor)) fail("could not find the scene import block in src/main.ts");
  let next = main.replace(anchor, `${anchor}\n${importLine}`);
  const sceneArray = /scene: \[([^\]]+)\]/;
  const m = next.match(sceneArray);
  if (!m) fail("could not find the scene array in src/main.ts");
  next = next.replace(sceneArray, `scene: [${m[1]}, ${className}]`);
  write(MAIN, next, "src/main.ts (import + scene array)");

  console.log(`\nScene "${key}" created.`);
  console.log(`  file: src/scenes/${className}.ts`);
  console.log(`  start it with: this.scene.start("${key}");`);
  console.log("  verify with: npm run build");
}

// ---- new-level -----------------------------------------------------------
function nextSeed(cfg) {
  const used = new Set([...cfg.matchAll(/seed: (\d+)/g)].map((m) => Number(m[1])));
  let seed = 157;
  while (used.has(seed)) seed += 2;
  return seed;
}

function cmdNewLevel(label, name, opts) {
  if (!label || !name) fail('usage: new-level <chapter>-<stage> "<name>" [--mode ...]   e.g. new-level 11-1 "The Graveyard"');
  const lm = /^(\d+)-(\d+)$/.exec(label);
  if (!lm) fail('level label must look like 11-1 (chapter-stage)');
  const chapter = Number(lm[1]);
  const stage = Number(lm[2]);
  if (stage !== 1 && stage !== 2) fail("stage must be 1 or 2");

  const cfg = read(CONFIG);
  if (!new RegExp(`^  ${chapter}: \\{`, "m").test(cfg)) fail(`chapter ${chapter} does not exist in CHAPTERS — run new-chapter first`);
  if (new RegExp(`\\{ chapter: ${chapter}, stage: ${stage},`).test(cfg)) fail(`level ${label} already exists`);

  const mode = opts.mode ?? "run";
  const goal = opts.goal ?? "kills";
  const terrain = opts.terrain ?? "flat";
  if (!MODES.includes(mode)) fail(`--mode must be one of: ${MODES.join(", ")}`);
  if (!GOALS.includes(goal)) fail(`--goal must be one of: ${GOALS.join(", ")}`);
  if (!TERRAINS.includes(terrain)) fail(`--terrain must be one of: ${TERRAINS.join(", ")}`);
  const need = Number(opts.need ?? (goal === "kills" ? 10 : goal === "gems" ? 6 : 0));
  if (!Number.isInteger(need) || need < 0) fail("--need must be a whole number >= 0");
  const pieces = (opts.pieces ?? "hops,steps").split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of pieces) if (!PIECE_KINDS.includes(p)) fail(`unknown piece "${p}" — valid: ${PIECE_KINDS.join(", ")}`);
  let weapon = "";
  if (opts.weapon) {
    if (!WEAPONS.includes(opts.weapon)) fail(`--weapon must be one of: ${WEAPONS.join(", ")}`);
    weapon = `, weapon: "${opts.weapon}"`;
  }
  const seed = opts.seed ? Number(opts.seed) : nextSeed(cfg);
  if (!Number.isInteger(seed) || seed <= 0) fail("--seed must be a whole number > 0");
  const tip = (opts.tip ?? "TODO: write the level tip").replace(/"/g, "'");
  const extras = `${opts.boss ? ", boss: true" : ""}${opts.flood ? ", flood: true" : ""}${opts.splash ? `, splash: "${opts.splash}"` : ""}`;
  const goalNeed = goal === "boss" || goal === "reach" ? 0 : need;
  const entry = `  { chapter: ${chapter}, stage: ${stage}, name: "${name.replace(/"/g, "'")}", mode: "${mode}", goal: "${goal}", need: ${goalNeed}, terrain: "${terrain}", seed: ${seed}, pieces: [${pieces.map((p) => `"${p}"`).join(", ")}]${weapon}${extras}, tip: "${tip}" },`;

  const anchor = "].map((l, i) => L(l as Omit<LevelInfo, \"index\">, i));";
  if (!cfg.includes(anchor)) fail("could not find the LEVELS array end in src/config.ts");
  const next = cfg.replace(anchor, `${entry}\n${anchor}`);
  write(CONFIG, next, "src/config.ts (LEVELS)");

  console.log(`\nLevel ${label} "${name}" created.`);
  console.log(`  mode ${mode} / goal ${goal} / need ${goalNeed} / terrain ${terrain} / seed ${seed}`);
  console.log(`  pieces: ${pieces.join(", ")}${weapon ? ` / weapon: ${opts.weapon}` : ""}`);
  console.log("  Next: edit the entry in src/config.ts if the defaults are wrong,");
  console.log("  then verify with: npm run build");
}

// ---- new-chapter ---------------------------------------------------------
function findBlock(text, id) {
  const start = text.indexOf(`  ${id}: {`);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        // block ends at the closing "}," of this entry
        const end = text.indexOf("\n", i) + 1;
        return { start, end };
      }
    }
  }
  return null;
}

function cmdNewChapter(idRaw, name, opts) {
  if (!idRaw || !name) fail('usage: new-chapter <id> "<name>" [--background bgN]   e.g. new-chapter 11 "The Graveyard"');
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id < 1 || id > 11) fail("chapter id must be 1-11 (ChapterId union in src/config.ts)");
  const cfg = read(CONFIG);
  const block = findBlock(cfg, id);
  if (!block) fail(`chapter ${id} not found in CHAPTERS`);
  const oldBlock = cfg.slice(block.start, block.end);
  const enemies = (opts.enemies ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (/enemies: \[([^\]]+)\]/.test(oldBlock) && !/enemies: \[\]/.test(oldBlock)) {
    fail(`chapter ${id} already has enemies — refusing to overwrite a real chapter`);
  }
  const background = opts.background ?? `bg${id}`;
  const music = opts.music ?? "music_shadow";
  const splash = opts.splash ?? `splash${id}`;
  const pit = opts.pit ?? "pit";
  if (pit !== "pit" && pit !== "lava") fail('--pit must be "pit" or "lava"');
  const grip = Number(opts.grip ?? 1);
  const maxAlive = Number(opts.maxAlive ?? 4);
  const spawnEvery = Number(opts.spawnEvery ?? 1.7);
  const ambient = opts.ambient ?? "0xb7a6ff,102";
  const [ambientColor, ambientCount] = ambient.split(",").map((s) => s.trim());
  const newBlock =
    `  ${id}: {\n` +
    `    id: ${id},\n` +
    `    name: "${name.replace(/"/g, "'")}",\n` +
    `    splash: "${splash}",\n` +
    `    background: "${background}",\n` +
    `    music: "${music}",\n` +
    `    enemies: [${enemies.map((e) => `"${e}"`).join(", ")}],\n` +
    `    maxAlive: ${maxAlive},\n` +
    `    spawnEvery: ${spawnEvery},\n` +
    `    pitKind: "${pit}",\n` +
    `    grip: ${grip},\n` +
    `    ambient: { color: ${ambientColor}, count: ${Number(ambientCount ?? 100)} },\n` +
    `  },\n`;
  const next = cfg.slice(0, block.start) + newBlock + cfg.slice(block.end);
  write(CONFIG, next, `src/config.ts (CHAPTERS ${id})`);

  console.log(`\nChapter ${id} "${name}" created.`);
  console.log(`  background ${background} / music ${music} / splash ${splash}`);
  console.log(`  enemies: ${enemies.length ? enemies.join(", ") : "(none yet — add with --enemies)"}`);
  console.log("  Next: add its levels with: npm run cli -- new-level");
  console.log("  then verify with: npm run build");
}

// ---- help ----------------------------------------------------------------
function help() {
  console.log(`Angely's World — scaffolding CLI (Phaser 4)

Usage: npm run cli -- <command> [args] [--dry-run]

  help                                  this text
  list                                  chapters, levels and scenes
  new-scene <Name>                      src/scenes/<Name>Scene.ts + register in main.ts
  new-level <ch>-<st> "<name>" [opts]   append a level to LEVELS in config.ts
  new-chapter <id> "<name>" [opts]      fill a placeholder chapter (1-11)

new-level options: --mode run|chase|climb|swim  --goal kills|gems|reach|boss
  --need N  --terrain flat|hills|cliffs  --pieces hops,steps  --weapon sword|bow|hammer|wand|ray
  --tip "..."  --seed N  --boss  --flood  --splash <key>
new-chapter options: --background bgN  --music <track>  --enemies a,b  --splash splashN
  --pit pit|lava  --grip N  --maxAlive N  --spawnEvery N  --ambient 0xRRGGBB,count

Examples:
  npm run cli -- new-scene Shop
  npm run cli -- new-level 11-1 "The Graveyard" --mode run --goal kills --need 12 --terrain cliffs --pieces hops,steps,breakWall
  npm run cli -- new-chapter 11 "The Graveyard" --background bg11 --music music_shadow --enemies zombie,bruto --dry-run

Always verify after: npm run build`);
}

// ---- main ----------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const { positional, opts } = parseArgs(rest);

switch (cmd) {
  case undefined:
  case "help":
    help();
    break;
  case "list":
    cmdList();
    break;
  case "new-scene":
    cmdNewScene(positional[0]);
    break;
  case "new-level":
    cmdNewLevel(positional[0], positional[1], opts);
    break;
  case "new-chapter":
    cmdNewChapter(positional[0], positional[1], opts);
    break;
  default:
    fail(`unknown command "${cmd}" — run: npm run cli -- help`);
}
