// 畫面測試的共用輔助：固定種子亂數、建立真的 gameController、存檔寫入。
// 選擇「真的 controller + 固定種子」而不是手工 stub：元件會讀很多 gameState 欄位
// （素材、境界、事件佇列…），手工 stub 容易與真實狀態漂移；真 controller 也能順便
// 驗證畫面與規則層的接線。需要驗證「有沒有呼叫某方法」時，再用 vi.spyOn 包住該方法。
import { createElement, useReducer } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createGame } from "../../src/game/controller.js";
import { marks } from "../../src/data/marks.js";
import { save } from "../../src/systems/save.js";
import { state } from "../../src/systems/state.js";
import { createMulberry32 } from "../../tests/helpers/seededRandom.js";

// 讓 Math.random 變成固定種子；呼叫 vi.restoreAllMocks() 還原（setup 不自動還原，由各測試檔 afterEach 負責）
export function useSeededRandom(seed = 1) {
  vi.spyOn(Math, "random").mockImplementation(createMulberry32(seed));
}

// 建立真的 gameController，onChange 預設不做事（元件測試自己負責重繪時可傳入 rerender）
export function createTestGame(onChange = () => {}) {
  return createGame(onChange);
}

// 讓 controller 走到「修練畫面」：新的一生 → 快速開局 → 測靈 → 覺醒 → 關掉老執事的提醒
export function playToCultivation(gameController, name = "測試修士") {
  gameController.newLife(name);
  gameController.chooseAim(marks.aims[0].id);
  gameController.takeTest();
  gameController.chooseAwakening(0);
  gameController.dismissNotice();
  return gameController;
}

// 把真的 controller 接到元件上並渲染：controller 改完狀態呼叫 onChange 時元件會真的重繪，
// 讓測試可以斷言「玩家看得到的變化」。prepare 在進入修練畫面後、渲染前調整 gameState。
export function renderLiveGame(GameComponent, prepare = () => {}) {
  let requestRerender = () => {};
  const gameController = createTestGame(() => requestRerender());
  playToCultivation(gameController);
  prepare(gameController.s);
  function LiveHost() {
    const [, forceRender] = useReducer(renderCount => renderCount + 1, 0);
    requestRerender = forceRender;
    return createElement(GameComponent, { game: gameController });
  }
  return { gameController, ...render(createElement(LiveHost)) };
}

// 把一份 gameState 直接寫進存檔（模擬玩家上次留下的進度）
export function writeSave(gameState) {
  save.save(gameState);
}

export function writeLegacy(legacyData) {
  save.saveLegacy(legacyData);
}

// 造一份活著的存檔狀態
export function createSavedState(name = "舊日修士", changes = {}) {
  return Object.assign(state.create(name), changes);
}

// 讓 gameState 站在「煉氣圓滿、修為已滿」的瓶頸上（畫面會出現「突破」入口）
export function putAtBottleneck(gameState) {
  gameState.realmIndex = 0;
  gameState.stageIndex = 9;
  gameState.xiu = 130;
  gameState.seasonIdx = 0;
  return gameState;
}

// 讓 gameState 站在築基初期（長行動一次四季，畫面會多出「先一季」按鈕）
export function putAtFoundationRealm(gameState) {
  gameState.realmIndex = 1;
  gameState.stageIndex = 0;
  gameState.xiu = 0;
  return gameState;
}

// 「一般模式」不該出現的測試內容：className="test" 區塊與〔…〕數值行
export function findTestContent(container) {
  const testBlocks = [...container.querySelectorAll(".test")].map(element => element.textContent);
  const bracketLines = (container.textContent.match(/〔[^〕]*〕/g) || []);
  return { testBlocks, bracketLines };
}
