import { useEffect, useRef } from 'react';
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
  'COUNTER_ACCEPTED',
  'COUNTER_REJECTED',
]);

let notificationSound: HTMLAudioElement | null = null;
try {
  notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIo8TGfT0cN3qqzN+lUyAaf6HIz6FRIBt2ncjfqVYdGnOcyeGpVh0acpvK4qpXHRpxm8vjq1ceGnCay+OrVx4ab5rM5KtXHhpvmszlq1ceGm+azOWrVx4ab5rM5atXHhpvmszlq1ceAA==');
} catch {
  // Audio not supported
}

/**
 * Keep a single WebSocket open for notifications across the life of the
 * component. We deliberately open the socket only once (per auth token)
 * and route incoming messages through a ref'd handler so callers can
 * change preferences / store actions without tearing down the socket.
 */
export function useNotificationSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelay = useRef(2000);
  const cancelledRef = useRef(false);

  const { addRealtimeNotification, preferences } = useNotificationStore();
  const { addToast } = useToastStore();

  // Stable handler that always reads the latest store values / prefs via a
  // ref, so re-renders never force a reconnect.
  const handlersRef = useRef({ addRealtimeNotification, addToast, soundEnabled: preferences?.sound_enabled });
  useEffect(() => {
    handlersRef.current = {
      addRealtimeNotification,
      addToast,
      soundEnabled: preferences?.sound_enabled,
    };
  }, [addRealtimeNotification, addToast, preferences?.sound_enabled]);

  useEffect(() => {
    cancelledRef.current = false;

    const connect = () => {
      if (cancelledRef.current) return;
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
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'notification') {
            const notif = parsed.data as NotificationItem;
            const h = handlersRef.current;
            h.addRealtimeNotification(notif);

            if (HIGH_PRIORITY_TYPES.has(notif.type)) {
              h.addToast('info', notif.message);
            }

            if (h.soundEnabled !== false && notificationSound) {
              notificationSound.play().catch(() => {});
            }
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
    // Intentionally empty: the socket lives as long as the component is
    // mounted. Handlers are refreshed via `handlersRef` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
