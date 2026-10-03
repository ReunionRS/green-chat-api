import { AuthScreen } from "./components/AuthScreen";
import { MessengerLayout } from "./components/MessengerLayout";
import { useMessengerApp } from "./hooks/useMessengerApp";
import "./App.css";

function App() {
  const app = useMessengerApp();

  if (!app.credentials) {
    return (
      <AuthScreen
        messenger={app.messenger}
        idInstance={app.idInstance}
        apiToken={app.apiToken}
        connecting={app.connecting}
        error={app.error}
        connections={app.connections}
        onConnectionSelect={app.activateConnection}
        onConnectionDelete={(connection) => void app.removeConnection(connection)}
        onMessengerChange={(messenger) => {
          app.setMessenger(messenger);
          app.setError("");
        }}
        onIdChange={app.setIdInstance}
        onTokenChange={app.setApiToken}
        onSubmit={app.connect}
      />
    );
  }

  return (
    <MessengerLayout
      messenger={app.messenger}
      credentials={app.credentials}
      connections={app.connections}
      chatsLoading={app.chatsLoading}
      selectedChat={app.selectedChat}
      messages={app.messages}
      visibleChats={app.visibleChats}
      search={app.search}
      darkMode={app.darkMode}
      view={app.view}
      recipient={app.recipient}
      connecting={app.connecting}
      error={app.error}
      draft={app.draft}
      sending={app.sending}
      currentMessages={app.currentMessages}
      bottomRef={app.bottomRef}
      onToggleTheme={app.toggleTheme}
      onSearch={app.setSearch}
      onConnectionSelect={app.activateConnection}
      onConnectionDelete={(connection) => void app.removeConnection(connection)}
      onAddConnection={app.addConnection}
      onNewChat={app.newChat}
      onSelect={app.selectChat}
      onLogout={app.logout}
      onBack={app.back}
      onRecipientChange={app.setRecipient}
      onDraftChange={app.setDraft}
      onSubmitChat={app.openChat}
      onSubmitMessage={app.sendMessage}
    />
  );
}

export default App;
