// 整流程冒煙測試：用最上層的 App 從標題開始新的一生，走過快速開局到修練畫面
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { useSeededRandom } from "./helpers/gameFixtures.js";

beforeEach(() => { useSeededRandom(11); });
afterEach(() => { vi.restoreAllMocks(); });

// 測靈畫面上的三個入定景象按鈕（用「測靈」標題所在的卡片找，不依賴 CSS 類別）
function findVisionButtons() {
  const testCard = screen.getByRole("heading", { name: "測靈" }).closest("section");
  const visionButtons = within(testCard).getAllByRole("button");
  expect(visionButtons).toHaveLength(3);
  return visionButtons;
}

// 從標題走到入定幻境選完第一個景象（尚未關掉老執事的提醒）
async function playToAwakening() {
  await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
  await userEvent.click(screen.getAllByRole("button", { name: /^那幾年，你大多/ })[0]);
  await userEvent.click(screen.getByRole("button", { name: "把手放上測靈石" }));
  await userEvent.click(findVisionButtons()[0]);
}

// 狀態面板「年歲」那一欄的文字（歲數與季節）
function readAgeAndSeasonText() {
  const statusPanel = screen.getByRole("complementary");
  return within(statusPanel).getByText("年歲").nextElementSibling.textContent;
}

// 日誌分頁目前列出的紀錄
function readJournalEntries() {
  const journalCard = screen.getByRole("tablist").parentElement;
  return within(journalCard).getAllByRole("listitem").map(entry => entry.textContent);
}

describe("整流程冒煙測試", () => {
  test("標題 → 新的一生 → 快速開局 → 測靈 → 入定覺醒 → 老執事提醒 → 修練畫面，全程不丟例外", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "一世修仙" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
    expect(screen.getByRole("heading", { name: "青石鎮" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /^那幾年，你大多/ })[0]);
    await userEvent.click(screen.getByRole("button", { name: "把手放上測靈石" }));
    expect(screen.getByRole("heading", { name: "測靈" })).toBeInTheDocument();

    await userEvent.click(findVisionButtons()[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "記下了" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // 修練畫面：標題列、狀態面板、行動列都在
    expect(screen.getByText("一世修仙", { selector: ".brand-name" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveTextContent("神通與體悟");
    for (const actionName of ["吐納", "周天", "閉關", "遊歷"]) {
      expect(screen.getByRole("button", { name: new RegExp("^" + actionName) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "坊市" })).toBeInTheDocument();
  });

  test("進入修練畫面後點「吐納」，玩家看得到季節往前走、日誌多一筆；若遇事件則事件選項有具體文字", async () => {
    render(<App />);
    await playToAwakening();
    await userEvent.click(screen.getByRole("button", { name: "記下了" }));

    const ageAndSeasonBefore = readAgeAndSeasonText();
    const journalBefore = readJournalEntries();

    await userEvent.click(screen.getByRole("button", { name: /^吐納/ }));

    expect(readAgeAndSeasonText()).not.toBe(ageAndSeasonBefore);
    const journalAfter = readJournalEntries();
    expect(journalAfter).toHaveLength(journalBefore.length + 1);
    expect(journalAfter.at(-1).length).toBeGreaterThan(0);

    const eventHeading = screen.queryByRole("heading", { level: 3, name: /./ });
    if (eventHeading) {
      // 遇到事件：行動列被事件卡取代，事件卡要有標題與至少一個有文字的選項
      const eventCard = eventHeading.parentElement;
      const choiceButtons = within(eventCard).getAllByRole("button");
      expect(choiceButtons.length).toBeGreaterThan(0);
      for (const choiceButton of choiceButtons) expect(choiceButton.textContent.trim().length).toBeGreaterThan(0);
    } else {
      expect(screen.getByRole("button", { name: /^周天/ })).toBeInTheDocument();
    }
  });
});
