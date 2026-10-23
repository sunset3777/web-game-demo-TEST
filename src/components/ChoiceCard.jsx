import { abilities } from "../data/abilities.js";
import { eventsData } from "../data/events.js";
import { events } from "../systems/events.js";

export default function ChoiceCard({ game }) {
  const s = game.s, c = s.current;
  if (c.type === "growth") {
    return (
      <div className="choice">
        <h3>靈光一閃</h3>
        <p className="muted">小境界突破，心有所悟。選一個方向：</p>
        <div className="options">
          {c.options.map((n, i) => {
            const g = abilities.growth.find(x => x.name === n);
            return (
              <button key={i} className="option" onClick={() => game.pick(i)}>
                <span className="opt-title">{n}<span className={`rar ${g.rarity}`}>{g.rarity}</span></span>
                <span className="opt-sub">{g.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (c.type === "ability") {
    return (
      <div className="choice">
        <h3>入定幻境{c.level === "共鳴" ? "・共鳴" : ""}</h3>
        <p className="muted">突破之際，三個景象浮現。走向哪一個？</p>
        <div className="options">
          {c.options.map((n, i) => {
            const a = abilities.pool.find(x => x.name === n);
            return (
              <button key={i} className="option" onClick={() => game.pick(i)}>
                <span className="opt-title">{abilities.imagery[a.tag] || a.tag}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (c.type === "event") {
    const e = eventsData.list.find(x => x.id === c.id);
    return (
      <div className="choice">
        <h3>{e.title}</h3>
        <p className="story">{events.text(s, e)}</p>
        <div className="options">
          {events.choices(s, e).map((ch, i) => (
            <button key={i} className="option" onClick={() => game.pick(i)}><span className="opt-title">{ch.label}</span></button>
          ))}
        </div>
      </div>
    );
  }
  if (c.type === "deviation") {
    const opts = [
      ["散功重修", "退回上一個小境界，心魔歸零"],
      ["硬撐", "保住境界，但重傷並折損兩成剩餘壽元"],
      ["入魔", "demo 尚未開放魔修，這一世會結束"]
    ];
    return (
      <div className="choice danger-zone">
        <h3>走火入魔</h3>
        <p className="story">心魔滿溢，經脈逆行，眼前一片血紅。</p>
        <div className="options">
          {opts.map(([k, sub]) => (
            <button key={k} className="option" onClick={() => game.deviate(k)}>
              <span className="opt-title">{k === "入魔" ? "順勢入魔" : k}</span><span className="opt-sub">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
