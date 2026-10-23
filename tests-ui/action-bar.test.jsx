// 行動列：按鈕點下去呼叫正確的 controller 方法；突破入口只在瓶頸出現
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionBar from "../src/components/ActionBar.jsx";
import {
  createTestGame, playToCultivation, putAtBottleneck, putAtFoundationRealm, useSeededRandom
} from "./helpers/gameFixtures.js";

beforeEach(() => { useSeededRandom(3); });
afterEach(() => { vi.restoreAllMocks(); });

function createGameWithSpies(prepare = () => {}) {
  const gameController = playToCultivation(createTestGame());
  prepare(gameController.s);
  vi.spyOn(gameController, "doAction").mockImplementation(() => {});
  vi.spyOn(gameController, "togglePanel").mockImplementation(() => {});
  vi.spyOn(gameController, "retire").mockImplementation(() => {});
  return gameController;
}

describe("ActionBar 行動列", () => {
  test("煉氣期：四種行動都能點，點「吐納」只呼叫一次 doAction(吐納, 短行動)，且沒有「先一季」按鈕", async () => {
    const gameController = createGameWithSpies();
    render(<ActionBar game={gameController} />);
    for (const actionName of ["吐納", "周天", "閉關", "遊歷"]) {
      expect(screen.getByRole("button", { name: new RegExp("^" + actionName) })).toBeEnabled();
    }
    expect(screen.queryByRole("button", { name: "先一季" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^吐納/ }));
    expect(gameController.doAction).toHaveBeenCalledTimes(1);
    expect(gameController.doAction).toHaveBeenCalledWith("吐納", false);
  });

  test("築基期：每種行動多一顆「先一季」；主按鈕是長行動，「先一季」是短行動", async () => {
    const gameController = createGameWithSpies(putAtFoundationRealm);
    render(<ActionBar game={gameController} />);
    expect(screen.getAllByRole("button", { name: "先一季" })).toHaveLength(4);

    await userEvent.click(screen.getByRole("button", { name: /^閉關/ }));
    expect(gameController.doAction).toHaveBeenLastCalledWith("閉關", true);

    await userEvent.click(screen.getAllByRole("button", { name: "先一季" })[0]);
    expect(gameController.doAction).toHaveBeenLastCalledWith("吐納", false);
  });

  test("還沒到瓶頸時沒有「突破」入口", () => {
    render(<ActionBar game={createGameWithSpies()} />);
    expect(screen.queryByRole("button", { name: /^突破/ })).not.toBeInTheDocument();
  });

  test("修為已滿到瓶頸時出現「突破」入口，點下去開啟突破面板（togglePanel 傳入 bt）", async () => {
    const gameController = createGameWithSpies(putAtBottleneck);
    render(<ActionBar game={gameController} />);
    await userEvent.click(screen.getByRole("button", { name: /^突破/ }));
    expect(gameController.togglePanel).toHaveBeenCalledWith("bt");
  });

  test("年輕時沒有「坐化」按鈕；年紀超過 60 歲才出現，點下去呼叫 retire", async () => {
    const youngGame = createGameWithSpies();
    const { unmount } = render(<ActionBar game={youngGame} />);
    expect(screen.queryByRole("button", { name: "坐化" })).not.toBeInTheDocument();
    unmount();

    const oldGame = createGameWithSpies(gameState => { gameState.seasons = 4 * 70; });
    render(<ActionBar game={oldGame} />);
    await userEvent.click(screen.getByRole("button", { name: "坐化" }));
    expect(oldGame.retire).toHaveBeenCalledTimes(1);
  });
});
