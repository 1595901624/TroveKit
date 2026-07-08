import { Store } from '@tauri-apps/plugin-store';

const store = await Store.load('store.bin');

export async function getStoredItem(key: string): Promise<string | null> {
  try {
    const val = await store.get<string>(key);
    if (val !== null && val !== undefined) {
      return val;
    }

    // 迁移逻辑：只在 store 中不存在时读取旧 localStorage，迁移完成后删除旧副本，避免大文本状态常驻两份。
    const localVal = localStorage.getItem(key);
    if (localVal) {
      await store.set(key, localVal);
      await store.save();
      localStorage.removeItem(key);
      return localVal;
    }
  } catch (err) {
    console.error('Error in getStoredItem:', err);
  }
  return null;
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  try {
    // 工具状态统一写入 Tauri store，不再镜像到 localStorage，减少 WebView2 进程里的同步存储缓存。
    await store.set(key, value);
    await store.save();
    localStorage.removeItem(key);
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
