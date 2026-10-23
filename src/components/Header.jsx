import { numbers } from "../data/numbers.js";

export default function Header({ game }) {
  return (
    <header className="top">
      <div className="brand">
        <span className="seal">修</span>
        <div>
          <div className="brand-name">一世修仙</div>
          <div className="brand-sub">文字版 demo{game.testMode && <span className="test">・數值 {numbers.version}</span>}</div>
        </div>
      </div>
      <div className="top-actions">
        <button className="ghost" onClick={game.toggleTestMode}>{game.testMode ? "隱藏數值" : "顯示數值"}</button>
        {game.s && <button className="ghost" onClick={game.toTitle}>回標題</button>}
      </div>
    </header>
  );
}
