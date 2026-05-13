import type { NpcDef } from "../data/npc.schema";

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const MAX_TOKENS = 200;
const TEMPERATURE = 0.8;
const HISTORY_TURN_CAP = 12;

export type ChatRole = "user" | "assistant";
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export type StatusKind = "idle" | "loading" | "ready" | "error";
export interface ChatStatus {
  kind: StatusKind;
  text: string;
}

type StatusListener = (s: ChatStatus) => void;

interface MlcInitProgress {
  progress?: number;
  text?: string;
}

interface MlcChunkChoiceDelta {
  content?: string;
}
interface MlcChunkChoice {
  delta?: MlcChunkChoiceDelta;
}
interface MlcChunk {
  choices?: MlcChunkChoice[];
}

interface MlcMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
interface MlcChatRequest {
  messages: MlcMessage[];
  stream: true;
  temperature: number;
  max_tokens: number;
}
interface MlcEngine {
  chat: {
    completions: {
      create: (req: MlcChatRequest) => Promise<AsyncIterable<MlcChunk>>;
    };
  };
}

let engine: MlcEngine | null = null;
let loading = false;
let lastError: string | null = null;
let status: ChatStatus = { kind: "idle", text: "" };
const listeners = new Set<StatusListener>();
const histories = new Map<string, ChatTurn[]>();

function setStatus(next: ChatStatus): void {
  status = next;
  for (const l of listeners) l(next);
}

export function getStatus(): ChatStatus {
  return status;
}

export function subscribeStatus(fn: StatusListener): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getHistory(npcId: string): ChatTurn[] {
  return histories.get(npcId) ?? [];
}

export function resetHistory(npcId: string): void {
  histories.delete(npcId);
}

function pushTurn(npcId: string, turn: ChatTurn): void {
  const list = histories.get(npcId) ?? [];
  list.push(turn);
  if (list.length > HISTORY_TURN_CAP) list.splice(0, list.length - HISTORY_TURN_CAP);
  histories.set(npcId, list);
}

function buildSystemPrompt(npc: NpcDef): string {
  const bossLine = npc.boss === true
    ? "You are the final boss of this dungeon. The player has come to defeat you. Be ominous, terse, never plead."
    : "";
  const idle = npc.barks_idle.slice(0, 6).map((b) => `- "${b}"`).join("\n");
  const combat = npc.barks_combat.slice(0, 4).map((b) => `- "${b}"`).join("\n");
  return [
    `You are ${npc.name}, a ${npc.role} in a dark procedural-dungeon rogue-like.`,
    bossLine,
    "Stay in character. Never mention being an AI, a model, or a chatbot.",
    "Reply in 1-2 short sentences. Match the tone of the lines below.",
    "",
    "Lines you sometimes mutter when idle:",
    idle || "- (silence)",
    "",
    "Lines you cry out when threatened:",
    combat || "- (silence)",
  ].filter((s) => s.length > 0).join("\n");
}

export function isReady(): boolean {
  return engine !== null && status.kind === "ready";
}

export function lastInitError(): string | null {
  return lastError;
}

interface WebLlmModule {
  CreateMLCEngine: (
    model: string,
    opts: { initProgressCallback: (p: MlcInitProgress) => void },
  ) => Promise<MlcEngine>;
}

export async function ensureEngine(): Promise<MlcEngine | null> {
  if (engine) return engine;
  if (loading) return null;
  loading = true;
  setStatus({ kind: "loading", text: "loading model 0%" });
  try {
    const mod = (await import("@mlc-ai/web-llm")) as unknown as WebLlmModule;
    engine = await mod.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (p: MlcInitProgress) => {
        const pct = Math.round((p.progress ?? 0) * 100);
        setStatus({ kind: "loading", text: `loading model ${pct}%` });
      },
    });
    lastError = null;
    setStatus({ kind: "ready", text: "ready" });
    return engine;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    lastError = message;
    engine = null;
    setStatus({ kind: "error", text: "WebGPU unavailable — using scripted barks" });
    return null;
  } finally {
    loading = false;
  }
}

export interface StreamCallbacks {
  onToken: (acc: string) => void;
  onDone: (final: string) => void;
  onError: (message: string) => void;
}

export async function streamReply(
  npc: NpcDef,
  userText: string,
  cb: StreamCallbacks,
): Promise<void> {
  const eng = engine;
  if (!eng) {
    cb.onError("Engine not ready");
    return;
  }
  pushTurn(npc.id, { role: "user", content: userText });
  const history = getHistory(npc.id);
  const messages: MlcMessage[] = [
    { role: "system", content: buildSystemPrompt(npc) },
    ...history.map<MlcMessage>((t) => ({ role: t.role, content: t.content })),
  ];
  try {
    const stream = await eng.chat.completions.create({
      messages,
      stream: true,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    });
    let acc = "";
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? "";
      if (!delta) continue;
      acc += delta;
      cb.onToken(acc);
    }
    pushTurn(npc.id, { role: "assistant", content: acc });
    cb.onDone(acc);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    cb.onError(message);
  }
}
