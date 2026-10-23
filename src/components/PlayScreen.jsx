import StatusPanel from "./StatusPanel.jsx";
import ActionBar from "./ActionBar.jsx";
import ChoiceCard from "./ChoiceCard.jsx";
import Journal from "./Journal.jsx";
import TestStatus from "./TestStatus.jsx";
import { visibleText } from "./text.js";

export default function PlayScreen({ game }) {
  const s = game.s;
  return (
    <>
    <div className="layout">
      <StatusPanel game={game} />
      <div className="main">
        <section className="card scene">
          {s.lastText && <p className="story" key={s.lastText}>{visibleText(game, s.lastText)}</p>}
          {s.current ? <ChoiceCard game={game} /> : <ActionBar game={game} />}
        </section>
        <Journal game={game} />
      </div>
    </div>
    {game.testMode && <TestStatus game={game} />}
    </>
  );
}
