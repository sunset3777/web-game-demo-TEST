// 突破系統：大境界突破成功率、道傷與心魔、覺醒、能力池與成長池三選一、走火入魔
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { abilities } from "../data/abilities.js";
import { util, state } from "./state.js";
import { layout } from "./layout.js";
import { cultivation } from "./cultivation.js";
import { legacy } from "./legacy.js";
import { routes } from "./routes.js";
import { routesData } from "../data/routes.js";

export const breakthrough = {
  layoutOpts(s, choice) {
    return { technique: s.technique, material: choice.material || null, artifact: s.equipped,
             env: choice.env || "洞府", season: state.season(s) };
  },

  envUsable(s, env) {
    const e = layoutData.environments[env];
    return s.envs.includes(env) && (!e.season || e.season === state.season(s));
  },

  // 成功率
  rate(s, extraDemon) {
    const N = numbers, st = state, M = st.realm(s).major;
    const cap = Math.max(M.base * 0.5, M.cap - Math.min(s.scars, N.scar.maxLayers) * N.scar.perLayer - st.aging(s).capCut);
    const d = routes.demonEff(s) + (extraDemon || 0);
    const raw = M.base + (cap - M.base) * (1 - Math.exp(-s.insight / M.k));
    const r = raw - Math.min(d, N.demon.gate) * N.demon.penalty - Math.max(0, d - N.demon.gate) * N.demon.forcePenalty;
    return { rate: Math.max(0, Math.min(cap, r)), cap, forced: d > N.demon.gate };
  },

  preview(s, choice) {
    const L = layout;
    const t = L.tags(s, this.layoutOpts(s, choice));
    const j = L.judge(s, t);
    const env = layoutData.environments[choice.env || "洞府"];
    const r = this.rate(s, env.demon || 0);
    return { t, j, ...r };
  },

  // 進行大境界突破（短行動，耗時一季）
  attempt(s, choice) {
    const N = numbers, st = state, U = util;
    const p = this.preview(s, choice);
    const out = [];
    const envDemon = layoutData.environments[choice.env || "洞府"].demon || 0;
    if (choice.material) { s.materials[choice.material]--; if (s.materials[choice.material] <= 0) delete s.materials[choice.material]; }
    if (envDemon) s.demon = Math.min(N.demon.max, s.demon + envDemon);
    const fromRealm = st.realm(s).id;
    const tierKey = (s.realmIndex === 0 ? "築基突破" : "金丹突破");

    if (U.chance(p.rate)) {
      s.realmIndex++; s.stageIndex = 0; s.xiu = 0; s.insight = 0; s.fails = 0;
      out.push(`${p.forced ? "強行衝關，竟然" : ""}突破成功！你踏入了${st.stageName(s)}。體內氣血更盛，壽元也延長了。\n〔壽元上限 ${st.maxAge(s)} 歲〕`);
      st.note(s, `於${choice.env || "洞府"}突破至${st.realm(s).id}${choice.material ? "，以" + choice.material + "佈局" : ""}。`, "突破心得");
      if (p.j.level === "覺醒" || p.j.level === "天人合一") {
        const r = this.tryAwaken(s, p.j);
        out.push(`【${p.j.level}】${layout.omen(p.j)}${r.text}`);
        if (!r.ok) s.queue.push({ type: "ability", timing: tierKey, judge: { ...p.j, level: "共鳴" }, tags: p.t });
      } else {
        s.queue.push({ type: "ability", timing: tierKey, judge: p.j, tags: p.t });
      }
    } else {
      const M = st.realm(s).major;
      s.fails++; s.stats.breakFails++;
      const kept = s.insight * M.keep;
      s.insight = kept;
      s.scars = Math.min(N.scar.maxLayers, s.scars + 1);
      let dAdd = N.demon.failAdd + (s.fails - 1) * N.demon.failExtra;
      if (p.forced) dAdd *= N.demon.forceMult;
      s.demon = Math.min(N.demon.max, s.demon + dAdd);
      out.push(`衝擊${numbers.realms[s.realmIndex + 1].id}失敗。經脈受創，留下一道道傷；積累的感悟散去大半，心裡的魔念也重了幾分。\n〔感悟只剩 ${Math.round(kept)}，心魔 +${Math.round(dAdd)}〕`);
      if (p.forced && U.chance(N.risk.forcedFailDeath)) {
        out.push("心魔趁著衝關失敗的空隙一擁而上。你的意識沉入黑暗，再也沒有醒來。");
        legacy.die(s, "衝關身死");
        return out;
      }
      st.note(s, `於${choice.env || "洞府"}衝擊${fromRealm}瓶頸失敗${choice.material ? "，以" + choice.material + "佈局" : ""}。`, "突破心得");
    }
    s.turns++;
    const dead = cultivation.advanceSeason(s, out);
    if (!dead && s.demon >= N.demon.max) s.queue.unshift({ type: "qiudeviation" });
    return out;
  },

  // 覺醒：靈根要有該屬性；依靈根擲機率；同系已有體質則往上爬一階。回傳 { ok, text }
  canAwaken(s, label) {
    if (label === "心境" || label === "肉身") return true;
    if (layoutData.fusions.some(f => f.name === label)) return s.root.fusion === label;
    return s.root.elements.includes(label);
  },
  // 狀態欄名字下那行：體質升華靈根的那一系（例：玄水之體・木靈根）
  rootTitle(s) {
    if (!s.root) return "";
    const R = numbers.roots[s.root.type];
    const parts = [];
    let rest = s.root.elements.slice(), rootDone = false;
    const others = [];
    s.constitutions.forEach(c => {
      if (s.root.fusion && c.label === s.root.fusion) { parts.push(c.name); rootDone = true; }
      else if (rest.includes(c.label) && !s.root.fusion) { parts.push(c.name); rest = rest.filter(e => e !== c.label); }
      else others.push(c.name);
    });
    if (!rootDone) {
      if (s.root.fusion) parts.push(`${s.root.fusion}靈根`);
      else if (rest.length === s.root.elements.length) parts.push(`${R.name}（${rest.join("")}）`);
      else if (rest.length) parts.push(`${rest.join("")}靈根`);
    }
    return parts.concat(others).join("・");
  },
  awakenChance(s, j) {
    const C = numbers.constitution;
    const base = C.chance[s.root.type] ?? 0.15;
    return Math.min(C.maxChance, base + (j.level === "天人合一" ? C.heavenBonus : 0));
  },
  tryAwaken(s, j) {
    const A = abilities, C = numbers.constitution, label = j.label;
    const ladder = A.constitutions[label] || [label + "之體"];
    if (!this.canAwaken(s, label)) {
      return { ok: false, text: `那股${label}氣湧入體內，卻與你的${s.root.elements.join("")}之氣相互排斥，終究沒能扎根。` };
    }
    const have = s.constitutions.find(c => c.label === label);
    if (have && (have.rung ?? 0) >= ladder.length - 1) {
      return { ok: false, text: `${have.name}已臻極致，湧來的${label}氣只在經脈間流轉一圈，便散入四肢百骸。` };
    }
    if (!util.chance(this.awakenChance(s, j))) {
      return { ok: false, text: `那股${label}氣在體內翻湧良久，終究沒能凝成。` };
    }
    const rung = have ? (have.rung ?? 0) + 1 : (C.startRung[s.root.type] ?? 0);
    const m = C.mults[rung];
    const fusion = layoutData.fusions.find(f => f.name === label);
    const c = have || { label };
    c.rung = rung; c.name = ladder[rung];
    c.effect = fusion ? { tagMult2: [fusion.a, fusion.b, m] } : { tagMult: [label, m] };
    c.desc = (fusion ? `${fusion.a}、${fusion.b}` : label) + ` 標籤永久 ×${m}；需定期調和（第一階段未實作反噬）`;
    if (j.level === "天人合一") { c.heaven = true; }
    if (c.heaven) c.effect.life = C.heavenLife;
    if (!have) s.constitutions.push(c);
    state.note(s, have ? `突破時${j.level}，體質更進一步，化為「${c.name}」。` : `突破時${j.level}，覺醒「${c.name}」。`, "里程碑");
    const text = have ? `體內的${ladder[rung - 1]}再起變化，化為「${c.name}」。` : `你覺醒了「${c.name}」。`;
    return { ok: true, c, text: text + (j.level === "天人合一" && !have ? "天人合一，壽元也隨之綿長。" : "") };
  },

  // 能力池三選一的選項
  abilityOptions(s, timing, j, t) {
    const A = abilities, U = util, L = layout;
    const rw = A.rarityWeights[timing], tw = A.tierWeights[timing];
    const fus = j ? j.fusions : L.fusionTable(s, t);
    const avail = A.pool.filter(a => !s.abilities.includes(a.name));
    const w = a => {
      let pm = L.poolMult(t, fus, a.tag);
      if (!pm && routesData.routeTags.includes(a.tag)) pm = 2;   // 路線專屬系別不在佈局標籤裡
      return rw[a.rarity] * tw[a.tier] * pm * routes.tagBias(s, a.tag);
    };
    let opts = U.weightedDistinct(avail, w, 3);
    // 共鳴：保證出現一個該系稀有以上能力
    if (j && j.level === "共鳴") {
      const rare = avail.filter(a => a.tag === j.label && a.rarity !== "普通" && tw[a.tier] > 0);
      if (rare.length && !opts.some(o => rare.includes(o))) opts[opts.length - 1] = U.pick(rare);
    }
    return opts;
  },

  growthOptions(s) {
    const A = abilities, U = util, L = layout, st = state;
    const t = L.tags(s, { technique: s.technique, artifact: s.equipped, season: st.season(s) });
    const avail = A.growth.filter(g => g.repeat || !s.growth.includes(g.name));
    return U.weightedDistinct(avail, g => A.rarityWeights["成長池"][g.rarity] * (t[g.tag] || 1), 3);
  },

  // 走火入魔的三個選項
  deviation(s, pick) {
    const st = state;
    if (pick === "散功重修") {
      if (s.stageIndex > 0) s.stageIndex--; s.xiu = 0; s.insight = 0; s.demon = 0;
      st.note(s, "走火入魔，散功重修。", "里程碑");
      return `你散去部分功力，退回${st.stageName(s)}，心魔一掃而空。`;
    }
    if (pick === "硬撐") {
      if (util.chance(numbers.risk.holdOnDeath)) {
        legacy.die(s, "走火");
        return "你咬牙硬撐，經脈卻一寸寸斷開。這一次，你沒能撐過去。";
      }
      s.demon = 70; s.injury = 4; s.lifePenalty = (s.lifePenalty || 0);
      s.seasons += Math.round((st.maxAge(s) - st.age(s)) * 0.2) * 4;
      st.note(s, "走火入魔，硬撐下來，折損大量壽元。", "里程碑");
      return "你咬牙硬撐過去，經脈重創，折損了兩成剩餘壽元。";
    }
    // 入魔：氣修等路線就此轉為魔修；已是魔修則是放任魔性，可能被吞噬
    if (s.route === "魔修") {
      if (util.chance(routesData.routes["魔修"].deviationDeath)) { legacy.die(s, "魔性反噬"); return "你放任魔性奔湧。這一次，它沒有再聽你的話。"; }
      s.demon = 60; s.xiu += numbers.realms[s.realmIndex].perSeason * 3;
      st.note(s, "走火入魔，放任魔性，竟壓住了它。", "里程碑");
      return "魔氣在體內翻騰了三天三夜，最後被你一口吞下。功力反而更進一步。";
    }
    // 金丹以前：還墮不了魔，只能與心魔立約，在心底種下魔種
    if (s.realmIndex < 2) {
      s.flags["魔種"] = true; s.demon = 60;
      routes.adjust(s, "正邪", -15);
      st.note(s, "走火入魔時與心魔立約，它退去了，卻在心底留下一顆種子。", "里程碑");
      return "你對心魔說：好，我讓你留下。\n它安靜了下來，退進你心底最深的地方。你知道它沒走，只是在等。";
    }
    routes.setRoute(s, "魔修");
    s.demon = 60;
    st.note(s, "走火入魔，順勢墮入魔道，改修《天魔策》。", "里程碑");
    return "你不再抵抗。心魔湧進每一條經脈，然後安靜了下來。\n從今往後，你修的是魔道。"
  }
};
