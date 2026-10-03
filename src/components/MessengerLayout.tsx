import type { FormEvent, RefObject } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { DialogPanel } from "./DialogPanel";
import { EmptyPanel } from "./EmptyPanel";
import { NewChatPanel } from "./NewChatPanel";
import type {
  Chat,
  Message,
  Messenger,
  MessengerConnection,
  View,
} from "../types";

type Props = {
  messenger: Messenger;
  credentials: { idInstance: string };
  connections: MessengerConnection[];
  chatsLoading: boolean;
  selectedChat: Chat | null;
  messages: Record<string, Message[]>;
  visibleChats: Chat[];
  search: string;
  darkMode: boolean;
  view: View;
  recipient: string;
  connecting: boolean;
  error: string;
  draft: string;
  sending: boolean;
  currentMessages: Message[];
  bottomRef: RefObject<HTMLDivElement | null>;
  onToggleTheme: () => void;
  onSearch: (value: string) => void;
  onConnectionSelect: (connection: MessengerConnection) => void;
  onConnectionDelete: (connection: MessengerConnection) => void;
  onAddConnection: () => void;
  onNewChat: () => void;
  onSelect: (chat: Chat) => void;
  onLogout: () => void;
  onBack: () => void;
  onRecipientChange: (value: string) => void;
  onDraftChange: (value: string) => void;
  onSubmitChat: (event: FormEvent) => void;
  onSubmitMessage: (event: FormEvent) => void;
};

export function MessengerLayout({
  messenger,
  credentials,
  connections,
  chatsLoading,
  selectedChat,
  messages,
  visibleChats,
  search,
  darkMode,
  view,
  recipient,
  connecting,
  error,
  draft,
  sending,
  currentMessages,
  bottomRef,
  onToggleTheme,
  onSearch,
  onConnectionSelect,
  onConnectionDelete,
  onAddConnection,
  onNewChat,
  onSelect,
  onLogout,
  onBack,
  onRecipientChange,
  onDraftChange,
  onSubmitChat,
  onSubmitMessage,
}: Props) {
  return (
    <main className="messenger-page">
      <div className="messenger-window">
        <div className={`messenger-layout view-${view}`}>
          <ChatSidebar
            messenger={messenger}
            activeInstance={credentials.idInstance}
            connections={connections}
            chats={visibleChats}
            chatsLoading={chatsLoading}
            selectedChat={selectedChat}
            messages={messages}
            search={search}
            darkMode={darkMode}
            onToggleTheme={onToggleTheme}
            onSearch={onSearch}
            onConnectionSelect={onConnectionSelect}
            onConnectionDelete={onConnectionDelete}
            onAddConnection={onAddConnection}
            onNewChat={onNewChat}
            onSelect={onSelect}
            onLogout={onLogout}
          />
          <section className="content-panel">
            {view === "new" && (
              <NewChatPanel
                messenger={messenger}
                recipient={recipient}
                connecting={connecting}
                error={error}
                onRecipientChange={onRecipientChange}
                onSubmit={onSubmitChat}
              />
            )}
            {view === "empty" && (
              <EmptyPanel messenger={messenger} onNewChat={onNewChat} />
            )}
            {view === "chat" && selectedChat && (
              <DialogPanel
                messenger={messenger}
                darkMode={darkMode}
                chat={selectedChat}
                messages={currentMessages}
                draft={draft}
                sending={sending}
                error={error}
                bottomRef={bottomRef}
                onBack={onBack}
                onDraftChange={onDraftChange}
                onSubmit={onSubmitMessage}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
