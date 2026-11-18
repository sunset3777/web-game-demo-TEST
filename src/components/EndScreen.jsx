import { numbers } from "../data/numbers.js";
import { state } from "../systems/state.js";
import { legacy } from "../systems/legacy.js";
import { visibleText } from "./text.js";

// 下一世讀到時隔了幾世 → 效力說明（1 世全效、2 世減半；更早的不會出現在清單裡）
const CLUE_STRENGTH_LABEL = { 1: "全效", 2: "隔兩世，效力減半" };

export default function EndScreen({ game }) {
  const s = game.s;
  const passedDownClues = legacy.previewDemonKingCluesForNextLife(s);
  return (
    <section className="card">
      <h2>一世終了</h2>
      {game.flash && <p className="flash">{game.flash}</p>}
      <p className="story">{s.lastText ? visibleText(game, s.lastText) + "\n" : ""}{s.name}，{s.root ? s.root.label : ""}，{s.cause}於{state.stageName(s)}，享年 {Math.floor(state.age(s))} 歲。</p>
      <p className="lead">後人稱你為「{legacy.title(s)}」。</p>
      <h3>選擇要留下的筆記（最多 {numbers.legacy.maxPages} 頁）</h3>
      <p className="muted small">下一世遊歷時可能找到你的遺府，你留下的筆記會成為後人的一點領悟。{game.testMode && <span className="test">〔每頁化為 {numbers.legacy.pageInsight} 點感悟〕</span>}</p>
      <ul className="notes-pick">
        {/* 線索頁會自動傳下，不列在這裡；勾選用的仍是筆記在 s.notes 裡的原始位置 */}
        {s.notes.map((n, i) => legacy.isUnpickableNote(n) ? null : (
          <li key={i}>
            <label>
              <input type="checkbox" checked={game.ui.picks.includes(i)} onChange={() => game.toggleNotePick(i)} />
              <span className="when">{n.when}</span>{n.text}
            </label>
          </li>
        ))}
      </ul>
      {passedDownClues.length > 0 && (
        <section className="auto-passed" aria-label="自動傳下">
          <h3>自動傳下</h3>
          <p className="muted small">這些關於妖王的心得不必挑選，會自動帶到下一世，也不佔筆記頁。</p>
          <ul>
            {passedDownClues.map(clue => (
              <li key={clue.type}>妖王{clue.type}<span className="muted">（{CLUE_STRENGTH_LABEL[clue.livesAgo] || "效力已淡"}）</span></li>
            ))}
          </ul>
        </section>
      )}
      <button className="primary" onClick={game.bequeath}>留下筆記，進入下一世</button>
    </section>
  );
}
