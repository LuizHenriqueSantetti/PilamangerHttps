class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const localStorage = new MemoryStorage();
const events = new EventTarget();
Object.assign(globalThis, {
  localStorage,
  window: {
    localStorage,
    setTimeout,
    atob: globalThis.atob.bind(globalThis),
    btoa: globalThis.btoa.bind(globalThis),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  },
  CustomEvent: class<T = unknown> extends Event {
    detail: T;
    constructor(type: string, init?: CustomEventInit<T>) { super(type); this.detail = init?.detail as T; }
  },
});

beforeEach(() => localStorage.clear());
