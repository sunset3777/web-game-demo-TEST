// 不變條件測試：在許多固定種子的整世模擬過程中，每一步行動之後都檢查「任何時候都不該違反」的性質。
// 也涵蓋死亡或退隱後玩家不能再操作（之後應交由 NPC 規則接手，NPC 系統尚未實作）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { numbers } from "../src/data/numbers.js";
import { state } from "../src/systems/state.js";
import { playOneLife } from "./helpers/playLife.js";

const SEEDS_TO_CHECK = Array.from({ length: 12 }, (_, index) => index + 1);
const OPENING_MODES = ["quick", "full"];

// 檢查一個遊戲狀態是否符合所有基本不變條件；違反時錯誤訊息會帶上種子、步驟，方便重現
function assertBasicInvariants(gameState, contextText) {
  for (const [materialName, amount] of Object.entries(gameState.materials)) {
    assert.ok(Number.isFinite(amount) && amount >= 0, `${contextText}：素材「${materialName}」庫存為 ${amount}`);
  }
  assert.ok(Number.isInteger(gameState.realmIndex) && gameState.realmIndex >= 0 && gameState.realmIndex < numbers.realms.length,
    `${contextText}：境界索引 ${gameState.realmIndex} 超出範圍`);
  const stageCount = numbers.realms[gameState.realmIndex].stages.length;
  assert.ok(Number.isInteger(gameState.stageIndex) && gameState.stageIndex >= 0 && gameState.stageIndex < stageCount,
    `${contextText}：小境界索引 ${gameState.stageIndex} 超出範圍`);
  assert.ok(gameState.demon >= 0 && gameState.demon <= numbers.demon.max, `${contextText}：心魔 ${gameState.demon} 不在 0～${numbers.demon.max}`);
  assert.ok(Number.isFinite(state.age(gameState)), `${contextText}：年齡不是有限數`);
  assert.ok(Number.isFinite(state.maxAge(gameState)), `${contextText}：壽元不是有限數`);
  assert.ok(Number.isFinite(gameState.stones), `${contextText}：靈石不是有限數`);
  if (!gameState.alive) assert.equal(gameState.phase, "end", `${contextText}：已死亡但 phase 是 ${gameState.phase}`);
}

for (const openingMode of OPENING_MODES) {
  test(`${openingMode === "full" ? "凡人期完整開局" : "快速開局"}：${SEEDS_TO_CHECK.length} 個種子的整世，每一步之後素材、境界、心魔、壽元、死亡 phase 都合理`, () => {
    let totalStepsChecked = 0;
    for (const seed of SEEDS_TO_CHECK) {
      const lifeResult = playOneLife({
        seed,
        openingMode,
        afterEachStep: (game, stepDescription) => {
          totalStepsChecked++;
          assertBasicInvariants(game.s, `種子 ${seed}、第 ${totalStepsChecked} 步（${stepDescription}）`);
        }
      });
      assert.equal(lifeResult.isFinished, true, `種子 ${seed} 沒有在步數上限內結束`);
      assert.equal(lifeResult.game.s.alive, false);
      assert.equal(lifeResult.game.s.phase, "end");
      assert.ok(lifeResult.game.s.cause, "死亡必須有死因");
    }
    assert.ok(totalStepsChecked > 500, "檢查的步數太少，模擬可能沒真的跑");
  });
}

for (const openingMode of OPENING_MODES) {
  test(`${openingMode === "full" ? "凡人期完整開局" : "快速開局"}：開局流程（行動、選擇、測靈、覺醒）每一步之後狀態都合理`, () => {
    let totalOpeningStepsChecked = 0;
    for (const seed of [1, 7, 12]) {
      const lifeResult = playOneLife({
        seed,
        openingMode,
        stopWhen: () => true,
        afterOpeningStep: (game, stepDescription) => {
          totalOpeningStepsChecked++;
          assertBasicInvariants(game.s, `種子 ${seed}、開局第 ${totalOpeningStepsChecked} 步（${stepDescription}）`);
        }
      });
      assert.equal(lifeResult.game.s.phase === "end", false);
    }
    assert.ok(totalOpeningStepsChecked >= (openingMode === "full" ? 30 : 9), "開局檢查的步數太少：" + totalOpeningStepsChecked);
  });
}

test("死亡後 alive 不會變回 true，phase 維持 end，死因不會被改寫（retire 與 pick 對已死狀態不動作）", () => {
  const { game } = playOneLife({ seed: 3, openingMode: "full" });
  const causeAtDeath = game.s.cause;
  const snapshotBefore = JSON.stringify(game.s);
  game.retire();
  game.pick(0);
  game.nextQueue();
  assert.equal(JSON.stringify(game.s), snapshotBefore);
  assert.equal(game.s.cause, causeAtDeath);
});

// 死亡後的行為：玩家操作一律不改變遊戲狀態（測試補充發現，審查未列）
test("死亡後行動（doAction）不該再改變遊戲狀態", () => {
  const { game } = playOneLife({ seed: 1, openingMode: "quick" });
  const snapshotBefore = JSON.stringify(game.s);
  game.doAction("吐納", true);
  assert.equal(JSON.stringify(game.s), snapshotBefore);
});

test("死亡後其他玩家操作（突破、買東西、換功法、裝備、走火入魔抉擇）也不改變遊戲狀態、不丟例外、不寫檔", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  const snapshotBefore = JSON.stringify(game.s);
  const saveBefore = storage.getItem("xiuxian-demo-save-v1");
  assert.doesNotThrow(() => {
    game.ui.bt = { material: Object.keys(game.s.materials)[0] || "", env: "洞府" };
    game.doBreakthrough();
    game.buy(Object.keys(game.s.materials)[0] || "雷擊木");
    game.setTechnique("基礎吐納法");
    game.equip(game.s.abilities[0] || null);
    game.deviate("散功重修");
  });
  assert.equal(JSON.stringify(game.s), snapshotBefore);
  assert.equal(storage.getItem("xiuxian-demo-save-v1"), saveBefore);
});

test("坐化（退隱）後呼叫 doBreakthrough 不丟例外，也不改變遊戲狀態", () => {
  const { game } = playOneLife({ seed: 2, openingMode: "quick", stopWhen: (runningGame) => runningGame.s.turns >= 5 });
  game.retire();
  assert.equal(game.s.cause, "坐化");
  const snapshotBefore = JSON.stringify(game.s);
  assert.doesNotThrow(() => { game.doBreakthrough(); game.doAction("閉關", true); });
  assert.equal(JSON.stringify(game.s), snapshotBefore);
});
