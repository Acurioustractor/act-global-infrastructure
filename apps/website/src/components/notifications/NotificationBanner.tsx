'use client';

import { useState, useEffect } from 'react';
import { X, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  priority: string;
  created_at: string;
}

interface NotificationSummary {
  unread_count: number;
  urgent_count: number;
  high_count: number;
  review_due_count: number;
  high_confidence_count: number;
  latest_unread_at: string | null;
}

export function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch notifications on mount and every 5 minutes
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setSummary(data.summary || null);

        // Reset dismissed state if there are new urgent notifications
        if (data.summary?.urgent_count > 0) {
          setIsDismissed(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Update summary
        if (summary) {
          setSummary({
            ...summary,
            unread_count: summary.unread_count - 1,
          });
        }
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (response.ok) {
        setNotifications([]);
        setSummary(null);
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  function getNotificationIcon(type: string, priority: string) {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (type === 'high_confidence') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Info className="w-5 h-5 text-blue-500" />;
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'normal':
        return 'bg-blue-50 border-blue-200';
      case 'low':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Don't show if no notifications or dismissed
  if (!summary || summary.unread_count === 0 || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Summary Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <Bell className="w-6 h-6 text-blue-600" />
              {summary.unread_count > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {summary.unread_count > 9 ? '9+' : summary.unread_count}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {summary.unread_count} notification{summary.unread_count !== 1 ? 's' : ''}
                {summary.urgent_count > 0 && (
                  <span className="ml-2 text-red-600">
                    ({summary.urgent_count} urgent)
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {summary.review_due_count > 0 && `${summary.review_due_count} pages due for review`}
                {summary.review_due_count > 0 && summary.high_confidence_count > 0 && ' • '}
                {summary.high_confidence_count > 0 && `${summary.high_confidence_count} high-confidence extractions`}
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {isExpanded ? '▲' : '▼'}
            </div>
          </button>

          <div className="flex items-center gap-2 ml-4">
            {summary.unread_count > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setIsDismissed(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Dismiss notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expanded Notification List */}
        {isExpanded && (
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`border rounded-lg p-3 ${getPriorityColor(notification.priority)}`}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type, notification.priority)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mt-1">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => markAsRead(notification.id)}
                        >
                          View →
                        </Link>
                      )}
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
