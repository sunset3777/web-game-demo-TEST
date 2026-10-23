// 能力池（靈根覺醒、大境界突破）與成長池（小境界），沿用 v4
export const abilities = {
  // 稀有度權重依抽選時機
  rarityWeights: {
    "成長池": { "普通": 10, "稀有": 4, "傳說": 1 },
    "靈根覺醒": { "普通": 10, "稀有": 2, "傳說": 0 },
    "築基突破": { "普通": 10, "稀有": 4, "傳說": 0.5 },
    "金丹突破": { "普通": 8, "稀有": 5, "傳說": 1 }
  },
  // 品階倍率：同階為主、低一階少量、高一階極少
  tierWeights: {
    "靈根覺醒": { "入門": 1, "築基": 0.05, "金丹": 0 },
    "築基突破": { "入門": 0.2, "築基": 1, "金丹": 0.05 },
    "金丹突破": { "入門": 0, "築基": 0.3, "金丹": 1 }
  },

  // effect：程式會處理的效果（其餘只是描述）
  pool: [
    { name: "金鋒劍氣", cat: "主動神通", rarity: "普通", tier: "入門", tag: "金", desc: "單體金傷，無視部分防禦" },
    { name: "回春術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "木", desc: "回復生命" },
    { name: "水幕術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "水", desc: "護盾" },
    { name: "火球術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "火", desc: "單體火傷 1.5 倍攻擊" },
    { name: "土牆術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "土", desc: "格擋一次攻擊" },
    { name: "靜心訣", cat: "被動", rarity: "普通", tier: "入門", tag: "心境", desc: "心魔增長減半", effect: { demonGain: 0.5 } },
    { name: "蠻牛勁", cat: "主動神通", rarity: "普通", tier: "入門", tag: "肉身", desc: "高傷害普通攻擊" },
    { name: "金剛護體", cat: "被動", rarity: "普通", tier: "築基", tag: "金", desc: "防禦 +15%" },
    { name: "藤縛術", cat: "主動神通", rarity: "普通", tier: "築基", tag: "木", desc: "束縛一回合" },
    { name: "寒冰刺", cat: "主動神通", rarity: "普通", tier: "築基", tag: "水", desc: "水傷並減速" },
    { name: "烈焰護體", cat: "被動", rarity: "普通", tier: "築基", tag: "火", desc: "受擊時反彈少量火傷" },
    { name: "地刺", cat: "主動神通", rarity: "普通", tier: "築基", tag: "土", desc: "土傷並降低對方速度" },
    { name: "銅皮鐵骨", cat: "被動", rarity: "普通", tier: "築基", tag: "肉身", desc: "防禦 +20%，遊歷受傷機率減半", effect: { injury: 0.5 } },
    { name: "長生木心", cat: "被動", rarity: "稀有", tier: "築基", tag: "木", desc: "壽元 +10 年", effect: { life: 10 } },
    { name: "玄水心訣", cat: "被動", rarity: "稀有", tier: "築基", tag: "水", desc: "每回合回復靈力；感悟 +10%", effect: { insight: 0.10 } },
    { name: "望氣術", cat: "特殊", rarity: "稀有", tier: "築基", tag: "心境", desc: "看出他人善惡與機緣，解鎖劇情選項", effect: { flag: "望氣術" } },
    { name: "萬劍歸宗", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "金", desc: "多段金傷" },
    { name: "萬木回春", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "木", desc: "大量回復並解除負面狀態" },
    { name: "玄冥真水", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "水", desc: "全體水傷並封印靈力一回合" },
    { name: "焚天炎印", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "火", desc: "全體火傷，需存 2 回合靈力" },
    { name: "赤陽之體", cat: "體質", rarity: "傳說", tier: "金丹", tag: "火", desc: "火系 ×1.3，需調和", effect: { tagMult: ["火", 1.3] } },
    { name: "厚土之體", cat: "體質", rarity: "傳說", tier: "金丹", tag: "土", desc: "土系 ×1.3，需調和", effect: { tagMult: ["土", 1.3] } },
    { name: "掌心雷", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "雷", desc: "單體雷傷，有機率麻痺" },
    { name: "冰魄寒光", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "冰", desc: "冰傷並凍結一回合" },
    { name: "雷靈之體", cat: "體質", rarity: "傳說", tier: "金丹", tag: "雷", desc: "金、木 ×1.3，雷劫傷害減半", effect: { tagMult2: ["金", "木", 1.3] } },
    { name: "劍氣縱橫", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "劍", desc: "多段劍氣" }
  ],

  growth: [
    { name: "吐納精進", cat: "功法精進", rarity: "普通", tag: "心境", desc: "修煉速度 +5%", repeat: true, effect: { cult: 0.05 } },
    { name: "周天運轉", cat: "功法精進", rarity: "普通", tag: "心境", desc: "閉關效率 +8%", repeat: true, effect: { seclude: 0.08 } },
    { name: "功法第二層・金", cat: "功法精進", rarity: "稀有", tag: "金", desc: "主修金系時修煉 +10%，金 ×1.2", effect: { second: "金" } },
    { name: "功法第二層・木", cat: "功法精進", rarity: "稀有", tag: "木", desc: "主修木系時修煉 +10%，木 ×1.2", effect: { second: "木" } },
    { name: "功法第二層・水", cat: "功法精進", rarity: "稀有", tag: "水", desc: "主修水系時修煉 +10%，水 ×1.2", effect: { second: "水" } },
    { name: "功法第二層・火", cat: "功法精進", rarity: "稀有", tag: "火", desc: "主修火系時修煉 +10%，火 ×1.2", effect: { second: "火" } },
    { name: "功法第二層・土", cat: "功法精進", rarity: "稀有", tag: "土", desc: "主修土系時修煉 +10%，土 ×1.2", effect: { second: "土" } },
    { name: "金之體悟", cat: "體悟", rarity: "普通", tag: "金", desc: "金標籤永久 ×1.1", repeat: true, effect: { tagMult: ["金", 1.1] } },
    { name: "木之體悟", cat: "體悟", rarity: "普通", tag: "木", desc: "木標籤永久 ×1.1", repeat: true, effect: { tagMult: ["木", 1.1] } },
    { name: "水之體悟", cat: "體悟", rarity: "普通", tag: "水", desc: "水標籤永久 ×1.1", repeat: true, effect: { tagMult: ["水", 1.1] } },
    { name: "火之體悟", cat: "體悟", rarity: "普通", tag: "火", desc: "火標籤永久 ×1.1", repeat: true, effect: { tagMult: ["火", 1.1] } },
    { name: "土之體悟", cat: "體悟", rarity: "普通", tag: "土", desc: "土標籤永久 ×1.1", repeat: true, effect: { tagMult: ["土", 1.1] } },
    { name: "靈台清明", cat: "體悟", rarity: "普通", tag: "心境", desc: "心魔增長 −20%", repeat: true, effect: { demonGain: 0.8 } },
    { name: "厚積薄發", cat: "體悟", rarity: "稀有", tag: "心境", desc: "瓶頸期感悟 +15%", repeat: true, effect: { insight: 0.15 } },
    { name: "經脈拓寬", cat: "根基", rarity: "普通", tag: "肉身", desc: "靈力上限 +10%", repeat: true },
    { name: "淬骨", cat: "根基", rarity: "普通", tag: "肉身", desc: "生命 +10%", repeat: true },
    { name: "神識凝練", cat: "根基", rarity: "傳說", tag: "心境", desc: "神通佇列 +1" }
  ],

  // 覺醒時依最高標籤或融合系得到的體質
  constitutions: {
    "金": "庚金之體", "木": "青木之體", "水": "玄水之體", "火": "赤陽之體", "土": "厚土之體",
    "心境": "天生道心", "肉身": "金剛不壞之體",
    "炎": "炎靈之體", "岩": "岩靈之體", "玄": "玄靈之體", "冰": "冰靈之體", "風": "風靈之體",
    "雷": "雷靈之體", "毒": "毒靈之體", "冥": "冥靈之體", "霞": "霞靈之體", "劍": "劍靈之體"
  },

  // 入定幻境的意象（依標籤）
  imagery: {
    "金": "一柄斷劍插在雪地裡，劍身仍在低鳴",
    "木": "枯木逢春，一夜之間抽出新枝",
    "水": "深潭無波，倒映著不屬於此世的星空",
    "火": "一盞孤燈在狂風中不滅，反而越燒越旺",
    "土": "群山沉默，你聽見大地緩慢的心跳",
    "心境": "遠處傳來鐘聲，你看見年幼的自己",
    "肉身": "一頭蠻牛撞向山壁，山壁裂開，牛毫髮無傷",
    "雷": "一道雷光劈開黑夜，照亮整片山林",
    "冰": "寒霜爬上你的指尖，卻一點也不冷",
    "劍": "萬千劍影在雲海中排成一列，向你行禮",
    "風": "風過竹林，每一片葉子都在說同一句話",
    "炎": "林火燎原，灰燼裡長出新芽",
    "岩": "熔岩冷卻成石，石中有火",
    "玄": "黑土之下，埋著一塊溫潤的金",
    "毒": "一株毒草開出極美的花",
    "冥": "泥沼深處，有一雙眼睛靜靜看著你",
    "霞": "水火相激，天邊燒出一片晚霞"
  }
};
