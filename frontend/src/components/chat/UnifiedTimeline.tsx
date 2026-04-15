import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2, ArrowDown, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { useMessageStore } from '../../store/messageStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import OnlineUsers from './OnlineUsers';
import type { ChatMessage, TypingUser } from '../../types';

interface Props {
  requestId: string;
}

export default function UnifiedTimeline({ requestId }: Props) {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    typingUsers,
    onlineUsers,
    fetchMessages,
    addMessage,
    setTyping,
    setUserOnline,
    setOnlineUsers,
    clearMessages,
  } = useMessageStore();

  const [isSending, setIsSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const handleNewMessage = useCallback(
    (msg: ChatMessage) => {
      addMessage(msg);
    },
    [addMessage],
  );

  const handleTyping = useCallback(
    (data: TypingUser) => {
      setTyping(data);
    },
    [setTyping],
  );

  const handleUserOnline = useCallback(
    (data: { user_id: string; name: string; online: boolean }) => {
      setUserOnline(data);
    },
    [setUserOnline],
  );

  const handleRoomState = useCallback(
    (data: { online_users: { user_id: string; name: string; online: boolean }[] }) => {
      setOnlineUsers(data.online_users);
    },
    [setOnlineUsers],
  );

  const { isConnected, sendTyping } = useWebSocket({
    requestId,
    onNewMessage: handleNewMessage,
    onTyping: handleTyping,
    onUserOnline: handleUserOnline,
    onRoomState: handleRoomState,
  });

  useEffect(() => {
    fetchMessages(requestId);
    return () => clearMessages();
  }, [requestId, fetchMessages, clearMessages]);

  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    isAtBottom.current = atBottom;
    setShowScrollBtn(!atBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = useCallback(
    async (content: string) => {
      setIsSending(true);
      try {
        const { sendMessage } = useMessageStore.getState();
        await sendMessage(requestId, content);
      } catch {
        // error is set in the store
      }
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    },
    [requestId],
  );

  const handleTypingInput = useCallback(
    (typing: boolean) => {
      sendTyping(typing);
    },
    [sendTyping],
  );

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <OnlineUsers users={onlineUsers} />
        <div className="flex items-center gap-1.5 text-xs">
          {isConnected ? (
            <>
              <Wifi size={12} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Live</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-gray-400" />
              <span className="text-gray-400">Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[300px] max-h-[500px] relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <MessageSquare size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation by sending a message below</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender?.id === user?.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump to latest */}
      {showScrollBtn && (
        <div className="flex justify-center -mt-10 mb-2 relative z-10">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-600 text-white text-xs font-medium shadow-lg hover:bg-teal-700 transition-colors"
          >
            <ArrowDown size={12} />
            Jump to latest
          </button>
        </div>
      )}

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTyping={handleTypingInput}
        isSending={isSending}
        disabled={false}
      />
    </div>
  );
}
