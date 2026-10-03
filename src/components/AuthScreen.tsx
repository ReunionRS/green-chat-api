import { useState } from "react";
import type { FormEvent } from "react";
import telegramLogo from "../assets/Telegram_2019_Logo.svg.webp";
import whatsappLogo from "../assets/WhatsApp_logo-color-vertical.svg.webp";
import type { Messenger, MessengerConnection } from "../types";

type Props = {
  messenger: Messenger;
  idInstance: string;
  apiToken: string;
  connecting: boolean;
  error: string;
  connections: MessengerConnection[];
  onConnectionSelect: (connection: MessengerConnection) => void;
  onConnectionDelete: (connection: MessengerConnection) => void;
  onMessengerChange: (messenger: Messenger) => void;
  onIdChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function AuthScreen({
  messenger,
  idInstance,
  apiToken,
  connecting,
  error,
  connections,
  onConnectionSelect,
  onConnectionDelete,
  onMessengerChange,
  onIdChange,
  onTokenChange,
  onSubmit,
}: Props) {
  const [showToken, setShowToken] = useState(false);
  const serviceName = messenger === "telegram" ? "Telegram" : "WhatsApp";
  return (
    <main className="auth-page">
      <div className="auth-window">
        <section className={`auth-card ${messenger}`}>
          <h1>Вход в мессенджер</h1>
          <p>
            Выберите мессенджер и введите данные
            <br />
            соответствующего инстанса GREEN-API
          </p>
          {connections.length > 0 && (
            <div className="saved-connections">
              <span>Сохранённые подключения</span>
              {connections.map((connection) => (
                <div
                  key={`${connection.messenger}-${connection.idInstance}`}
                  className="saved-connection"
                >
                  <button
                    type="button"
                    className="saved-connection-select"
                    onClick={() => onConnectionSelect(connection)}
                  >
                    <img
                      src={
                        connection.messenger === "telegram"
                          ? telegramLogo
                          : whatsappLogo
                      }
                      alt=""
                    />
                    <span>
                      <strong>
                        {connection.messenger === "telegram"
                          ? "Telegram"
                          : "WhatsApp"}
                      </strong>
                      <small>Инстанс {connection.idInstance}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="saved-connection-delete"
                    onClick={() => onConnectionDelete(connection)}
                    aria-label={`Удалить подключение ${connection.idInstance}`}
                    title="Удалить подключение"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={onSubmit} className="auth-form">
            <div
              className="messenger-switch"
              role="group"
              aria-label="Выбор мессенджера"
            >
              <button
                type="button"
                className={messenger === "telegram" ? "active" : ""}
                onClick={() => onMessengerChange("telegram")}
              >
                <img src={telegramLogo} alt="" /> Telegram
              </button>
              <button
                type="button"
                className={messenger === "whatsapp" ? "active" : ""}
                onClick={() => onMessengerChange("whatsapp")}
              >
                <img src={whatsappLogo} alt="" /> WhatsApp
              </button>
            </div>
            <label>
              idInstance для {serviceName}
              <input
                value={idInstance}
                onChange={(event) => onIdChange(event.target.value)}
                placeholder={`Введите idInstance ${serviceName}`}
                inputMode="numeric"
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            <label>
              apiTokenInstance для {serviceName}
              <div className="token-field">
                <input
                  value={apiToken}
                  onChange={(event) => onTokenChange(event.target.value)}
                  placeholder={`Введите токен ${serviceName}`}
                  type={showToken ? "text" : "password"}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken((value) => !value)}
                  aria-label={showToken ? "Скрыть токен" : "Показать токен"}
                >
                  {showToken ? "●" : "◉"}
                </button>
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="blue-button" disabled={connecting}>
              {connecting ? "Проверяем…" : "Войти"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
