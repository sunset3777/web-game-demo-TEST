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
    "cause": "走火",
    "stage": "築基圓滿",
    "age": 70,
    "turns": 109,
    "breakFails": 1,
    "eventOrder": "古廟傳聞>誤食靈果>發現裂谷>發現地火>發現金脈>富戶求法>山道老者>老者報恩>引雷訣殘卷>石壁劍痕",
    "stepKinds": {
     "事件": 42,
     "吐納(短)": 11,
     "吐納(長)": 63,
     "突破:失敗": 1,
     "突破:成功": 1,
     "遊歷(短)": 3,
     "遊歷(長)": 17,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 13
    },
    "stepSequenceHash": "c1151a9f5bfbbdfe",
    "finalStateHash": "45f988413db10399",
    "legacyFileHash": "051994cd8b26567f"
   },
   "full-2": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 31,
    "turns": 56,
    "breakFails": 1,
    "eventOrder": "青梅竹馬>誤食靈果>山道老者>古戰場遺跡",
    "stepKinds": {
     "事件": 12,
     "吐納(短)": 6,
     "吐納(長)": 23,
     "突破:失敗": 1,
     "遊歷(短)": 1,
     "遊歷(長)": 7,
     "選擇:growth": 9,
     "閉關(長)": 18
    },
    "stepSequenceHash": "2744d657800718fc",
    "finalStateHash": "55e107a4a6aec0db",
    "legacyFileHash": "11a5d26dbec3808a"
   },
   "full-3": {
    "cause": "坐化",
    "stage": "金丹圓滿",
    "age": 111,
    "turns": 143,
    "breakFails": 0,
    "eventOrder": "青梅竹馬>小荷生病>誤食靈果>發現金脈>古戰場遺跡>劍冢>故人老去>富戶求法>發現地火>引雷訣殘卷>山道老者",
    "stepKinds": {
     "事件": 71,
     "吐納(短)": 16,
     "吐納(長)": 89,
     "坐化": 1,
     "突破:成功": 2,
     "遊歷(短)": 2,
     "遊歷(長)": 27,
     "選擇:ability": 2,
     "選擇:growth": 15,
     "閉關(長)": 7
    },
    "stepSequenceHash": "fc1175e822a593fd",
    "finalStateHash": "b684a943306966dd",
    "legacyFileHash": "1169303619441783"
   },
   "full-4": {
    "cause": "坐化",
    "stage": "金丹圓滿",
    "age": 119,
    "turns": 142,
    "breakFails": 0,
    "eventOrder": "誤食靈果>先生借書>小荷生病>煉體殘卷>以身為爐>發現地火>發現裂谷>古戰場遺跡>發現金脈>富戶求法>引雷訣殘卷>山道老者>老者報恩",
    "stepKinds": {
     "事件": 72,
     "吐納(短)": 13,
     "吐納(長)": 89,
     "坐化": 1,
     "突破:成功": 2,
     "遊歷(短)": 3,
     "遊歷(長)": 29,
     "選擇:ability": 2,
     "選擇:growth": 15,
     "閉關(長)": 6
    },
    "stepSequenceHash": "7b07f0b2d75603cc",
    "finalStateHash": "b67df4e392910174",
    "legacyFileHash": "98d17a4212edad5c"
   },
   "full-5": {
    "cause": "走火",
    "stage": "築基圓滿",
    "age": 78,
    "turns": 114,
    "breakFails": 1,
    "eventOrder": "先生借書>小荷生病>古廟傳聞>古戰場遺跡>發現裂谷>劍冢>劍意試煉>山道老者>富戶求法>石壁劍痕",
    "stepKinds": {
     "事件": 46,
     "吐納(短)": 10,
     "吐納(長)": 66,
     "突破:失敗": 1,
     "突破:成功": 1,
     "遊歷(短)": 2,
     "遊歷(長)": 18,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 16
    },
    "stepSequenceHash": "5ef458893bbbc66c",
    "finalStateHash": "2eba50593ccba497",
    "legacyFileHash": "026c408bbf806802"
   },
   "quick-1": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 32,
    "turns": 58,
    "breakFails": 1,
    "eventOrder": "雷雨夜>煉體殘卷>以身為爐>石壁劍痕",
    "stepKinds": {
     "事件": 15,
     "吐納(短)": 3,
     "吐納(長)": 26,
     "突破:失敗": 1,
     "遊歷(長)": 6,
     "選擇:growth": 9,
     "閉關(長)": 22
    },
    "stepSequenceHash": "7a9405d177a4eeeb",
    "finalStateHash": "e2dc54acfc1e4fd9",
    "legacyFileHash": "f298009b00b4b4dc"
   },
   "quick-2": {
    "cause": "走火",
    "stage": "築基圓滿",
    "age": 73,
    "turns": 111,
    "breakFails": 0,
    "eventOrder": "發現地火>發現裂谷>古戰場遺跡>劍冢>發現金脈>富戶求法>劍意試煉>山道老者",
    "stepKinds": {
     "事件": 44,
     "吐納(短)": 10,
     "吐納(長)": 65,
     "突破:成功": 1,
     "遊歷(短)": 4,
     "遊歷(長)": 16,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 15
    },
    "stepSequenceHash": "b42d3e12bf74d6d1",
    "finalStateHash": "0046ed56585d1d11",
    "legacyFileHash": "3b8aeeaa46d4e20e"
   },
   "quick-3": {
    "cause": "走火",
    "stage": "煉氣第10層",
    "age": 32,
    "turns": 58,
    "breakFails": 1,
    "eventOrder": "古戰場遺跡>發現地火>雷雨夜>發現裂谷",
    "stepKinds": {
     "事件": 11,
     "吐納(短)": 4,
     "吐納(長)": 21,
     "突破:失敗": 1,
     "遊歷(短)": 1,
     "遊歷(長)": 7,
     "選擇:growth": 9,
     "閉關(長)": 24
    },
    "stepSequenceHash": "b26deec1c77b2f81",
    "finalStateHash": "883874bd91878f81",
    "legacyFileHash": "69b97a7034bec3aa"
   },
   "quick-4": {
    "cause": "走火",
    "stage": "築基圓滿",
    "age": 79,
    "turns": 122,
    "breakFails": 0,
    "eventOrder": "發現裂谷>古戰場遺跡>發現地火>石壁劍痕>劍冢>富戶求法>發現金脈",
    "stepKinds": {
     "事件": 43,
     "吐納(短)": 11,
     "吐納(長)": 70,
     "突破:成功": 1,
     "遊歷(短)": 3,
     "遊歷(長)": 17,
     "選擇:ability": 1,
     "選擇:growth": 12,
     "閉關(長)": 20
    },
    "stepSequenceHash": "5faab507ce6410bc",
    "finalStateHash": "cb78c01312768a53",
    "legacyFileHash": "9f3fced6eca71042"
   },
   "quick-5": {
    "cause": "遇劫身死",
    "stage": "築基中期",
    "age": 41,
    "turns": 64,
    "breakFails": 0,
    "eventOrder": "古戰場遺跡>山道老者>發現金脈>老者報恩>富戶求法",
    "stepKinds": {
     "事件": 30,
     "吐納(短)": 8,
     "吐納(長)": 37,
     "突破:成功": 1,
     "遊歷(短)": 1,
     "遊歷(長)": 10,
     "選擇:ability": 1,
     "選擇:growth": 10,
     "閉關(長)": 7
    },
    "stepSequenceHash": "7abdc9fbd046c81e",
    "finalStateHash": "9582e6e2da878b25",
    "legacyFileHash": "19c81dea5411ea2c"
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
  const { lifeResult } = playAndSummarize("full", 3);
  assert.equal(lifeResult.game.s, null);
  assert.equal(lifeResult.storage.getItem(save.SAVE_KEY), null);
  const legacyFile = save.loadLegacy();
  assert.equal(legacyFile.lives.length, 1);
  assert.equal(legacyFile.lives[0].name, "測試修士3");
  assert.equal(legacyFile.lives[0].cause, "坐化");
  assert.equal(legacyFile.pending.length, 2);
  assert.equal(legacyFile.pending[0].from, "測試修士3");
});
