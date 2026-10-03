const API_URL = import.meta.env.VITE_GREEN_API_URL;

function requestUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  const response = await fetch(requestUrl(path), { ...init, headers });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Ошибка API: ${response.status}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

type IncomingNotification = {
  receiptId: number;
  body: {
    typeWebhook?: string;
    timestamp?: number;
    idMessage?: string;
    senderData?: {
      chatId?: string;
      chatName?: string;
      senderName?: string;
      senderContactName?: string;
      senderPhoneNumber?: number;
    };
    messageData?: {
      textMessageData?: { textMessage?: string };
      extendedTextMessageData?: { text?: string };
    };
  };
};

export function enableHttpNotifications(credentials: Credentials) {
  return apiRequest<{ saveSettings?: boolean }>(
    `/waInstance${credentials.idInstance}/setSettings/${credentials.apiTokenInstance}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: "",
        webhookUrlToken: "",
        incomingWebhook: "yes",
      }),
    },
  );
}

export function receiveNotification(
  credentials: Credentials,
  signal?: AbortSignal,
) {
  return apiRequest<IncomingNotification | null>(
    `/waInstance${credentials.idInstance}/receiveNotification/${credentials.apiTokenInstance}?receiveTimeout=5`,
    { signal },
  );
}

export function deleteNotification(
  credentials: Credentials,
  receiptId: number,
) {
  return apiRequest<{ result: boolean }>(
    `/waInstance${credentials.idInstance}/deleteNotification/${credentials.apiTokenInstance}/${receiptId}`,
    { method: "DELETE" },
  );
}

export function incomingText(notification: IncomingNotification) {
  const body = notification.body;
  if (body.typeWebhook !== "incomingMessageReceived") return null;
  const text =
    body.messageData?.textMessageData?.textMessage ??
    body.messageData?.extendedTextMessageData?.text;
  const chatId = body.senderData?.chatId;
  const id = body.idMessage;
  if (!text || !chatId || !id) return null;
  return {
    chat: {
      chatId,
      name:
        body.senderData?.chatName ||
        body.senderData?.senderContactName ||
        body.senderData?.senderName ||
        formatPhone(body.senderData?.senderPhoneNumber) ||
        `Чат ${chatId}`,
      phoneNumber: body.senderData?.senderPhoneNumber,
    } satisfies Chat,
    message: {
      id,
      text,
      direction: "incoming" as const,
      // Notifications can remain queued for hours. Using their original
      // timestamp makes a newly received reply jump above newer local
      // messages after Firestore sorts the dialog. Arrival time keeps the
      // conversation stable and always appends new replies at the bottom.
      time: new Date(),
    },
  };
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("8")
    ? `7${digits.slice(1)}`
    : digits;
}

export function formatPhone(value?: number) {
  const digits = String(value ?? "");
  if (digits.length !== 11) return digits ? `+${digits}` : "";
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
}

export async function resolveRecipient(
  credentials: Credentials,
  messenger: Messenger,
  recipient: string,
): Promise<Chat> {
  const value = recipient.trim();
  const username = value.startsWith("@");
  const normalized = username ? value : normalizePhone(value);
  if (messenger === "whatsapp" && username) {
    throw new Error("Для WhatsApp укажите номер телефона");
  }
  if ((!username && normalized.length < 10) || (username && normalized.length < 2)) {
    throw new Error("Введите номер в международном формате или @username");
  }

  const base = `/waInstance${credentials.idInstance}`;
  const init = (body: object): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: {
    exist: boolean;
    chatId: string;
    username?: string;
    phoneNumber?: number;
  } = messenger === "telegram"
    ? await apiRequest(
        `${base}/checkAccount/${credentials.apiTokenInstance}`,
        init(username ? { username: normalized } : { phoneNumber: Number(normalized) }),
      )
    : await apiRequest<{ existsWhatsapp: boolean }>(
        `${base}/checkWhatsapp/${credentials.apiTokenInstance}`,
        init({ phoneNumber: Number(normalized) }),
      ).then((response) => ({
        exist: response.existsWhatsapp,
        chatId: `${normalized}@c.us`,
        phoneNumber: Number(normalized),
      }));

  if (!result.exist || !result.chatId) {
    throw new Error(
      `Аккаунт ${messenger === "telegram" ? "Telegram не найден или скрыт настройками приватности" : "WhatsApp не найден"}`,
    );
  }
  return {
    chatId: result.chatId,
    name: result.username || formatPhone(result.phoneNumber) || normalized,
    username: result.username,
    phoneNumber: result.phoneNumber,
  };
}

export async function sendTextMessage(
  credentials: Credentials,
  chatId: string,
  text: string,
) {
  const result = await apiRequest<{ idMessage: string }>(
    `/waInstance${credentials.idInstance}/sendMessage/${credentials.apiTokenInstance}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message: text }),
    },
  );
  return {
    id: result.idMessage,
    text,
    direction: "outgoing" as const,
    time: new Date(),
  };
}

export async function loadInstanceChats(
  credentials: Credentials,
  messenger: Messenger,
): Promise<Chat[]> {
  const base = `/waInstance${credentials.idInstance}`;
  const state = await apiRequest<{ stateInstance?: string }>(
    `${base}/getStateInstance/${credentials.apiTokenInstance}`,
  );
  if (state.stateInstance !== "authorized") {
    throw new Error(
      `Инстанс не авторизован: ${state.stateInstance ?? "неизвестный статус"}`,
    );
  }

  const settings = await apiRequest<{ typeInstance?: string }>(
    `${base}/getSettings/${credentials.apiTokenInstance}`,
  );
  if (settings.typeInstance && settings.typeInstance !== messenger) {
    throw new Error(
      `Этот инстанс подключён к ${settings.typeInstance === "telegram" ? "Telegram" : "WhatsApp"}. Измените выбор выше.`,
    );
  }

  const loaded = await apiRequest<
    Array<{
      chatId?: string;
      id?: string;
      name?: string;
      username?: string;
      phoneNumber?: number;
      avatar?: string;
      urlAvatar?: string;
    }>
  >(`${base}/getChats/${credentials.apiTokenInstance}`);
  return loaded.flatMap((chat) => {
    const chatId = chat.chatId ?? chat.id;
    return chatId
      ? [{
          chatId,
          name:
            chat.name ||
            chat.username ||
            formatPhone(chat.phoneNumber) ||
            `Чат ${chatId}`,
          username: chat.username,
          phoneNumber: chat.phoneNumber,
          avatarUrl: chat.avatar || chat.urlAvatar || undefined,
        }]
      : [];
  });
}

export async function getChatDetails(
  requestPath: string,
  apiToken: string,
  chatId: string,
  messenger: Messenger,
) {
  // These profile endpoints are intended for WhatsApp instances. Telegram
  // instances return GREEN-API status 466, which is expected but noisy.
  if (messenger === "telegram") {
    return { avatarUrl: undefined, lastSeen: null };
  }

  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
  };
  let avatarUrl = "";
  let lastSeen: string | number | null = null;

  try {
    const contact = await apiRequest<{
      avatar?: string;
      urlAvatar?: string;
      lastSeen?: string | number | null;
    } | null>(`${requestPath}/getContactInfo/${apiToken}`, init);
    avatarUrl = contact?.avatar || contact?.urlAvatar || "";
    lastSeen = contact?.lastSeen ?? null;
  } catch {
    /* Groups and privacy-restricted contacts may not expose contact info. */
  }

  if (!avatarUrl) {
    try {
      const avatar = await apiRequest<{ urlAvatar?: string }>(
        `${requestPath}/getAvatar/${apiToken}`,
        init,
      );
      avatarUrl = avatar.urlAvatar || "";
    } catch {
      /* Keep the local fallback avatar when GREEN-API has no image. */
    }
  }

  return { avatarUrl: avatarUrl || undefined, lastSeen };
}

export function formatLastSeen(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string" && !/^\d+$/.test(value)) {
    const normalized = value.toLowerCase();
    if (normalized === "online") return "Онлайн";
    if (normalized === "recently") return "Был(а) недавно";
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()))
      return `Был(а) ${date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  }
  const numeric = Number(value);
  const date = new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
  if (Number.isNaN(date.getTime())) return "";
  return `Был(а) ${date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
}
import type { Chat, Credentials, Messenger } from "./types";
