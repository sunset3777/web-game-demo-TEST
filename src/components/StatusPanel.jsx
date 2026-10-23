import { numbers } from "../data/numbers.js";
import { state } from "../systems/state.js";
import { breakthrough } from "../systems/breakthrough.js";
import Bar from "./Bar.jsx";

const pct = x => (x * 100).toFixed(1) + "%";

export default function StatusPanel({ game }) {
  const s = game.s;
  const age = state.age(s), maxAge = state.maxAge(s);
  const neck = state.inBottleneck(s);
  const req = state.stageReq(s);
  const mats = Object.entries(s.materials);
  return (
    <aside className="status card">
      <div className="who">
        <div className="who-name">{s.name}</div>
        <div className="muted">{s.root.label}・人稱「{s.mark}」{s.comboMark ? `「${s.comboMark}」` : ""}</div>
      </div>
      <div className="realm">
        {state.stageName(s)}
        {neck && <span className="pill warn">瓶頸</span>}
        {s.demoEnd && <span className="pill">demo 終點</span>}
      </div>
      <dl className="stats">
        <dt>年歲</dt>
        <dd>{Math.floor(age)} 歲・{state.season(s)}　<span className="muted">壽元 {maxAge}</span>
          <Bar value={age} max={maxAge} tone={age / maxAge > 0.85 ? "danger" : ""} /></dd>
        <dt>{neck ? "感悟" : "修為"}</dt>
        <dd>{neck
          ? <>{Math.round(s.insight)}</>
          : <>{Math.round(s.xiu)} / {req}<Bar value={s.xiu} max={req} /></>}</dd>
        <dt>心魔</dt>
        <dd>{Math.round(s.demon)}{s.demon > numbers.demon.gate && <span className="pill warn">高於 {numbers.demon.gate}</span>}
          <Bar value={s.demon} max={numbers.demon.max} tone="demon" /></dd>
        <dt>道傷</dt>
        <dd>{s.scars ? "●".repeat(s.scars) : "無"}{s.injury > 0 && <span className="pill warn">受傷 {s.injury} 季</span>}</dd>
        <dt>靈石</dt><dd className="num">{s.stones}</dd>
        <dt>主修</dt>
        <dd><select aria-label="主修功法" value={s.technique} onChange={e => game.setTechnique(e.target.value)}>
          {s.techniques.map(t => <option key={t}>{t}</option>)}</select></dd>
        <dt>靈器</dt>
        <dd>{s.artifacts.length
          ? <select aria-label="靈器" value={s.equipped || ""} onChange={e => game.equip(e.target.value)}>
              <option value="">（不佩戴）</option>{s.artifacts.map(a => <option key={a}>{a}</option>)}</select>
          : <span className="muted">尚無</span>}</dd>
      </dl>
      <div className="chips"><div className="chips-label">神通與體悟</div>
        {s.abilities.concat(s.growth).map((a, i) => <span key={i} className="chip">{a}</span>)}
        {s.constitutions.map((c, i) => <span key={"c" + i} className="chip gold">{c.name}</span>)}
      </div>
      <div className="chips"><div className="chips-label">素材</div>
        {mats.length ? mats.map(([k, v]) => <span key={k} className="chip">{k} ×{v}</span>) : <span className="muted small">尚無</span>}
      </div>
      <div className="chips"><div className="chips-label">已知突破地點</div>
        {s.envs.map(e => <span key={e} className="chip">{e}</span>)}
      </div>
    </aside>
  );
}
