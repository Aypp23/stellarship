import { useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Notification } from '@/types/notification';

interface UseNotificationSocketProps {
  socket: Socket | null;
  onNewNotification: (notification: Notification) => void;
  userId: number | undefined;
}

const useNotificationSocket = ({ socket, onNewNotification, userId }: UseNotificationSocketProps) => {
  useEffect(() => {
    if (!socket || !userId) return;

    console.log('[NotificationSocket] Setting up notification listeners');

    // Subscribe to notifications for this user
    socket.emit('notification:subscribe', { userId });

    // Listen for new notifications
    socket.on('notification:new', (notification: Notification) => {
      console.log('[NotificationSocket] New notification received:', notification);
      onNewNotification(notification);
    });

    // Listen for notification updates (marked as read, etc.)
    socket.on('notification:updated', (notification: Notification) => {
      console.log('[NotificationSocket] Notification updated:', notification);
      onNewNotification(notification);
    });

    return () => {
      console.log('[NotificationSocket] Cleaning up notification listeners');
      socket.emit('notification:unsubscribe', { userId });
      socket.off('notification:new');
      socket.off('notification:updated');
    };
  }, [socket, userId, onNewNotification]);
};

export default useNotificationSocket;

