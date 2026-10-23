// 整流程冒煙測試：用最上層的 App 從標題開始新的一生，走過快速開局到修練畫面
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { useSeededRandom } from "./helpers/gameFixtures.js";

beforeEach(() => { useSeededRandom(11); });
afterEach(() => { vi.restoreAllMocks(); });

// 從標題走到入定幻境選完第一個景象（尚未關掉老執事的提醒）
async function playToAwakening() {
  await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
  await userEvent.click(screen.getAllByRole("button", { name: /^那幾年，你大多/ })[0]);
  await userEvent.click(screen.getByRole("button", { name: "把手放上測靈石" }));
  const visionButtons = screen.getAllByRole("button").filter(button => button.classList.contains("option"));
  expect(visionButtons).toHaveLength(3);
  await userEvent.click(visionButtons[0]);
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

    const visionButtons = screen.getAllByRole("button").filter(button => button.classList.contains("option"));
    expect(visionButtons).toHaveLength(3);
    await userEvent.click(visionButtons[0]);

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

  test("進入修練畫面後點「吐納」，畫面仍正常：狀態面板還在，且出現行動列或事件選擇卡", async () => {
    render(<App />);
    await playToAwakening();
    await userEvent.click(screen.getByRole("button", { name: "記下了" }));

    await userEvent.click(screen.getByRole("button", { name: /^吐納/ }));
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    const hasActionBar = screen.queryByRole("button", { name: /^周天/ }) !== null;
    const hasChoiceCard = document.querySelector(".choice") !== null;
    expect(hasActionBar || hasChoiceCard).toBe(true);
  });
});
