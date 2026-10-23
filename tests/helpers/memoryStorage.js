// 記憶體版 localStorage：測試不碰真的瀏覽器儲存，也方便檢查「實際寫進去了什麼」。
// shouldThrowOnWrite 設為 true 時，setItem 會丟例外，用來模擬儲存空間滿或被禁止。
export function createMemoryStorage() {
  const entries = new Map();
  return {
    shouldThrowOnWrite: false,
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) {
      if (this.shouldThrowOnWrite) throw new Error("QuotaExceededError（測試模擬）");
      entries.set(key, String(value));
    },
    removeItem(key) { entries.delete(key); },
    clear() { entries.clear(); },
    keys() { return [...entries.keys()]; }
  };
}

// 把全域 localStorage 換成新的記憶體版並回傳它；每個測試開頭呼叫一次，確保彼此不受影響
export function installMemoryStorage() {
  const storage = createMemoryStorage();
  globalThis.localStorage = storage;
  return storage;
}
