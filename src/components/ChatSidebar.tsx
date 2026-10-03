import telegramLogo from "../assets/Telegram_2019_Logo.svg.webp";
import whatsappLogo from "../assets/WhatsApp_logo-color-vertical.svg.webp";
import { useState } from "react";
import { formatPhone } from "../greenApi";
import type { Chat, Message, Messenger, MessengerConnection } from "../types";

type Props = {
  messenger: Messenger;
  activeInstance: string;
  connections: MessengerConnection[];
  chats: Chat[];
  chatsLoading: boolean;
  selectedChat: Chat | null;
  messages: Record<string, Message[]>;
  search: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onSearch: (value: string) => void;
  onConnectionSelect: (connection: MessengerConnection) => void;
  onConnectionDelete: (connection: MessengerConnection) => void;
  onAddConnection: () => void;
  onNewChat: () => void;
  onSelect: (chat: Chat) => void;
  onLogout: () => void;
};

export function ChatSidebar({
  messenger,
  activeInstance,
  connections,
  chats,
  chatsLoading,
  selectedChat,
  messages,
  search,
  darkMode,
  onToggleTheme,
  onSearch,
  onConnectionSelect,
  onConnectionDelete,
  onAddConnection,
  onNewChat,
  onSelect,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const closeMenu = () => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 200);
  };
  const logo = messenger === "telegram" ? telegramLogo : whatsappLogo;
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-brand">
        <button
          className="sidebar-menu-button"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
        >
          ☰
        </button>
        <img className="brand-logo" src={logo} alt="" />
        <strong>Мессенджер</strong>
        <button onClick={onLogout} title="Выйти">
          ↪
        </button>
      </div>
      {menuOpen && (
        <div
          className={`menu-backdrop ${menuClosing ? "closing" : ""}`}
          onClick={closeMenu}
        >
          <aside
            className="account-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="account-menu-head">
              <img className="menu-logo" src={logo} alt="" />
              <div>
                <strong>Подключение</strong>
                <small>
                  {messenger === "telegram" ? "Telegram" : "WhatsApp"} ·{" "}
                  {activeInstance}
                </small>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Закрыть меню"
              >
                ×
              </button>
            </div>
            <button
              className="account-menu-row connection-row"
              type="button"
              onClick={() => setConnectionsOpen((open) => !open)}
            >
              <span>⇄</span>
              <strong>Сменить подключение</strong>
              <b>{connectionsOpen ? "⌃" : "⌄"}</b>
            </button>
            {connectionsOpen && (
              <div className="connection-list">
                {connections.map((connection) => (
                  <div
                    key={`${connection.messenger}-${connection.idInstance}`}
                    className={`connection-item ${
                      connection.idInstance === activeInstance &&
                      connection.messenger === messenger
                        ? "active"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="connection-select"
                      onClick={() => {
                        onConnectionSelect(connection);
                        closeMenu();
                      }}
                    >
                      <img
                        src={
                          connection.messenger === "telegram"
                            ? telegramLogo
                            : whatsappLogo
                        }
                        alt=""
                      />
                      {connection.messenger === "telegram"
                        ? "Telegram"
                        : "WhatsApp"}{" "}
                      · {connection.idInstance}
                    </button>
                    <button
                      type="button"
                      className="connection-delete"
                      aria-label={`Удалить подключение ${connection.idInstance}`}
                      title="Удалить подключение"
                      onClick={() => onConnectionDelete(connection)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-connection"
                  onClick={() => {
                    closeMenu();
                    onAddConnection();
                  }}
                >
                  ＋ Добавить подключение
                </button>
              </div>
            )}
            <div className="account-menu-divider" />
            <button
              className="account-menu-row"
              type="button"
              onClick={onToggleTheme}
            >
              <span>{darkMode ? "☀" : "☾"}</span>
              <strong>{darkMode ? "Дневная тема" : "Ночная тема"}</strong>
              <i className={`theme-switch ${darkMode ? "on" : ""}`} />
            </button>
            <button
              className="account-menu-row"
              type="button"
              onClick={onLogout}
            >
              <span>↪</span>
              <strong>Выйти</strong>
            </button>
          </aside>
        </div>
      )}
      <button className="new-chat-button" onClick={onNewChat}>
        <span>＋</span> Новый чат
      </button>
      <div className="search-box">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Поиск чатов…"
          aria-label="Поиск чатов"
        />
      </div>
      <p className="section-label">Недавние чаты</p>
      <div className="chat-list">
        {chatsLoading && (
          <div
            className="chat-loading"
            role="status"
            aria-label="Загрузка чатов"
          >
            <div className="loading-bar" />
            {[1, 2, 3, 4].map((item) => (
              <div className="chat-skeleton" key={item}>
                <i />
                <span>
                  <b />
                  <small />
                </span>
              </div>
            ))}
          </div>
        )}
        {chats.map((chat) => {
          const last = messages[chat.chatId]?.at(-1);
          const unread =
            selectedChat?.chatId === chat.chatId
              ? 0
              : (messages[chat.chatId] ?? []).filter(
                  (message) => message.direction === "incoming",
                ).length;
          return (
            <button
              key={chat.chatId}
              className={`chat-item ${selectedChat?.chatId === chat.chatId ? "active" : ""}`}
              onClick={() => onSelect(chat)}
            >
              <span className="user-avatar">
                {chat.avatarUrl ? (
                  <img
                    src={chat.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  chat.name.trim().charAt(0).toUpperCase()
                )}
              </span>
              <span className="chat-copy">
                <strong>{chat.name}</strong>
                <small>
                  {last?.text ??
                    chat.username ??
                    formatPhone(chat.phoneNumber) ??
                    messenger}
                </small>
              </span>
              <span className="chat-meta">
                <time>
                  {last?.time.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) ?? ""}
                </time>
                {unread > 0 && (
                  <b className="unread-badge">{unread > 99 ? "99+" : unread}</b>
                )}
              </span>
            </button>
          );
        })}
        {!chats.length && <p className="no-chats">Чатов пока нет</p>}
      </div>
    </aside>
  );
}
