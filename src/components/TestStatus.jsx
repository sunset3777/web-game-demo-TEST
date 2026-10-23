import { numbers } from "../data/numbers.js";
import { marks } from "../data/marks.js";
import { abilities } from "../data/abilities.js";
import { state } from "../systems/state.js";
import { breakthrough } from "../systems/breakthrough.js";
import { cultivation } from "../systems/cultivation.js";
import { growth } from "../systems/growth.js";
import { routes } from "../systems/routes.js";
import { routesData } from "../data/routes.js";
import { layoutData } from "../data/layout.js";

// 測試用：主角狀態總覽（只在「顯示數值」開啟時出現，放在畫面最下方）
const pct = x => (x * 100).toFixed(1) + "%";
const signed = x => (x >= 0 ? "+" : "") + pct(x);

export default function TestStatus({ game }) {
  const s = game.s, m = s.mortal;
  const aim = marks.aims.find(a => a.id === s.aim);
  const flags = Object.entries(s.flags).map(([k, v]) => (v === true ? k : `${k}：${v}`));
  const mats = Object.entries(s.materials).map(([k, v]) => `${k}×${v}`);
  const rows = [];
  const row = (k, v) => rows.push([k, v]);

  row("姓名", s.name);
  row("年紀", `${Math.floor(state.age(s))} 歲・${state.season(s)}（${s.startAge} 歲開局）`);

  if (!s.root && m) {
    const left = m.playable - m.done;
    const top = Object.entries(m.counts).sort((a, b) => b[1] - a[1])[0];
    const lead = top && marks.aims.find(a => a.id === top[0]);
    row("凡人期", `已過 ${m.done} 季，還能安排 ${left} 季${m.auto > 0 ? `，之後 ${m.auto} 年自動帶過` : ""}`);
    row("目前傾向", lead ? `${lead.id}（印記「${lead.mark}」：${lead.desc}）` : "尚無");
  } else {
    const r = state.realm(s), b = state.bonuses(s);
    row("境界", `${state.stageName(s)}（第 ${s.turns} 回合，修仙 ${s.seasons} 季）`);
    row("修為", `${Math.round(s.xiu)} / ${state.stageReq(s)}${state.inBottleneck(s) ? "（瓶頸）" : ""}${s.stageRest > 0 ? `・小境界調息剩 ${s.stageRest} 季` : ""}`);
    if (r.major) {
      const br = breakthrough.rate(s);
      row("感悟", `${Math.round(s.insight)}・突破成功率 ${pct(br.rate)}（上限 ${pct(br.cap)}${br.forced ? "，心魔過高強行衝關" : ""}）・失敗 ${s.fails} 次`);
    }
    row("壽元", `${Math.floor(state.age(s))} / ${state.maxAge(s)}（境界 ${r.life}${b.life ? ` + 加成 ${b.life}` : ""}）`);
    row("心魔", `${Math.round(s.demon)} / ${numbers.demon.max}（門檻 ${numbers.demon.gate}，增長 ×${b.demonGain.toFixed(2)}）`);
    row("道傷", `${s.scars} 層${s.injury ? `・受傷剩 ${s.injury} 季` : ""}`);
    if (s.root) row("靈根", `${s.root.label}（修練 ×${state.rootMult(s)}${s.root.fusion ? `，融合 ${s.root.fusion}` : ""}）`);
    if (aim) row("少年印記", `「${s.mark}」：${aim.desc}${s.comboMark ? `；組合印記「${s.comboMark}」（第一階段尚無效果）` : ""}`);
    row("加成合計", [
      `修練 ${signed(b.cult)}`, `閉關 ${signed(b.seclude)}`, `感悟 ${signed(b.insight)}`,
      `受傷 ×${b.injury.toFixed(2)}`, `材料 ${signed(b.material)}`, `事件 ${signed(b.event)}`,
      ...Object.entries(b.tagMult).map(([t, v]) => `${t} ×${v.toFixed(2)}`)
    ].join("・"));
    const ab = s.abilities.map(n => abilities.pool.find(x => x.name === n)).filter(Boolean).map(a => `${a.name}：${a.desc}`);
    const gr = growth.list(s).map(x => `${x.label}（${x.name}×${x.n}，每重 ${growth.def(x.name).desc}）${growth.atCap(s, x.name) ? "［已達本境界上限］" : ""}`);
    const store = Object.entries(s.growthStore || {}).map(([k, v]) => `${k}×${v}`);
    row("神通", ab.length ? ab.join("；") : "無");
    row("體悟", (gr.length ? gr.join("；") : "無") + `・本境界上限 ${growth.cap(s)} 重`);
    row("積蘊（突破後化開）", store.length ? store.join("、") : "無");
    row("體質", (s.constitutions.length ? s.constitutions.map(c => `${c.name}（${c.label}・第 ${(c.rung ?? 0) + 1} 階）：${c.desc}`).join("；") : "無")
      + `・覺醒成功率 ${pct(breakthrough.awakenChance(s, { level: "覺醒" }))}（天人合一 ${pct(breakthrough.awakenChance(s, { level: "天人合一" }))}）`);
    row("主修", s.technique + (s.equipped ? `・佩戴 ${s.equipped}` : ""));
  }
  if (s.root) {
    const rv = routes.view(s), rd = routesData.routes[s.route || "氣修"];
    row("路線", `${rd.name}：${rd.desc}${Object.keys(rd.mods).length ? `（${JSON.stringify(rd.mods).replace(/"/g, "")}）` : ""}`);
    row("傾向", `正邪 ${Math.round(rv.正邪)}・穩躁 ${Math.round(rv.穩躁)}・習慣 ${rv.habit || "無"}（${Object.entries(rv.act).map(([k, v]) => `${k} ${v.toFixed(1)}`).join("、")}）・稱號「${routes.title(s)}」`);
    row("最近事件", (s.recentEvents || []).join("、") || "無");
  }
  row("靈石", s.stones);
  row("材料", mats.length ? mats.join("、") : "無");
  row("旗標", flags.length ? flags.join("、") : "無");
  row("因果", s.karma.length ? s.karma.map(k => `${k.text}${k.done ? "（已了結）" : ""}`).join("；") : "無");

  // 眼前選項背後的內容（原本寫在選項按鈕上，移到這裡）
  const hints = [];
  const hint = (k, v) => hints.push([k, v]);
  if (s.awakenOpts && s.root && !s.abilities.length) {
    s.awakenOpts.forEach(o => hint(abilities.vision(o.ability, o.tag), `${o.ability}＋主修${o.technique}${o.fromMark ? "（少年印記）" : ""}`));
  }
  if (s.current && s.current.type === "growth") {
    s.current.options.forEach(n => { const g = growth.def(n); hint(growth.title(n, growth.count(s, n)), `${n}・${g.rarity}・${g.desc}・目前 ${growth.count(s, n)}／${growth.cap(s)} 重${growth.atCap(s, n) ? "（已滿，選了只會積蘊）" : ""}`); });
  }
  if (s.current && s.current.type === "ability") {
    s.current.options.forEach(n => { const a = abilities.pool.find(x => x.name === n); if (a) hint(abilities.vision(a.name), `${a.name}・${a.rarity}・${a.tier}・${a.desc}`); });
  }
  if (s.root && !s.current && s.abilities.length) {
    const neck = state.inBottleneck(s), L = state.realm(s).longLen;
    ["吐納", "周天", "閉關", "遊歷"].forEach(a => hint(a,
      `${neck ? `感悟 +${Math.round(cultivation.insightPerSeason(s, a))}` : `修為 +${Math.round(cultivation.xiuPerSeason(s, a))}`}/季・${L} 季${L > 1 ? "（修滿 ×1.1）" : ""}`));
  }
  if (s.root && game.ui.panel === "bt" && state.inBottleneck(s)) {
    const bt = game.ui.bt;
    const env = breakthrough.envUsable(s, bt.env) ? bt.env : "洞府";
    const material = bt.material && s.materials[bt.material] ? bt.material : "";
    const p = breakthrough.preview(s, { material, env }), j = p.j;
    hint("突破成功率", `${pct(p.rate)}（上限 ${pct(p.cap)}${s.scars ? `，道傷 ${s.scars} 層` : ""}${p.forced ? "，強行衝關" : ""}）`);
    hint("佈局判定", `${j.level}・採用 ${j.label} ${j.score.toFixed(2)} 分・純度 ${pct(j.purity)}`);
    hint("各標籤", layoutData.tags.map(k => `${k} ${p.t[k].toFixed(2)}`).join("・"));
    const fusOk = j.fusions.filter(f => f.ok);
    if (fusOk.length) hint("成立的融合系", fusOk.map(f => `${f.name}（${f.score.toFixed(1)}${f.own ? "，已擁有" : "，機緣"}）`).join("、"));
  }

  return (
    <section className="card test-card test">
      <h3>主角狀態</h3>
      <div className="test-grid">
        {rows.map(([k, v]) => (
          <div key={k} className="test-item"><div className="test-k">{k}</div><div>{v}</div></div>
        ))}
      </div>
      {hints.length > 0 && (
        <>
          <h4 className="test-sub">眼前選項的底牌</h4>
          <div className="test-grid">
            {hints.map(([k, v], i) => (
              <div key={i} className="test-item"><div className="test-k">{k}</div><div>{v}</div></div>
            ))}
          </div>
        </>
      )}
      {!s.root && m && (
        <table className="test-table">
          <thead><tr><th>行動</th>{marks.aims.map(a => <th key={a.id}>{a.id}</th>)}</tr></thead>
          <tbody>
            <tr><td className="test-k">已做</td>{marks.aims.map(a => <td key={a.id}>{m.counts[a.id] || 0} 季</td>)}</tr>
            <tr><td className="test-k">印記</td>{marks.aims.map(a => <td key={a.id}>{a.mark}</td>)}</tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
