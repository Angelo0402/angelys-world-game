import Phaser from "phaser";
import type { WeaponId } from "../config";

export const WEAPON_LABELS: Record<WeaponId, string> = {
  sword: "SWORD", bow: "BOW", hammer: "HAMMER", boomerang: "BOOMERANG",
  wand: "WAND", cog: "COG", ray: "RAY",
};

export function queueHudIcons(load: Phaser.Loader.LoaderPlugin) {
  for (const weapon of Object.keys(WEAPON_LABELS)) {
    load.image(`hud_weapon_${weapon}`, `assets/runtime/hud/${weapon}.webp`);
  }
}

// Rasterize smooth rings once. Canvas gradients remain sharp at the game's 2x
// render scale and avoid the segmented WebGL graphics strokes on Android.
export function ensureHudArt(scene: Phaser.Scene) {
  const panel = (key: string, width: number, height: number, fill: string, stroke?: string) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, width * 2, height * 2)!;
    const ctx = tex.getContext(); ctx.scale(2, 2);
    ctx.beginPath(); ctx.roundRect(2, 2, width - 4, height - 4, 18);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    tex.refresh();
  };
  panel("hud_hearts_panel", 222, 52, "rgba(20,8,42,.32)");
  panel("hud_goal_panel", 300, 54, "rgba(27,15,46,.55)");
  panel("hud_boss_panel", 520, 64, "rgba(13,6,24,.75)", "#b57cff");
  const texture = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 256, 256)!;
    const ctx = tex.getContext();
    ctx.scale(2, 2);
    ctx.translate(64, 64);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    draw(ctx);
    tex.refresh();
  };
  const disk = (ctx: CanvasRenderingContext2D, r: number) => {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  };
  const jewel = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, gold: boolean) => {
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * .62, y);
    ctx.lineTo(x, y + size); ctx.lineTo(x - size * .62, y); ctx.closePath();
    ctx.fillStyle = gold ? "#561b0d" : "#351342";
    ctx.fill(); ctx.strokeStyle = "#ffe995"; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - size * .46); ctx.lineTo(x + size * .25, y);
    ctx.lineTo(x, y + size * .46); ctx.lineTo(x - size * .25, y); ctx.closePath();
    ctx.fillStyle = gold ? "#ffbd38" : "#e0b8ff"; ctx.fill();
  };
  const ring = (ctx: CanvasRenderingContext2D, gold: boolean, ornaments: boolean) => {
    const fill = ctx.createRadialGradient(-16, -28, 0, 0, 2, 52);
    fill.addColorStop(0, gold ? "rgba(141,57,21,.78)" : "rgba(91,35,135,.8)");
    fill.addColorStop(.48, gold ? "rgba(72,24,14,.85)" : "rgba(42,14,72,.86)");
    fill.addColorStop(1, gold ? "rgba(31,9,14,.9)" : "rgba(17,10,33,.9)");
    disk(ctx, 48); ctx.fillStyle = fill; ctx.fill();
    const metal = ctx.createLinearGradient(-36, -48, 34, 48);
    metal.addColorStop(0, "#fff0b0"); metal.addColorStop(.25, gold ? "#ffce43" : "#ecbad8");
    metal.addColorStop(.6, gold ? "#ff9631" : "#c66ac4"); metal.addColorStop(1, "#fff0b0");
    ctx.save(); ctx.shadowColor = gold ? "#ff671d" : "#ef67bf"; ctx.shadowBlur = ornaments ? 8 : 4;
    disk(ctx, 49); ctx.strokeStyle = metal; ctx.lineWidth = ornaments ? 2.4 : 2; ctx.stroke(); ctx.restore();
    disk(ctx, 45.6); ctx.strokeStyle = gold ? "#8e4318" : "#6e387a"; ctx.lineWidth = 2; ctx.stroke();
    disk(ctx, 42); ctx.strokeStyle = gold ? "rgba(255,198,97,.55)" : "rgba(243,199,241,.48)";
    ctx.lineWidth = .9; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 46, Math.PI * 1.08, Math.PI * 1.7);
    ctx.strokeStyle = "rgba(255,243,218,.65)"; ctx.lineWidth = 1; ctx.stroke();
    if (ornaments) {
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        jewel(ctx, Math.cos(a) * 49, Math.sin(a) * 49, 5, gold);
      }
    }
  };
  texture("hud_jump", ctx => {
    ring(ctx, true, true);
    const chevron = ctx.createLinearGradient(0, -28, 0, 9);
    chevron.addColorStop(0, "#fff6c8"); chevron.addColorStop(.55, "#ffc761"); chevron.addColorStop(1, "#ff7629");
    ctx.save(); ctx.shadowColor = "#ff6819"; ctx.shadowBlur = 9; ctx.fillStyle = chevron;
    for (const y of [-26, -10]) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(18, y + 19); ctx.lineTo(18, y + 28);
      ctx.lineTo(0, y + 10); ctx.lineTo(-18, y + 28); ctx.lineTo(-18, y + 19); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  });
  texture("hud_attack", ctx => ring(ctx, false, true));
  texture("hud_swap", ctx => {
    ring(ctx, false, true);
    ctx.strokeStyle = "#ffe4ce"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17, -2); ctx.quadraticCurveTo(-16, -19, 3, -19); ctx.lineTo(15, -19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -26); ctx.lineTo(18, -19); ctx.lineTo(10, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, -7); ctx.quadraticCurveTo(16, 10, -3, 10); ctx.lineTo(-15, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, 3); ctx.lineTo(-18, 10); ctx.lineTo(-10, 17); ctx.stroke();
  });
  texture("hud_joystick", ctx => {
    const glass = ctx.createRadialGradient(-18, -25, 0, 0, 0, 50);
    glass.addColorStop(0, "rgba(190,225,255,.12)"); glass.addColorStop(.68, "rgba(56,106,162,.12)");
    glass.addColorStop(1, "rgba(68,150,224,.4)"); disk(ctx, 49); ctx.fillStyle = glass; ctx.fill();
    ctx.save(); ctx.shadowColor = "#67c9ff"; ctx.shadowBlur = 7;
    disk(ctx, 49); ctx.strokeStyle = "#86caff"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    disk(ctx, 46); ctx.strokeStyle = "rgba(227,244,255,.34)"; ctx.lineWidth = .7; ctx.stroke();
    ctx.fillStyle = "rgba(190,224,255,.8)";
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(Math.PI * i / 2);
      ctx.beginPath(); ctx.moveTo(0, -41); ctx.lineTo(4.5, -34); ctx.lineTo(-4.5, -34); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  });
  texture("hud_knob", ctx => {
    const pearl = ctx.createLinearGradient(-26, -45, 25, 48);
    pearl.addColorStop(0, "rgba(245,250,255,.9)"); pearl.addColorStop(.48, "rgba(183,201,226,.84)");
    pearl.addColorStop(1, "rgba(98,127,174,.86)");
    ctx.save(); ctx.shadowColor = "#96caff"; ctx.shadowBlur = 8;
    disk(ctx, 49); ctx.fillStyle = pearl; ctx.fill();
    ctx.strokeStyle = "rgba(232,246,255,.92)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(-2, -1, 44, Math.PI * 1.12, Math.PI * 1.7);
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.stroke();
  });
  for (const key of ["hud_pause", "hud_sound", "hud_sound_off"]) texture(key, ctx => {
    ring(ctx, true, false);
    ctx.fillStyle = "#fff2cd";
    if (key === "hud_pause") {
      ctx.beginPath(); ctx.roundRect(-17, -22, 11, 44, 3); ctx.roundRect(6, -22, 11, 44, 3); ctx.fill();
    } else {
      ctx.fillRect(-23, -9, 11, 18);
      ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(3, -22); ctx.lineTo(3, 22); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#fff2cd"; ctx.lineWidth = 3;
      if (key === "hud_sound_off") {
        ctx.beginPath(); ctx.moveTo(12, -9); ctx.lineTo(26, 9); ctx.moveTo(26, -9); ctx.lineTo(12, 9); ctx.stroke();
      } else for (const r of [12, 21]) {
        ctx.beginPath(); ctx.arc(4, 0, r, -.9, .9); ctx.stroke();
      }
    }
  });
  texture("hud_weapon_slot", ctx => {
    ctx.beginPath(); ctx.roundRect(-49, -49, 98, 98, 26);
    ctx.fillStyle = "rgba(21,10,35,.73)"; ctx.fill();
    ctx.strokeStyle = "#ffdc79"; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-45, -45, 90, 90, 23);
    ctx.strokeStyle = "rgba(255,232,167,.25)"; ctx.lineWidth = .7; ctx.stroke();
  });
  texture("hud_gem", ctx => {
    ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(35, 0); ctx.lineTo(0, 48); ctx.lineTo(-35, 0); ctx.closePath();
    const grad = ctx.createLinearGradient(-35, -40, 35, 40);
    grad.addColorStop(0, "#bcffff"); grad.addColorStop(.45, "#58dcf9"); grad.addColorStop(1, "#34afe4");
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, 48); ctx.lineTo(-35, 0); ctx.closePath();
    ctx.fillStyle = "rgba(184,255,255,.22)"; ctx.fill();
  });
}

/** The circle occupies 100 of the texture's 128 logical units; outer space holds glow. */
export function hudDisc(scene: Phaser.Scene, key: string, radius: number, x = 0, y = 0) {
  return scene.add.image(x, y, key).setDisplaySize(radius * 2.56, radius * 2.56);
}
