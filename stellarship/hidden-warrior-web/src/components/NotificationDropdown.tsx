'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Shield, Award, Bell, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/types/notification';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAsRead, deleteNotification } = useNotifications();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'weekly_results':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'guild':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-orange-400" />;
      case 'system':
        return <Bell className="w-4 h-4 text-gray-400" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 mt-2 w-96 bg-console-bg-dark border-2 border-console-gold shadow-2xl z-50"
      style={{ maxHeight: '500px' }}
    >
      {/* Header */}
      <div className="p-4 border-b-2 border-console-gold flex items-center justify-between">
        <h3 className="text-lg font-departure text-console-gold uppercase">NOTIFICATIONS</h3>
        <button
          onClick={onClose}
          className="text-console-text hover:text-console-gold transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-console-text-secondary opacity-50" />
            <p className="text-console-text-secondary font-departure">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-console-bg hover:bg-console-bg-dark cursor-pointer transition-colors ${
                !notification.read ? 'bg-console-bg-dark/50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-departure text-console-gold line-clamp-1">
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-console-text-secondary mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-console-text-secondary mt-2">
                    {formatTimestamp(notification.createdAt)}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDelete(e, notification.id)}
                  className="flex-shrink-0 text-console-text-secondary hover:text-console-error transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 5 && (
        <div className="p-3 border-t border-console-bg text-center">
          <button
            onClick={onClose}
            className="text-sm text-console-cyan hover:text-console-gold font-departure transition-colors"
          >
            View All ({notifications.length})
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default NotificationDropdown;

