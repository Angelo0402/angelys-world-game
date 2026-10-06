import { GROUND_Y } from "../config";
import type { LevelDef } from "./level";

/** Authored chapter routes. Every gap has a safe stepping stone or ferry. */
export function crystalCauseway(L: LevelDef): LevelDef {
  L.width = 5200;
  L.ground.push(
    {x0:-200,x1:1080,y:GROUND_Y},
    {x0:1260,x1:2310,y:GROUND_Y-90},
    {x0:2500,x1:3430,y:GROUND_Y-140},
    {x0:3620,x1:5400,y:GROUND_Y}
  );
  L.platforms.push(
    {x:500,y:GROUND_Y-108,prop:"plat_log"},
    {x:1170,y:GROUND_Y-55,prop:"plat_float"},
    {x:1840,y:GROUND_Y-195,prop:"plat_medium"},
    {x:2405,y:GROUND_Y-120,prop:"plat_float"},
    {x:2890,y:GROUND_Y-240,prop:"plat_medium"},
    {x:3520,y:GROUND_Y-100,prop:"plat_float"},
    {x:4410,y:GROUND_Y-120,prop:"plat_medium"}
  );
  L.movers.push({x0:3030,y0:GROUND_Y-220,x1:3270,y1:GROUND_Y-220,period:3400});
  L.crumbles.push({x:3990,y:GROUND_Y-115},{x:4150,y:GROUND_Y-155});
  L.spikes.push({x:720,y:GROUND_Y},{x:2100,y:GROUND_Y-90},{x:3110,y:GROUND_Y-140},{x:4610,y:GROUND_Y});
  L.crates.push({x:1640,y:GROUND_Y-90});
  L.walls.push({x:1950,y:GROUND_Y-90,blocks:1,breakable:true});
  L.hearts.push({x:500,y:GROUND_Y-150},{x:2750,y:GROUND_Y-185},{x:4380,y:GROUND_Y-168});
  L.checkpoints.push({x:1460,y:GROUND_Y-90},{x:3800,y:GROUND_Y});
  L.portal = {x:5010,y:GROUND_Y};
  return L;
}

export function crystalCrownArena(L: LevelDef): LevelDef {
  const x0 = 1400, x1 = x0+1280;
  L.width = x1+220;
  L.ground.push({x0:-200,x1:x1+400,y:GROUND_Y});
  L.platforms.push(
    {x:620,y:GROUND_Y-90,prop:"plat_log"},
    {x:980,y:GROUND_Y-115,prop:"plat_medium"},
    {x:x0+250,y:GROUND_Y-130,prop:"plat_medium"},
    {x:x1-390,y:GROUND_Y-130,prop:"plat_medium"}
  );
  L.hearts.push({x:1050,y:GROUND_Y-42},{x:x0+250,y:GROUND_Y-173});
  L.arena = {x0,x1};
  L.portal = {x:(x0+x1)/2,y:GROUND_Y};
  return L;
}
