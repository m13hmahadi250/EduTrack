/// <reference types="vite/client" />

interface Window {
  AndroidInterface?: {
    showNotification: (title: string, message: string) => void;
    [key: string]: any;
  };
}
