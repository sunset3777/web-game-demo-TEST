// 結局畫面：留下筆記時傳承檔寫入失敗，玩家要看到存檔失敗的提示、留在結局畫面，之後還能再試
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { save } from "../src/systems/save.js";
import { createTestGame, playToCultivation, useSeededRandom } from "./helpers/gameFixtures.js";

afterEach(() => { vi.restoreAllMocks(); });

// 上一次遊玩坐化了但還沒留下筆記；重新開啟 App，從標題回到結局畫面並勾選第一頁筆記
async function reopenAtLifeEndingWithOneNotePicked() {
  useSeededRandom(1);
  const previousSession = playToCultivation(createTestGame());
  previousSession.retire();
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "為 測試修士 留下筆記" }));
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
}

describe("結局畫面", () => {
  test("傳承檔寫入失敗：顯示「存檔失敗，舊存檔仍保留，請稍後再試。」，不說已留下筆記，仍停在結局畫面", async () => {
    await reopenAtLifeEndingWithOneNotePicked();
    const saveBefore = localStorage.getItem(save.SAVE_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError（測試模擬）"); });

    await userEvent.click(screen.getByRole("button", { name: "留下筆記，進入下一世" }));
    expect(screen.getByText("存檔失敗，舊存檔仍保留，請稍後再試。")).toBeInTheDocument();
    expect(screen.queryByText(/留下了/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "一世終了" })).toBeInTheDocument();
    expect(localStorage.getItem(save.SAVE_KEY)).toBe(saveBefore);
  });

  test("寫入失敗後儲存恢復，再按一次就回到標題，看到「留下了 1 頁筆記」", async () => {
    await reopenAtLifeEndingWithOneNotePicked();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError（測試模擬）"); });
    await userEvent.click(screen.getByRole("button", { name: "留下筆記，進入下一世" }));

    setItemSpy.mockRestore();
    await userEvent.click(screen.getByRole("button", { name: "留下筆記，進入下一世" }));
    expect(screen.getByRole("heading", { name: "一世修仙" })).toBeInTheDocument();
    expect(screen.getByText(/^留下了 1 頁筆記/)).toBeInTheDocument();
    expect(screen.queryByText(/存檔失敗/)).not.toBeInTheDocument();
    expect(localStorage.getItem(save.SAVE_KEY)).toBeNull();
  });

  test("傳承檔來自較新版本：按「留下筆記」顯示「這份存檔來自較新版本」而不是會一直失敗的「請稍後再試」，傳承檔與存檔原字不動", async () => {
    useSeededRandom(1);
    playToCultivation(createTestGame()).retire();
    const newerLegacyText = JSON.stringify({ v: save.SAVE_VERSION + 98, lives: [{ name: "未來" }], pending: [] });
    localStorage.setItem(save.LEGACY_KEY, newerLegacyText);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "為 測試修士 留下筆記" }));
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    const saveBefore = localStorage.getItem(save.SAVE_KEY);

    await userEvent.click(screen.getByRole("button", { name: "留下筆記，進入下一世" }));
    expect(screen.getByText(/^這份存檔來自較新版本/)).toBeInTheDocument();
    expect(screen.queryByText(/請稍後再試/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "一世終了" })).toBeInTheDocument();
    expect(localStorage.getItem(save.LEGACY_KEY)).toBe(newerLegacyText);
    expect(localStorage.getItem(save.SAVE_KEY)).toBe(saveBefore);
  });
});
