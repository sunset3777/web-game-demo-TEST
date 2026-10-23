import { numbers } from "../data/numbers.js";
import { state } from "../systems/state.js";
import { legacy } from "../systems/legacy.js";
import { visibleText } from "./text.js";

export default function EndScreen({ game }) {
  const s = game.s;
  return (
    <section className="card">
      <h2>一世終了</h2>
      <p className="story">{s.lastText ? visibleText(game, s.lastText) + "\n" : ""}{s.name}，{s.root ? s.root.label : ""}，{s.cause}於{state.stageName(s)}，享年 {Math.floor(state.age(s))} 歲。</p>
      <p className="lead">後人稱你為「{legacy.title(s)}」。</p>
      <h3>選擇要留下的筆記（最多 {numbers.legacy.maxPages} 頁）</h3>
      <p className="muted small">下一世遊歷時可能找到你的遺府，你留下的筆記會成為後人的一點領悟。{game.testMode && <span className="test">〔每頁化為 {numbers.legacy.pageInsight} 點感悟〕</span>}</p>
      <ul className="notes-pick">
        {s.notes.map((n, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={game.ui.picks.includes(i)} onChange={() => game.toggleNotePick(i)} />
              <span className="when">{n.when}</span>{n.text}
            </label>
          </li>
        ))}
      </ul>
      <button className="primary" onClick={game.bequeath}>留下筆記，進入下一世</button>
    </section>
  );
}
