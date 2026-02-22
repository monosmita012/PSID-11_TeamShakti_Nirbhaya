import { ref, set, onValue, get } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

export class NotificationService {
  private static instance: NotificationService;
  private auth = getAuth();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async createSOSNotification(sessionId: string, victimId: string, location?: any) {
    try {
      // Get all police users
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();

      if (users) {
        Object.entries(users).forEach(([uid, user]: [string, any]) => {
          if (user.role === 'police') {
            // Create notification for each police officer
            const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const notificationRef = ref(database, `notifications/${uid}/${notificationId}`);
            
            set(notificationRef, {
              id: notificationId,
              type: 'sos_alert',
              title: '🚨 New SOS Alert',
              message: `Emergency alert from victim ${victimId.slice(-8)}${location ? ` at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : ''}`,
              timestamp: Date.now(),
              sessionId: sessionId,
              read: false
            });
          }
        });
      }
    } catch (error) {
      console.error('Error creating SOS notification:', error);
    }
  }

  async createSessionEndedNotification(sessionId: string, victimId: string) {
    try {
      // Get all police users
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();

      if (users) {
        Object.entries(users).forEach(([uid, user]: [string, any]) => {
          if (user.role === 'police') {
            // Create notification for each police officer
            const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const notificationRef = ref(database, `notifications/${uid}/${notificationId}`);
            
            set(notificationRef, {
              id: notificationId,
              type: 'session_ended',
              title: '✅ Session Ended',
              message: `Emergency session ${sessionId.slice(-8)} has been ended`,
              timestamp: Date.now(),
              sessionId: sessionId,
              read: false
            });
          }
        });
      }
    } catch (error) {
      console.error('Error creating session ended notification:', error);
    }
  }

  async createChatNotification(sessionId: string, senderId: string, senderName: string, message: string) {
    try {
      // Get all police users (except the sender if they're police)
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();

      if (users) {
        Object.entries(users).forEach(([uid, user]: [string, any]) => {
          if (user.role === 'police' && uid !== senderId) {
            // Create notification for each police officer (except sender)
            const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const notificationRef = ref(database, `notifications/${uid}/${notificationId}`);
            
            set(notificationRef, {
              id: notificationId,
              type: 'chat_message',
              title: '💬 New Message',
              message: `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
              timestamp: Date.now(),
              sessionId: sessionId,
              read: false
            });
          }
        });
      }
    } catch (error) {
      console.error('Error creating chat notification:', error);
    }
  }

  // Listen for new SOS sessions and create notifications
  startSOSListener() {
    const sessionsRef = ref(database, 'sessions');
    
    onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([sessionId, session]: [string, any]) => {
          // Check if this is a new active session (created in the last 5 seconds)
          if (session.status === 'active' && 
              session.timestamp && 
              Date.now() - session.timestamp < 5000) {
            this.createSOSNotification(sessionId, session.victimId, session.location);
          }
          
          // Check if session just ended
          if (session.status === 'ended' && 
              session.endedAt && 
              Date.now() - session.endedAt < 5000) {
            this.createSessionEndedNotification(sessionId, session.victimId);
          }
        });
      }
    });
  }

  // Listen for new chat messages and create notifications
  startChatListener() {
    const chatsRef = ref(database, 'chats');
    
    onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([sessionId, messages]: [string, any]) => {
          if (messages) {
            Object.entries(messages).forEach(([messageId, message]: [string, any]) => {
              // Check if this is a new message (created in the last 5 seconds)
              if (message.timestamp && 
                  Date.now() - message.timestamp < 5000 &&
                  message.senderId !== this.auth.currentUser?.uid) {
                this.createChatNotification(
                  sessionId, 
                  message.senderId, 
                  message.senderName, 
                  message.text
                );
              }
            });
          }
        });
      }
    });
  }

  initialize() {
    this.startSOSListener();
    this.startChatListener();
  }
}
