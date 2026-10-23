// 開局系統：凡人期（簡化成選少年志向）、靈根測試、覺醒三選一
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { abilities } from "../data/abilities.js";
import { marks } from "../data/marks.js";
import { util, state } from "./state.js";
import { events } from "./events.js";
import { mortalEvents } from "../data/mortalEvents.js";

export const opening = {
  randomName() {
    const M = marks, U = util;
    return U.pick(M.surnames) + U.pick(M.givenNames) + (U.chance(0.5) ? U.pick(M.givenNames) : "");
  },

  // ---- 完整凡人期：每季選一個行動、觸發小事件，結束時凝成印記 ----
  startMortal(s, mode) {
    const N = numbers, U = util;
    s.startAge = U.rand(11, 16);
    const yearsLeft = N.testAge - s.startAge;
    const playable = Math.min(N.mortalMaxSeasons, yearsLeft * 4);
    s.mortal = { mode, playable, auto: yearsLeft - playable / 4, done: 0, counts: {}, pending: null, finished: false };
    const lines = [`你今年 ${s.startAge} 歲，住在青石鎮。`];
    if (s.startAge >= 16) {
      const pre = U.pick(marks.aims);
      s.mortal.counts[pre.id] = 4;
      lines.push(`這兩年，你一直${pre.habit}。再 ${playable} 季，就到測靈的日子了。`);
      state.note(s, `十六歲以前，一直${pre.habit}。`, "回憶");
    } else {
      lines.push(`聽大人說，等你十八歲那年，仙門的人會來鎮上測靈。`);
    }
    s.mortal.intro = lines;
  },

  mortalAct(s, action) {
    const m = s.mortal;
    m.counts[action] = (m.counts[action] || 0) + 1;
    m.done++;
    s.seasonIdx = (s.seasonIdx + 1) % 4;
    const list = mortalEvents.list.filter(e => (!e.action || e.action === action) && !(e.once && s.eventsDone.includes(e.id)) && (!e.when || e.when(s)));
    const e = util.weighted(list, x => x.weight || (x.action ? 2 : 1));
    m.lastAction = action;
    m.pending = e ? e.id : null;
    if (!e) this.afterMortalSeason(s);
  },

  mortalEvent(s) { return mortalEvents.list.find(e => e.id === s.mortal.pending); },

  resolveMortalEvent(s, i) {
    const e = this.mortalEvent(s);
    const text = events.resolve(s, e, i);
    s.mortal.pending = null;
    s.mortal.lastText = `【${e.title}】${text}`;
    this.afterMortalSeason(s);
    return text;
  },

  afterMortalSeason(s) {
    if (s.mortal.done >= s.mortal.playable) this.finishMortal(s);
  },

  // 凡人期結束：自動帶過剩餘年數、凝成印記
  finishMortal(s) {
    const m = s.mortal, M = marks, U = util;
    const ranked = Object.entries(m.counts).sort((a, b) => b[1] - a[1] || Math.random() - 0.5);
    const top = ranked.length ? ranked[0][0] : U.pick(M.aims).id;
    if (m.auto > 0) m.counts[top] = (m.counts[top] || 0) + m.auto * 4;
    const aim = M.aims.find(a => a.id === top);
    s.aim = top; s.mark = aim.mark;
    const lines = [];
    if (m.auto > 0) lines.push(`接下來的 ${m.auto} 年，你大多${aim.habit}。`);
    lines.push(`不知從什麼時候起，鎮上的人都叫你「${aim.mark}」。`);
    if (m.mode === "full" && ranked.length > 1) {
      const second = ranked[1];
      const combo = M.combos.find(c => (c.a === top && c.b === second[0]) || (c.b === top && c.a === second[0]));
      if (combo && second[1] >= 3) { s.comboMark = combo.mark; lines.push(`也有人說，你身上有股「${combo.mark}」的味道。`); }
    }
    s.fruit = !!s.flags["靈果"];
    state.note(s, `少年時大多${aim.habit}，人稱「${aim.mark}」${s.comboMark ? `，也有人說我像個${s.comboMark}` : ""}。`, "回憶");
    m.finished = true;
    s.mortalLines = lines;
  },

  // 快速開局：選一個志向，凡人期自動帶過
  mortal(s, aimId) {
    const M = marks, N = numbers, U = util;
    const aim = M.aims.find(a => a.id === aimId);
    s.aim = aimId; s.mark = aim.mark;
    s.startAge = U.rand(11, 16);
    const yearsLeft = N.testAge - s.startAge;
    const lines = [`${s.startAge} 歲那年起，你大多${aim.habit}。`];
    lines.push(`${yearsLeft} 年一晃而過，鎮上的人都叫你「${aim.mark}」。`);
    s.fruit = aim.mark === "野孩子" && U.chance(M.fruitChance);
    if (s.fruit) { s.flags["靈果"] = true; lines.push("某次在後山探險，你誤食了一顆不知名的靈果，渾身燥熱了三天三夜。"); }
    s.mortal = { mode: "quick", playable: 0, auto: yearsLeft, done: 0, counts: { [aimId]: yearsLeft * 4 }, finished: true };
    state.note(s, `少年時大多${aim.habit}，人稱「${aim.mark}」。`, "回憶");
    return lines;
  },

  // 靈根測試
  rollRoot(s) {
    const N = numbers, L = layoutData, U = util, R = N.roots;
    const els = L.elements.slice();
    const shuffled = () => els.slice().sort(() => Math.random() - 0.5);
    const r = Math.random();
    let root;
    if (r < R.single.chance) {
      root = { type: "single", elements: [U.pick(els)] };
    } else if (r < R.single.chance + R.dual.chance) {
      const f = U.pick(L.fusions);
      let rate = s.fruit ? R.fruitFuseRate : R.fuseRate[f.kind];
      if (s.flags["雷擊"] && f.name === "雷") rate = Math.min(1, rate * 2);
      root = U.chance(rate) ? { type: "fusion", elements: [f.a, f.b], fusion: f.name, kind: f.kind }
                            : { type: "dual", elements: [f.a, f.b] };
    } else if (r < R.single.chance + R.dual.chance + R.triple.chance) {
      root = { type: "triple", elements: shuffled().slice(0, 3) };
    } else if (r < R.single.chance + R.dual.chance + R.triple.chance + R.quad.chance) {
      root = { type: "quad", elements: shuffled().slice(0, 4) };
    } else {
      root = { type: "penta", elements: els.slice() };
    }
    root.label = root.type === "fusion" ? `${root.fusion}靈根（${root.elements.join("")}・${root.kind}融合）`
               : `${R[root.type].name}（${root.elements.join("")}）`;
    s.root = root;
    const colorLine = root.type === "fusion" ? `測靈石先是亮起${root.elements.join("、")}兩色，兩股光芒忽然絞在一起，化作耀眼的${root.fusion}光！`
                    : `測靈石亮起了${root.elements.join("、")}${root.elements.length > 1 ? "幾色" : "一色"}光芒。`;
    state.note(s, `十八歲測出${root.label}。`, "里程碑");
    return [colorLine, `你是${root.label}。`, root.type === "fusion" ? "負責測靈的老執事手一抖，差點摔了茶杯。" : ""].filter(Boolean);
  },

  // 覺醒三選一：入門功法＋起手神通
  awakeningOptions(s) {
    const A = abilities, L = layoutData, U = util;
    const opts = [];
    const entry = tag => A.pool.find(a => a.tag === tag && a.tier === "入門");
    if (s.root.type === "fusion") {
      const fa = A.pool.find(a => a.tag === s.root.fusion);
      if (fa) opts.push({ ability: fa.name, technique: s.root.fusion === "雷" ? "引雷訣" : L.techniqueByElement[s.root.elements[0]], tag: s.root.fusion });
    }
    U.weightedDistinct(s.root.elements, () => 1, 3).forEach(e => {
      if (opts.length < 3) opts.push({ ability: entry(e).name, technique: L.techniqueByElement[e], tag: e });
    });
    const markExtra = { "書生": "心境", "武童": "肉身" }[s.mark];
    if (markExtra) {
      const ab = entry(markExtra);
      const o = { ability: ab.name, technique: markExtra === "肉身" ? "厚土訣" : "基礎吐納法", tag: markExtra, fromMark: true };
      if (opts.length >= 3) opts[2] = o; else opts.push(o);
    }
    while (opts.length < 3) {
      const e = U.pick(L.elements.filter(x => !opts.some(o => o.tag === x)));
      opts.push({ ability: entry(e).name, technique: L.techniqueByElement[e], tag: e });
    }
    return opts;
  },

  chooseAwakening(s, opt) {
    s.abilities.push(opt.ability);
    if (!s.techniques.includes(opt.technique)) s.techniques.push(opt.technique);
    s.technique = opt.technique;
    state.note(s, `入定幻境中見「${abilities.imagery[opt.tag]}」，悟得${opt.ability}，主修${opt.technique}。`, "里程碑");
    s.phase = "play";
  }
};
