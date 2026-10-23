// 成長池（小境界體悟）：每個境界有重數上限、達重數改名、上限時的積蘊在境界提升後化開
import { numbers } from "../data/numbers.js";
import { abilities } from "../data/abilities.js";
import { state } from "./state.js";

const CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export const growth = {
  def(name) { return abilities.growth.find(g => g.name === name); },
  count(s, name) { return s.growth.filter(n => n === name).length; },
  cap(s) { const c = numbers.growth.caps; return c[Math.min(s.realmIndex, c.length - 1)]; },
  atCap(s, name) { const g = this.def(name); return !!(g && g.repeat && this.count(s, name) >= this.cap(s)); },

  // 依重數顯示的名稱（有 tiers 的會進化）
  title(name, n) {
    const g = this.def(name), T = numbers.growth.tiers;
    if (!g || !g.tiers) return name;
    let t = name;
    T.forEach((need, i) => { if (n >= need && g.tiers[i]) t = g.tiers[i]; });
    return t;
  },
  label(name, n) { const t = this.title(name, n); return n > 1 ? `${t}・${CN[n] || n}重` : t; },

  // 狀態欄用：合併重複、依取得順序
  list(s) {
    const seen = [];
    s.growth.forEach(n => { if (!seen.includes(n)) seen.push(n); });
    return seen.map(n => ({ name: n, n: this.count(s, n), label: this.label(n, this.count(s, n)) }));
  },

  // 選了一個體悟：未到上限就加一重；到上限就積蘊起來，回傳畫面文字
  pick(s, name) {
    const g = this.def(name);
    s.growthStore = s.growthStore || {};
    if (this.atCap(s, name)) {
      s.growthStore[name] = (s.growthStore[name] || 0) + 1;
      return `你凝神去感受${g.sense || "那一絲靈光"}，卻像隔著一層薄紗，怎麼也觸不到更深處。\n那份感觸沒有散去，只是沉進了心底。`;
    }
    const before = this.title(name, this.count(s, name));
    s.growth.push(name);
    const n = this.count(s, name), after = this.title(name, n);
    if (after !== before) {
      state.note(s, `對${g.sense}的領會更上一層，悟得「${after}」。`, "突破心得");
      return `靈光一閃，你對${g.sense}的領會豁然開朗，悟得「${after}」。\n〔${g.desc}〕`;
    }
    return `靈光一閃，你領悟了「${this.label(name, n)}」。\n〔${g.desc}〕`;
  },

  // 大境界提升後：積蘊的感觸在新的上限內化開
  onRealmUp(s) {
    const out = [], store = s.growthStore || {};
    Object.keys(store).forEach(name => {
      const g = this.def(name);
      const room = Math.max(0, this.cap(s) - this.count(s, name));
      const take = Math.min(room, store[name]);
      if (!take) return;
      const before = this.title(name, this.count(s, name));
      for (let i = 0; i < take; i++) s.growth.push(name);
      store[name] -= take;
      if (!store[name]) delete store[name];
      const after = this.title(name, this.count(s, name));
      out.push(after !== before
        ? `壓在心底多年、關於${g.sense}的感觸，此刻豁然貫通，化作「${after}」。`
        : `壓在心底多年、關於${g.sense}的感觸，此刻終於化開了。`);
    });
    return out;
  }
};
