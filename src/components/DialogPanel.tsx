import { useState } from "react";
import type { FormEvent, RefObject } from "react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { formatLastSeen } from "../greenApi";
import type { Chat, Message, Messenger } from "../types";

type Props = {
  messenger: Messenger;
  darkMode: boolean;
  chat: Chat;
  messages: Message[];
  draft: string;
  sending: boolean;
  error: string;
  bottomRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function DialogPanel({
  messenger,
  darkMode,
  chat,
  messages,
  draft,
  sending,
  error,
  bottomRef,
  onBack,
  onDraftChange,
  onSubmit,
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const orderedMessages = [...messages].sort(
    (left, right) => left.time.getTime() - right.time.getTime(),
  );

  return (
    <>
      <header className="dialog-header">
        <button
          className="mobile-back"
          type="button"
          onClick={onBack}
          aria-label="Назад к чатам"
        >
          ←
        </button>
        <span className="user-avatar">
          {chat.avatarUrl ? (
            <img src={chat.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            chat.name.trim().charAt(0).toUpperCase()
          )}
        </span>
        <div>
          <strong>{chat.name}</strong>
          {formatLastSeen(chat.lastSeen) && (
            <small className={chat.lastSeen === "online" ? "is-online" : ""}>
              <i /> {formatLastSeen(chat.lastSeen)}
            </small>
          )}
        </div>
        <button className="dialog-menu" aria-label="Меню чата">
          ⋮
        </button>
      </header>
      <div
        className={`dialog-messages ${orderedMessages.length ? "" : "is-empty"}`}
        aria-live="polite"
      >
        {orderedMessages.length > 0 && <span className="today">Сегодня</span>}
        {!orderedMessages.length && (
          <div className="dialog-empty">
            <span aria-hidden="true">◰</span>
            <strong>Сообщений пока нет</strong>
            <p>Напишите первое сообщение в этот чат</p>
          </div>
        )}
        {orderedMessages.map((message) => (
          <article key={message.id} className={`message ${message.direction}`}>
            <p>{message.text}</p>
            <time>
              {message.time.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {message.direction === "outgoing" && " ✓✓"}
            </time>
          </article>
        ))}
        {orderedMessages.length > 0 && <div ref={bottomRef} />}
      </div>
      {error && (
        <div className="action-error" role="alert">
          {error}
        </div>
      )}
      <form className="composer" onSubmit={onSubmit}>
        <button
          className="emoji-button"
          type="button"
          onClick={() => setEmojiOpen((open) => !open)}
          aria-label="Выбрать эмодзи"
          aria-expanded={emojiOpen}
        >
          ☺
        </button>
        {emojiOpen && (
          <div className="emoji-picker">
            <EmojiPicker
              theme={darkMode ? Theme.DARK : Theme.LIGHT}
              width="100%"
              height={360}
              emojiStyle={EmojiStyle.NATIVE}
              lazyLoadEmojis
              searchPlaceholder="Найти эмодзи"
              previewConfig={{
                defaultEmoji: "😊",
                defaultCaption: "Выберите эмодзи",
                showPreview: true,
              }}
              onEmojiClick={({ emoji }) => {
                onDraftChange(draft + emoji);
                setEmojiOpen(false);
              }}
            />
          </div>
        )}
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Введите сообщение"
          rows={1}
          maxLength={messenger === "telegram" ? 4096 : 20000}
          aria-label="Сообщение"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Отправить"
        >
          ➤
        </button>
      </form>
    </>
  );
}
