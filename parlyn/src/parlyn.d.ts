declare module "*.mjs" {
  export class Node {
    id: string;
    name: string;
    type: string;
    parent: Node | null;
    children: Node[];
    enabled: boolean;
    metadata: Record<string, unknown>;
    constructor(options?: { id?: string; name?: string; type?: string });
    addChild(node: Node): Node;
    removeChild(node: Node): boolean;
    walk(visitor: (node: Node) => void): void;
  }

  export class Node2_5D extends Node {
    position: { x: number; y: number; z: number };
    rotation: number;
    scale: { x: number; y: number };
    depthLayer: string;
    constructor(options?: Record<string, unknown>);
  }

  export class Node3D extends Node {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    constructor(options?: Record<string, unknown>);
  }

  export class Light3D extends Node3D {
    lightKind: "point" | "directional" | "spot" | string;
    color: string | number;
    intensity: number;
    castShadow: boolean;
    constructor(options?: Record<string, unknown>);
  }
}
