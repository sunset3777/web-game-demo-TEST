// 能力池（靈根覺醒、大境界突破）與成長池（小境界），沿用 v4
export const abilities = {
  // 能力在幻境中的景象（找不到時退回該系的通用意象）
  vision(name, tag) {
    const a = this.pool.find(x => x.name === name);
    return (a && a.img) || this.imagery[tag || (a && a.tag)] || tag || name;
  },
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
  // img：入定幻境中看到的景象（每個能力各自不同，同系意象相近，讓玩家學會解讀）
  pool: [
    { name: "金鋒劍氣", cat: "主動神通", rarity: "普通", tier: "入門", tag: "金", desc: "單體金傷，無視部分防禦", img: "一柄斷劍插在雪地裡，劍身仍在低鳴" },
    { name: "鐵骨訣", cat: "被動", rarity: "普通", tier: "入門", tag: "金", desc: "銳金之氣淬體，遊歷受傷 −15%", img: "一塊頑鐵在爐火裡燒了三天三夜，越燒越亮", effect: { injury: 0.85 } },
    { name: "金剛護體", cat: "被動", rarity: "普通", tier: "築基", tag: "金", desc: "防禦 +15%", img: "寺前銅鐘被雷劈中，鐘聲卻更加洪亮" },
    { name: "庚金指", cat: "主動神通", rarity: "普通", tier: "築基", tag: "金", desc: "一指破防", img: "一根銀針穿過七層牛皮，針尖不卷" },
    { name: "萬劍歸宗", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "金", desc: "多段金傷", img: "滿山的鐵器同時嗡鳴，指向同一個方向" },
    { name: "金身不朽", cat: "被動", rarity: "稀有", tier: "金丹", tag: "金", desc: "防禦大增，遊歷受傷 −30%", img: "一尊金像立在廢墟中央，千年風沙也磨不去它的光", effect: { injury: 0.7 } },
    { name: "回春術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "木", desc: "回復生命", img: "枯木逢春，一夜之間抽出新枝" },
    { name: "青藤引", cat: "被動", rarity: "普通", tier: "入門", tag: "木", desc: "草木親近，遊歷採得素材 +10%", img: "藤蔓順著你的腳踝爬上來，像在認親", effect: { material: 0.10 } },
    { name: "藤縛術", cat: "主動神通", rarity: "普通", tier: "築基", tag: "木", desc: "束縛一回合", img: "千年古藤把一頭猛虎輕輕纏住，不傷分毫" },
    { name: "長生木心", cat: "被動", rarity: "稀有", tier: "築基", tag: "木", desc: "壽元 +10 年", img: "一棵老樹的年輪在你眼前一圈圈展開，數不到盡頭", effect: { life: 10 } },
    { name: "萬木回春", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "木", desc: "大量回復並解除負面狀態", img: "焦土上一夜長出整片森林" },
    { name: "青帝長生訣", cat: "被動", rarity: "稀有", tier: "金丹", tag: "木", desc: "壽元 +15 年", img: "一粒種子落在你掌心，發芽、開花、結果，又落回土裡", effect: { life: 15 } },
    { name: "水幕術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "水", desc: "護盾", img: "深潭無波，倒映著不屬於此世的星空" },
    { name: "滌心水訣", cat: "被動", rarity: "普通", tier: "入門", tag: "水", desc: "心魔增長 −20%", img: "一滴墨落進清水，轉眼散得無影無蹤", effect: { demonGain: 0.8 } },
    { name: "寒冰刺", cat: "主動神通", rarity: "普通", tier: "築基", tag: "水", desc: "水傷並減速", img: "屋簷下的冰柱一根根落下，排成一列" },
    { name: "玄水心訣", cat: "被動", rarity: "稀有", tier: "築基", tag: "水", desc: "每回合回復靈力；感悟 +10%", img: "潮水退去，沙灘上留著一行你看不懂的字", effect: { insight: 0.10 } },
    { name: "玄冥真水", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "水", desc: "全體水傷並封印靈力一回合", img: "黑色的河水倒流上天" },
    { name: "上善若水", cat: "被動", rarity: "稀有", tier: "金丹", tag: "水", desc: "閉關效率 +15%", img: "水滴穿過頑石，石上留下一個圓潤的小孔", effect: { seclude: 0.15 } },
    { name: "火球術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "火", desc: "單體火傷 1.5 倍攻擊", img: "一盞孤燈在狂風中不滅，反而越燒越旺" },
    { name: "丹火心法", cat: "被動", rarity: "普通", tier: "入門", tag: "火", desc: "修練速度 +5%", img: "灶膛裡的火一夜未熄，鍋裡的粥還溫著", effect: { cult: 0.05 } },
    { name: "烈焰護體", cat: "被動", rarity: "普通", tier: "築基", tag: "火", desc: "受擊時反彈少量火傷", img: "一隻飛蛾撲進火裡，卻帶著火光飛了出來" },
    { name: "離火遁", cat: "主動神通", rarity: "普通", tier: "築基", tag: "火", desc: "化火遁走，遊歷受傷 −20%", img: "火星濺起，落地時已在百步之外", effect: { injury: 0.8 } },
    { name: "焚天炎印", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "火", desc: "全體火傷，需存 2 回合靈力", img: "天邊燒起一片紅雲，雲裡有鳳鳴" },
    { name: "薪盡火傳", cat: "被動", rarity: "稀有", tier: "金丹", tag: "火", desc: "更容易找到前人遺府", img: "一支將熄的火把，點燃了另一支", effect: { legacyFind: 0.15 } },
    { name: "土牆術", cat: "主動神通", rarity: "普通", tier: "入門", tag: "土", desc: "格擋一次攻擊", img: "群山沉默，你聽見大地緩慢的心跳" },
    { name: "坐如山", cat: "被動", rarity: "普通", tier: "入門", tag: "土", desc: "閉關效率 +8%", img: "一塊石頭坐在山頂，看了一千年的日出", effect: { seclude: 0.08 } },
    { name: "地刺", cat: "主動神通", rarity: "普通", tier: "築基", tag: "土", desc: "土傷並降低對方速度", img: "乾裂的地面忽然隆起，像有什麼要破土而出" },
    { name: "搬山勁", cat: "主動神通", rarity: "普通", tier: "築基", tag: "土", desc: "力舉千鈞", img: "一個老人一鋤一鋤，把山挖低了一寸" },
    { name: "地脈感應", cat: "特殊", rarity: "稀有", tier: "金丹", tag: "土", desc: "感知地脈，遊歷事件 +10%", img: "你閉上眼，看見大地下的靈脈像河一樣流淌", effect: { event: 0.10 } },
    { name: "萬里黃沙", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "土", desc: "全體土傷並遮蔽視線", img: "一陣風起，整座城沒入黃沙，只剩塔尖" },
    { name: "靜心訣", cat: "被動", rarity: "普通", tier: "入門", tag: "心境", desc: "心魔增長減半", img: "遠處傳來鐘聲，你看見年幼的自己", effect: { demonGain: 0.5 } },
    { name: "明心見性", cat: "被動", rarity: "普通", tier: "入門", tag: "心境", desc: "感悟 +8%", img: "一面蒙塵的鏡子，被風一點一點吹亮", effect: { insight: 0.08 } },
    { name: "望氣術", cat: "特殊", rarity: "稀有", tier: "築基", tag: "心境", desc: "看出他人善惡與機緣，解鎖劇情選項", img: "人群中每個人頭頂都飄著一縷顏色不同的煙", effect: { flag: "望氣術" } },
    { name: "坐忘", cat: "被動", rarity: "稀有", tier: "築基", tag: "心境", desc: "閉關效率 +10%", img: "你坐在湖邊，忘了自己是誰，湖也忘了", effect: { seclude: 0.10 } },
    { name: "心猿歸位", cat: "被動", rarity: "稀有", tier: "金丹", tag: "心境", desc: "心魔增長 −40%", img: "一隻躁動的猿猴，終於在你掌心睡著", effect: { demonGain: 0.6 } },
    { name: "蠻牛勁", cat: "主動神通", rarity: "普通", tier: "入門", tag: "肉身", desc: "高傷害普通攻擊", img: "一頭蠻牛撞向山壁，山壁裂開，牛毫髮無傷" },
    { name: "鍛骨", cat: "被動", rarity: "普通", tier: "入門", tag: "肉身", desc: "遊歷受傷 −15%", img: "鐵匠一錘一錘，敲打著燒紅的骨頭", effect: { injury: 0.85 } },
    { name: "銅皮鐵骨", cat: "被動", rarity: "普通", tier: "築基", tag: "肉身", desc: "防禦 +20%，遊歷受傷機率減半", img: "刀砍在你手臂上，崩出一個缺口", effect: { injury: 0.5 } },
    { name: "龍象之力", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "肉身", desc: "力大無窮", img: "一頭白象與一條蛟龍角力，誰也不讓誰" },
    { name: "血氣如虹", cat: "被動", rarity: "稀有", tier: "金丹", tag: "肉身", desc: "壽元 +8 年，受傷 −20%", img: "你的心跳聲，蓋過了瀑布", effect: { life: 8, injury: 0.8 } },
    { name: "心魔化力", cat: "被動", rarity: "普通", tier: "入門", tag: "魔", desc: "修練速度 +10%", img: "一團黑霧鑽進你的胸口，沉甸甸的，卻很溫暖", effect: { cult: 0.10 } },
    { name: "魔焰", cat: "主動神通", rarity: "普通", tier: "築基", tag: "魔", desc: "黑焰灼燒，心魔越高越強", img: "燭火忽然變成黑色，照得四周更暗" },
    { name: "天魔解體", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "魔", desc: "燃燒精血換一時之力", img: "你看見自己的身影碎成千片，每一片都在笑" },
    { name: "噬魂", cat: "特殊", rarity: "稀有", tier: "金丹", tag: "魔", desc: "吞噬敵人殘魂，感悟 +12%", img: "無數低語湧向你，然後一一沉默", effect: { insight: 0.12 } },
    { name: "掌心雷", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "雷", desc: "單體雷傷，有機率麻痺", img: "一道雷光劈開黑夜，照亮整片山林" },
    { name: "雷光淬體", cat: "被動", rarity: "稀有", tier: "金丹", tag: "雷", desc: "雷劫傷害減半，受傷 −20%", img: "你站在雷雨中，每一道雷都繞開了你", effect: { injury: 0.8 } },
    { name: "冰魄寒光", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "冰", desc: "冰傷並凍結一回合", img: "寒霜爬上你的指尖，卻一點也不冷" },
    { name: "冰心訣", cat: "被動", rarity: "稀有", tier: "金丹", tag: "冰", desc: "心魔增長 −30%", img: "湖面結了冰，冰下的魚仍在游", effect: { demonGain: 0.7 } },
    { name: "劍心通明", cat: "被動", rarity: "稀有", tier: "築基", tag: "劍", desc: "劍意凝神，感悟 +10%", img: "你看見自己變成一把劍，插在山巔", effect: { insight: 0.10 } },
    { name: "劍氣縱橫", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "劍", desc: "多段劍氣", img: "萬千劍影在雲海中排成一列，向你行禮" },
    { name: "御風術", cat: "特殊", rarity: "稀有", tier: "築基", tag: "風", desc: "遊歷受傷 −20%，事件 +5%", img: "風過竹林，每一片葉子都在說同一句話", effect: { injury: 0.8, event: 0.05 } },
    { name: "青風化影", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "風", desc: "身法如風，殘影迷敵", img: "一片落葉在風中轉了九十九圈，始終沒有落地" },
    { name: "燎原火", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "炎", desc: "火勢蔓延，持續燒傷", img: "林火燎原，灰燼裡長出新芽" },
    { name: "炎心", cat: "被動", rarity: "稀有", tier: "金丹", tag: "炎", desc: "修練速度 +8%", img: "火山口裡，岩漿像心臟一樣起伏", effect: { cult: 0.08 } },
    { name: "熔岩甲", cat: "被動", rarity: "稀有", tier: "築基", tag: "岩", desc: "受傷 −25%", img: "熔岩冷卻成石，石中有火", effect: { injury: 0.75 } },
    { name: "磐石不移", cat: "被動", rarity: "稀有", tier: "金丹", tag: "岩", desc: "心魔增長 −20%", img: "洪水漫過山谷，一塊巨石紋風不動", effect: { demonGain: 0.8 } },
    { name: "玄黃氣", cat: "被動", rarity: "稀有", tier: "築基", tag: "玄", desc: "閉關效率 +10%", img: "黑土之下，埋著一塊溫潤的金", effect: { seclude: 0.10 } },
    { name: "厚德載物", cat: "被動", rarity: "稀有", tier: "金丹", tag: "玄", desc: "壽元 +8 年", img: "大地托住了墜落的星辰", effect: { life: 8 } },
    { name: "萬毒手", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "毒", desc: "中者持續受傷", img: "一株毒草開出極美的花" },
    { name: "百毒不侵", cat: "被動", rarity: "稀有", tier: "金丹", tag: "毒", desc: "受傷 −20%", img: "一條毒蛇咬了你一口，自己卻倒下了", effect: { injury: 0.8 } },
    { name: "冥目", cat: "特殊", rarity: "稀有", tier: "築基", tag: "冥", desc: "看見亡者殘念，更容易找到前人遺府", img: "泥沼深處，有一雙眼睛靜靜看著你", effect: { legacyFind: 0.15 } },
    { name: "幽冥遁", cat: "主動神通", rarity: "稀有", tier: "金丹", tag: "冥", desc: "遁入陰影", img: "你走進自己的影子，從另一處的影子走出" },
    { name: "流霞錦", cat: "主動神通", rarity: "稀有", tier: "築基", tag: "霞", desc: "霞光纏敵，水火交替", img: "水火相激，天邊燒出一片晚霞" },
    { name: "霞光照心", cat: "被動", rarity: "稀有", tier: "金丹", tag: "霞", desc: "感悟 +12%", img: "晨光與暮色同時落在你身上", effect: { insight: 0.12 } }
  ],

  growth: [
    { name: "吐納精進", sense: "呼吸吐納的節奏", cat: "功法精進", rarity: "普通", tag: "心境", desc: "修煉速度 +5%", repeat: true, effect: { cult: 0.05 } },
    { name: "周天運轉", sense: "周天運行的路數", cat: "功法精進", rarity: "普通", tag: "心境", desc: "閉關效率 +8%", repeat: true, effect: { seclude: 0.08 } },
    { name: "功法第二層・金", cat: "功法精進", rarity: "稀有", tag: "金", desc: "主修金系時修煉 +10%，金 ×1.2", effect: { second: "金" } },
    { name: "功法第二層・木", cat: "功法精進", rarity: "稀有", tag: "木", desc: "主修木系時修煉 +10%，木 ×1.2", effect: { second: "木" } },
    { name: "功法第二層・水", cat: "功法精進", rarity: "稀有", tag: "水", desc: "主修水系時修煉 +10%，水 ×1.2", effect: { second: "水" } },
    { name: "功法第二層・火", cat: "功法精進", rarity: "稀有", tag: "火", desc: "主修火系時修煉 +10%，火 ×1.2", effect: { second: "火" } },
    { name: "功法第二層・土", cat: "功法精進", rarity: "稀有", tag: "土", desc: "主修土系時修煉 +10%，土 ×1.2", effect: { second: "土" } },
    { name: "金之體悟", sense: "金鐵的鋒意", tiers: ["庚金真意", "鋒銳道韻"], cat: "體悟", rarity: "普通", tag: "金", desc: "金標籤永久 ×1.1", repeat: true, effect: { tagMult: ["金", 1.1] } },
    { name: "木之體悟", sense: "草木的生息", tiers: ["青木真意", "生生道韻"], cat: "體悟", rarity: "普通", tag: "木", desc: "木標籤永久 ×1.1", repeat: true, effect: { tagMult: ["木", 1.1] } },
    { name: "水之體悟", sense: "水的流轉", tiers: ["玄水真意", "上善道韻"], cat: "體悟", rarity: "普通", tag: "水", desc: "水標籤永久 ×1.1", repeat: true, effect: { tagMult: ["水", 1.1] } },
    { name: "火之體悟", sense: "火的脈動", tiers: ["離火真意", "薪火道韻"], cat: "體悟", rarity: "普通", tag: "火", desc: "火標籤永久 ×1.1", repeat: true, effect: { tagMult: ["火", 1.1] } },
    { name: "土之體悟", sense: "大地的厚重", tiers: ["厚土真意", "載物道韻"], cat: "體悟", rarity: "普通", tag: "土", desc: "土標籤永久 ×1.1", repeat: true, effect: { tagMult: ["土", 1.1] } },
    { name: "靈台清明", sense: "心湖的波紋", tiers: ["心如止水", "道心通明"], cat: "體悟", rarity: "普通", tag: "心境", desc: "心魔增長 −20%", repeat: true, effect: { demonGain: 0.8 } },
    { name: "厚積薄發", sense: "積累與迸發的分寸", cat: "體悟", rarity: "稀有", tag: "心境", desc: "瓶頸期感悟 +15%", repeat: true, effect: { insight: 0.15 } },
    { name: "經脈拓寬", sense: "經脈裡靈力的奔流", cat: "根基", rarity: "普通", tag: "肉身", desc: "靈力上限 +10%", repeat: true },
    { name: "淬骨", sense: "筋骨深處的變化", cat: "根基", rarity: "普通", tag: "肉身", desc: "生命 +10%", repeat: true },
    { name: "神識凝練", cat: "根基", rarity: "傳說", tag: "心境", desc: "神通佇列 +1" }
  ],

  // 覺醒時依最高標籤或融合系得到的體質
  constitutions: {
    "金": ["庚金之體", "庚金靈體", "庚金聖體", "庚金道體"],
    "木": ["青木之體", "青木靈體", "青木聖體", "青木道體"],
    "水": ["玄水之體", "玄水靈體", "玄水聖體", "玄水道體"],
    "火": ["赤陽之體", "赤陽靈體", "赤陽聖體", "赤陽道體"],
    "土": ["厚土之體", "厚土靈體", "厚土聖體", "厚土道體"],
    "心境": ["天生道心", "琉璃道心", "無垢道心", "太上道心"],
    "肉身": ["金剛之體", "金剛靈體", "金剛不壞之體", "不滅道體"],
    "炎": ["焚炎之體", "焚炎靈體", "焚炎聖體", "焚炎道體"],
    "岩": ["磐岩之體", "磐岩靈體", "磐岩聖體", "磐岩道體"],
    "玄": ["玄黃之體", "玄黃靈體", "玄黃聖體", "玄黃道體"],
    "冰": ["寒冰之體", "寒冰靈體", "寒冰聖體", "寒冰道體"],
    "風": ["青風之體", "青風靈體", "青風聖體", "青風道體"],
    "雷": ["紫雷之體", "紫雷靈體", "紫雷聖體", "紫雷道體"],
    "毒": ["萬毒之體", "萬毒靈體", "萬毒聖體", "萬毒道體"],
    "冥": ["幽冥之體", "幽冥靈體", "幽冥聖體", "幽冥道體"],
    "霞": ["流霞之體", "流霞靈體", "流霞聖體", "流霞道體"],
    "劍": ["先天劍體", "劍靈體", "劍聖體", "劍道體"]
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
