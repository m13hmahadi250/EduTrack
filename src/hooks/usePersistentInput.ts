import { useState, useEffect, useRef } from 'react';

/**
 * A custom React hook to persist a text input value in local storage.
 * Automatically handles key changes (e.g., switching chat partners)
 * by reloading the correct draft synchronously during render.
 * Saves the draft to localStorage whenever the value changes.
 */
export function usePersistentInput(key: string, initialValue: string = '') {
  const keyRef = useRef(key);

  // Initialize state with value from localStorage if available
  const [value, setValue] = useState(() => {
    if (!key) return initialValue;
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? saved : initialValue;
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
      return initialValue;
    }
  });

  // Synchronously update state during render if key changes (e.g., switched conversation)
  if (keyRef.current !== key) {
    keyRef.current = key;
    let nextValue = initialValue;
    if (key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          nextValue = saved;
        }
      } catch (e) {
        console.warn('Failed to read from localStorage during key change:', e);
      }
    }
    setValue(nextValue);
  }

  // Save value to localStorage whenever the key or value changes
  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
