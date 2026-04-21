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

/**
 * Chat-room WebSocket hook. The socket (re)connects only when
 * `requestId` changes. Event callbacks are read from a ref, so parents
 * that recreate their handlers on every render no longer force a
 * reconnection and messages between renders are not lost.
 */
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
  const cancelledRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  const handlersRef = useRef({ onNewMessage, onTyping, onUserOnline, onRoomState });
  useEffect(() => {
    handlersRef.current = { onNewMessage, onTyping, onUserOnline, onRoomState };
  }, [onNewMessage, onTyping, onUserOnline, onRoomState]);

  useEffect(() => {
    if (!requestId) return;
    cancelledRef.current = false;

    const connect = () => {
      if (cancelledRef.current) return;
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
        if (cancelledRef.current) return;
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
          const h = handlersRef.current;
          switch (parsed.event) {
            case 'new_message':
              h.onNewMessage?.(parsed.data as unknown as ChatMessage);
              break;
            case 'typing':
              h.onTyping?.(parsed.data as unknown as TypingUser);
              break;
            case 'user_online':
              h.onUserOnline?.(parsed.data as unknown as { user_id: string; name: string; online: boolean });
              break;
            case 'room_state':
              h.onRoomState?.(parsed.data as unknown as { online_users: { user_id: string; name: string; online: boolean }[] });
              break;
          }
        } catch {
          // ignore malformed messages
        }
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [requestId]);

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
