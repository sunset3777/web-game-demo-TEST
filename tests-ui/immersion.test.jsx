// 沉浸感：一般模式不得出現測試用數字（className="test" 區塊、〔…〕行），顯示數值時才出現。
// 使用「真的 gameController + 固定種子」：元件會讀大量 gameState 欄位，手工 stub 容易與真實狀態漂移。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import Header from "../src/components/Header.jsx";
import StatusPanel from "../src/components/StatusPanel.jsx";
import EndScreen from "../src/components/EndScreen.jsx";
import OpeningScreen from "../src/components/OpeningScreen.jsx";
import { numbers } from "../src/data/numbers.js";
import {
  createTestGame, findTestContent, playToCultivation, useSeededRandom
} from "./helpers/gameFixtures.js";

beforeEach(() => { useSeededRandom(7); });
afterEach(() => { vi.restoreAllMocks(); });

describe("Header 標題列", () => {
  test("一般模式：沒有「數值 v?」標記，按鈕寫著「顯示數值」", () => {
    const gameController = createTestGame();
    const { container, getByRole } = render(<Header game={gameController} />);
    expect(findTestContent(container).testBlocks).toEqual([]);
    expect(container).not.toHaveTextContent(`數值 ${numbers.version}`);
    expect(getByRole("button", { name: "顯示數值" })).toBeInTheDocument();
  });

  test("顯示數值模式：出現「數值 v?」標記，按鈕變成「隱藏數值」", () => {
    const gameController = createTestGame();
    gameController.testMode = true;
    const { container, getByRole } = render(<Header game={gameController} />);
    expect(findTestContent(container).testBlocks).toEqual([`・數值 ${numbers.version}`]);
    expect(getByRole("button", { name: "隱藏數值" })).toBeInTheDocument();
  });
});

describe("StatusPanel 狀態面板", () => {
  function createPlayingGame(testMode) {
    const gameController = playToCultivation(createTestGame());
    gameController.testMode = testMode;
    gameController.s.xiu = 17;
    gameController.s.demon = numbers.demon.gate + 15; // 心魔高於門檻，才會出現「心神不寧」
    return gameController;
  }

  test("一般模式：沒有壽元、修為／所需、心魔數字，心魔只以「心神不寧」描述", () => {
    const { container } = render(<StatusPanel game={createPlayingGame(false)} />);
    const { testBlocks, bracketLines } = findTestContent(container);
    expect(testBlocks).toEqual([]);
    expect(bracketLines).toEqual([]);
    expect(container).toHaveTextContent("心神不寧");
    expect(container).not.toHaveTextContent("壽元");
    expect(container).not.toHaveTextContent(`高於 ${numbers.demon.gate}`);
  });

  test("顯示數值模式：出現壽元、修為／所需與心魔數字，心魔提示改為「高於 門檻」", () => {
    const gameController = createPlayingGame(true);
    const { container } = render(<StatusPanel game={gameController} />);
    const { testBlocks } = findTestContent(container);
    expect(testBlocks.length).toBeGreaterThanOrEqual(3);
    expect(container).toHaveTextContent("壽元");
    expect(container).toHaveTextContent(`17 / ${numbers.realms[0].reqs[0]}`);
    expect(container).toHaveTextContent(`高於 ${numbers.demon.gate}`);
    expect(container).not.toHaveTextContent("心神不寧");
  });
});

describe("EndScreen 結局畫面", () => {
  function createEndedGame(testMode) {
    const gameController = playToCultivation(createTestGame());
    gameController.s.lastText = "你闔上雙眼。\n〔壽元耗盡，最終修為 123〕";
    gameController.retire();
    gameController.testMode = testMode;
    return gameController;
  }

  test("一般模式：結局文字裡的〔…〕行與「每頁化為 N 點感悟」都不出現", () => {
    const { container } = render(<EndScreen game={createEndedGame(false)} />);
    const { testBlocks, bracketLines } = findTestContent(container);
    expect(testBlocks).toEqual([]);
    expect(bracketLines).toEqual([]);
    expect(container).toHaveTextContent("你闔上雙眼。");
    expect(container).toHaveTextContent("一世終了");
  });

  test("顯示數值模式：〔…〕行與「每頁化為 N 點感悟」都出現", () => {
    const { container } = render(<EndScreen game={createEndedGame(true)} />);
    expect(container).toHaveTextContent("〔壽元耗盡，最終修為 123〕");
    expect(container).toHaveTextContent(`〔每頁化為 ${numbers.legacy.pageInsight} 點感悟〕`);
    expect(findTestContent(container).testBlocks).toHaveLength(1);
  });
});

describe("OpeningScreen 開局畫面（凡人期）", () => {
  function createMortalGame(testMode) {
    const gameController = createTestGame();
    gameController.newLife("少年");
    gameController.startMortal(); // 完整模式，進入每季行動
    gameController.testMode = testMode;
    return gameController;
  }

  test("一般模式：沒有「還有 N 季」與任何〔…〕行或 test 區塊，但看得到行動選項", () => {
    const { container, getByText } = render(<OpeningScreen game={createMortalGame(false)} />);
    const { testBlocks, bracketLines } = findTestContent(container);
    expect(testBlocks).toEqual([]);
    expect(bracketLines).toEqual([]);
    expect(getByText("這一季，你打算……")).toBeInTheDocument();
  });

  test("顯示數值模式：出現「還有 N 季」，並附上測試狀態區", () => {
    const { container } = render(<OpeningScreen game={createMortalGame(true)} />);
    expect(container).toHaveTextContent(/〔還有 \d+ 季〕/);
    expect(findTestContent(container).testBlocks.length).toBeGreaterThanOrEqual(1);
  });
});
