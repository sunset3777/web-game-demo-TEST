// 驅動整個遊戲流程的測試輔助：用 controller 的公開方法玩完（或玩到一半的）一世。
// 所有「選擇」都由步數與種子決定，不另外用亂數，所以同一組參數一定得到同一結果。
import { createGame } from "../../src/game/controller.js";
import { state } from "../../src/systems/state.js";
import { marks } from "../../src/data/marks.js";
import { breakthrough } from "../../src/systems/breakthrough.js";
import { withSeededRandom } from "./seededRandom.js";
import { installMemoryStorage } from "./memoryStorage.js";

// 凡人期完整開局：每季輪流選行動，遇到小事件一律選第一個
function playFullMortalPeriod(game, seed, afterOpeningStep) {
  game.startMortal();
  afterOpeningStep?.(game, "開始凡人期");
  let guard = 0;
  while (!game.s.mortal.finished && guard++ < 50) {
    if (game.s.mortal.pending) {
      game.mortalPick(0);
      afterOpeningStep?.(game, "凡人期:小事件選擇");
    } else {
      const aimIndex = (seed + game.s.mortal.done) % marks.aims.length;
      game.mortalAct(marks.aims[aimIndex].id);
      afterOpeningStep?.(game, "凡人期:行動");
    }
  }
}

// 決定下一步做什麼並執行；回傳一段短描述，用來組成「行動順序摘要」
function playOneStep(game, stepNumber) {
  const gameState = game.s;
  if (gameState.current) {
    if (gameState.current.type === "deviation") { game.deviate("散功重修"); return "走火入魔:散功重修"; }
    const currentType = gameState.current.type === "event" ? "事件:" + gameState.current.id : gameState.current.type;
    game.pick(0);
    return "選擇:" + currentType;
  }
  if (state.inBottleneck(gameState)) {
    if (gameState.demon > 20) { game.doAction("閉關", true); return "閉關(長)"; }
    const targetRate = gameState.realmIndex === 0 ? 0.6 : 0.5;
    if (breakthrough.rate(gameState).rate >= targetRate || gameState.insight > 1500) {
      const firstMaterial = Object.keys(gameState.materials)[0] || "";
      game.ui.bt = { material: firstMaterial, env: "洞府" };
      const realmBefore = gameState.realmIndex;
      game.doBreakthrough();
      if (!game.s.alive) return "突破:死亡";
      return game.s.realmIndex > realmBefore ? "突破:成功" : "突破:失敗";
    }
    game.doAction("閉關", true);
    return "閉關(長)";
  }
  if (gameState.demoEnd) { game.retire(); return "坐化"; }
  // 每 5 步一次遊歷；其餘吐納。每 7 步改走短行動（只坐一季），讓長短兩種都跑到
  const action = stepNumber % 5 === 0 ? "遊歷" : "吐納";
  const isLongAction = stepNumber % 7 !== 0;
  game.doAction(action, isLongAction);
  return action + (isLongAction ? "(長)" : "(短)");
}

// 玩一世。
// options.seed：亂數種子；options.openingMode："full"（凡人期完整）或 "quick"（快速開局）
// options.stopWhen(game)：回傳 true 就停在那裡（不坐化、不傳承），給「玩到一半」的測試用
// options.afterEachStep(game, stepDescription)：每一步之後呼叫，不變條件測試用它檢查
// options.afterOpeningStep(game, stepDescription)：開局流程（凡人期每個行動／選擇、選志向、測靈、覺醒）每一步之後呼叫
// options.shouldBequeath：一世結束後是否把前兩頁筆記傳下去
export function playOneLife(options) {
  const { seed, openingMode = "quick", stopWhen = null, afterEachStep = null, afterOpeningStep = null, shouldBequeath = false, maxSteps = 3000 } = options;
  const storage = installMemoryStorage();
  return withSeededRandom(seed, () => {
    const game = createGame(() => {});
    game.newLife("測試修士" + seed);
    if (openingMode === "full") playFullMortalPeriod(game, seed, afterOpeningStep);
    else {
      game.chooseAim(marks.aims[seed % marks.aims.length].id);
      afterOpeningStep?.(game, "快速開局:選志向");
    }
    game.takeTest();
    afterOpeningStep?.(game, "測靈根");
    game.chooseAwakening(0);
    afterOpeningStep?.(game, "覺醒");

    const stepSummaries = [];
    let stepNumber = 0;
    while (game.s.alive && stepNumber++ < maxSteps) {
      if (stopWhen && stopWhen(game)) break;
      const description = playOneStep(game, stepNumber);
      stepSummaries.push(description);
      if (afterEachStep) afterEachStep(game, description);
    }
    const isFinished = !game.s.alive;
    if (isFinished && shouldBequeath) { game.ui.picks = [0, 1]; game.bequeath(); }
    return { game, storage, stepSummaries, stepsTaken: stepNumber, isFinished };
  });
}
