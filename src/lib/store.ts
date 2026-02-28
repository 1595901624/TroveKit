import { Store } from '@tauri-apps/plugin-store';

const store = await Store.load('store.bin');

export async function getStoredItem(key: string): Promise<string | null> {
  try {
    const val = await store.get<string>(key);
    if (val !== null && val !== undefined) {
      localStorage.setItem(key, val);
      return val;
    }

    // 迁移逻辑：若 store 中不存在，则回退读取 localStorage 并写回 store。
    const localVal = localStorage.getItem(key);
    if (localVal) {
      await store.set(key, localVal);
      await store.save();
      return localVal;
    }
  } catch (err) {
    console.error('Error in getStoredItem:', err);
  }
  return null;
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  try {
    await store.set(key, value);
    await store.save();
    localStorage.setItem(key, value);
  } catch (err) {
    console.error('Error in setStoredItem:', err);
  }
}

export async function removeStoredItem(key: string): Promise<void> {
  try {
    await store.delete(key);
    await store.save();
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Error in removeStoredItem:', err);
  }
}
