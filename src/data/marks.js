// 凡人期：少年志向與少年印記（終生不衰減）
export const marks = {
  aims: [
    { id: "讀書識字", verb: "到私塾聽先生講書", habit: "在私塾裡讀書", mark: "書生", evolve: "悟性", desc: "感悟獲得 +15%", effect: { insight: 0.15 } },
    { id: "習武鍛體", verb: "去武館扎馬步、練拳腳", habit: "在武館練拳", mark: "武童", evolve: "鐵骨", desc: "肉身 ×1.1，遊歷受傷機率 −30%", effect: { tagMult: ["肉身", 1.1], injury: 0.7 } },
    { id: "採藥打工", verb: "在藥鋪幫忙，跟掌櫃上山採藥", habit: "在藥鋪幫忙", mark: "藥童", evolve: "丹心", desc: "遊歷找到素材機率 +15%", effect: { material: 0.15 } },
    { id: "結交他人", verb: "和鎮上的孩子們混在一起", habit: "和朋友們四處玩鬧", mark: "孩子王", evolve: "人緣", desc: "人物相關事件選項變多", effect: { flag: "人緣" } },
    { id: "聽說書、打聽", verb: "泡在茶館聽說書人講古", habit: "泡在茶館聽書", mark: "說書迷", evolve: "博聞", desc: "更容易遇到前人遺府", effect: { legacyFind: 0.15 } },
    { id: "冒險", verb: "往後山沒人去的地方鑽", habit: "在後山野", mark: "野孩子", evolve: "福緣", desc: "遊歷事件機率 +15%；可能誤食靈果", effect: { event: 0.15 } }
  ],
  // 組合印記（兩個志向都練過才可能出現；第一階段只用單一志向）
  combos: [
    { a: "讀書識字", b: "習武鍛體", mark: "儒俠" },
    { a: "採藥打工", b: "冒險", mark: "山野客" },
    { a: "結交他人", b: "聽說書、打聽", mark: "江湖通" }
  ],
  fruitChance: 0.30,  // 野孩子在凡人期誤食靈果的機率
  surnames: ["林", "沈", "顧", "陸", "蘇", "葉", "韓", "秦", "柳", "白", "謝", "雲"],
  givenNames: ["青", "玄", "遠", "辰", "瑤", "清", "寒", "川", "遙", "微", "衍", "舟", "笙", "霽"]
};
