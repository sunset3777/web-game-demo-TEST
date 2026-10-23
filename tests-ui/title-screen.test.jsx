// 標題畫面：繼續按鈕、前人筆記提示、前世列表，以及死亡後只能回到結局畫面選筆記、不能繼續
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import TitleScreen from "../src/components/TitleScreen.jsx";
import { state } from "../src/systems/state.js";
import { save } from "../src/systems/save.js";
import {
  createSavedState, createTestGame, playToCultivation, useSeededRandom, writeLegacy, writeSave
} from "./helpers/gameFixtures.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("標題畫面", () => {
  test("沒有任何存檔時，玩家只看到「開始新的一生」，沒有「繼續」按鈕", () => {
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.getByRole("button", { name: "開始新的一生" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^繼續/ })).not.toBeInTheDocument();
  });

  test("接線：有活著的存檔時，出現「繼續 姓名（境界）」按鈕，點下去會呼叫 continueLife", async () => {
    writeSave(createSavedState("舊日修士"));
    const gameController = createTestGame();
    const continueSpy = vi.spyOn(gameController, "continueLife").mockImplementation(() => {});
    render(<TitleScreen game={gameController} />);

    const continueButton = screen.getByRole("button", { name: "繼續 舊日修士（煉氣第1層）" });
    await userEvent.click(continueButton);
    expect(continueSpy).toHaveBeenCalledTimes(1);
  });

  test("真流程：玩過一段後重新開啟，點「繼續」會回到修練畫面，角色名字、境界與日誌都是存檔裡的進度", async () => {
    useSeededRandom(21);
    // 上一次遊玩：真 controller 走到修練畫面並行動兩次，每次行動都會自動存檔
    const previousSession = playToCultivation(createTestGame(), "續玩修士");
    previousSession.doAction("吐納", false);
    if (previousSession.s.current) previousSession.pick(0); // 行動若引來事件，先選掉，存檔才停在行動列
    previousSession.doAction("周天", false);
    if (previousSession.s.current) previousSession.pick(0);
    expect(previousSession.s.current).toBeNull();
    const savedStageName = state.stageName(previousSession.s);
    const savedJournalLength = previousSession.s.log.length;
    expect(savedJournalLength).toBeGreaterThanOrEqual(2);

    // 重新開啟：全新的 App 從標題開始
    render(<App />);
    expect(screen.getByRole("heading", { name: "一世修仙" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: `繼續 續玩修士（${savedStageName}）` }));

    expect(screen.queryByRole("button", { name: "開始新的一生" })).not.toBeInTheDocument();
    const statusPanel = screen.getByRole("complementary");
    expect(within(statusPanel).getByText("續玩修士")).toBeInTheDocument();
    expect(statusPanel).toHaveTextContent(savedStageName);
    expect(statusPanel).toHaveTextContent("神通與體悟");
    expect(screen.getByRole("button", { name: /^吐納/ })).toBeInTheDocument();
    const journalCard = screen.getByRole("tablist").parentElement;
    expect(within(journalCard).getAllByRole("listitem")).toHaveLength(savedJournalLength);
  });

  test("存檔已標成死亡（alive=false）時，不顯示「繼續」按鈕", () => {
    writeSave(createSavedState("已逝修士", { alive: false }));
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.queryByRole("button", { name: /^繼續/ })).not.toBeInTheDocument();
  });

  test("傳承檔有待取的筆記頁時，顯示「有 N 頁前人筆記等待被找到」的提示", () => {
    writeLegacy({ lives: [], pending: [{ text: "甲" }, { text: "乙" }] });
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.getByText("有 2 頁前人筆記等待被找到。")).toBeInTheDocument();
  });

  test("沒有待取的筆記頁時，不顯示前人筆記提示", () => {
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.queryByText(/前人筆記等待被找到/)).not.toBeInTheDocument();
  });

  test("前世列表把最近一世排在最上面，並顯示稱號、境界、享年與死因", () => {
    writeLegacy({
      lives: [
        { name: "甲", title: "煉氣散修", realm: "煉氣第3層", age: 30, cause: "壽盡", root: "木靈根" },
        { name: "乙", title: "金丹修士", realm: "金丹初期", age: 120, cause: "坐化", root: "火靈根" }
      ],
      pending: []
    });
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.getByRole("heading", { name: "前世" })).toBeInTheDocument();
    const livesList = screen.getByRole("list");
    const items = livesList.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("乙・金丹修士・金丹初期・120 歲・坐化");
    expect(items[1]).toHaveTextContent("甲・煉氣散修・煉氣第3層・30 歲・壽盡");
  });

  test("沒有前世紀錄時，不顯示「前世」標題", () => {
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.queryByRole("heading", { name: "前世" })).not.toBeInTheDocument();
  });

  // 死亡後的行為：標題不能再讀回死前的進度（審查 4-1）
  test("死亡後標題不該再出現「繼續」（存檔應被清掉或標成已死）", () => {
    useSeededRandom(1);
    const playedGame = playToCultivation(createTestGame());
    playedGame.retire();

    render(<TitleScreen game={createTestGame()} />);
    expect(screen.queryByRole("button", { name: /^繼續/ })).not.toBeInTheDocument();
  });

  test("真流程：坐化後還沒留下筆記就重新開啟，標題出現「為 姓名 留下筆記」，點下去回到結局畫面選筆記", async () => {
    useSeededRandom(1);
    const playedGame = playToCultivation(createTestGame());
    playedGame.retire();
    expect(save.load().alive).toBe(false);

    render(<App />);
    expect(screen.queryByRole("button", { name: /^繼續/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "為 測試修士 留下筆記" }));
    expect(screen.getByRole("heading", { name: "一世終了" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "留下筆記，進入下一世" })).toBeInTheDocument();
  });

  test("存檔是活著的進度時，不顯示「留下筆記」按鈕", () => {
    writeSave(createSavedState("舊日修士"));
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.queryByRole("button", { name: /留下筆記/ })).not.toBeInTheDocument();
  });

  test("存檔來自較新版本時：顯示「這份存檔來自較新版本」，沒有「繼續」；按「開始新的一生」被擋下並說明，存檔不被覆蓋", async () => {
    const newerSave = createSavedState("未來修士", { v: save.SAVE_VERSION + 4 });
    localStorage.setItem(save.SAVE_KEY, JSON.stringify(newerSave));
    const newerSaveText = localStorage.getItem(save.SAVE_KEY);

    render(<App />);
    expect(screen.getByText(/^這份存檔來自較新版本/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^繼續/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
    expect(screen.getByText("為了不蓋掉較新版本的存檔，這裡不能開始新的一生。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "一世修仙" })).toBeInTheDocument();
    expect(localStorage.getItem(save.SAVE_KEY)).toBe(newerSaveText);
  });

  test("傳承檔來自較新版本時，同樣顯示「這份存檔來自較新版本」", () => {
    localStorage.setItem(save.LEGACY_KEY, JSON.stringify({ v: save.SAVE_VERSION + 4, lives: [], pending: [] }));
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.getByText(/^這份存檔來自較新版本/)).toBeInTheDocument();
  });

  test("一般存檔不顯示較新版本的提示", () => {
    writeSave(createSavedState("舊日修士"));
    render(<TitleScreen game={createTestGame()} />);
    expect(screen.queryByText(/較新版本/)).not.toBeInTheDocument();
  });

  describe("上一世的筆記還沒留下時開始新的一生", () => {
    function playToUnbequeathedEnding() {
      useSeededRandom(1);
      playToCultivation(createTestGame()).retire();
      writeLegacy({ lives: [{ name: "前人", title: "散修", realm: "煉氣第3層", age: 30, cause: "壽盡", root: "木靈根" }], pending: [] });
      return localStorage.getItem(save.SAVE_KEY);
    }
    const reminderText = "上一世（測試修士）的筆記還沒留下，現在開始新的一生，那些筆記就留不住了。";

    test("按「開始新的一生」先出現提醒，尚未開始新的一世，存檔與前世紀錄都還在", async () => {
      const endingSaveText = playToUnbequeathedEnding();
      const legacyText = localStorage.getItem(save.LEGACY_KEY);
      render(<App />);
      await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
      expect(screen.getByText(reminderText)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "還是開始新的一生" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "一世修仙" })).toBeInTheDocument();
      expect(localStorage.getItem(save.SAVE_KEY)).toBe(endingSaveText);
      expect(localStorage.getItem(save.LEGACY_KEY)).toBe(legacyText);
    });

    test("按「先去留下筆記」回到結局畫面", async () => {
      playToUnbequeathedEnding();
      render(<App />);
      await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
      await userEvent.click(screen.getByRole("button", { name: "先去留下筆記" }));
      expect(screen.getByRole("heading", { name: "一世終了" })).toBeInTheDocument();
    });

    test("按「還是開始新的一生」才真的開始新一世", async () => {
      playToUnbequeathedEnding();
      render(<App />);
      await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
      await userEvent.click(screen.getByRole("button", { name: "還是開始新的一生" }));
      expect(screen.queryByRole("heading", { name: "一世修仙" })).not.toBeInTheDocument();
      expect(screen.queryByText(reminderText)).not.toBeInTheDocument();
      expect(save.load().alive).toBe(true);
    });

    test("沒有這種存檔時，按「開始新的一生」直接開始，不出現提醒", async () => {
      render(<App />);
      await userEvent.click(screen.getByRole("button", { name: "開始新的一生" }));
      expect(screen.queryByText(/筆記還沒留下/)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "一世修仙" })).not.toBeInTheDocument();
    });
  });
});
