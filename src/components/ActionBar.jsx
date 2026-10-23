import { numbers } from "../data/numbers.js";
import { state } from "../systems/state.js";
import BreakthroughPanel from "./BreakthroughPanel.jsx";
import MarketPanel from "./MarketPanel.jsx";

const ACTIONS = [
  ["吐納", "一呼一吸，不急不躁"],
  ["周天", "日夜搬運周天，一刻不停"],
  ["閉關", "封了洞府，不問外事"],
  ["遊歷", "出門走走，看看外面的世界"]
];

export default function ActionBar({ game }) {
  const s = game.s;
  const neck = state.inBottleneck(s);
  const L = state.realm(s).longLen;
  return (
    <>
      <div className="actions">
        {ACTIONS.map(([a, sub]) => (
          <div className="act" key={a}>
            <button className="act-main" onClick={() => game.doAction(a, L > 1)}>
              <span className="act-name">{a}</span>
              <span className="act-sub">{sub}</span>
            </button>
            {L > 1 && <button className="act-short" title="只坐一季便起身" onClick={() => game.doAction(a, false)}>先一季</button>}
          </div>
        ))}
        {neck && (
          <div className="act">
            <button className="act-main accent" onClick={() => game.togglePanel("bt")}>
              <span className="act-name">突破</span>
              <span className="act-sub">選好時機與地點，衝擊{numbers.realms[s.realmIndex + 1].id}</span>
            </button>
          </div>
        )}
      </div>
      <div className="small-actions">
        <button className="ghost" onClick={() => game.togglePanel("market")}>坊市</button>
        {(s.demoEnd || state.age(s) > 60) && <button className="ghost" onClick={game.retire}>坐化</button>}
      </div>
      {game.ui.panel === "bt" && neck && <BreakthroughPanel game={game} />}
      {game.ui.panel === "market" && <MarketPanel game={game} />}
    </>
  );
}
