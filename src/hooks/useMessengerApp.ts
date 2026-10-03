import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTheme } from "./useTheme";
import { useConnections } from "./useConnections";
import { useFirebaseChatSync } from "./useFirebaseChatSync";
import { useIncomingMessages } from "./useIncomingMessages";
import { readSession, SESSION_KEY } from "../session";
import { deleteConnection, ensureFirebaseSession, saveChat, saveChats, saveConnection, saveMessage } from "../firebase/chatStore";
import { getChatDetails, loadInstanceChats, resolveRecipient, sendTextMessage } from "../greenApi";
import type { Chat, Credentials, Message, Messenger, MessengerConnection, View } from "../types";

const savedSession = readSession();

export function useMessengerApp() {
  const [credentials, setCredentials] = useState<Credentials | null>(savedSession);
  const [messenger, setMessenger] = useState<Messenger>(savedSession?.messenger ?? "telegram");
  const [idInstance, setIdInstance] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [view, setView] = useState<View>("empty");
  const [recipient, setRecipient] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(Boolean(savedSession));
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const { darkMode, toggleTheme } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  const visibleChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? chats.filter((chat) => `${chat.name} ${chat.username ?? ""} ${chat.phoneNumber ?? ""}`.toLowerCase().includes(query))
      : chats;
  }, [chats, search]);
  const currentMessages = selectedChat ? (messages[selectedChat.chatId] ?? []) : [];

  const refreshChatDetails = async (chat: Chat, activeCredentials: Credentials) => {
    const details = await getChatDetails(
      `/waInstance${activeCredentials.idInstance}`,
      activeCredentials.apiTokenInstance,
      chat.chatId,
      messenger,
    );
    const enriched = {
      ...chat,
      ...(details.avatarUrl ? { avatarUrl: details.avatarUrl } : {}),
      ...(details.lastSeen !== null && details.lastSeen !== undefined ? { lastSeen: details.lastSeen } : {}),
    };
    setChats((current) => current.map((item) => (item.chatId === chat.chatId ? enriched : item)));
    setSelectedChat((current) => current?.chatId === chat.chatId ? enriched : current);
    await ensureFirebaseSession();
    await saveChat(activeCredentials.idInstance, enriched);
    return enriched;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat]);

  const { connections, setConnections, activateConnection } = useConnections({
    initial: savedSession ? [savedSession] : [],
    setCredentials, setMessenger, setIdInstance, setApiToken, setChats,
    setChatsLoading, setMessages, setSelectedChat, setView, setError,
  });

  useFirebaseChatSync({ credentials, selectedChat, setChats, setMessages, setChatsLoading, setError });
  useIncomingMessages({ credentials, setChats, setMessages, setError });

  const removeConnection = async (connection: MessengerConnection) => {
    if (!window.confirm(`Удалить подключение ${connection.idInstance}?`)) return;
    setError("");
    try {
      await ensureFirebaseSession();
      await deleteConnection(connection);
      const remaining = connections.filter((item) => item.idInstance !== connection.idInstance);
      setConnections(remaining);
      const isActive = credentials?.idInstance === connection.idInstance && messenger === connection.messenger;
      if (!isActive) return;
      sessionStorage.removeItem(SESSION_KEY);
      if (remaining[0]) activateConnection(remaining[0]);
      else setCredentials(null);
    } catch {
      setError("Не удалось удалить подключение");
    }
  };

  const connect = async (event: FormEvent) => {
    event.preventDefault();
    const next = { idInstance: idInstance.trim(), apiTokenInstance: apiToken.trim() };
    if (!/^\d{6,}$/.test(next.idInstance)) return setError("idInstance должен содержать только цифры");
    if (next.apiTokenInstance.length < 20) return setError("Проверьте apiTokenInstance — токен слишком короткий");
    setConnecting(true);
    setError("");
    try {
      const normalized = await loadInstanceChats(next, messenger);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...next, messenger }));
      setConnections((current) => [...current.filter((item) => item.idInstance !== next.idInstance), { ...next, messenger }]);
      setChats(normalized);
      setChatsLoading(false);
      setCredentials(next);
      setView(normalized.length ? "empty" : "new");
      void (async () => {
        await ensureFirebaseSession();
        await saveConnection({ ...next, messenger });
        await saveChats(next.idInstance, normalized);
        for (const chat of normalized.slice(0, 3)) {
          await refreshChatDetails(chat, next);
          await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
      })().catch(() => setError("Подключение выполнено, но часть данных профилей недоступна"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось проверить данные инстанса");
    } finally {
      setConnecting(false);
    }
  };

  const openChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!credentials) return;
    setError("");
    setConnecting(true);
    try {
      const chat = await resolveRecipient(credentials, messenger, recipient);
      setChats((current) => [chat, ...current.filter((item) => item.chatId !== chat.chatId)]);
      setSelectedChat(chat);
      setView("chat");
      setRecipient("");
      void saveChat(credentials.idInstance, chat).catch(() => setError("Чат создан, но не сохранён в Firebase"));
      void refreshChatDetails(chat, credentials).catch(() => {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось проверить аккаунт");
    } finally {
      setConnecting(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!credentials || !selectedChat || !text || sending) return;
    setSending(true);
    setError("");
    try {
      const message: Message = await sendTextMessage(credentials, selectedChat.chatId, text);
      setMessages((current) => ({ ...current, [selectedChat.chatId]: [...(current[selectedChat.chatId] ?? []), message] }));
      void saveMessage(credentials.idInstance, selectedChat.chatId, message, credentials.apiTokenInstance)
        .catch(() => setError("Сообщение отправлено, но не сохранено в Firebase"));
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  return {
    credentials, messenger, idInstance, apiToken, connecting, error, connections,
    chatsLoading, selectedChat, messages, visibleChats, search, darkMode, view,
    recipient, draft, sending, currentMessages, bottomRef, activateConnection,
    removeConnection, connect, openChat, sendMessage, toggleTheme, setMessenger,
    setError, setIdInstance, setApiToken, setSearch, setRecipient, setDraft,
    addConnection: () => {
      sessionStorage.removeItem(SESSION_KEY);
      setCredentials(null); setIdInstance(""); setApiToken("");
      setMessenger(messenger === "telegram" ? "whatsapp" : "telegram"); setError("");
    },
    newChat: () => { setView("new"); setSelectedChat(null); setError(""); },
    selectChat: (chat: Chat) => {
      setSelectedChat(chat); setView("chat"); setError("");
      if (credentials) void refreshChatDetails(chat, credentials).catch(() => {});
    },
    logout: () => { sessionStorage.removeItem(SESSION_KEY); setCredentials(null); },
    back: () => { setView("empty"); setSelectedChat(null); setError(""); },
  };
}
