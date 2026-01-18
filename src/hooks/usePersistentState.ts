import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { getStoredItem, setStoredItem, removeStoredItem } from '../lib/store';

export function usePersistentState<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  const [state, setState] = useState<T>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getStoredItem(key).then((stored) => {
      if (mounted) {
        if (stored) {
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
