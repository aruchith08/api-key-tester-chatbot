import React from 'react';
import { useAppStore } from '../store/appStore';
import { useChat } from '../hooks/useChat';
import { HomeScreen } from '../components/Home/HomeScreen';
import { ChatConversation } from '../components/Chat/ChatConversation';

export const ChatPage: React.FC = () => {
  const { messages } = useAppStore();
  const { sendMessage, regenerate } = useChat();

  const isConversationActive = messages.length > 0;

  return (
    <div className="w-full min-h-screen bg-[#08080A]">
      {!isConversationActive ? (
        <HomeScreen onSendMessage={sendMessage} />
      ) : (
        <ChatConversation onSendMessage={sendMessage} onRegenerate={regenerate} />
      )}
    </div>
  );
};

export default ChatPage;
