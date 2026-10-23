// visibleText()：一般模式隱藏〔…〕數值行，顯示數值時原樣保留
import { describe, expect, test } from "vitest";
import { visibleText } from "../src/components/text.js";

const normalModeGame = { testMode: false };
const testModeGame = { testMode: true };

describe("visibleText 文字過濾", () => {
  test("一般模式：整行只有〔…〕的數值行被隱藏，其餘行保留", () => {
    const text = "你吐納了一季。\n〔修為 +25〕\n窗外下起了雨。";
    expect(visibleText(normalModeGame, text)).toBe("你吐納了一季。\n窗外下起了雨。");
  });

  test("一般模式：行內的〔…〕不是整行，不會被誤刪（現況：整行才過濾）", () => {
    const text = "你悟得神通〔金剛身〕，心中一定。";
    expect(visibleText(normalModeGame, text)).toBe(text);
  });

  test("一般模式：〔…〕前後有空白的整行仍會被隱藏", () => {
    expect(visibleText(normalModeGame, "故事\n   〔數值〕  \n結尾")).toBe("故事\n結尾");
  });

  test("顯示數值模式：〔…〕行完整保留", () => {
    const text = "你吐納了一季。\n〔修為 +25〕";
    expect(visibleText(testModeGame, text)).toBe(text);
  });

  test("空字串或沒有文字時原樣回傳，不丟例外", () => {
    expect(visibleText(normalModeGame, "")).toBe("");
    expect(visibleText(normalModeGame, undefined)).toBeUndefined();
  });

  test("一般模式：全部都是〔…〕行時變成空字串", () => {
    expect(visibleText(normalModeGame, "〔甲〕\n〔乙〕")).toBe("");
  });
});
