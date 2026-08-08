/**
 * On-device conversation memory — the ONLY place chat persistence lives.
 *
 * Design rules:
 *  - Versioned schema key: `seekr:chat:v1`. Unknown versions or corrupt
 *    data recover to an empty conversation — never crash, never throw.
 *  - Bounded: keeps up to HISTORY_KEEP messages, each capped in length
 *    (~16MB worst case on native), while the per-request context sent to
 *    the backend stays small (12 turns) so the API contract never changes.
 *  - Safe by construction: storage failures are swallowed (memory loss is
 *    acceptable, a crash is not).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage, HistoryItem } from "./chat";

const STORAGE_KEY = "seekr:chat:v1";
const HISTORY_KEEP = 1000;
const MAX_TEXT_LEN = 16000;

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
};

function isValidMessage(m: unknown): m is StoredMessage {
  if (!m || typeof m !== "object") return false;
  const item = m as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.role === "user" || item.role === "assistant") &&
    typeof item.text === "string" &&
    item.text.trim().length > 0 &&
    typeof item.ts === "number"
  );
}

/** Drop invalid entries, cap count and per-message length. */
export function sanitize(messages: unknown): StoredMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(isValidMessage)
    .slice(-HISTORY_KEEP)
    .map((m) => ({ ...m, text: m.text.slice(0, MAX_TEXT_LEN) }));
}

/** Load the saved conversation; returns [] on corrupt data or no data. */
export async function loadChatHistory(): Promise<StoredMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sanitize(parsed);
  } catch {
    // Corrupt or unreadable — clear it and start fresh.
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

/** Persist the conversation; only plain user/assistant text survives. */
export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  const persistable = sanitize(
    messages.filter(
      (m): m is StoredMessage =>
        !m.isError && !m.action && typeof m.text === "string" && m.text.trim().length > 0
    )
  );
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    /* memory loss is acceptable, a crash is not */
  }
}

/** Build the context payload for the backend: last N plain text turns. */
export function toHistoryItems(messages: ChatMessage[], count = 12): HistoryItem[] {
  return messages
    .filter(
      (m): m is StoredMessage =>
        !m.isError && !m.action && typeof m.text === "string" && m.text.trim().length > 0
    )
    .slice(-count)
    .map((m) => ({ role: m.role, content: m.text.slice(0, MAX_TEXT_LEN) }));
}
