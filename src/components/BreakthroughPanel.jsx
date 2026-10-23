import { layoutData } from "../data/layout.js";
import { state } from "../systems/state.js";
import { layout } from "../systems/layout.js";
import { breakthrough } from "../systems/breakthrough.js";

export default function BreakthroughPanel({ game }) {
  const s = game.s, bt = game.ui.bt;
  const env = breakthrough.envUsable(s, bt.env) ? bt.env : "洞府";
  const material = bt.material && s.materials[bt.material] ? bt.material : "";
  const p = breakthrough.preview(s, { material, env });
  const j = p.j;
  return (
    <div className="panel">
      <h3>突破佈局</h3>
      <div className="grid2">
        <div className="field">
          <label htmlFor="bt-mat">素材（會消耗）</label>
          <select id="bt-mat" value={material} onChange={e => game.setBt("material", e.target.value)}>
            <option value="">（不用素材）</option>
            {Object.entries(s.materials).map(([k, v]) => <option key={k} value={k}>{k} ×{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bt-env">地點</label>
          <select id="bt-env" value={env} onChange={e => game.setBt("env", e.target.value)}>
            {s.envs.map(e => {
              const ok = breakthrough.envUsable(s, e);
              return <option key={e} value={e} disabled={!ok}>{e}{ok ? "" : `（${layoutData.environments[e].season}季才行）`}</option>;
            })}
          </select>
        </div>
      </div>
      <p className="muted small">主修 {s.technique}・靈器 {s.equipped || "無"}・季節 {state.season(s)}・{s.root.label}</p>
      <p className="omen">{layout.omen(j)}{p.forced ? "　心魔太重，此刻衝關是強行衝關。" : ""}</p>
      <div className="row">
        <button className="primary" onClick={() => {
          if (bt.material !== material) game.setBt("material", material);
          if (bt.env !== env) game.setBt("env", env);
          game.doBreakthrough();
        }}>開始突破</button>
        <button className="ghost" onClick={() => game.togglePanel("bt")}>取消</button>
      </div>
    </div>
  );
}
