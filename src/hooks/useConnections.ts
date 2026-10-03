import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ensureFirebaseSession, watchConnections } from "../firebase/chatStore";
import type {
  Chat,
  Credentials,
  Message,
  Messenger,
  MessengerConnection,
  View,
} from "../types";

type Options = {
  initial: MessengerConnection[];
  setCredentials: Dispatch<SetStateAction<Credentials | null>>;
  setMessenger: Dispatch<SetStateAction<Messenger>>;
  setIdInstance: Dispatch<SetStateAction<string>>;
  setApiToken: Dispatch<SetStateAction<string>>;
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setChatsLoading: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setSelectedChat: Dispatch<SetStateAction<Chat | null>>;
  setView: Dispatch<SetStateAction<View>>;
  setError: (message: string) => void;
};

export function useConnections({
  initial,
  setCredentials,
  setMessenger,
  setIdInstance,
  setApiToken,
  setChats,
  setChatsLoading,
  setMessages,
  setSelectedChat,
  setView,
  setError,
}: Options) {
  const [connections, setConnections] =
    useState<MessengerConnection[]>(initial);

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;
    ensureFirebaseSession()
      .then(() => {
        if (!active) return;
        unsubscribe = watchConnections(
          setConnections,
          () =>
            active && setError("Не удалось загрузить подключения из Firebase"),
        );
      })
      .catch(() => setError("Не удалось войти в Firebase"));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setError]);

  const activateConnection = (connection: MessengerConnection) => {
    sessionStorage.setItem("green-chat-session", JSON.stringify(connection));
    setMessenger(connection.messenger);
    setIdInstance(connection.idInstance);
    setApiToken(connection.apiTokenInstance);
    setCredentials({
      idInstance: connection.idInstance,
      apiTokenInstance: connection.apiTokenInstance,
    });
    setChats([]);
    setChatsLoading(true);
    setMessages({});
    setSelectedChat(null);
    setView("empty");
    setError("");
  };

  return { connections, setConnections, activateConnection };
}
