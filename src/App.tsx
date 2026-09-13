import React from 'react';
import { HomeScreen } from './components/Home/HomeScreen';
import { ChatConversation } from './components/Chat/ChatConversation';
import { AddApiKeyModal } from './components/API/AddApiKeyModal';
import { ModelSelector } from './components/Chat/ModelSelector';
import { DeveloperMode } from './components/Developer/DeveloperMode';
import { useAppStore } from './store/appStore';
import { useChat } from './hooks/useChat';
import { AlertCircle } from 'lucide-react';

export function App() {
  const { messages, notification, clearNotification } = useAppStore();
  const { sendMessage, regenerate } = useChat();

  const isConversationActive = messages.length > 0;

  return (
    <div className="relative min-h-screen bg-[#09090A] text-[#EDEDED] font-sans antialiased overflow-x-hidden">
      {/* Toast Notification */}
      {notification && (
        <div 
          onClick={clearNotification}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-[#18181B] text-neutral-200 border border-[#2B2B30] rounded-xl shadow-2xl text-xs sm:text-sm cursor-pointer hover:border-neutral-500 transition-all animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main View: Minimal Home or Active Conversation */}
      {!isConversationActive ? (
        <HomeScreen onSendMessage={sendMessage} />
      ) : (
        <ChatConversation onSendMessage={sendMessage} onRegenerate={regenerate} />
      )}

      {/* Modals & Drawers */}
      <AddApiKeyModal />
      <ModelSelector />
      <DeveloperMode />
    </div>
  );
}

export default App;
