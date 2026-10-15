import React, { useEffect } from 'react';
import { ChatPage } from './pages/ChatPage';
import { DualPage } from './pages/DualPage';
import { AddApiKeyModal } from './components/API/AddApiKeyModal';
import { StoredKeysModal } from './components/API/StoredKeysModal';
import { ModelSelector } from './components/Chat/ModelSelector';
import { DeveloperMode } from './components/Developer/DeveloperMode';
import { AboutModal } from './components/About/AboutModal';
import { FilePreviewDrawer } from './components/Chat/FilePreviewDrawer';
import { useAppStore } from './store/appStore';
import { AlertCircle } from 'lucide-react';

export function App() {
  const { activeChatTab, setActiveChatTab, notification, clearNotification } = useAppStore();

  useEffect(() => {
    const handlePopState = () => {
      const isDual = typeof window !== 'undefined' && window.location.pathname.startsWith('/dual');
      setActiveChatTab(isDual ? 'dual' : 'chat');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveChatTab]);

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

      {/* Dedicated Page Router: ChatPage (/) vs DualPage (/dual) */}
      <div key={activeChatTab} className="min-h-screen w-full animate-fade-in">
        {activeChatTab === 'dual' ? <DualPage /> : <ChatPage />}
      </div>

      {/* Modals & Drawers */}
      <AddApiKeyModal />
      <StoredKeysModal />
      <ModelSelector />
      <DeveloperMode />
      <AboutModal />
      <FilePreviewDrawer />
    </div>
  );
}

export default App;
