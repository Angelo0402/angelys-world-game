import { GROUND_Y } from "../../src/config";

/** Pixels per world unit. Matches the Phaser tile size so layouts port 1:1. */
export const UNIT = 80;

export const wx = (px: number) => px / UNIT;
export const wy = (py: number) => (GROUND_Y - py) / UNIT;
export const pxFromWorldX = (x: number) => x * UNIT;
export const pyFromWorldY = (y: number) => GROUND_Y - y * UNIT;
