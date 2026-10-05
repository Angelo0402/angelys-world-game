// Multiplayer manager for Angely's World co-op
// Connects to Cloudflare Worker, syncs player positions via WebSocket

const SERVER = "https://angely-multiplayer.angelo2231994.workers.dev";

export interface RemotePlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  anim: string;
  facing: number;
  hearts: number;
}

type Handler = (data: unknown) => void;

export class Multiplayer {
  private ws: WebSocket | null = null;
  private playerId: string | null = null;
  private handlers = new Map<string, Handler[]>();
  connected = false;

  /** Create a room → returns the 6-char code */
  async createRoom(): Promise<string> {
    const res = await fetch(`${SERVER}/create`, { method: "POST" });
    const { code } = (await res.json()) as { code: string };
    return code;
  }

  /** Join a room with a code */
  joinRoom(code: string): void {
    const wsUrl = SERVER.replace("https://", "wss://") + `/join/${code.toUpperCase()}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.connected = true;
      this.emit("connected", null);
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.type === "welcome") {
          this.playerId = msg.playerId;
          this.emit("welcome", msg);
        } else if (msg.type === "player-joined") {
          this.emit("player-joined", msg);
        } else if (msg.type === "player-left") {
          this.emit("player-left", msg);
        } else if (msg.type === "state") {
          this.emit("remote-state", msg);
        } else if (msg.type === "event") {
          this.emit("remote-event", msg);
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.emit("disconnected", null);
    };
  }

  /** Send our player state (call every ~100ms) */
  sendState(state: RemotePlayerState): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "state", state }));
    }
  }

  /** Send a game event (enemy killed, item picked up) */
  sendEvent(event: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "event", event }));
    }
  }

  on(type: string, handler: Handler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
  }

  private emit(type: string, data: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h(data);
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.playerId = null;
  }

  get id(): string | null {
    return this.playerId;
  }
}

export const multiplayer = new Multiplayer();
