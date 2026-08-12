import { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('azurestaticapps.net') || window.location.hostname.includes('green-dune')) {
      return 'https://gtm-backend1-hmgygeahadebdyc7.canadacentral-01.azurewebsites.net';
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

const API_BASE = getBaseUrl();

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/unread-count`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll every 30 seconds for unread count
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch full notifications when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications(notifications.map(n => 
          n.notification_id === id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/mark-all-read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getTypeStyles = (type: string, isRead: boolean) => {
    const base = isRead ? 'opacity-70' : 'bg-primary/5';
    switch (type) {
      case 'success': return `${base} border-l-4 border-green-500`;
      case 'warning': return `${base} border-l-4 border-yellow-500`;
      case 'error': return `${base} border-l-4 border-red-500`;
      default: return `${base} border-l-4 border-primary`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No notifications right now.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.notification_id} 
                    className={`p-4 transition-colors hover:bg-gray-50 ${getTypeStyles(notif.type, notif.is_read)}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${notif.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notif.title}
                        </h4>
                        <p className={`text-sm mt-1 ${notif.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-2 block">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      {!notif.is_read && (
                        <button 
                          onClick={() => markAsRead(notif.notification_id)}
                          className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-center">
            <span className="text-xs text-gray-400 font-medium">Auto-updates every 30s</span>
          </div>
        </div>
      )}
    </div>
  );
}
