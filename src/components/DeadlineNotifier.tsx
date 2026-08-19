import { useEffect } from 'react';
import { useAppStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { dispatchPushNotification, playChimeTone } from '../lib/pushNotifications';

export default function DeadlineNotifier() {
  const { currentUser, sessions, users, notifications, sendNotification } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    sessions: state.sessions,
    users: state.users,
    notifications: state.notifications,
    sendNotification: state.sendNotification,
  })));

  useEffect(() => {
    if (!currentUser || sessions.length === 0) return;

    const checkDeadlines = () => {
      const now = new Date();
      const oneDayInMs = 24 * 60 * 60 * 1000;

      sessions.forEach(session => {
        // Only remind for scheduled sessions where current user is the student or tutor
        if (session.status !== 'scheduled') return;
        if (session.studentId !== currentUser.id && session.tutorId !== currentUser.id) return;

        const sessionDate = new Date(session.scheduledTime);
        const diffMs = sessionDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        const isStudent = currentUser.id === session.studentId;
        const otherUser = users.find(u => u.id === (isStudent ? session.tutorId : session.studentId));
        const otherName = otherUser?.name || (isStudent ? 'Your Tutor' : 'Your Student');
        const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = sessionDate.toLocaleDateString();

        // 1. SPECIFIC 30-MINUTE CLASS ALERT
        if (diffMinutes > 0 && diffMinutes <= 30) {
          const alertStorageKey = `edutrack_alert_30m_${session.id}_${currentUser.id}`;
          const alreadySentInSession = typeof window !== 'undefined' && sessionStorage.getItem(alertStorageKey) === 'true';
          const hasNotified30m = alreadySentInSession || notifications.some(n =>
            n.userId === currentUser.id &&
            (n.title.includes('30 Minutes') || n.message.includes('30m')) &&
            n.message.includes(session.id)
          );

          if (!hasNotified30m) {
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(alertStorageKey, 'true');
              } catch (e) {}
            }

            // In-app notification
            sendNotification(
              currentUser.id,
              '⏰ Class Starting in 30 Minutes!',
              `[30m] Your scheduled tuition for ${session.subject} (Ref: ${session.id}) with ${otherName} starts at ${timeStr}. Please get prepared!`,
              'warning'
            );

            // Browser Web Push Notification
            dispatchPushNotification('⏰ EduTrack: Class in 30 Minutes!', {
              body: `Your scheduled ${session.subject} class with ${otherName} starts at ${timeStr}. Tap to join!`,
              tag: `class-30m-${session.id}`,
            });
          }
        }

        // 2. 1-HOUR AND 24-HOUR REMINDERS
        if (diffMs > 0 && diffMs <= oneDayInMs) {
          const hoursLeft = diffMs / (1000 * 60 * 60);
          
          let reminderType = '';
          if (hoursLeft <= 1 && hoursLeft > 0.5) {
            reminderType = '1h';
          } else if (hoursLeft <= 24 && hoursLeft > 1) {
            reminderType = '24h';
          }

          if (reminderType) {
            const hasNotified = notifications.some(n => 
              n.userId === currentUser.id &&
              n.title === 'Upcoming Session Reminder' && 
              n.message.includes(session.id) &&
              n.message.includes(reminderType)
            );

            if (!hasNotified) {
              const urgencyText = reminderType === '1h' ? 'Starts in less than 1 HOUR!' : 'Starts in less than 24 hours';
              
              sendNotification(
                currentUser.id,
                'Upcoming Session Reminder',
                `[${reminderType}] ${urgencyText} Your session for ${session.subject} (Ref: ${session.id}) is at ${timeStr} on ${dateStr}.`,
                reminderType === '1h' ? 'error' : 'warning'
              );

              if (reminderType === '1h') {
                dispatchPushNotification('🔔 EduTrack: Class Starting in 1 Hour', {
                  body: `Your session for ${session.subject} with ${otherName} starts at ${timeStr}.`,
                  tag: `class-1h-${session.id}`,
                });
              }
            }
          }
        }
      });
    };

    // Run check immediately
    checkDeadlines();

    // Re-check frequently (every 20 seconds) to catch the 30-minute threshold right on time
    const interval = setInterval(checkDeadlines, 20000);
    return () => clearInterval(interval);
  }, [sessions, notifications, users, currentUser?.id, sendNotification]);

  return null; // This component doesn't render anything
}
