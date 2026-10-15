import React from 'react';
import { DualChatWorkspace } from '../components/DualChat/DualChatWorkspace';

export const DualPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-[#08080A]">
      <DualChatWorkspace />
    </div>
  );
};

export default DualPage;
