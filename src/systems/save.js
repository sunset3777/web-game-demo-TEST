// 存檔系統：存檔版本與遷移、遊戲存檔與傳承檔的讀寫（localStorage）
import { state } from "./state.js";

// 存檔資料版本（跟 localStorage 的 key 後綴 v1 無關，那是舊的格式標記，不要動）。
// 新增欄位時：把 create() 加上預設值即可，舊存檔載入時會自動補齊；
// 只有「既有欄位的意義或形狀改了」才需要加版本號，並在 MIGRATIONS 補一個轉換函式。
export const SAVE_VERSION = 1;
// MIGRATIONS[n]：把 (n-1) 版的存檔就地轉成 n 版。沒有版本號的舊存檔視為第 0 版。
const MIGRATIONS = {
  1: (s) => s   // 第 0 → 1 版：只補版本號，缺的欄位由 fillDefaults 補
};
const LEGACY_MIGRATIONS = {
  1: (L) => L
};
const isPlain = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
// 只補「缺少」的欄位（undefined），已有的值一律不動；預設值是一般物件時往下一層補
function fillDefaults(target, defaults) {
  Object.keys(defaults).forEach(k => {
    if (target[k] === undefined) target[k] = defaults[k];
    else if (isPlain(defaults[k]) && isPlain(target[k])) fillDefaults(target[k], defaults[k]);
  });
  return target;
}

export const save = {
  SAVE_KEY: "xiuxian-demo-save-v1",
  LEGACY_KEY: "xiuxian-demo-legacy-v1",
  SAVE_VERSION,

  // ---- 存檔：存在這台電腦的瀏覽器裡（localStorage）----
  save(s) { try { localStorage.setItem(this.SAVE_KEY, JSON.stringify(s)); } catch (e) {} },
  // 載入並升級：缺欄位補預設值，不報錯、不改既有欄位
  migrate(s) {
    if (!isPlain(s)) return s;
    try {
      for (let v = (s.v | 0) + 1; v <= SAVE_VERSION; v++) if (MIGRATIONS[v]) s = MIGRATIONS[v](s) || s;
      fillDefaults(s, state.create(s.name));
      s.v = SAVE_VERSION;
    } catch (e) {}
    return s;
  },
  migrateLegacy(L) {
    if (!isPlain(L)) return { v: SAVE_VERSION, lives: [], pending: [] };
    try {
      for (let v = (L.v | 0) + 1; v <= SAVE_VERSION; v++) if (LEGACY_MIGRATIONS[v]) L = LEGACY_MIGRATIONS[v](L) || L;
      fillDefaults(L, { lives: [], pending: [] });
      L.v = SAVE_VERSION;
    } catch (e) {}
    return L;
  },
  load() { try { const t = localStorage.getItem(this.SAVE_KEY); return t ? this.migrate(JSON.parse(t)) : null; } catch (e) { return null; } },
  clear() { try { localStorage.removeItem(this.SAVE_KEY); } catch (e) {} },
  loadLegacy() { try { const t = localStorage.getItem(this.LEGACY_KEY); return this.migrateLegacy(t ? JSON.parse(t) : null); } catch (e) { return this.migrateLegacy(null); } },
  saveLegacy(L) { try { L.v = SAVE_VERSION; localStorage.setItem(this.LEGACY_KEY, JSON.stringify(L)); } catch (e) {} }
};
