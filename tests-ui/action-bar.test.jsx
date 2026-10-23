// 行動列：按鈕點下去呼叫正確的 controller 方法；突破入口只在瓶頸出現
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionBar from "../src/components/ActionBar.jsx";
import PlayScreen from "../src/components/PlayScreen.jsx";
import {
  createTestGame, playToCultivation, putAtBottleneck, putAtFoundationRealm, renderLiveGame, useSeededRandom
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

// 以下用真的 controller 接到畫面（修練畫面整頁），斷言玩家看得到的變化
describe("ActionBar 行動列（真 controller 互動）", () => {
  function readAgeAndSeasonText() {
    return within(screen.getByRole("complementary")).getByText("年歲").nextElementSibling.textContent;
  }
  function readJournalEntries() {
    return within(screen.getByRole("tablist").parentElement).getAllByRole("listitem");
  }

  test("點「吐納」，狀態面板的季節往前走，日誌多一筆", async () => {
    renderLiveGame(PlayScreen);
    const ageAndSeasonBefore = readAgeAndSeasonText();
    const journalLengthBefore = readJournalEntries().length;

    await userEvent.click(screen.getByRole("button", { name: /^吐納/ }));

    expect(readAgeAndSeasonText()).not.toBe(ageAndSeasonBefore);
    expect(readJournalEntries()).toHaveLength(journalLengthBefore + 1);
  });

  test("點「坊市」開啟坊市面板，再點一次關閉", async () => {
    renderLiveGame(PlayScreen);
    expect(screen.queryByRole("heading", { name: /^坊市/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "坊市" }));
    expect(screen.getByRole("heading", { name: /^坊市・/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "坊市" }));
    expect(screen.queryByRole("heading", { name: /^坊市/ })).not.toBeInTheDocument();
  });

  test("到了瓶頸，點「突破」開啟突破面板，點面板的「取消」關閉，境界不變", async () => {
    renderLiveGame(PlayScreen, putAtBottleneck);
    const realmTextBefore = screen.getByRole("complementary").querySelector(".realm").textContent;

    await userEvent.click(screen.getByRole("button", { name: /^突破/ }));
    expect(screen.getByRole("heading", { name: "突破佈局" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("heading", { name: "突破佈局" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary").querySelector(".realm").textContent).toBe(realmTextBefore);
  });
});
