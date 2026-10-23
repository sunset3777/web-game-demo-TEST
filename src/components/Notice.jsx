// 劇情內的提醒視窗（例如測靈後老執事的叮囑、境界提升後時間變長）
export default function Notice({ game }) {
  const n = game.s && game.s.notice;
  if (!n) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="notice-title">
      <div className="card notice">
        <h3 id="notice-title">{n.title}</h3>
        <p className="story">{n.text}</p>
        <button className="primary" onClick={game.dismissNotice} autoFocus>記下了</button>
      </div>
    </div>
  );
}
