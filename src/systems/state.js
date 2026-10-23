// 遊戲狀態、亂數工具、加成彙整（存檔讀寫與版本遷移在 save.js）
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { abilities } from "../data/abilities.js";
import { marks } from "../data/marks.js";
import { routes } from "./routes.js";
import { SAVE_VERSION } from "./save.js";

export const util = {
  rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  chance(p) { return Math.random() < p; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  // Fisher-Yates 洗牌（回傳新陣列，不改原陣列）
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  weighted(items, weightOf) {
    const total = items.reduce((t, it) => t + Math.max(0, weightOf(it)), 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const it of items) { r -= Math.max(0, weightOf(it)); if (r <= 0) return it; }
    return items[items.length - 1];
  },
  // 不重複加權抽 n 個
  weightedDistinct(items, weightOf, n) {
    const pool = items.slice(), out = [];
    while (out.length < n && pool.length) {
      const it = util.weighted(pool, weightOf);
      if (!it) break;
      out.push(it); pool.splice(pool.indexOf(it), 1);
    }
    return out;
  },
  pct(x) { return (x * 100).toFixed(1) + "%"; }
};

export const state = {
  // 新增欄位時在這裡給預設值，舊存檔載入時由 save.migrate() 自動補齊（見 save.js）
  create(name) {
    const N = numbers;
    return {
      v: SAVE_VERSION,
      name, alive: true, phase: "opening",
      startAge: 0, seasons: 0,                // seasons＝靈根測試後經過的季數
      seasonIdx: 0,                           // 0 春 1 夏 2 秋 3 冬
      realmIndex: 0, stageIndex: 0, xiu: 0, insight: 0, insightBank: 0,
      demon: 0, scars: 0, fails: 0, injury: 0, demoEnd: false,
      root: null,                             // { type, label, elements:[...], fusion }
      aim: null, mark: null,
      technique: "基礎吐納法", techniques: ["基礎吐納法"],
      materials: {}, artifacts: [], equipped: null, stones: 10,
      abilities: [], growth: [], constitutions: [],
      envs: layoutData.startEnvironments.slice(),
      karma: [], notes: [], flags: {}, eventsDone: [],
      route: "氣修", tend: { act: { 吐納: 0, 周天: 0, 閉關: 0, 遊歷: 0 }, 正邪: 0, 穩躁: 0 }, recentEvents: [],
      legacyAvailable: false,
      queue: [], current: null,              // 待處理的選擇（成長池、事件……）
      log: [], lastText: "",
      turns: 0, stats: { breakFails: 0 }
    };
  },

  realm(s) { return numbers.realms[s.realmIndex]; },
  season(s) { return numbers.seasons[s.seasonIdx]; },
  age(s) {
    if (!s.root && s.mortal) return s.startAge + s.mortal.done / 4;
    return numbers.testAge + s.seasons / 4;
  },
  stageName(s) { const r = this.realm(s); return r.id + r.stages[s.stageIndex]; },
  stageReq(s) { return this.realm(s).reqs[s.stageIndex]; },
  isLastStage(s) { return s.stageIndex === this.realm(s).stages.length - 1; },
  inBottleneck(s) { return this.isLastStage(s) && !!this.realm(s).major && s.xiu >= this.stageReq(s); },
  maxAge(s) { return Math.round(this.realm(s).life * routes.lifeMult(s)) + this.bonuses(s).life; },
  // 氣血衰退：回傳 { ratio, cult, capCut }
  aging(s) {
    const A = numbers.aging, ratio = this.age(s) / this.maxAge(s);
    const cult = ratio > A.from ? Math.max(A.cultMin, 1 - (ratio - A.from) * A.cultDrop) : 1;
    const capCut = ratio > A.capFrom ? (ratio - A.capFrom) * A.capDrop : 0;
    return { ratio, cult, capCut };
  },

  // 彙整所有永久加成（能力、成長、體質、少年印記）
  bonuses(s) {
    const A = abilities, M = marks;
    const b = { cult: 0, seclude: 0, insight: 0, demonGain: 1, injury: 1, material: 0, event: 0, legacyFind: 0, life: 0, tagMult: {}, flags: {} };
    const apply = (e) => {
      if (!e) return;
      if (e.cult) b.cult += e.cult;
      if (e.seclude) b.seclude += e.seclude;
      if (e.insight) b.insight += e.insight;
      if (e.demonGain) b.demonGain *= e.demonGain;
      if (e.injury) b.injury *= e.injury;
      if (e.material) b.material += e.material;
      if (e.event) b.event += e.event;
      if (e.legacyFind) b.legacyFind += e.legacyFind;
      if (e.life) b.life += e.life;
      if (e.flag) b.flags[e.flag] = true;
      if (e.tagMult) b.tagMult[e.tagMult[0]] = (b.tagMult[e.tagMult[0]] || 1) * e.tagMult[1];
      if (e.tagMult2) { const [x, y, m] = e.tagMult2; b.tagMult[x] = (b.tagMult[x] || 1) * m; b.tagMult[y] = (b.tagMult[y] || 1) * m; }
      if (e.second) {
        b.tagMult[e.second] = (b.tagMult[e.second] || 1) * 1.2;
        const tech = layoutData.techniques[s.technique] || {};
        if (tech[e.second]) b.cult += 0.10;
      }
    };
    s.abilities.forEach(n => { const a = A.pool.find(x => x.name === n); if (a) apply(a.effect); });
    s.growth.forEach(n => { const g = A.growth.find(x => x.name === n); if (g) apply(g.effect); });
    s.constitutions.forEach(c => apply(c.effect));
    if (s.aim) { const aim = M.aims.find(a => a.id === s.aim); if (aim) apply(aim.effect); }
    return b;
  },

  rootMult(s) {
    const R = numbers.roots;
    return routes.rootMult(s, s.root ? R[s.root.type].mult : 1);
  },

  log(s, text) {
    const N = numbers;
    s.log.unshift({ when: `${Math.floor(this.age(s))} 歲・${N.seasons[s.seasonIdx]}`, text });
    if (s.log.length > 80) s.log.length = 80;
  },
  note(s, text, kind) {
    s.notes.push({ when: `${Math.floor(this.age(s))} 歲・${numbers.seasons[s.seasonIdx]}`, text, kind: kind || "一般", realm: this.realm(s).id });
  }
};
