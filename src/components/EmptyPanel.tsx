import type { Messenger } from "../types";

export function EmptyPanel({
  messenger,
  onNewChat,
}: {
  messenger: Messenger;
  onNewChat: () => void;
}) {
  return (
    <div className="empty-chat">
      <div className="bubbles" aria-hidden="true">
        ▰ ◰
      </div>
      <h1>
        Выберите чат
        <br />
        или создайте новый
      </h1>
      <p>
        Отправляйте и получайте текстовые сообщения
        <br />
        через GREEN-API и {messenger === "telegram" ? "Telegram" : "WhatsApp"}
      </p>
      <button className="blue-button" onClick={onNewChat}>
        ＋ Новый чат
      </button>
    </div>
  );
}
