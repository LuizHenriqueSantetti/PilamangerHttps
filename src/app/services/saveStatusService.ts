import { flushRemoteStorage } from './remoteStorageSync';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export async function withSaveStatus<T>(
  setStatus: (status: SaveStatus) => void,
  action: () => T | Promise<T>,
  clearAfterMs = 1800,
) {
  setStatus('saving');
  try {
    const result = await action();
    await flushRemoteStorage();
    setStatus('saved');
    window.setTimeout(() => setStatus('idle'), clearAfterMs);
    return result;
  } catch (error) {
    setStatus('error');
    throw error;
  }
}
