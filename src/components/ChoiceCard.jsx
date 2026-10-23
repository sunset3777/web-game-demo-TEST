import { abilities } from "../data/abilities.js";
import { events } from "../systems/events.js";
import { growth } from "../systems/growth.js";

export default function ChoiceCard({ game }) {
  const s = game.s, c = s.current;
  if (c.type === "growth") {
    return (
      <div className="choice">
        <h3>靈光一閃</h3>
        <p className="muted">境界稍進，心有所感。你想往哪一處去體會？</p>
        <div className="options">
          {c.options.map((n, i) => {
            return (
              <button key={i} className="option" onClick={() => game.pick(i)}>
                <span className="opt-title">{growth.title(n, growth.count(s, n))}</span>
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
                <span className="opt-title">{abilities.vision(a.name)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (c.type === "event") {
    const e = events.find(c.id);
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
      ["硬撐", "保住境界，但身受重傷，壽元也折損不少"],
      ["入魔", s.route === "魔修" ? "放任魔性奔湧，可能就此被吞噬" : s.realmIndex < 2 ? "心魔退去，卻會在心底留下一樣東西" : "不再抵抗，墮入魔道，改修魔功"]
    ];
    return (
      <div className="choice danger-zone">
        <h3>走火入魔</h3>
        <p className="story">心魔滿溢，經脈逆行，眼前一片血紅。</p>
        <div className="options">
          {opts.map(([k, sub]) => (
            <button key={k} className="option" onClick={() => game.deviate(k)}>
              <span className="opt-title">{k === "入魔" ? (s.route === "魔修" ? "放任魔性" : s.realmIndex < 2 ? "與心魔立約" : "順勢入魔") : k}</span><span className="opt-sub">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
