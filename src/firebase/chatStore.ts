import { signInAnonymously } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import type { Chat, Message, MessengerConnection } from "../types";
import {
  decryptMessageText,
  encryptMessageText,
  type EncryptedMessage,
} from "../crypto/messageCrypto";
import { auth, db } from "./firebaseconfig";

const safeId = (value: string) => encodeURIComponent(value);
const withoutUndefined = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
const userId = () => {
  if (!auth.currentUser) throw new Error("Firebase user is not authenticated");
  return auth.currentUser.uid;
};

export async function ensureFirebaseSession() {
  if (!auth.currentUser) await signInAnonymously(auth);
}

export function watchConnections(
  onChange: (connections: MessengerConnection[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "users", userId(), "connections"),
    (snapshot) => {
      const unique = new Map<string, MessengerConnection>();
      snapshot.docs
        .sort((left, right) => {
          const leftValue = left.data() as MessengerConnection;
          const rightValue = right.data() as MessengerConnection;
          const leftCanonical = left.id === safeId(`${leftValue.messenger}:${leftValue.idInstance}`);
          const rightCanonical = right.id === safeId(`${rightValue.messenger}:${rightValue.idInstance}`);
          return Number(leftCanonical) - Number(rightCanonical);
        })
        .forEach((item) => {
        const connection = item.data() as MessengerConnection;
        unique.set(connection.idInstance, connection);
        });
      onChange([...unique.values()]);
    },
    onError,
  );
}

export async function saveConnection(connection: MessengerConnection) {
  await setDoc(
    doc(
      db,
      "users",
      userId(),
      "connections",
      safeId(`${connection.messenger}:${connection.idInstance}`),
    ),
    connection,
  );
  await deleteDoc(
    doc(db, "users", userId(), "connections", connection.idInstance),
  ).catch(() => {});
}

export async function deleteConnection(connection: MessengerConnection) {
  const connectionsRef = collection(db, "users", userId(), "connections");
  const matches = await getDocs(
    query(connectionsRef, where("idInstance", "==", connection.idInstance)),
  );
  const batch = writeBatch(db);
  matches.docs.forEach((item) => batch.delete(item.ref));
  // These explicit paths also cover malformed legacy documents whose fields
  // cannot be found by the query.
  batch.delete(
    doc(connectionsRef, safeId(`${connection.messenger}:${connection.idInstance}`)),
  );
  batch.delete(doc(connectionsRef, connection.idInstance));
  await batch.commit();
}

export function watchChats(
  instanceId: string,
  onChange: (chats: Chat[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "users", userId(), "instances", instanceId, "chats"),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => item.data() as Chat));
    },
    onError,
  );
}

export function watchMessages(
  instanceId: string,
  chatId: string,
  encryptionSecret: string,
  onChange: (messages: Message[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const messagesQuery = query(
    collection(
      db,
      "users",
      userId(),
      "instances",
      instanceId,
      "chats",
      safeId(chatId),
      "messages",
    ),
    orderBy("time", "asc"),
  );
  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      void Promise.all(
        snapshot.docs.map(async (item) => {
          const value = item.data() as Omit<Message, "time"> &
            Partial<EncryptedMessage> & { time: Timestamp };
          const text =
            value.version === 1 && value.ciphertext && value.iv
              ? await decryptMessageText(
                  { version: 1, ciphertext: value.ciphertext, iv: value.iv },
                  encryptionSecret,
                  instanceId,
                  chatId,
                  value.id,
                )
              : value.text;
          const message = {
            id: value.id,
            direction: value.direction,
            text: text ?? "",
            time: value.time.toDate(),
          } satisfies Message;
          if (value.version !== 1 && message.text) {
            void saveMessage(
              instanceId,
              chatId,
              message,
              encryptionSecret,
            ).catch(onError);
          }
          return message;
        }),
      ).then(onChange, onError);
    },
    onError,
  );
}

export async function saveChats(instanceId: string, chats: Chat[]) {
  for (let offset = 0; offset < chats.length; offset += 400) {
    const batch = writeBatch(db);
    for (const chat of chats.slice(offset, offset + 400)) {
      batch.set(
        doc(
          db,
          "users",
          userId(),
          "instances",
          instanceId,
          "chats",
          safeId(chat.chatId),
        ),
        withoutUndefined(chat),
        { merge: true },
      );
    }
    await batch.commit();
  }
}

export function saveChat(instanceId: string, chat: Chat) {
  return setDoc(
    doc(
      db,
      "users",
      userId(),
      "instances",
      instanceId,
      "chats",
      safeId(chat.chatId),
    ),
    withoutUndefined(chat),
    { merge: true },
  );
}

export function saveMessage(
  instanceId: string,
  chatId: string,
  message: Message,
  encryptionSecret: string,
) {
  return encryptMessageText(
    message.text,
    encryptionSecret,
    instanceId,
    chatId,
    message.id,
  ).then((encrypted) => setDoc(
    doc(
      db,
      "users",
      userId(),
      "instances",
      instanceId,
      "chats",
      safeId(chatId),
      "messages",
      safeId(message.id),
    ),
    {
      id: message.id,
      direction: message.direction,
      time: Timestamp.fromDate(message.time),
      ...encrypted,
    },
  ));
}
