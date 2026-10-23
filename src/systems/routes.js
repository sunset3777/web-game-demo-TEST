// 路線與傾向系統：記錄行事與心性傾向、提供各路線對數值的修正、切換路線、稱號
import { numbers } from "../data/numbers.js";
import { routesData } from "../data/routes.js";

const R = routesData;

export const routes = {
  // 舊存檔沒有這些欄位時補上
  ensure(s) {
    if (!s.tend) s.tend = { act: { 吐納: 0, 周天: 0, 閉關: 0, 遊歷: 0 }, 正邪: 0, 穩躁: 0 };
    if (!s.route) s.route = "氣修";
    if (!s.recentEvents) s.recentEvents = [];
    return s;
  },

  def(s) { this.ensure(s); return R.routes[s.route] || R.routes["氣修"]; },
  mod(s, key, dflt) { const m = this.def(s).mods[key]; return m === undefined ? dflt : m; },

  // ---- 傾向 ----
  clamp(v) { return Math.max(-R.tendency.clamp, Math.min(R.tendency.clamp, v)); },
  onAction(s, action) {
    this.ensure(s);
    const T = s.tend;
    Object.keys(T.act).forEach(k => { T.act[k] *= R.tendency.decay; });
    T.act[action] = (T.act[action] || 0) + 1;
    T.穩躁 = this.clamp(T.穩躁 + (R.tendency.actStep[action] || 0));
  },
  adjust(s, axis, delta) { this.ensure(s); s.tend[axis] = this.clamp((s.tend[axis] || 0) + delta); },
  habit(s) {
    this.ensure(s);
    const [k, v] = Object.entries(s.tend.act).sort((a, b) => b[1] - a[1])[0];
    return v >= R.tendency.dominant ? k : null;
  },
  view(s) { this.ensure(s); return { 正邪: s.tend.正邪, 穩躁: s.tend.穩躁, habit: this.habit(s), act: s.tend.act }; },

  // ---- 稱號（人稱「…」）----
  title(s) {
    const t = this.view(s);
    const hit = R.titles.find(x => (!x.route || x.route === s.route) && (!x.when || x.when(t)));
    return hit ? hit.title : s.mark;
  },

  // ---- 數值修正 ----
  cultMult(s, action) {
    const ac = this.mod(s, "actionCult", {});
    const dc = this.mod(s, "demonToCult", 0);
    return this.mod(s, "cult", 1) * (ac[action] || 1) * (1 + dc * s.demon);
  },
  // 用來算懲罰的「有效心魔」：魔修在 demonFloor 以下不受心魔影響
  demonEff(s) { const f = this.mod(s, "demonFloor", 0); return Math.max(0, s.demon - f); },
  rootMult(s, raw) { const w = this.mod(s, "rootWeight", 1); return 1 + (raw - 1) * w; },
  lifeMult(s) { return this.mod(s, "life", 1); },
  injuryMult(s) { return this.mod(s, "injury", 1); },
  deathMult(s) { return this.mod(s, "deathIfInjured", 1); },
  tagBias(s, tag) {
    const b = this.mod(s, "tagBias", {});
    if (R.routeTags.includes(tag)) return b[tag] || 0;   // 路線專屬系別，別的路線抽不到
    return b[tag] || 1;
  },

  // ---- 切換路線 ----
  setRoute(s, id, techniques) {
    const d = R.routes[id];
    if (!d || s.route === id) return;
    s.route = id;
    if (d.technique) {
      if (!s.techniques.includes(d.technique)) s.techniques.push(d.technique);
      s.technique = d.technique;
    }
  }
};
