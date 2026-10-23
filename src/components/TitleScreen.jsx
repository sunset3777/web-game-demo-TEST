import { useState } from "react";
import { state } from "../systems/state.js";
import { opening } from "../systems/opening.js";
import { save as saveFile } from "../systems/save.js";

export default function TitleScreen({ game }) {
  const [name, setName] = useState(() => opening.randomName());
  const [isConfirmingNewLife, setIsConfirmingNewLife] = useState(false);
  const save = saveFile.load();
  const L = saveFile.loadLegacy();
  const lives = (L.lives || []).slice().reverse();
  return (
    <section className="card title-card">
      <h1>一世修仙</h1>
      <p className="lead">從凡人到金丹，一生只有一次。準備越用心，天意越可控；走完這一世，留下的筆記會在下一世等你。</p>
      {game.flash && <p className="flash">{game.flash}</p>}
      {(saveFile.hasNewerSave() || saveFile.hasNewerLegacy()) && (
        <p className="flash">這份存檔來自較新版本，這個版本無法讀取，也不會覆蓋它。請用較新的版本繼續，或清除所有存檔與傳承後重新開始。</p>
      )}
      <div className="field">
        <label htmlFor="name-input">名字</label>
        <div className="row">
          <input id="name-input" value={name} maxLength={8} onChange={e => setName(e.target.value)} />
          <button className="ghost" onClick={() => setName(opening.randomName())}>換一個</button>
        </div>
      </div>
      <div className="row wrap">
        <button className="primary" onClick={() => (game.hasUnbequeathedEnding() ? setIsConfirmingNewLife(true) : game.newLife(name))}>開始新的一生</button>
        {save && save.alive && <button onClick={game.continueLife}>繼續 {save.name}（{state.stageName(save)}）</button>}
        {save && save.alive === false && save.phase === "end" && <button onClick={game.returnToLifeEnding}>為 {save.name} 留下筆記</button>}
      </div>
      {isConfirmingNewLife && save && (
        <div className="notice-box" role="alertdialog" aria-label="尚未留下筆記">
          <p className="flash">上一世（{save.name}）的筆記還沒留下，現在開始新的一生，那些筆記就留不住了。</p>
          <div className="row wrap">
            <button onClick={() => { setIsConfirmingNewLife(false); game.newLife(name); }}>還是開始新的一生</button>
            <button className="primary" onClick={game.returnToLifeEnding}>先去留下筆記</button>
          </div>
        </div>
      )}
      {(L.pending || []).length > 0 && <p className="hint">有 {L.pending.length} 頁前人筆記等待被找到。</p>}
      {lives.length > 0 && (
        <>
          <h3>前世</h3>
          <ul className="lives">
            {lives.map((l, i) => (
              <li key={i}><b>{l.name}</b>・{l.title}・{l.realm}・{l.age} 歲・{l.cause}<span className="muted">　{l.root}</span></li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">存檔放在這台電腦的瀏覽器裡。<button className="link" onClick={game.wipe}>清除所有存檔與傳承</button></p>
    </section>
  );
}
