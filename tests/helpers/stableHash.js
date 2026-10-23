// 固定種子回歸測試用：把任何可存成 JSON 的資料轉成「鍵順序固定」的字串再算 sha256，
// 這樣只要狀態內容一樣，雜湊就一樣，與物件欄位的建立順序無關。
import { createHash } from "node:crypto";

export function stringifyWithSortedKeys(value) {
  if (Array.isArray(value)) return "[" + value.map(stringifyWithSortedKeys).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value).sort();
    return "{" + sortedKeys.map(key => JSON.stringify(key) + ":" + stringifyWithSortedKeys(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function hashOf(value) {
  return createHash("sha256").update(stringifyWithSortedKeys(value)).digest("hex").slice(0, 16);
}
