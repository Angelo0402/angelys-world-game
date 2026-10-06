import * as THREE from "three";
import { Node } from "../../vendor/parlyn-engine/src/engine/core/Node.mjs";
import { Node2_5D } from "../../vendor/parlyn-engine/src/engine/core/Node2_5D.mjs";
import { Node3D } from "../../vendor/parlyn-engine/src/engine/core/Node3D.mjs";
import { Light3D } from "../../vendor/parlyn-engine/src/engine/core/Light3D.mjs";

/**
 * Parlyn play-mode renderer. Upstream ThreeRenderer is an editor viewport
 * (gizmos, grid, selection). This runtime keeps Parlyn's node types, loads
 * real textures onto Sprite2_5D / Billboard2_5D, and runs a side-scrolling
 * 2.5D camera with sun, fog and contact shadows.
 */
type Sheet = { cols: number; rows: number; frame: number };
type SpriteMeta = {
  width?: number;
  height?: number;
  color?: number;
  opacity?: number;
  texture?: string;
  sheet?: Sheet;
  originX?: number;
  originY?: number;
  emissive?: number;
  depthWrite?: boolean;
  billboard?: boolean;
};

export class PlayRenderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly nodeObjects = new Map<string, THREE.Object3D>();
  private loader = new THREE.TextureLoader();
  private textures = new Map<string, THREE.Texture>();
  private follow = new THREE.Vector3(0, 1.2, 0);
  private orbit = { yaw: 0.04, pitch: 0.18, distance: 12.2 };
  private sun?: THREE.DirectionalLight;
  private sunTarget = new THREE.Object3D();
  private fill?: THREE.PointLight;
  private onResize: () => void;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0f16, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.08, 260);
    this.scene.fog = new THREE.FogExp2(0x0a0f16, 0.024);
    this.scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x1a1420, 0.72));
    this.scene.add(this.sunTarget);

    this.onResize = () => this.resize(container);
    window.addEventListener("resize", this.onResize);
    this.resize(container);
  }

  setClear(color: number, fog = 0.022) {
    this.renderer.setClearColor(color, 1);
    this.scene.background = new THREE.Color(color);
    this.scene.fog = new THREE.FogExp2(color, fog);
  }

  setOrbit(partial: Partial<typeof this.orbit>) {
    Object.assign(this.orbit, partial);
  }

  async texture(url: string) {
    const key = url.startsWith("/") ? url.slice(1) : url;
    const hit = this.textures.get(key);
    if (hit) return hit;
    const tex = await this.loader.loadAsync(key);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.set(key, tex);
    return tex;
  }

  sheetGrid(url: string, frameWidth: number, frameHeight: number) {
    const tex = this.textures.get(url.startsWith("/") ? url.slice(1) : url);
    const img = tex?.image as { width?: number; height?: number } | undefined;
    const w = img?.width ?? frameWidth;
    const h = img?.height ?? frameHeight;
    return {
      cols: Math.max(1, Math.round(w / frameWidth)),
      rows: Math.max(1, Math.round(h / frameHeight)),
    };
  }

  addNode(node: InstanceType<typeof Node>) {
    const object = this.createObject(node);
    if (!object) return;
    this.applyTransform(node, object);
    this.nodeObjects.set(node.id, object);
    this.scene.add(object);
  }

  removeNode(id: string) {
    const object = this.nodeObjects.get(id);
    if (!object) return;
    this.scene.remove(object);
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose?.();
      const map = (mesh.material as THREE.MeshStandardMaterial | undefined)?.map;
      if (map && map.userData.cloned) map.dispose();
    });
    this.nodeObjects.delete(id);
  }

  sync(node: InstanceType<typeof Node2_5D> | InstanceType<typeof Node3D>) {
    const object = this.nodeObjects.get(node.id);
    if (object) this.applyTransform(node, object);
  }

  setVisible(id: string, visible: boolean) {
    const object = this.nodeObjects.get(id);
    if (object) object.visible = visible;
  }

  setOpacity(id: string, opacity: number) {
    const mesh = this.nodeObjects.get(id) as THREE.Mesh | undefined;
    const mat = mesh?.material as THREE.MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.opacity = opacity;
    mat.transparent = opacity < 1 || !!mat.map;
  }

  setEmissive(id: string, color: number, intensity = 1) {
    const mesh = this.nodeObjects.get(id) as THREE.Mesh | undefined;
    const mat = mesh?.material as THREE.MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.emissive = new THREE.Color(color);
    mat.emissiveIntensity = intensity;
  }

  setSheetFrame(id: string, frame: number, cols: number, rows: number, flipX = false) {
    const object = this.nodeObjects.get(id) as THREE.Mesh | undefined;
    const mat = object?.material as THREE.MeshStandardMaterial | undefined;
    const tex = mat?.map;
    if (!tex || !cols) return;
    this.setSheetOnTex(tex, frame, cols, rows, flipX);
  }

  followTarget(x: number, y: number, immediate = false) {
    const next = new THREE.Vector3(x, y + 1.05, 0);
    if (immediate) this.follow.copy(next);
    else this.follow.lerp(next, 0.14);
    const cp = Math.cos(this.orbit.pitch);
    const offset = new THREE.Vector3(
      Math.sin(this.orbit.yaw) * cp,
      Math.sin(this.orbit.pitch),
      Math.cos(this.orbit.yaw) * cp,
    ).multiplyScalar(this.orbit.distance);
    this.camera.position.copy(this.follow).add(offset);
    this.camera.lookAt(this.follow);
    this.sunTarget.position.copy(this.follow);
    if (this.sun) {
      this.sun.position.set(this.follow.x + 6.5, this.follow.y + 10, this.follow.z + 7);
      this.sun.target = this.sunTarget;
    }
    if (this.fill) this.fill.position.set(this.follow.x - 2.2, this.follow.y + 3.2, this.follow.z + 3.4);
  }

  render() {
    for (const object of this.nodeObjects.values()) {
      if (object.userData.billboard) {
        object.quaternion.copy(this.camera.quaternion);
        object.rotateZ(object.userData.billboardRoll ?? 0);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize(container: HTMLElement) {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.removeEventListener("resize", this.onResize);
    for (const id of [...this.nodeObjects.keys()]) this.removeNode(id);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createObject(node: InstanceType<typeof Node>): THREE.Object3D | null {
    if (node.type === "SceneRoot") return null;
    if (node.type === "Sprite2_5D" || node.type === "Billboard2_5D") {
      const meta = node.metadata as SpriteMeta;
      const width = meta.width ?? 1.4;
      const height = meta.height ?? 1.6;
      const geometry = new THREE.PlaneGeometry(width, height);
      const ox = meta.originX ?? 0.5;
      const oy = meta.originY ?? 1;
      geometry.translate((0.5 - ox) * width, (oy - 0.5) * height, 0);
      const material = new THREE.MeshStandardMaterial({
        color: meta.texture ? 0xffffff : (meta.color ?? 0x4f8edc),
        roughness: 0.58,
        metalness: 0.04,
        transparent: true,
        opacity: meta.opacity ?? 1,
        side: THREE.DoubleSide,
        alphaTest: 0.08,
        depthWrite: meta.depthWrite !== false,
        emissive: new THREE.Color(meta.emissive ?? 0x000000),
      });
      if (meta.texture) {
        const src = this.textures.get(meta.texture.startsWith("/") ? meta.texture.slice(1) : meta.texture);
        if (src) {
          const tex = src.clone();
          tex.needsUpdate = true;
          tex.userData.cloned = true;
          material.map = tex;
          if (meta.sheet) {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            this.setSheetOnTex(tex, meta.sheet.frame, meta.sheet.cols, meta.sheet.rows, false);
          }
        }
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.userData.billboard = node.type === "Billboard2_5D" || meta.billboard;
      mesh.userData.billboardRoll = 0;
      mesh.userData.parlynNodeId = node.id;
      return mesh;
    }
    if (node.type === "Mesh3D") {
      const meta = node.metadata as { color?: number; w?: number; h?: number; d?: number; receive?: boolean; opacity?: number };
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(meta.w ?? 1.6, meta.h ?? 0.45, meta.d ?? 2.6),
        new THREE.MeshStandardMaterial({
          color: meta.color ?? 0x3b2414,
          roughness: 0.9,
          metalness: 0.02,
          transparent: (meta.opacity ?? 1) < 1,
          opacity: meta.opacity ?? 1,
        }),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = meta.receive !== false;
      mesh.userData.parlynNodeId = node.id;
      mesh.userData.surfaceSupport = true;
      return mesh;
    }
    if (node instanceof Light3D || node.type === "Light3D") {
      const lightNode = node as InstanceType<typeof Light3D>;
      const group = new THREE.Group();
      const color = lightNode.color as string | number;
      if (lightNode.lightKind === "point") {
        const light = new THREE.PointLight(color, lightNode.intensity, 34, 1.55);
        light.castShadow = lightNode.castShadow;
        group.add(light);
        group.userData.light = light;
        this.fill = light;
      } else {
        const light = new THREE.DirectionalLight(color, lightNode.intensity);
        light.castShadow = lightNode.castShadow;
        light.shadow.mapSize.set(2048, 2048);
        light.shadow.camera.near = 0.4;
        light.shadow.camera.far = 48;
        light.shadow.camera.left = -18;
        light.shadow.camera.right = 18;
        light.shadow.camera.top = 12;
        light.shadow.camera.bottom = -8;
        light.shadow.bias = -0.0008;
        light.target = this.sunTarget;
        group.add(light);
        group.userData.light = light;
        this.sun = light;
      }
      group.userData.parlynNodeId = node.id;
      return group;
    }
    return null;
  }

  private setSheetOnTex(tex: THREE.Texture, frame: number, cols: number, rows: number, flipX: boolean) {
    const col = ((frame % cols) + cols) % cols;
    const row = Math.floor(frame / cols) % rows;
    tex.repeat.set((flipX ? -1 : 1) / cols, 1 / rows);
    tex.offset.set((flipX ? col + 1 : col) / cols, 1 - (row + 1) / rows);
  }

  private applyTransform(node: InstanceType<typeof Node>, object: THREE.Object3D) {
    const n = node as InstanceType<typeof Node2_5D> & InstanceType<typeof Node3D>;
    object.position.set(n.position?.x ?? 0, n.position?.y ?? 0, n.position?.z ?? 0);
    if (node.type === "Sprite2_5D" || node.type === "Billboard2_5D") {
      object.rotation.set(0, 0, THREE.MathUtils.degToRad((n as InstanceType<typeof Node2_5D>).rotation ?? 0));
      object.userData.billboardRoll = object.rotation.z;
      const s = (n as InstanceType<typeof Node2_5D>).scale;
      object.scale.set(s?.x ?? 1, s?.y ?? 1, 1);
    } else if (n.rotation && typeof n.rotation === "object") {
      const r = n.rotation as { x: number; y: number; z: number };
      object.rotation.set(
        THREE.MathUtils.degToRad(r.x ?? 0),
        THREE.MathUtils.degToRad(r.y ?? 0),
        THREE.MathUtils.degToRad(r.z ?? 0),
      );
      const s = n.scale as { x: number; y: number; z: number };
      object.scale.set(s?.x ?? 1, s?.y ?? 1, s?.z ?? 1);
    }
  }
}

export { Node, Node2_5D, Node3D, Light3D };
