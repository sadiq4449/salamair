import { useEffect, useRef, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import { useNotificationStore } from '../store/notificationStore';
import { useToastStore } from '../store/toastStore';
import type { NotificationItem } from '../types';

const HIGH_PRIORITY_TYPES = new Set([
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'SLA_BREACHED',
  'SLA_WARNING',
  'COUNTER_OFFERED',
]);

let notificationSound: HTMLAudioElement | null = null;
try {
  notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIo8TGfT0cN3qqzN+lUyAaf6HIz6FRIBt2ncjfqVYdGnOcyeGpVh0acpvK4qpXHRpxm8vjq1ceGnCay+OrVx4ab5rM5KtXHhpvmszlq1ceGm+azOWrVx4ab5rM5atXHhpvmszlq1ceAA==');
} catch {
  // Audio not supported
}

export function useNotificationSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelay = useRef(2000);
  const { addRealtimeNotification, preferences } = useNotificationStore();
  const { addToast } = useToastStore();

  const connect = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/v1/ws/notifications?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 2000;
    };

    ws.onclose = () => {
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
        const parsed = JSON.parse(event.data);
        if (parsed.event === 'notification') {
          const notif = parsed.data as NotificationItem;
          addRealtimeNotification(notif);

          if (HIGH_PRIORITY_TYPES.has(notif.type)) {
            addToast('info', notif.message);
          }

          if (preferences?.sound_enabled !== false && notificationSound) {
            notificationSound.play().catch(() => {});
          }
        }
      } catch {
        // ignore malformed messages
      }
    };
  }, [addRealtimeNotification, addToast, preferences?.sound_enabled]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
