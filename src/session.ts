import type { Credentials, Messenger } from "./types";

export const SESSION_KEY = "green-chat-session";
export type SavedSession = Credentials & { messenger: Messenger };

export function readSession(): SavedSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    return value?.idInstance &&
      value?.apiTokenInstance &&
      ["telegram", "whatsapp"].includes(value.messenger)
      ? value
      : null;
  } catch {
    return null;
  }
}
