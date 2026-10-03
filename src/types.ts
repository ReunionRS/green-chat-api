export type Credentials = { idInstance: string; apiTokenInstance: string };
export type Messenger = "telegram" | "whatsapp";
export type MessengerConnection = Credentials & { messenger: Messenger };
export type View = "empty" | "new" | "chat";
export type Chat = {
  chatId: string;
  name: string;
  username?: string;
  phoneNumber?: number;
  avatarUrl?: string;
  lastSeen?: string | number | null;
};
export type Message = {
  id: string;
  text: string;
  direction: "incoming" | "outgoing";
  time: Date;
};
