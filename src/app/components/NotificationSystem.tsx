import { useState, useEffect, useRef } from "react";
import { Bell, X, AlertTriangle, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { ref, onValue, update, remove } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

interface Notification {
  id: string;
  type: "sos_alert" | "session_ended" | "chat_message";
  title: string;
  message: string;
  timestamp: number;
  sessionId?: string;
  read: boolean;
}

export default function NotificationSystem() {
  const auth = getAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Create audio element for notification sound
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT");
    
    const notificationsRef = ref(database, `notifications/${auth.currentUser.uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationsList = Object.entries(data).map(([id, notification]: [string, any]) => ({
          id,
          ...notification
        })) as Notification[];

        // Sort by timestamp (newest first)
        notificationsList.sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationsList);
        
        // Count unread notifications
        const unread = notificationsList.filter(n => !n.read).length;
        setUnreadCount(unread);

        // Play sound for new notifications
        if (unread > 0 && audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const markAsRead = async (notificationId: string) => {
    // Update notification as read in Firebase
    const notificationRef = ref(database, `notifications/${auth.currentUser?.uid}/${notificationId}`);
    await update(notificationRef, { read: true });
  };

  const markAllAsRead = async () => {
    // Mark all notifications as read
    const updates: any = {};
    notifications.forEach(notification => {
      if (!notification.read) {
        updates[`notifications/${auth.currentUser?.uid}/${notification.id}/read`] = true;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  };

  const clearAllNotifications = async () => {
    // Clear all notifications
    await remove(ref(database, `notifications/${auth.currentUser?.uid}`));
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'session_ended':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'chat_message':
        return <Bell className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return 'border-red-200 bg-red-50';
      case 'session_ended':
        return 'border-blue-200 bg-blue-50';
      case 'chat_message':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
          <Card className="border-0 rounded-none">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                          !notification.read ? 'font-semibold' : ''
                        } ${getNotificationColor(notification.type)}`}
                        onClick={() => {
                          markAsRead(notification.id);
                          // Handle navigation based on notification type
                          if (notification.sessionId && notification.type === 'sos_alert') {
                            // Navigate to session
                            window.location.hash = `/police-dashboard?session=${notification.sessionId}`;
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
