import { useEffect } from 'react';
import { useAppStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

export default function DeadlineNotifier() {
  const { currentUser, sessions, notifications, sendNotification } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    sessions: state.sessions,
    notifications: state.notifications,
    sendNotification: state.sendNotification,
  })));

  useEffect(() => {
    if (!currentUser || sessions.length === 0) return;

    const checkDeadlines = () => {
      const now = new Date();
      const oneDayInMs = 24 * 60 * 60 * 1000;

      sessions.forEach(session => {
        // Only remind for scheduled sessions
        if (session.status !== 'scheduled') return;

        const sessionDate = new Date(session.scheduledTime);
        const diff = sessionDate.getTime() - now.getTime();

        // If session is within 24 hours AND more than 0 minutes away
        if (diff > 0 && diff <= oneDayInMs) {
          const hoursLeft = diff / (1000 * 60 * 60);
          
          let reminderType = '';
          if (hoursLeft <= 1) {
            reminderType = '1h';
          } else if (hoursLeft <= 24) {
            reminderType = '24h';
          }

          if (reminderType) {
            // Check if we've already notified the current user about this specific reminder type
            const hasNotified = notifications.some(n => 
              n.title === 'Upcoming Session Reminder' && 
              n.message.includes(session.id) &&
              n.message.includes(reminderType)
            );

            if (!hasNotified) {
              const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = sessionDate.toLocaleDateString();
              const urgencyText = reminderType === '1h' ? 'Starts in less than 1 HOUR!' : 'Starts in less than 24 hours';
              
              sendNotification(
                currentUser.id,
                'Upcoming Session Reminder',
                `[${reminderType}] ${urgencyText} Your session for ${session.subject} (Ref: ${session.id}) is at ${timeStr} on ${dateStr}.`,
                reminderType === '1h' ? 'error' : 'warning'
              );
            }
          }
        }
      });
    };

    // Run check immediately
    checkDeadlines();

    // Re-check every 30 minutes to catch sessions crossing the 24h mark
    const interval = setInterval(checkDeadlines, 1800000);
    return () => clearInterval(interval);
  }, [sessions, notifications, currentUser?.id, sendNotification]);

  return null; // This component doesn't render anything
}
