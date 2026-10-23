// 事件系統：依條件與權重抽遊歷事件、提供事件 api、因果帳的記錄與淡去
import { numbers } from "../data/numbers.js";
import { eventsData } from "../data/events.js";
import { actionEvents } from "../data/actionEvents.js";
import { routes } from "./routes.js";
import { util, state } from "./state.js";
import { legacy } from "./legacy.js";

export const events = {
  all() { return eventsData.list.concat(actionEvents.list); },
  find(id) { return this.all().find(e => e.id === id); },

  // action：這次修練的行動；事件沒寫 actions 的視為遊歷事件
  available(s, action) {
    routes.ensure(s);
    return this.all().filter(e => {
      if (e.once && s.eventsDone.includes(e.id)) return false;
      if (action && !(e.actions || ["遊歷"]).includes(action)) return false;
      if (e.route && e.route !== s.route) return false;
      if (e.routeNot && e.routeNot === s.route) return false;
      try { return e.when(s); } catch (err) { console.warn("事件條件錯誤", e.id, err); return false; }
    });
  },

  // 抽一個事件；前人遺府受「說書迷」加成
  // 權重：基礎 × 心性契合 × 最近出現過的降權
  pick(s, action) {
    const b = state.bonuses(s);
    const list = this.available(s, action);
    const fit = e => {
      let m = 1;
      Object.entries(e.tend || {}).forEach(([axis, dir]) => { m *= Math.max(0.2, 1 + dir * (s.tend[axis] || 0) / 50); });
      return m;
    };
    const recent = e => { const k = s.recentEvents.indexOf(e.id); return k < 0 ? 1 : 0.1 + 0.15 * k; };
    const e = util.weighted(list, e => (e.weight || 1) * fit(e) * recent(e) * (e.id === "前人遺府" ? 1 + b.legacyFind * 10 : 1));
    if (e) { s.recentEvents.unshift(e.id); s.recentEvents = s.recentEvents.filter((x, i, a) => a.indexOf(x) === i).slice(0, 6); }
    return e;
  },

  text(s, e) { return typeof e.text === "function" ? e.text(s) : e.text; },
  choices(s, e) { return e.choices.filter(c => !c.show || c.show(s)); },

  resolve(s, e, choiceIndex) {
    const c = this.choices(s, e)[choiceIndex];
    if (e.once) s.eventsDone.push(e.id);
    const result = c.run(s, this.api(s));
    return result;
  },

  api(s) {
    const U = util, st = state, N = numbers;
    return {
      rand: U.rand, chance: U.chance, pick: U.pick,
      addStones: n => { s.stones = Math.max(0, s.stones + n); },
      addMaterial: (m, n) => { s.materials[m] = (s.materials[m] || 0) + (n || 1); },
      addArtifact: a => { if (!s.artifacts.includes(a)) s.artifacts.push(a); },
      addDemon: n => { const b = st.bonuses(s); s.demon = Math.max(0, Math.min(N.demon.max, s.demon + (n > 0 ? n * b.demonGain : n))); },
      addInsight: n => { if (st.inBottleneck(s)) s.insight += n; else s.insightBank += n; },
      addLife: y => { s.seasons = Math.max(0, s.seasons - y * 4); },
      injure: () => { s.injury = N.injurySeasons; },
      unlockEnv: env => { if (!s.envs.includes(env)) s.envs.push(env); },
      setFlag: (k, v) => { s.flags[k] = v === undefined ? true : v; },
      flag: k => s.flags[k],
      addKarma: (id, text, weight) => this.addKarma(s, id, text, weight),
      hasKarma: id => s.karma.some(k => k.id === id),
      resolveKarma: (id, ending) => {
        const k = s.karma.find(x => x.id === id);
        if (k) { k.done = true; k.ending = ending; }
      },
      note: text => st.note(s, text),
      die: cause => legacy.die(s, cause),
      learnTechnique: name => { if (!s.techniques.includes(name)) s.techniques.push(name); },
      legacyPages: () => (st.loadLegacy().pending || []),
      takeLegacy: () => legacy.take(s),
      tend: (axis, d) => routes.adjust(s, axis, d),
      setRoute: id => routes.setRoute(s, id),
      route: () => s.route,
      addXiu: n => { s.xiu = Math.max(0, s.xiu + n); }
    };
  },

  addKarma(s, id, text, weight) {
    const N = numbers;
    if (s.karma.some(k => k.id === id && !k.done)) return;
    s.karma.push({ id, text, weight, born: s.seasons, done: false });
    const open = s.karma.filter(k => !k.done && !k.faded);
    if (open.length > N.karma.maxOpen) { const old = open.find(k => k.weight !== "大"); if (old) old.faded = true; }
    if (!s.flags.karmaTaught) { s.flags.karmaTaught = true; state.log(s, "這件事記進了修仙筆記的「因果」頁。有些因果，日後會回來找你。"); }
  },

  // 小因果、中因果隨時間淡去
  fadeKarma(s) {
    const N = numbers;
    s.karma.forEach(k => {
      if (k.done || k.faded) return;
      if (s.seasons - k.born >= N.karma.fade[k.weight]) {
        k.faded = true;
        if (!s.flags.fadeTaught) { s.flags.fadeTaught = true; state.log(s, `「${k.text}」這段因果隨歲月淡去了。小事淡得快，大事會一直記著。`); }
      }
    });
  }
};
