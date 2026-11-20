type StorageResult<T> = {
  ok: boolean;
  data: T;
  error?: Error;
};

const memoryFallback = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    const testKey = '__pilamanager_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export const storageService = {
  get<T>(key: string, fallback: T): T {
    const result = this.safeGet(key, fallback);
    return result.data;
  },

  safeGet<T>(key: string, fallback: T): StorageResult<T> {
    try {
      const storage = getStorage();
      const raw = storage ? storage.getItem(key) : memoryFallback.get(key) ?? null;
      if (!raw) return { ok: true, data: fallback };
      return { ok: true, data: JSON.parse(raw) as T };
    } catch (error) {
      return { ok: false, data: fallback, error: error as Error };
    }
  },

  set<T>(key: string, value: T): StorageResult<T> {
    try {
      const raw = JSON.stringify(value);
      const storage = getStorage();
      if (!storage) throw new Error('O armazenamento do navegador está indisponível. Mantenha o formulário aberto e tente novamente.');
      storage.setItem(key, raw);
      return { ok: true, data: value };
    } catch (error) {
      return { ok: false, data: value, error: error as Error };
    }
  },

  remove(key: string): void {
    try {
      const storage = getStorage();
      if (storage) storage.removeItem(key);
      memoryFallback.delete(key);
    } catch {
      memoryFallback.delete(key);
    }
  },
};
