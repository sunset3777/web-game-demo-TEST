// 把一世的結果濃縮成可寫死在測試裡的「快照」：結局、境界、年歲、事件順序、行動統計、狀態雜湊
import { state } from "../../src/systems/state.js";
import { save } from "../../src/systems/save.js";
import { hashOf } from "./stableHash.js";

export function countStepKinds(stepSummaries) {
  const counts = {};
  stepSummaries.forEach(description => {
    const kind = description.startsWith("選擇:事件:") ? "事件" : description;
    counts[kind] = (counts[kind] || 0) + 1;
  });
  return Object.fromEntries(Object.keys(counts).sort().map(kind => [kind, counts[kind]]));
}

// finalStateBeforeBequeath：bequeath 之後 game.s 會是 null，所以呼叫端要在傳承前先複製一份最終狀態
export function summarizeLife(lifeResult, finalStateBeforeBequeath) {
  const finalState = finalStateBeforeBequeath;
  return {
    cause: finalState.cause,
    stage: state.stageName(finalState),
    age: Math.floor(state.age(finalState)),
    turns: finalState.turns,
    breakFails: finalState.stats.breakFails,
    eventOrder: finalState.eventsDone.join(">"),
    stepKinds: countStepKinds(lifeResult.stepSummaries),
    stepSequenceHash: hashOf(lifeResult.stepSummaries),
    finalStateHash: hashOf(finalState),
    legacyFileHash: hashOf(save.loadLegacy())
  };
}
