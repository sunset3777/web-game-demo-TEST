const TABS = [["log", "日誌"], ["notes", "修仙筆記"], ["karma", "因果"]];

export default function Journal({ game }) {
  const s = game.s, tab = game.ui.tab;
  return (
    <section className="card journal">
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => game.setTab(k)}>{l}</button>
        ))}
      </div>
      <ul>
        {tab === "log" && s.log.map((l, i) => <li key={i}><span className="when">{l.when}</span><span className="pre">{l.text}</span></li>)}
        {tab === "notes" && s.notes.map((n, i) => <li key={i}><span className="when">{n.when}</span>{n.text}<span className="kind">{n.kind}</span></li>)}
        {tab === "karma" && (s.karma.length
          ? s.karma.map((k, i) => (
              <li key={i} className={k.done ? "done" : k.faded ? "faded" : ""}>
                <span className="kind">{k.weight}</span>{k.text}
                {k.done ? `　→ ${k.ending}` : k.faded ? "　（已淡去）" : "　（未了結）"}
              </li>))
          : <li className="muted">尚無因果。</li>)}
      </ul>
    </section>
  );
}
