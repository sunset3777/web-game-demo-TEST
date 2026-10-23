// 突破面板：地點是否可選、按鈕呼叫的 controller 方法
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BreakthroughPanel from "../src/components/BreakthroughPanel.jsx";
import { createTestGame, playToCultivation, putAtBottleneck, useSeededRandom } from "./helpers/gameFixtures.js";

beforeEach(() => { useSeededRandom(5); });
afterEach(() => { vi.restoreAllMocks(); });

function createBottleneckGame(prepare = () => {}) {
  const gameController = playToCultivation(createTestGame());
  putAtBottleneck(gameController.s);
  prepare(gameController.s);
  vi.spyOn(gameController, "doBreakthrough").mockImplementation(() => {});
  vi.spyOn(gameController, "togglePanel").mockImplementation(() => {});
  vi.spyOn(gameController, "setBt").mockImplementation(() => {});
  return gameController;
}

describe("BreakthroughPanel 突破面板", () => {
  test("點「開始突破」呼叫一次 doBreakthrough；點「取消」只關面板，不突破", async () => {
    const gameController = createBottleneckGame();
    render(<BreakthroughPanel game={gameController} />);

    await userEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(gameController.togglePanel).toHaveBeenCalledWith("bt");
    expect(gameController.doBreakthrough).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "開始突破" }));
    expect(gameController.doBreakthrough).toHaveBeenCalledTimes(1);
  });

  test("季節不對的地點（雷雨山巔只在夏天）選項是停用的並註明季節，洞府永遠可選", () => {
    const gameController = createBottleneckGame(gameState => {
      gameState.envs.push("雷雨山巔");
      gameState.seasonIdx = 0; // 春
    });
    render(<BreakthroughPanel game={gameController} />);
    expect(screen.getByRole("option", { name: "洞府" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "雷雨山巔（夏季才行）" })).toBeDisabled();
  });

  test("到了夏天，雷雨山巔變成可選", () => {
    const gameController = createBottleneckGame(gameState => {
      gameState.envs.push("雷雨山巔");
      gameState.seasonIdx = 1; // 夏
    });
    render(<BreakthroughPanel game={gameController} />);
    expect(screen.getByRole("option", { name: "雷雨山巔" })).toBeEnabled();
  });

  test("選素材與地點時，會把選擇交給 setBt（material／env）", async () => {
    const gameController = createBottleneckGame(gameState => { gameState.materials["靈草"] = 2; });
    render(<BreakthroughPanel game={gameController} />);
    await userEvent.selectOptions(screen.getByLabelText("素材（會消耗）"), "靈草");
    expect(gameController.setBt).toHaveBeenCalledWith("material", "靈草");
    await userEvent.selectOptions(screen.getByLabelText("地點"), "靈泉");
    expect(gameController.setBt).toHaveBeenCalledWith("env", "靈泉");
  });

  test("素材欄會列出持有的素材與數量", () => {
    const gameController = createBottleneckGame(gameState => { gameState.materials["靈草"] = 2; });
    render(<BreakthroughPanel game={gameController} />);
    expect(screen.getByRole("option", { name: "靈草 ×2" })).toBeInTheDocument();
  });
});
