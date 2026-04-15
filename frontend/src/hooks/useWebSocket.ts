import { useEffect, useRef, useCallback, useState } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import type { WsEvent, TypingUser, ChatMessage } from '../types';

interface UseWebSocketOptions {
  requestId: string | undefined;
  onNewMessage?: (msg: ChatMessage) => void;
  onTyping?: (data: TypingUser) => void;
  onUserOnline?: (data: { user_id: string; name: string; online: boolean }) => void;
  onRoomState?: (data: { online_users: { user_id: string; name: string; online: boolean }[] }) => void;
}

export function useWebSocket({
  requestId,
  onNewMessage,
  onTyping,
  onUserOnline,
  onRoomState,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelay = useRef(1000);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!requestId) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/v1/ws/${requestId}?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelay.current = 1000;
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const parsed: WsEvent = JSON.parse(event.data);
        switch (parsed.event) {
          case 'new_message':
            onNewMessage?.(parsed.data as unknown as ChatMessage);
            break;
          case 'typing':
            onTyping?.(parsed.data as unknown as TypingUser);
            break;
          case 'user_online':
            onUserOnline?.(parsed.data as unknown as { user_id: string; name: string; online: boolean });
            break;
          case 'room_state':
            onRoomState?.(parsed.data as unknown as { online_users: { user_id: string; name: string; online: boolean }[] });
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };
  }, [requestId, onNewMessage, onTyping, onUserOnline, onRoomState]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    sendEvent('typing', { is_typing: isTyping });
  }, [sendEvent]);

  const sendMessage = useCallback((content: string) => {
    sendEvent('send_message', { content });
  }, [sendEvent]);

  return { isConnected, sendEvent, sendTyping, sendMessage };
}
