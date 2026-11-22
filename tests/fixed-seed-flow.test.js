// 固定種子流程回歸測試：用固定亂數種子玩完整一世，比對結局、境界、年歲、事件順序與最終狀態雜湊。
//
// 重要：下面的 EXPECTED_LIVES 是「快照」，記錄的是目前規則下的結果。
// 只要有意改了規則、數值、事件資料或任何消耗亂數的順序，這些測試就會變紅——這是設計上的行為，不是 bug。
// 改規則時請有意識地更新快照：先確認新結果合理，再用 helpers/summarizeLife.js 重新產生並整段取代。
// 若改的是「不該改變行為」的重構（改名、拆檔），快照一個字都不該變；變了就代表重構改到了行為。
import { test } from "node:test";
import assert from "node:assert/strict";
import { playOneLife } from "./helpers/playLife.js";
import { summarizeLife } from "./helpers/summarizeLife.js";
import { save } from "../src/systems/save.js";

const OPENING_MODE_LABELS = { full: "凡人期完整開局", quick: "快速開局" };

const EXPECTED_LIVES = {
   "full-1": {
    "cause": "遇劫身死",
    "stage": "煉氣第8層",
    "age": 27,
    "turns": 37,
    "breakFails": 0,
    "eventOrder": "古廟傳聞>誤食靈果>代送一封信>發現裂谷>試劍石>古戰場遺跡",
    "stepKinds": {
     "事件": 11,
     "吐納(短)": 4,
     "吐納(長)": 23,
     "遊歷(短)": 1,
     "遊歷(長)": 9,
     "選擇:growth": 7
    },
    "stepSequenceHash": "8eebe19b9a60fca7",
    "finalStateHash": "dab66a750a304783",
    "legacyFileHash": "2f835c5943d57380"
   },
   "full-2": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 28,
    "turns": 44,
    "breakFails": 1,
    "eventOrder": "青梅竹馬>誤食靈果>坊市執事>山道老者>發現地火>雷雨夜",
    "stepKinds": {
     "事件": 10,
     "吐納(短)": 5,
     "吐納(長)": 22,
     "突破:失敗": 1,
     "遊歷(短)": 1,
     "遊歷(長)": 6,
     "選擇:growth": 9,
     "閉關(長)": 9
    },
    "stepSequenceHash": "547929ce1de21002",
    "finalStateHash": "c9b15e47bfd3d242",
    "legacyFileHash": "a18a7618281e018f"
   },
   "full-3": {
    "cause": "走火",
    "stage": "築基圓滿",
    "age": 99,
    "turns": 144,
    "breakFails": 1,
    "eventOrder": "青梅竹馬>小荷生病>誤食靈果>發現地火>試劍石>故人老去>截道>山道老者>代送一封信>富戶求法>引雷訣殘卷>古戰場遺跡>劍冢",
    "stepKinds": {
     "事件": 55,
     "吐納(短)": 17,
     "吐納(長)": 83,
     "突破:失敗": 1,
     "突破:成功": 1,
     "遊歷(短)": 2,
     "遊歷(長)": 20,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 20
    },
    "stepSequenceHash": "c1c3ba8f8dd5dfc1",
    "finalStateHash": "106c7e3c41214683",
    "legacyFileHash": "86aa417e2f17993d"
   },
   "full-4": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 39,
    "turns": 87,
    "breakFails": 1,
    "eventOrder": "誤食靈果>先生借書>小荷生病>煉體殘卷>以身為爐>發現金脈>坊市執事>血跡殘卷>發現地火",
    "stepKinds": {
     "事件": 22,
     "吐納(短)": 7,
     "吐納(長)": 49,
     "突破:失敗": 1,
     "遊歷(短)": 2,
     "遊歷(長)": 11,
     "選擇:growth": 9,
     "閉關(長)": 17
    },
    "stepSequenceHash": "bf0e66d4b69990b8",
    "finalStateHash": "1465add99f83b207",
    "legacyFileHash": "c691a17a6836b7f8"
   },
   "full-5": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 32,
    "turns": 57,
    "breakFails": 0,
    "eventOrder": "先生借書>小荷生病>古廟傳聞>古戰場遺跡>發現裂谷>無眼鶴",
    "stepKinds": {
     "事件": 14,
     "吐納(短)": 6,
     "吐納(長)": 31,
     "遊歷(長)": 6,
     "選擇:growth": 9,
     "閉關(長)": 14
    },
    "stepSequenceHash": "d26d12b51abc60c9",
    "finalStateHash": "109f69762555002f",
    "legacyFileHash": "d35feda9a4f45b62"
   },
   "quick-1": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 31,
    "turns": 53,
    "breakFails": 1,
    "eventOrder": "截道>煉體殘卷>以身為爐>無眼鶴>古戰場遺跡>發現地火",
    "stepKinds": {
     "事件": 17,
     "吐納(短)": 5,
     "吐納(長)": 23,
     "突破:失敗": 1,
     "遊歷(長)": 6,
     "選擇:growth": 9,
     "閉關(長)": 18
    },
    "stepSequenceHash": "c2212dfd743da27d",
    "finalStateHash": "715ca3a62b36403a",
    "legacyFileHash": "6b63ef32fcad0157"
   },
   "quick-2": {
    "cause": "遇劫身死",
    "stage": "築基圓滿",
    "age": 53,
    "turns": 84,
    "breakFails": 0,
    "eventOrder": "發現金脈>古戰場遺跡>發現地火>試劍石>代送一封信>坊市執事>無眼鶴>富戶求法>發現裂谷",
    "stepKinds": {
     "事件": 33,
     "吐納(短)": 7,
     "吐納(長)": 51,
     "突破:成功": 1,
     "遊歷(短)": 2,
     "遊歷(長)": 17,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 6
    },
    "stepSequenceHash": "7bf62bf297ae47b5",
    "finalStateHash": "49a10591d13e6b3b",
    "legacyFileHash": "7fdff370a4b48a09"
   },
   "quick-3": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 31,
    "turns": 54,
    "breakFails": 1,
    "eventOrder": "發現地火>血跡殘卷",
    "stepKinds": {
     "事件": 11,
     "吐納(短)": 2,
     "吐納(長)": 23,
     "突破:失敗": 1,
     "遊歷(長)": 6,
     "選擇:growth": 9,
     "閉關(長)": 22
    },
    "stepSequenceHash": "f02d17e624a47d37",
    "finalStateHash": "9487cd1a80e60ba5",
    "legacyFileHash": "80feb692c3c4e876"
   },
   "quick-4": {
    "cause": "走火",
    "stage": "築基圓滿",
    "age": 71,
    "turns": 115,
    "breakFails": 0,
    "eventOrder": "代送一封信>發現地火>截道>坊市執事>富戶求法>發現裂谷>發現金脈>無眼鶴>劍冢>石壁劍痕",
    "stepKinds": {
     "事件": 43,
     "吐納(短)": 10,
     "吐納(長)": 64,
     "突破:成功": 1,
     "遊歷(短)": 3,
     "遊歷(長)": 21,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 16
    },
    "stepSequenceHash": "0f24994bdc50a09d",
    "finalStateHash": "f750e19b4db033f6",
    "legacyFileHash": "5d350c51a00a817f"
   },
   "quick-5": {
    "cause": "遇劫身死",
    "stage": "煉氣第6層",
    "age": 22,
    "turns": 17,
    "breakFails": 0,
    "eventOrder": "發現地火>古戰場遺跡>發現金脈",
    "stepKinds": {
     "事件": 9,
     "吐納(短)": 2,
     "吐納(長)": 10,
     "遊歷(長)": 5,
     "選擇:growth": 4
    },
    "stepSequenceHash": "82409e2c969e934e",
    "finalStateHash": "e869dcd1fdf39f81",
    "legacyFileHash": "ff234b204e53eed1"
   },
   "full-29": {
    "cause": "坐化",
    "stage": "金丹圓滿",
    "age": 132,
    "turns": 156,
    "breakFails": 0,
    "eventOrder": "誤食靈果>古廟傳聞>雷擊>先生借書>小荷生病>坊市執事>發現裂谷>山道老者>古戰場遺跡>發現金脈>發現地火>老者報恩>富戶求法>劍冢>無眼鶴>代送一封信>引雷訣殘卷",
    "stepKinds": {
     "事件": 85,
     "吐納(短)": 17,
     "吐納(長)": 102,
     "坐化": 1,
     "突破:成功": 2,
     "遊歷(短)": 6,
     "遊歷(長)": 25,
     "選擇:ability": 2,
     "選擇:growth": 15,
     "閉關(長)": 4
    },
    "stepSequenceHash": "a484cd400d7e8947",
    "finalStateHash": "a9de3ffc3a79ea13",
    "legacyFileHash": "b59ac31951bac428"
   }
  };

// 玩一世並在傳承前抓下最終狀態，回傳摘要與其他觀察資料
function playAndSummarize(openingMode, seed) {
  const observedTexts = [];
  const lifeResult = playOneLife({ seed, openingMode, afterEachStep: (game) => observedTexts.push(game.s.lastText) });
  const finalState = JSON.parse(JSON.stringify(lifeResult.game.s));
  lifeResult.game.ui.picks = [0, 1];
  lifeResult.game.bequeath();
  return { summary: summarizeLife(lifeResult, finalState), lifeResult, observedTexts };
}

for (const [lifeKey, expectedSummary] of Object.entries(EXPECTED_LIVES)) {
  const [openingMode, seedText] = lifeKey.split("-");
  test(`固定種子 ${seedText}、${OPENING_MODE_LABELS[openingMode]}：整世結果與快照一致`, () => {
    const { summary } = playAndSummarize(openingMode, Number(seedText));
    assert.deepEqual(summary, expectedSummary);
  });
}

test("同一個種子與開局重跑兩次，結果逐字相同；不同種子結果不同", () => {
  const firstRun = playAndSummarize("quick", 1).summary;
  const secondRun = playAndSummarize("quick", 1).summary;
  const otherSeedRun = playAndSummarize("quick", 2).summary;
  assert.deepEqual(firstRun, secondRun);
  assert.notEqual(firstRun.finalStateHash, otherSeedRun.finalStateHash);
});

test("這批種子合起來涵蓋：長短行動、遊歷、突破成功與失敗、走火、坐化、遇劫身死（本次實際執行模擬統計）", () => {
  const actualSummaries = {};
  for (const lifeKey of Object.keys(EXPECTED_LIVES)) {
    const [openingMode, seedText] = lifeKey.split("-");
    actualSummaries[lifeKey] = playAndSummarize(openingMode, Number(seedText)).summary;
  }
  // 與快照比對行動統計與結局：若這裡不一致，代表模擬結果已偏離 EXPECTED_LIVES，涵蓋率以本次實際結果為準
  for (const [lifeKey, actualSummary] of Object.entries(actualSummaries)) {
    assert.deepEqual(actualSummary.stepKinds, EXPECTED_LIVES[lifeKey].stepKinds, lifeKey + " 的行動統計與快照不同");
    assert.equal(actualSummary.cause, EXPECTED_LIVES[lifeKey].cause, lifeKey + " 的結局與快照不同");
  }
  const allSummaries = Object.values(actualSummaries);
  const totalOf = (stepKind) => allSummaries.reduce((sum, summary) => sum + (summary.stepKinds[stepKind] || 0), 0);
  assert.ok(totalOf("吐納(長)") > 0 && totalOf("吐納(短)") > 0, "吐納應有長有短");
  assert.ok(totalOf("遊歷(長)") > 0 && totalOf("遊歷(短)") > 0, "遊歷應有長有短");
  assert.ok(totalOf("閉關(長)") > 0);
  assert.ok(totalOf("突破:成功") > 0, "應有突破成功");
  assert.ok(totalOf("突破:失敗") > 0, "應有突破失敗");
  const causes = new Set(allSummaries.map(summary => summary.cause));
  for (const expectedCause of ["走火", "坐化", "遇劫身死"]) assert.ok(causes.has(expectedCause), "缺少結局：" + expectedCause);
});

test("固定種子下確實會趕上秘境開啟並拿到收穫（遊歷與秘境路徑有被跑到）", () => {
  const { observedTexts } = playAndSummarize("full", 1);
  assert.ok(observedTexts.some(text => text.includes("你趕上了秘境開啟")));
});

test("一世結束後傳承：存檔被清掉、傳承檔多一筆生平與兩頁待取筆記、game.s 變 null", () => {
  // 用一個結局是坐化的種子（作派加入後 full-3 改為走火，11/17 換成 full-29）
  const { lifeResult } = playAndSummarize("full", 29);
  assert.equal(lifeResult.game.s, null);
  assert.equal(lifeResult.storage.getItem(save.SAVE_KEY), null);
  const legacyFile = save.loadLegacy();
  assert.equal(legacyFile.lives.length, 1);
  assert.equal(legacyFile.lives[0].name, "測試修士29");
  assert.equal(legacyFile.lives[0].cause, "坐化");
  assert.equal(legacyFile.pending.length, 2);
  assert.equal(legacyFile.pending[0].from, "測試修士29");
});
