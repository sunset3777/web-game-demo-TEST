// 不開瀏覽器，自動玩幾輪，檢查流程與數值有沒有壞掉：npm run sim
import { createGame } from "../src/game/controller.js";
import { state } from "../src/systems/state.js";
import { marks } from "../src/data/marks.js";
import { breakthrough } from "../src/systems/breakthrough.js";

const runs = Number(process.argv[2] || 20);
if (!Number.isFinite(runs) || runs <= 0) {
  console.error(`局數必須是大於 0 的數字（收到：${process.argv[2]}）`);
  process.exit(1);
}
const MAX_TURNS = 3000;
const results = [];
let cappedRuns = 0;
let finishedRuns = 0;
for (let r = 0; r < runs; r++) {
  const G = createGame(() => {});
  G.newLife("測試" + r);
  if (r % 3 === 0) G.chooseAim(marks.aims[r % marks.aims.length].id);
  else {
    G.startMortal();
    let g = 0;
    while (!G.s.mortal.finished && g++ < 50) {
      if (G.s.mortal.pending) G.mortalPick(0);
      else G.mortalAct(marks.aims[(r + G.s.mortal.done) % 2 === 0 ? r % 6 : (r + 1) % 6].id);
    }
  }
  G.takeTest();
  G.chooseAwakening(0);
  let guard = 0;
  while (G.s && G.s.alive && guard++ < MAX_TURNS) {
    const s = G.s;
    if (s.current) {
      if (s.current.type === "deviation") G.deviate("散功重修"); else G.pick(0);
      continue;
    }
    if (state.inBottleneck(s)) {
      if (s.demon > 20) { G.doAction("閉關", true); continue; }
      const target = s.realmIndex === 0 ? 0.6 : 0.5;
      if (state.inBottleneck(s) && (breakthrough.rate(s).rate >= target || s.insight > 1500)) {
        const mat = Object.keys(s.materials)[0] || "";
        G.ui.bt = { material: mat, env: "洞府" };
        G.doBreakthrough();
      } else G.doAction("閉關", true);
      continue;
    }
    if (s.demoEnd) { G.retire(); continue; }
    G.doAction(guard % 5 === 0 ? "遊歷" : "吐納", true);
  }
  const s = G.s;
  if (s && s.alive) cappedRuns++; else finishedRuns++;
  results.push({ mark: s.mark + (s.comboMark ? "+" + s.comboMark : ""), root: s.root.label, end: state.stageName(s), age: Math.floor(state.age(s)), cause: s.cause, turns: s.turns, fails: s.stats.breakFails, events: s.eventsDone.length, notes: s.notes.length });
}
console.table(results);
const by = {};
results.forEach(x => { const k = x.end.slice(0, 2); by[k] = (by[k] || 0) + 1; });
console.log("最終境界分布：", by, "平均回合：", Math.round(results.reduce((a, x) => a + x.turns, 0) / runs));
if (finishedRuns === 0) {
  console.error("錯誤：沒有任何一局跑完");
  process.exit(1);
}
if (cappedRuns > 0) {
  console.error(`${cappedRuns} 局達到 ${MAX_TURNS} 回合上限仍未結束`);
  process.exit(1);
}
