import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { getStoredItem, setStoredItem, removeStoredItem } from '../lib/store';

function getInitialValueFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const localValue = window.localStorage.getItem(key);
    if (localValue === null) return fallback;
    return JSON.parse(localValue) as T;
  } catch (e) {
    console.error(`Failed to parse localStorage state for key "${key}"`, e);
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  const [state, setState] = useState<T>(() => getInitialValueFromLocalStorage(key, initialState));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getStoredItem(key).then((stored) => {
      if (mounted) {
        if (stored !== null) {
          try {
            const parsed = JSON.parse(stored);
            setState(parsed);
          } catch (e) {
            console.error(`Failed to parse stored state for key "${key}"`, e);
          }
        }
        setIsLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [key]);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(key, JSON.stringify(state));
    }
  }, [key, state, isLoaded]);

  const clearStoredState = () => {
      removeStoredItem(key);
  };

  return [state, setState, clearStoredState, isLoaded];
}

export function useStorageLoader<T>(key: string): [T | null, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getStoredItem(key).then((val) => {
        if (mounted) {
            if (val) {
                try {
                    setData(JSON.parse(val));
                } catch (e) {
                    console.error("Failed to parse", key, e);
                }
            }
            setIsLoaded(true);
        }
    });
    return () => { mounted = false; };
  }, [key]);

  return [data, isLoaded];
}
