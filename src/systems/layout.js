// 佈局系統：計算 7 個標籤分數、融合系、純度與覺醒判定
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { state } from "./state.js";

export const layout = {
  // opts: { technique, material, artifact, env, season, includeRoot(預設 true) }
  tags(s, opts) {
    const L = layoutData, R = numbers.roots, st = state;
    const t = {}; L.tags.forEach(k => t[k] = 1);
    const mul = (m) => { if (!m) return; for (const k in m) if (k in t) t[k] *= m[k]; };
    mul(L.techniques[opts.technique]);
    if (opts.material) mul(L.materials[opts.material]);
    if (opts.artifact) mul(L.artifacts[opts.artifact]);
    if (opts.env) mul(L.environments[opts.env].mults);
    if (opts.season) mul(L.seasons[opts.season]);
    if (opts.includeRoot !== false && s.root) {
      const tagM = R[s.root.type].tag;
      s.root.elements.forEach(e => t[e] *= tagM);
    }
    mul(st.bonuses(s).tagMult);
    return t;
  },

  fusionTable(s, t) {
    const L = layoutData, F = L.fusionRule;
    const owned = s.root && s.root.fusion;
    return L.fusions.map(f => {
      const a = t[f.a], b = t[f.b], lo = Math.min(a, b), hi = Math.max(a, b);
      const ok = lo >= F.min && lo >= F.ratio[f.kind] * hi;
      const score = ok ? (a + b - F.base) * F.mult[f.kind] : 0;
      const own = owned === f.name;
      return { ...f, scoreA: a, scoreB: b, ok, score, own, poolMult: own ? score : score * F.luck };
    });
  },

  // 整體判定：單一標籤 vs 擁有的融合系，取高者
  judge(s, t) {
    const L = layoutData, F = L.fusionRule;
    const total = L.tags.reduce((x, k) => x + t[k], 0);
    let bestTag = L.tags[0];
    L.tags.forEach(k => { if (t[k] > t[bestTag]) bestTag = k; });
    let pick = { label: bestTag, score: t[bestTag], purity: t[bestTag] / total, fusion: null };
    const fus = this.fusionTable(s, t);
    const own = fus.find(f => f.own && f.ok);
    if (own && own.score > pick.score) {
      pick = { label: own.name, score: own.score, purity: (own.scoreA + own.scoreB - F.base) / (total - F.base), fusion: own.name };
    }
    let level = "一般";
    for (const th of L.thresholds) { if (pick.score >= th.score && pick.purity >= th.purity) { level = th.name; break; } }
    return { ...pick, level, fusions: fus, total };
  },

  // 標籤或融合系名稱 → 能力池倍率
  poolMult(t, fus, tag) {
    if (tag in t) return t[tag];
    const f = fus.find(x => x.name === tag);
    return f ? f.poolMult : 0;
  },

  // 天意提示（不顯示數字）
  omen(j) {
    const label = j.label;
    if (j.level === "天人合一") return `天地間的${label}氣朝你匯聚，萬物彷彿都在等待這一刻。`;
    if (j.level === "覺醒") return `你感到體內${label}息躁動不已，似有異變將至。`;
    if (j.level === "共鳴") return `體內${label}氣隱隱共鳴，這次突破或許會有所不同。`;
    return "氣息平穩，看不出什麼徵兆。";
  }
};
