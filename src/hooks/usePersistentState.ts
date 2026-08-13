import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { getCachedStoredItem, getStoredItem, setStoredItem, removeStoredItem } from '../lib/store';

function parseStoredState<T>(key: string, stored: string | null | undefined, fallback: T): T {
  if (stored === null || stored === undefined) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch (e) {
    console.error(`Failed to parse stored state for key "${key}"`, e);
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  // 持久化状态异步从 Tauri store 恢复，避免启动时同步解析 localStorage 中的大文本。
  const cachedState = getCachedStoredItem(key);
  const [state, setState] = useState<T>(() => parseStoredState(key, cachedState, initialState));
  const [isLoaded, setIsLoaded] = useState(cachedState !== undefined);

  useEffect(() => {
    let mounted = true;
    getStoredItem(key).then((stored) => {
      if (mounted) {
        if (stored !== null) setState(parseStoredState(key, stored, initialState));
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
