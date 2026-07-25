import React, { useEffect, useState, memo } from 'react';
import { useAppStore, Notification } from '../store';
import { Bell, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// NotificationCenter component is maintained for header/layout compatibility; toast popups and native OS status bar alerts are managed by MessageToastCenter
const NotificationCenter = memo(function NotificationCenter() {
  return null;
});

export default NotificationCenter;

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'success': return <CheckCircle className="w-6 h-6" />;
    case 'error': return <AlertCircle className="w-6 h-6" />;
    case 'warning': return <AlertTriangle className="w-6 h-6" />;
    default: return <Info className="w-6 h-6" />;
  }
}
