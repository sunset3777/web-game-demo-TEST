import { useReducer, useRef } from "react";
import { createGame } from "./game/controller.js";
import Header from "./components/Header.jsx";
import TitleScreen from "./components/TitleScreen.jsx";
import OpeningScreen from "./components/OpeningScreen.jsx";
import PlayScreen from "./components/PlayScreen.jsx";
import EndScreen from "./components/EndScreen.jsx";
import Notice from "./components/Notice.jsx";

export default function App() {
  const [, rerender] = useReducer(x => x + 1, 0);
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = createGame(rerender);
  const game = gameRef.current;
  const s = game.s;

  let screen;
  if (!s) screen = <TitleScreen game={game} />;
  else if (s.phase === "opening") screen = <OpeningScreen game={game} />;
  else if (s.phase === "end" || !s.alive) screen = <EndScreen game={game} />;
  else screen = <PlayScreen game={game} />;

  return (
    <div id="app">
      <Header game={game} />
      {screen}
      <Notice game={game} />
    </div>
  );
}
