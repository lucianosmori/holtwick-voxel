// Cloudflare Worker / Groq Llama-3.1-8B is the sole NPC chat backend.
// Endpoint:    https://holtwick-llm.lucianosmori.workers.dev/chat
// Source:      https://github.com/lucianosmori/holtwick-llm-proxy
// Wire format: Server-Sent Events in Groq's OpenAI-compatible delta shape
//              (`data: {choices:[{delta:{content:"..."}}]}`).
//
// This module owns chat-history state (a per-NPC ring buffer capped at
// HISTORY_TURN_CAP turns) and the StreamCallbacks contract the dialog uses
// to render tokens. Both lived in webllm.ts before the in-browser model was
// dropped; nothing else consumes them, so they live here directly.

import type { NpcDef } from "../data/npc.schema";

const PROXY_URL = "https://holtwick-llm.lucianosmori.workers.dev/chat";
const HEALTH_URL = "https://holtwick-llm.lucianosmori.workers.dev/health";
const WARM_URL = "https://holtwick-llm.lucianosmori.workers.dev/warm";

// Cap the round-trip so a hung worker / Groq timeout doesn't strand the
// dialog spinner on "…" — the bubble falls through to the offline bark.
const PROXY_REQUEST_TIMEOUT_MS = 8000;
const HISTORY_TURN_CAP = 12;

export type ChatRole = "user" | "assistant";
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface StreamCallbacks {
  onToken: (acc: string) => void;
  onDone: (final: string) => void;
  onError: (message: string) => void;
}

const histories = new Map<string, ChatTurn[]>();

export function getHistory(npcId: string): ChatTurn[] {
  return histories.get(npcId) ?? [];
}

export function resetHistory(npcId: string): void {
  histories.delete(npcId);
}

export function pushTurn(npcId: string, turn: ChatTurn): void {
  const list = histories.get(npcId) ?? [];
  list.push(turn);
  if (list.length > HISTORY_TURN_CAP) list.splice(0, list.length - HISTORY_TURN_CAP);
  histories.set(npcId, list);
}

interface ProxyChunk {
  choices?: { delta?: { content?: string } }[];
}

export async function isProxyReachable(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Fire-and-forget warmup. Cloudflare Workers cold-start adds ~50-100ms on
// the first request after idle; pinging /health when the player opens the
// dialog (or even when the page loads) means the actual /chat POST hits a
// warm isolate. /warm goes one further and round-trips a 1-token Groq
// request so the worker->Groq TLS pipe + model selection is hot too.
// Throttled so rapid opens don't spam the worker.
let lastWarmupAt = 0;
const WARMUP_MIN_INTERVAL_MS = 30_000;

export function warmupProxy(): void {
  const now = Date.now();
  if (now - lastWarmupAt < WARMUP_MIN_INTERVAL_MS) return;
  lastWarmupAt = now;
  void fetch(HEALTH_URL, { method: "GET", signal: AbortSignal.timeout(2000) }).catch(() => {});
  void fetch(WARM_URL, { method: "GET", signal: AbortSignal.timeout(5000) }).catch(() => {});
}

export async function streamProxyReply(
  npc: NpcDef,
  userMsg: string,
  cb: StreamCallbacks,
): Promise<void> {
  pushTurn(npc.id, { role: "user", content: userMsg });
  const history: ChatTurn[] = getHistory(npc.id).slice(0, -1); // exclude the just-pushed user turn
  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(PROXY_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        npc: {
          id: npc.id,
          name: npc.name,
          role: npc.role,
          barks_idle: npc.barks_idle,
          barks_combat: npc.barks_combat,
        },
        history: history.slice(-HISTORY_TURN_CAP),
        userMsg,
      }),
    });
  } catch (err) {
    cb.onError(`proxy unreachable: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    cb.onError(`proxy ${res.status}: ${errText.slice(0, 200)}`);
    return;
  }
  if (!res.body) {
    cb.onError("proxy: empty body");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE events are \n\n separated; each event has one-or-more `data:` lines.
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of raw.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let chunk: ProxyChunk;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            acc += delta;
            cb.onToken(acc);
          }
        }
      }
    }
  } catch (err) {
    cb.onError(`stream read failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  pushTurn(npc.id, { role: "assistant", content: acc });
  cb.onDone(acc);
}
