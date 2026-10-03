import type { FormEvent } from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import labels from "react-phone-number-input/locale/ru";
import type { Messenger } from "../types";

type Props = {
  messenger: Messenger;
  recipient: string;
  connecting: boolean;
  error: string;
  onRecipientChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function NewChatPanel({
  messenger,
  recipient,
  connecting,
  error,
  onRecipientChange,
  onSubmit,
}: Props) {
  const telegram = messenger === "telegram";
  const phoneValue = recipient.trim();
  const country = phoneValue.startsWith("@")
    ? undefined
    : parsePhoneNumber(
        phoneValue.startsWith("+") ? phoneValue : `+${phoneValue}`,
      )?.country;
  const Flag = country ? flags[country] : undefined;
  const countryName = country ? labels[country] ?? country : "";
  return (
    <div className="new-chat-wrap">
        <form className="new-chat-card" onSubmit={onSubmit}>
          <div className="person-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20c.7-4.2 3.2-6.3 7.5-6.3s6.8 2.1 7.5 6.3" />
            </svg>
          </div>
          <h1>Создать новый чат</h1>
          <p>
            {telegram
              ? "Введите номер телефона получателя или публичный @username"
              : "Введите номер телефона получателя в международном формате"}
          </p>
          <label>
            {telegram ? "Телефон или @username" : "Номер телефона"}
            <span className="recipient-input">
              {Flag && (
                <span className="recipient-flag">
                  <Flag title={countryName} />
                </span>
              )}
              <input
                value={recipient}
                onChange={(event) => onRecipientChange(event.target.value)}
                placeholder={
                  telegram ? "79991234567 или @username" : "79991234567"
                }
                inputMode={phoneValue.startsWith("@") ? "text" : "tel"}
                required
                autoFocus
              />
            </span>
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="blue-button" disabled={connecting}>
            {connecting ? "Проверяем…" : "Создать чат"}
          </button>
          <small>
            {telegram
              ? "Например: +7 999 123-45-67 или @username"
              : "Например: +7 999 123-45-67"}
          </small>
        </form>
    </div>
  );
}
