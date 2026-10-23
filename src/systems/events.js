// 事件系統：依條件與權重抽遊歷事件、提供事件 api、因果帳的記錄與淡去
import { numbers } from "../data/numbers.js";
import { eventsData } from "../data/events.js";
import { util, state } from "./state.js";
import { legacy } from "./legacy.js";

export const events = {
  available(s) {
    return eventsData.list.filter(e => {
      if (e.once && s.eventsDone.includes(e.id)) return false;
      try { return e.when(s); } catch (err) { console.warn("事件條件錯誤", e.id, err); return false; }
    });
  },

  // 抽一個事件；前人遺府受「說書迷」加成
  pick(s) {
    const b = state.bonuses(s);
    const list = this.available(s);
    return util.weighted(list, e => (e.weight || 1) * (e.id === "前人遺府" ? 1 + b.legacyFind * 10 : 1));
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
      takeLegacy: () => legacy.take(s)
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
