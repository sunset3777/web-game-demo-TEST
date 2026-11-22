// 存檔系統：存檔版本與遷移、遊戲存檔與傳承檔的讀寫（localStorage）
import { state } from "./state.js";
import { karmaData } from "../data/karma.js";

// 存檔資料版本（跟 localStorage 的 key 後綴 v1 無關，那是舊的格式標記，不要動）。
// 新增欄位時：把 create() 加上預設值即可，舊存檔載入時會自動補齊；
// 只有「既有欄位的意義或形狀改了」才需要加版本號，並在 MIGRATIONS 補一個轉換函式。
export const SAVE_VERSION = 2;
// MIGRATIONS[n]：把 (n-1) 版的存檔就地轉成 n 版。沒有版本號的舊存檔視為第 0 版。
const MIGRATIONS = {
  1: (s) => s,  // 第 0 → 1 版：只補版本號，缺的欄位由 fillDefaults 補
  // 第 1 → 2 版（2026-11-17 作派拆軸）：舊的「正邪」其實同時記著善行與守正道，意義改了。
  // 照玄機選的 (a)：把舊正邪搬進新的「善惡」、正邪歸 0，免得過去做的好事被當成「走正路」。已經有善惡的存檔不動
  2: (s) => {
    if (isPlain(s.tend) && s.tend.善惡 === undefined && typeof s.tend.正邪 === "number") { s.tend.善惡 = s.tend.正邪; s.tend.正邪 = 0; }
    return s;
  }
};
const LEGACY_MIGRATIONS = {
  1: (L) => L,
  2: (L) => L   // 傳承檔格式沒變，只跟著存檔升版號
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
// 版本號比這個程式新的存檔（由較新版的遊戲寫下）：這個版本看不懂它的欄位，讀進來或寫回去都可能弄壞它
const isFromNewerVersion = (data) => isPlain(data) && (data.v | 0) > SAVE_VERSION;
// 直接看 localStorage 裡那份檔案是不是較新版本寫的；讀不到或壞掉都當成不是
function isStoredFileFromNewerVersion(storageKey) {
  try { const text = localStorage.getItem(storageKey); return text ? isFromNewerVersion(JSON.parse(text)) : false; }
  catch (e) { return false; }
}

export const save = {
  SAVE_KEY: "xiuxian-demo-save-v1",
  LEGACY_KEY: "xiuxian-demo-legacy-v1",
  SAVE_VERSION,

  // ---- 存檔：存在這台電腦的瀏覽器裡（localStorage）----
  // 回報是否真的寫進去。已有較新版本的存檔時不覆蓋它（回報 false），避免舊版程式把新版進度蓋掉
  save(gameState) {
    if (this.hasNewerSave()) return false;
    try { localStorage.setItem(this.SAVE_KEY, JSON.stringify(gameState)); return true; }
    catch (e) { return false; }
  },
  // 標題畫面與 controller 用來判斷要不要提示「這份存檔來自較新版本」、要不要擋下開新的一世
  hasNewerSave() { return isStoredFileFromNewerVersion(this.SAVE_KEY); },
  hasNewerLegacy() { return isStoredFileFromNewerVersion(this.LEGACY_KEY); },
  // 載入並升級：缺欄位補預設值，不報錯、不改既有欄位
  migrate(s) {
    if (!isPlain(s)) return s;
    if (isFromNewerVersion(s)) return s; // 不把較新版的存檔降回現版號
    try {
      for (let v = (s.v | 0) + 1; v <= SAVE_VERSION; v++) if (MIGRATIONS[v]) s = MIGRATIONS[v](s) || s;
      fillDefaults(s, state.create(s.name));
      // 因果的種類（恩／仇，11/17 新增）：舊存檔的因果沒有這個欄位，照 data/karma.js 的對照表補上，沒列到的算「恩」。
      // 只是補新欄位、不改既有欄位，所以不升存檔版本
      if (Array.isArray(s.karma)) s.karma.forEach(entry => { if (isPlain(entry) && !entry.kind) entry.kind = karmaData.kindById[entry.id] || karmaData.defaultKind; });
      s.v = SAVE_VERSION;
    } catch (e) {}
    return s;
  },
  migrateLegacy(L) {
    if (!isPlain(L)) return { v: SAVE_VERSION, lives: [], pending: [] };
    if (isFromNewerVersion(L)) return L; // 不把較新版的傳承檔降回現版號
    try {
      for (let v = (L.v | 0) + 1; v <= SAVE_VERSION; v++) if (LEGACY_MIGRATIONS[v]) L = LEGACY_MIGRATIONS[v](L) || L;
      fillDefaults(L, { lives: [], pending: [] });
      L.v = SAVE_VERSION;
    } catch (e) {}
    return L;
  },
  // 較新版本的存檔不載入（回傳 null），標題改用 hasNewerSave() 提示玩家
  load() {
    try {
      const t = localStorage.getItem(this.SAVE_KEY);
      if (!t) return null;
      const savedData = JSON.parse(t);
      return isFromNewerVersion(savedData) ? null : this.migrate(savedData);
    } catch (e) { return null; }
  },
  // 較新版本的存檔不刪：只有玩家明確按「清除所有存檔與傳承」（clearEverything）才會刪掉它
  clear() { if (this.hasNewerSave()) return; try { localStorage.removeItem(this.SAVE_KEY); } catch (e) {} },
  clearEverything() { try { localStorage.removeItem(this.SAVE_KEY); localStorage.removeItem(this.LEGACY_KEY); } catch (e) {} },
  // 較新版本的傳承檔看不懂，當成沒有傳承來讀；saveLegacy 也不會覆蓋它
  loadLegacy() {
    try {
      const t = localStorage.getItem(this.LEGACY_KEY);
      const legacyData = t ? JSON.parse(t) : null;
      return this.migrateLegacy(isFromNewerVersion(legacyData) ? null : legacyData);
    } catch (e) { return this.migrateLegacy(null); }
  },
  // 回報是否真的寫進去：傳承寫入失敗時呼叫端（legacy.bequeath）要保留舊存檔，不能當成已經傳下去
  saveLegacy(legacyData) {
    if (this.hasNewerLegacy()) return false;
    try { legacyData.v = SAVE_VERSION; localStorage.setItem(this.LEGACY_KEY, JSON.stringify(legacyData)); return true; }
    catch (e) { return false; }
  }
};
