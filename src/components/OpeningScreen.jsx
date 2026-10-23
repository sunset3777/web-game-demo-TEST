import { marks } from "../data/marks.js";
import { abilities } from "../data/abilities.js";
import { numbers } from "../data/numbers.js";
import { state } from "../systems/state.js";
import { opening } from "../systems/opening.js";
import { events } from "../systems/events.js";
import TestStatus from "./TestStatus.jsx";

// 開局：凡人期（每季行動＋小事件）→ 測靈 → 入定幻境三選一
// 文字以沉浸感為先：機制與數字只在「顯示數值」開啟時出現（.test 區塊）
export default function OpeningScreen({ game }) {
  const s = game.s;
  const m = s.mortal;
  const T = game.testMode;

  if (!m) {
    return (
      <section className="card">
        <h2>青石鎮</h2>
        <p className="story">{s.name}，你還是個普通孩子。{"\n"}鎮上的日子很慢，春天插秧，秋天收稻，偶爾有說書人經過。</p>
        <div className="options">
          <button className="option" onClick={game.startMortal}>
            <span className="opt-title">過好這幾年</span>
            <span className="opt-sub">春去秋來，你會親手度過每一季。</span>
          </button>
        </div>
        <h3>那幾年一晃而過</h3>
        <p className="muted small">如果你已經知道自己想成為怎樣的人。</p>
        <div className="options">
          {marks.aims.map(a => (
            <button key={a.id} className="option" onClick={() => game.chooseAim(a.id)}>
              <span className="opt-title">那幾年，你大多{a.habit}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (!m.finished) {
    const left = m.playable - m.done;
    const e = m.pending ? opening.mortalEvent(s) : null;
    return (
      <>
      <section className="card">
        <h2>{Math.floor(state.age(s))} 歲那年的{state.season(s)}天</h2>
        {m.done === 0 && <p className="story">{m.intro.join("\n")}</p>}
        {m.lastText && !e && <p className="story" key={m.lastText}>{m.lastText}</p>}
        {!e && !(m.done === 0 && s.startAge >= 16) && <p className="muted">還有 {left} 季就到測靈的日子了。</p>}
        {e ? (
          <div className="choice">
            <h3>{e.title}</h3>
            <p className="story">{events.text(s, e)}</p>
            <div className="options">
              {events.choices(s, e).map((c, i) => (
                <button key={i} className="option" onClick={() => game.mortalPick(i)}><span className="opt-title">{c.label}</span></button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="lead">這一季，你打算……</p>
            <div className="options">
              {marks.aims.map(a => (
                <button key={a.id} className="option" onClick={() => game.mortalAct(a.id)}>
                  <span className="opt-title">{a.verb}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      {T && <TestStatus game={game} />}
      </>
    );
  }

  if (!s.root) {
    return (
      <>
      <section className="card">
        <h2>十八歲</h2>
        {m.lastText && <p className="story">{m.lastText}</p>}
        <p className="story">{s.mortalLines.join("\n")}</p>
        <p className="story">十八歲那年的春天，仙門的人來到鎮上。祠堂前擺了一塊灰撲撲的石頭，孩子們排成一列。</p>
        <button className="primary" onClick={game.takeTest}>把手放上測靈石</button>
      </section>
      {T && <TestStatus game={game} />}
      </>
    );
  }

  return (
    <>
    <section className="card">
      <h2>測靈</h2>
      <p className="story">{s.rootLines.join("\n")}</p>
      <p className="story">老執事遞給你一本冊子：「修仙也好，做凡人也罷，記下走過的路。」{"\n"}你翻開冊子，前幾頁不知何時已寫著你少年時的事。</p>
      <h3>入定</h3>
      <p className="story">當晚，你照著老執事教的法子靜坐。恍惚間，三個景象浮現在眼前。</p>
      <div className="options">
        {s.awakenOpts.map((o, i) => (
          <button key={i} className="option" onClick={() => game.chooseAwakening(i)}>
            <span className="opt-title">{abilities.imagery[o.tag]}</span>
          </button>
        ))}
      </div>
    </section>
    {T && <TestStatus game={game} />}
    </>
  );
}
