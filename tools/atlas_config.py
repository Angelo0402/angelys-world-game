"""Source atlases and how to cut them into runtime sprite sheets.

Everything under art/source/gen/ is generated art on flat white (or black, for VFX)
backgrounds. Frames are detected automatically: G(atlas, row, first, last) picks
frames first..last (inclusive) from the given detected row of that atlas.

Runtime sheets are exported at ~2x their on-screen size so they stay sharp when the
game renders at device resolution (see RENDER_SCALE in src/config.ts).
"""

ROOT = "art/source"
OUT = "public/assets/runtime"
GEN_TS = "src/assets/sprites.gen.ts"

# Player sheets were generated separately, so each draws Angely at a different size.
# Her hair mass is the most pose-independent measure; every player atlas is scaled so
# sqrt(hair pixels) per frame matches this target (walk ends up ~232 px tall).
PLAYER_HAIR = 83

ATLASES: dict = {}


def _atlas(key, src, mask="flat", **kw):
    ATLASES[key] = {"src": f"gen/{src}.png", "mask": mask, **kw}


for p in ["idle2", "walk_a", "run_a", "start_stop", "jump8", "hurt_land", "celebrate", "sword_idle", "slash",
          "jump_attack", "pickup_hurt", "defeat", "push", "bow", "hammer", "boomerang", "wand", "ray", "run_legs", "walk_cycle", "run_cycle"]:
    _atlas(f"p_{p}", f"p_{p}", norm="hair", holes=p == "bow", glow=p == "bow")

# The game expects right-facing art. These enemy sheets came out facing left.
FACES_LEFT = {"ghost", "lantern", "firebat"}
ENEMY_PX = {  # runtime px height of the walk row, ~2.3x the in-game display height
    "mushroom": 170, "beetle": 152, "leafimp": 194, "firefly": 140,
    "golem": 240, "ghost": 190, "lantern": 194, "skeleton": 220,
    "firebat": 148, "lavablob": 130, "crab": 162, "magmagolem": 258,
    "frostwolf": 168, "icewisp": 150, "penguin": 160, "yeti": 252,
    "cogmoth": 156, "gearcrab": 168, "sandwisp": 160,
    "blob": 170, "squish": 190, "toxic": 176,
}
# 30-frame enemies (chapters 6-7): 3 rows of 10 (move, attack, hurt 4 + defeat 6).
RICH_PX = {"stormbird": 150, "thunderimp": 150, "jellyfish": 170, "anglerfish": 150}
# Near-white fur that touches the background through tiny outline gaps.
SEAL = {"yeti": 3}
for e, px in ENEMY_PX.items():
    _atlas(f"e_{e}", f"e_{e}", row0_px=px, flip=e in FACES_LEFT, seal=SEAL.get(e, 0))

for e, px in RICH_PX.items():
    _atlas(f"e_{e}", f"e_{e}", row0_px=px)
_atlas("items", "items")
_atlas("weapons2", "weapons2", holes=True, tol=40)
_atlas("weapon_cog", "weapon_cog", holes=True)
_atlas("weapon_ray", "weapon_ray")
_atlas("fx_ray", "fx_ray")
# Swimming: the stroke sheet is horizontal, so it is fitted by body length instead.
_atlas("p_swim", "p_swim", fit=("w", 0, 0, 7, 300))
_atlas("p_float2", "p_float2", norm="hair")
_atlas("p_swimup", "p_swimup", norm="hair")
# Angelo comes from three generated sheets. The standing poses are fitted to one
# height and the fight sheet to the same head width, so he never changes size.
ANGELO_PX = 236
_atlas("angelo_move", "angelo_move", fit=("h", 1, 0, 3, ANGELO_PX))
_atlas("angelo_extra", "angelo_extra", fit=("h", 0, 4, 5, ANGELO_PX))
_atlas("angelo_fight2", "angelo_fight2", match_head="angelo_move")
# Father and daughter together; Angelo's standing height in frame 1 sets the scale.
_atlas("angelo_hug", "angelo_hug", white_holes=True, fit=("h", 0, 1, 1, ANGELO_PX))
HUG = [(20, 210, 226, 455), (257, 236, 474, 455), (490, 223, 655, 454), (688, 218, 838, 455), (877, 212, 1034, 457), (1066, 206, 1251, 457)]
_atlas("e_colossus", "e_colossus_left2")
# Bow string encloses background; the hammer's pale glow halo should be cut too.
_atlas("weapons", "weapons", holes=True, glow=True, tol=60)
_atlas("e_umbra", "e_umbra", row0_px=330)
_atlas("e_sandworm", "e_sandworm", row0_px=300)
_atlas("portal", "portal")
_atlas("vfx", "vfx", mask="black")
_atlas("vfx2", "vfx2", mask="black")
for c in (1, 2, 3, 4, 5, 6, 7, 8, 9):
    _atlas(f"props_{c}", f"props2_ch{c}")
_atlas("props_10", "props_ch10", mask="alpha")

# 4x5 black-background sheets. row0_px is the idle-row height in the runtime sheet.
GRID_PX = {
    "shardknight": 210, "voidwraith": 188,
    "galaxmaw": 168, "stormgolem": 240, "sovereign": 300,
}
GRID_FLY = {"voidwraith", "galaxmaw"}
for e, px in GRID_PX.items():
    _atlas(f"e_{e}", f"e_{e}", mask="grid", row0_px=px)


def N(atlas, row, n, first, last, fps=8, repeat=-1):
    """Split detected row `row` evenly into n frames and take first..last (rows whose frames touch)."""
    return {"atlas": atlas, "rown": (row, n, first, last), "fps": fps, "repeat": repeat}


def G(atlas, row, first, last, fps=8, repeat=-1, keep=False, torso=False):
    spec = {"atlas": atlas, "auto": (row, first, last), "fps": fps, "repeat": repeat}
    if keep:
        spec["keep"] = True
    if torso:
        # Gait cycles: pin the hips, not the feet, so swinging legs don't drag the body back and forth.
        spec["torso"] = True
    return spec


def B(atlas, boxes, fps=8, repeat=-1):
    """Explicit per-frame boxes, for frames that the detector merges."""
    return {"atlas": atlas, "boxes": boxes, "fps": fps, "repeat": repeat}


def enemy(key, walk_fps=8, attack_fps=7):
    a = f"e_{key}"
    return {
        "idle": G(a, 0, 0, 3, max(4, walk_fps - 3)),
        "walk": G(a, 0, 0, 3, walk_fps),
        "attack": G(a, 1, 0, 1, attack_fps, 0),
        "hurt": G(a, 1, 2, 2, 8, 0),
        "dead": G(a, 1, 3, 4, 6, 0),
    }


# Chapter 4 sheets have loose swirls / shards in row 1 that the detector splits off,
# so their attack, hurt and death frames use explicit boxes.
ROW1 = {
    "frostwolf": [(14, 399, 235, 603), (264, 377, 551, 588), (561, 374, 745, 611), (765, 451, 998, 612), (1010, 394, 1268, 629)],
    "icewisp": [(32, 375, 279, 605), (287, 379, 534, 605), (556, 379, 751, 610), (770, 392, 973, 610), (996, 345, 1255, 632)],
    "penguin": [(35, 373, 214, 601), (261, 366, 525, 610), (548, 374, 740, 604), (761, 446, 969, 601), (1001, 391, 1268, 624)],
    "yeti": [(29, 348, 275, 619), (262, 376, 551, 642), (554, 390, 756, 619), (768, 440, 1000, 630), (1010, 418, 1270, 641)],
}


def enemy_boxed(key, walk_fps=8, attack_fps=7):
    a, b = f"e_{key}", ROW1[key]
    return {**enemy(key, walk_fps, attack_fps),
            "attack": B(a, b[0:2], attack_fps, 0), "hurt": B(a, b[2:3], 8, 0), "dead": B(a, b[3:5], 6, 0)}


# The detector merges the third spark frame with the slash above it.
SPARK = [(155, 485, 232, 562), (372, 463, 531, 572), (636, 452, 872, 586), (986, 472, 1127, 569)]

FLYING = {"firefly", "ghost", "lantern", "firebat", "icewisp", "stormbird", "thunderimp", "jellyfish", "anglerfish", "cogmoth", "sandwisp"}


def grid_enemy(key, walk_fps=10, attack_fps=14):
    a = f"e_{key}"
    return {
        "idle": G(a, 0, 0, 4, max(6, walk_fps - 2), keep=True),
        "walk": G(a, 1, 0, 4, walk_fps, keep=True),
        "attack": G(a, 2, 0, 4, attack_fps, 0, keep=True),
        "hurt": G(a, 3, 0, 0, 10, 0, keep=True),
        "dead": G(a, 3, 1, 4, 8, 0, keep=True),
    }


def rich(key):
    a = f"e_{key}"
    return {
        "idle": N(a, 0, 10, 0, 9, 10),
        "walk": N(a, 0, 10, 0, 9, 14),
        "attack": N(a, 1, 10, 0, 9, 16, 0),
        "hurt": N(a, 2, 10, 0, 3, 12, 0),
        "dead": N(a, 2, 10, 4, 9, 10, 0),
    }


SHEETS: dict = {
    # ---------------- Player ----------------
    "angely": {
        "anchor": "feet",
        "anims": {
            "idle": G("p_idle2", 0, 0, 3, 5),
            "walk": G("p_walk_cycle", 0, 0, 5, 9, torso=True),
            "run": G("p_run_cycle", 0, 0, 7, 14, torso=True),
            "start": G("p_start_stop", 0, 0, 2, 18, 0),
            "stop": G("p_start_stop", 0, 3, 5, 14, 0),
            "jump": G("p_jump8", 0, 0, 3, 20, 0),
            "air": G("p_jump8", 0, 4, 4, 1),
            "fall": G("p_jump8", 0, 5, 6, 6),
            "land": G("p_jump8", 0, 7, 7, 1, 0),
            "hurt": G("p_hurt_land", 0, 0, 1, 10, 0),
            "celebrate": G("p_celebrate", 0, 0, 3, 7),
            "defeat": G("p_defeat", 0, 0, 2, 5, 0),
            "push": G("p_push", 0, 0, 5, 9),
        },
    },
    "angely_bow": {
        "anchor": "feet",
        "anims": {"shoot": G("p_bow", 0, 0, 4, 18, 0)},
    },
    "angely_hammer": {
        "anchor": "feet",
        "anims": {"smash": G("p_hammer", 0, 0, 4, 12, 0)},
    },
    "toxic": {"anchor": "feet", "anims": {
        "idle": G("e_toxic", 0, 0, 3, 6),
        "walk": G("e_toxic", 0, 0, 3, 8),
        "attack": G("e_toxic", 1, 0, 1, 10, 0),
        "hurt": G("e_toxic", 1, 2, 2, 8, 0),
        "dead": G("e_toxic", 1, 3, 3, 6, 0),
    }},
    "sandworm": {"anchor": "feet", "anims": {
        "rise": G("e_sandworm", 0, 0, 3, 8, 0),
        "idle": G("e_sandworm", 0, 3, 3, 1),
        "spit": G("e_sandworm", 1, 0, 1, 10, 0),
        "hurt": G("e_sandworm", 1, 2, 2, 8, 0),
        "dive": G("e_sandworm", 1, 3, 4, 8, 0),
    }},
    "umbra": {
        "anchor": "center",
        "anims": {
            "idle": G("e_umbra", 0, 0, 3, 6),
            "cast": B("e_umbra", [(28, 345, 268, 654), (266, 390, 552, 654)], 8, 0),
            "hurt": B("e_umbra", [(549, 405, 790, 653)], 8, 0),
            "dead": B("e_umbra", [(773, 456, 1002, 650), (1019, 396, 1258, 662)], 4, 0),
        },
    },
    "angely_boomerang": {"anchor": "feet", "anims": {"throw": B("p_boomerang", [(33, 224, 214, 459), (285, 194, 503, 459), (552, 210, 782, 461), (818, 232, 1000, 461), (1073, 232, 1250, 461)], 18, 0)}},
    "angely_wand": {"anchor": "feet", "anims": {"cast": G("p_wand", 0, 0, 4, 16, 0)}},
    "angely_ray": {"anchor": "feet", "anims": {"shoot": G("p_ray", 0, 0, 5, 16, 0)}},
    **{k: {"anchor": "center", "anims": rich(k)} for k in RICH_PX},
    "angely_swim": {
        "anchor": "center",
        "anims": {
            "swim": G("p_swim", 0, 0, 7, 12),
            "float": G("p_float2", 0, 0, 5, 7),
            "up": G("p_swimup", 0, 0, 3, 14, 0),
            "hurt": G("p_swimup", 0, 4, 5, 10, 0),
        },
    },
    "angelo": {
        "anchor": "feet",
        "anims": {
            "idle": G("angelo_move", 1, 0, 3, 5),
            "run": G("angelo_move", 0, 0, 7, 14),
            "talk": G("angelo_move", 1, 4, 7, 7),
            "wave": G("angelo_extra", 0, 0, 3, 7),
            "arms": G("angelo_extra", 0, 4, 5, 2),
            "welcome": G("angelo_extra", 0, 6, 7, 5, 0),
            "stance": G("angelo_fight2", 0, 0, 0, 1),
            "crouch": G("angelo_fight2", 0, 1, 1, 1),
            "leap": G("angelo_fight2", 0, 2, 2, 1),
            "kick": G("angelo_fight2", 0, 3, 4, 12, 0),
            "drop": G("angelo_fight2", 0, 5, 5, 1),
            "punch": G("angelo_fight2", 1, 0, 2, 12, 0),
            "uppercut": G("angelo_fight2", 1, 3, 4, 10, 0),
            "land": G("angelo_fight2", 1, 5, 5, 1),
        },
    },
    "angelo_hug": {"anchor": "feet", "center_x": True, "anims": {
        "open": B("angelo_hug", HUG[0:1], 1), "kneel": B("angelo_hug", HUG[1:2], 1),
        "hug": B("angelo_hug", HUG[2:5] + HUG[3:4], 3), "pat": B("angelo_hug", HUG[5:6], 1)}},
    "colossus": {"anchor": "feet", "anims": {
        "idle": G("e_colossus", 0, 0, 1, 2), "roar": G("e_colossus", 0, 2, 2, 1), "smash": G("e_colossus", 0, 3, 3, 1),
        "hurt": G("e_colossus", 1, 0, 1, 6, 0), "fall": G("e_colossus", 1, 2, 4, 4, 0)}},
    "weapon_cog": {"anchor": "center", "scale": 0.45, "anims": {"idle": G("weapon_cog", 0, 0, 0, 1)}},
    "weapon_ray": {"anchor": "center", "scale": 0.45, "anims": {"idle": G("weapon_ray", 0, 0, 0, 1)}},
    "fx_ray": {"anchor": "center", "scale": 0.35, "anims": {"fly": G("fx_ray", 0, 0, 3, 16)}},
    "weapon_boomerang": {"anchor": "center", "scale": 0.5, "anims": {"idle": G("weapons2", 0, 0, 0, 1)}},
    "weapon_wand": {"anchor": "center", "scale": 0.5, "anims": {"idle": G("weapons2", 0, 1, 1, 1)}},
    "fx_star": {"anchor": "center", "scale": 0.35, "anims": {"fly": G("weapons2", 0, 2, 2, 1)}},
    "weapon_bow": {"anchor": "center", "scale": 0.5, "anims": {"idle": G("weapons", 0, 0, 0, 1)}},
    "weapon_hammer": {"anchor": "center", "scale": 0.5, "anims": {"idle": G("weapons", 0, 1, 1, 1)}},
    "fx_arrow": {"anchor": "center", "scale": 0.35, "anims": {"fly": G("weapons", 0, 2, 2, 1)}},
    "angely_sword": {
        "anchor": "feet",
        "anims": {
            "idle": G("p_sword_idle", 0, 0, 3, 6),
            "slash": G("p_slash", 0, 0, 4, 18, 0),
            "jump_attack": G("p_jump_attack", 0, 0, 3, 14, 0),
            "pickup": G("p_pickup_hurt", 0, 0, 2, 4, 0),
            "hurt": G("p_pickup_hurt", 0, 3, 4, 8, 0),
            "defeat": G("p_defeat", 0, 0, 2, 5, 0),
        },
    },
    # toxic is defined above: its death row merges a burst into frame 4, so the generic
    # walk/dead slice must not overwrite that custom cut.
    **{k: {"anchor": "center" if k in FLYING else "feet", "anims": enemy(k)} for k in ENEMY_PX if k not in ROW1 and k != "toxic"},
    **{k: {"anchor": "center" if k in FLYING else "feet", "anims": enemy_boxed(k)} for k in ROW1},
    **{k: {"anchor": "center" if k in GRID_FLY else "feet", "center_x": True, "anims": grid_enemy(k)} for k in GRID_PX},
    # ---------------- Projectiles / VFX ----------------
    "fx_fireball": {"anchor": "center", "scale": 0.7, "anims": {
        "fly": G("vfx", 0, 0, 3, 12), "impact": B("vfx", SPARK[1:3], 14, 0)}},
    "fx_orb": {"anchor": "center", "scale": 0.7, "anims": {
        "fly": G("vfx", 1, 0, 3, 12), "impact": B("vfx", SPARK[1:3], 14, 0)}},
    "fx_bolt": {"anchor": "center", "scale": 0.7, "anims": {
        "fly": G("vfx", 2, 0, 3, 12), "impact": B("vfx", SPARK[1:3], 14, 0)}},
    "fx_spark": {"anchor": "center", "scale": 0.6, "anims": {
        "hit": B("vfx", SPARK, 20, 0)}},
    "fx_dust": {"anchor": "feet", "scale": 0.6, "anims": {
        "puff": G("vfx", 5, 0, 3, 14, 0)}},
    "fx_explode": {"anchor": "center", "scale": 0.9, "anims": {
        "boom": B("vfx", SPARK, 14, 0)}},
    "fx_slash": {"anchor": "center", "scale": 0.7, "anims": {
        "swing": G("vfx2", 0, 0, 4, 20, 0)}},
    "fx_lava": {"anchor": "feet", "scale": 0.6, "anims": {
        "burst": G("vfx2", 1, 0, 4, 10, 0)}},
    # ---------------- Pickups / props ----------------
    "heart": {"anchor": "center", "scale": 0.45, "anims": {
        "glow": G("items", 0, 0, 2, 6)}},
    "flag": {"anchor": "feet", "scale": 0.75, "anims": {
        "down": G("items", 1, 0, 0, 1), "up": G("items", 1, 1, 1, 1)}},
    "spring": {"anchor": "feet", "scale": 0.6, "anims": {
        "idle": G("items", 1, 2, 2, 1)}},
    "sword_stone": {"anchor": "feet", "scale": 0.6, "anims": {
        "idle": G("items", 2, 0, 0, 1)}},
    "portal": {"anchor": "feet", "scale": 0.6, "anims": {
        "arch": G("portal", 0, 0, 0, 1)}},
    "vortex": {"anchor": "center", "scale": 0.6, "anims": {
        "spin": G("portal", 0, 1, 1, 1)}},
}

# Slime drips and a seated squash pull the feet-x anchor sideways, so the body
# slides between frames. Keep the feet baseline and pin x to the frame center.
for _slime in ("blob", "squish"):
    SHEETS[_slime]["center_x"] = True

# Static per-chapter props: (atlas, row, index, display width in game px).
# The runtime image is exported at 2x the display width.
PROPS: dict = {}
for c in (1, 2, 3, 4, 5, 6, 7, 8, 9):
    a = f"props_{c}"
    PROPS[f"ground_{c}"] = (a, 0, 0, 640)
    PROPS[f"plat_l_{c}"] = (a, 1, 0, 190)
    PROPS[f"plat_m_{c}"] = (a, 1, 1, 145)
    PROPS[f"plat_s_{c}"] = (a, 1, 2, 100)
    PROPS[f"spikes_{c}"] = (a, 2, 1, 100)
    PROPS[f"crate_{c}"] = (a, 2, 0, 84)
    PROPS[f"block_{c}"] = (a, 2, 2, 84)
# Chapter 6's golden spikes are detected as separate spears; use explicit boxes.
PROPS["spikes_6"] = ("props_6", (370, 432, 854, 670), None, 100)
PROPS["block_6"] = ("props_6", (914, 453, 1239, 680), None, 84)

# Crystal Veil platforms are loose sheets (ground, three floats, hazard),
# not the old 3-row prop layout. Crates and blocks are cut from the solid deck.
_LOOSE = {
    10: {
        "ground": ((10, 29, 1014, 375), 640),
        "plat_l": ((170, 380, 852, 665), 240),
        "plat_m": ((268, 721, 754, 953), 160),
        "plat_s": ((354, 1002, 666, 1202), 108),
        "spikes": ((111, 1231, 914, 1499), 160),
        "crate": ((250, 160, 360, 270), 84),
        "block": ((620, 150, 730, 260), 84),
    },
}
for _c, _parts in _LOOSE.items():
    for _name, (_box, _w) in _parts.items():
        PROPS[f"{_name}_{_c}"] = (f"props_{_c}", _box, None, _w)
BACKDROPS = {
    "bg1": ("gen/bg_ch1.png", 800),
    "bg2": ("gen/bg_ch2.png", 800),
    "bg3": ("gen/bg_ch3.png", 800),
    "bg4": ("gen/bg_ch4.png", 800),
    "bg5": ("gen/bg_ch5.png", 800),
    "bg6": ("gen/bg_ch6.png", 800),
    "bg7": ("gen/bg_ch7.png", 800),
    "bg8": ("gen/bg_ch8.png", 800),
    "bg9": ("gen/bg_ch9.png", 800),
    "bg10": ("gen/bg_ch10.png", 800),
    # Title / chapter select and chapter splashes use the original hand-supplied art.
    "title_bg": ("chapter1_enchanted_forest_background.png", 800),
    "title_splash": ("title_splash.png", 1080),
    "splash1": ("angelys_world_chapter1_splash.png", 720),
    "splash2": ("angelys_world_chapter2_splash.png", 720),
    "splash3": ("angelys_world_chapter3_splash.png", 720),
    "splash4": ("angelys_world_chapter4_splash.png", 720),
    "splash5": ("angelys_world_chapter5_splash.png", 720),
    "splash6": ("angelys_world_chapter6_splash.png", 720),
    "splash7": ("angelys_world_chapter7_splash.png", 720),
    "splash8": ("gen/splash_ch8b.png", 720),
    "splash9": ("gen/splash_ch9b.png", 720),
    "splash10": ("gen/splash_ch10.png", 720),
}

# Dialogue portraits: (source, crop box, output px). Angely's face comes from the
# character reference sheet she supplied; Umbra's is cropped from her idle frame.
PORTRAITS = {
    "portrait_angely": ("angely_reference_sheet.png", (1117, 202, 1249, 334), 160),
    "portrait_angely_wow": ("angely_reference_sheet.png", (1228, 45, 1359, 176), 160),
    "portrait_angely_happy": ("angely_reference_sheet.png", (966, 45, 1097, 176), 160),
    "portrait_umbra": ("gen/e_umbra.png", (140, 40, 250, 150), 160),
    "portrait_angelo": ("gen/angelo_portrait.png", (150, 40, 874, 764), 160),
}
