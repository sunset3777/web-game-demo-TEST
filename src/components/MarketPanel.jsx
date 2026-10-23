import { numbers } from "../data/numbers.js";
import { state } from "../systems/state.js";
import { cultivation } from "../systems/cultivation.js";

export default function MarketPanel({ game }) {
  const s = game.s, M = numbers.market;
  return (
    <div className="panel">
      <h3>坊市・{state.season(s)}季</h3>
      <p className="muted small">價格隨季節浮動。目前靈石 {s.stones}。</p>
      <div className="market">
        {Object.keys(M.prices).map(k => {
          const p = cultivation.price(s, k);
          return (
            <div key={k} className="mrow">
              <span>{k}</span>
              <span className="num">{p} 靈石
                {p < M.prices[k] && <span className="pill good">便宜</span>}
                {p > M.prices[k] && <span className="pill warn">貴</span>}</span>
              <button className="ghost" disabled={s.stones < p} onClick={() => game.buy(k)}>買</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
