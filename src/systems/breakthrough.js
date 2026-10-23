// 突破系統：大境界突破成功率、道傷與心魔、覺醒、能力池與成長池三選一、走火入魔
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { abilities } from "../data/abilities.js";
import { util, state } from "./state.js";
import { layout } from "./layout.js";
import { cultivation } from "./cultivation.js";
import { legacy } from "./legacy.js";

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
    const cap = Math.max(M.base, M.cap - Math.min(s.scars, N.scar.maxLayers) * N.scar.perLayer);
    const d = s.demon + (extraDemon || 0);
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
      out.push(`${p.forced ? "強行衝關，竟然" : ""}突破成功！你踏入了${st.stageName(s)}。壽元提升至 ${st.maxAge(s)} 歲。`);
      st.note(s, `於${choice.env || "洞府"}突破至${st.realm(s).id}${choice.material ? "，以" + choice.material + "佈局" : ""}。`, "突破心得");
      if (p.j.level === "覺醒" || p.j.level === "天人合一") {
        const c = this.awaken(s, p.j);
        out.push(`【${p.j.level}】${layout.omen(p.j)}你覺醒了「${c.name}」：${c.desc}。`);
        if (p.j.level === "天人合一") { s.constitutions[s.constitutions.length - 1].effect.life = 20; out.push("天人合一，壽元額外 +20 年。"); }
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
      out.push(`衝擊${numbers.realms[s.realmIndex + 1].id}失敗。經脈受創，留下一道道傷；感悟只剩 ${Math.round(kept)}，心魔 +${Math.round(dAdd)}。`);
      st.note(s, `於${choice.env || "洞府"}衝擊${fromRealm}瓶頸失敗${choice.material ? "，以" + choice.material + "佈局" : ""}。`, "突破心得");
    }
    s.turns++;
    const dead = cultivation.advanceSeason(s, out);
    if (!dead && s.demon >= N.demon.max) s.queue.unshift({ type: "qiudeviation" });
    return out;
  },

  // 覺醒：得到體質
  awaken(s, j) {
    const A = abilities;
    const name = A.constitutions[j.label] || (j.label + "之體");
    const c = { name, label: j.label, desc: "", effect: {} };
    const fusion = layoutData.fusions.find(f => f.name === j.label);
    if (fusion) { c.effect.tagMult2 = [fusion.a, fusion.b, 1.3]; c.desc = `${fusion.a}、${fusion.b} 標籤永久 ×1.3`; }
    else { c.effect.tagMult = [j.label, 1.3]; c.desc = `${j.label}標籤永久 ×1.3`; }
    c.desc += "；需定期調和（第一階段未實作反噬）";
    s.constitutions.push(c);
    state.note(s, `突破時${j.level}，覺醒「${name}」。`, "里程碑");
    return c;
  },

  // 能力池三選一的選項
  abilityOptions(s, timing, j, t) {
    const A = abilities, U = util, L = layout;
    const rw = A.rarityWeights[timing], tw = A.tierWeights[timing];
    const fus = j ? j.fusions : L.fusionTable(s, t);
    const avail = A.pool.filter(a => !s.abilities.includes(a.name));
    const w = a => rw[a.rarity] * tw[a.tier] * L.poolMult(t, fus, a.tag);
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
      s.demon = 70; s.injury = 4; s.lifePenalty = (s.lifePenalty || 0);
      s.seasons += Math.round((st.maxAge(s) - st.age(s)) * 0.2) * 4;
      st.note(s, "走火入魔，硬撐下來，折損大量壽元。", "里程碑");
      return "你咬牙硬撐過去，經脈重創，折損了兩成剩餘壽元。";
    }
    legacy.die(s, "入魔");
    return "你順著心魔墮入魔道。（demo 尚未開放魔修路線，這一世到此結束。）";
  }
};
