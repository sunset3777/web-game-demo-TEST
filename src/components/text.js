// 「〔…〕」包起來的行是數值紀錄，只在「顯示數值」開啟時顯示
export function visibleText(game, text) {
  if (!text || game.testMode) return text;
  return text.split("\n").filter(l => !/^〔.*〕$/.test(l.trim())).join("\n");
}
