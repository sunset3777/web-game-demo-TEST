// 凡人期小事件（資料驅動，格式同 events.js）
// action：哪個凡人期行動會觸發；不填＝任何行動都可能觸發
// 同一批人物會反覆出現：私塾先生、藥鋪掌櫃與女兒小荷、青梅竹馬、說書人、村口茶攤老人
export const mortalEvents = {
  list: [
    // 讀書識字
    { id: "先生借書", action: "讀書識字", once: true, title: "私塾先生",
      text: "私塾先生見你讀得認真，從櫃底翻出一本泛黃的書：「這本不考，你若有興趣就拿去看。」",
      choices: [
        { label: "收下", run: (s, api) => { api.setFlag("古籍"); api.note("私塾先生借我一本怪書，滿紙看不懂的符號。"); return "書裡畫滿了你看不懂的符號，但你還是一頁一頁讀完了。"; } },
        { label: "婉拒，專心準備科考", run: () => "先生點點頭，把書收了回去。" }
      ] },
    { id: "抄書", action: "讀書識字", title: "替人抄書",
      text: "鎮上的書鋪缺人手，掌櫃問你要不要替他抄書。",
      choices: [{ label: "接下", run: (s, api) => { api.addStones(2); return "抄了一季的書，掌櫃多塞給你兩塊亮晶晶的碎石頭，說是仙家用的東西。"; } }] },

    // 習武鍛體
    { id: "武館比試", action: "習武鍛體", title: "武館比試",
      text: "武館裡的師兄要和你過兩招。",
      choices: [
        { label: "全力以赴", run: (s, api) => api.chance(0.5) ? (api.note("少年時在武館贏過師兄一回。"), "你一記掃腿放倒了師兄，館主多看了你兩眼。") : "你被摔得鼻青臉腫，但記住了那一招。" },
        { label: "點到為止", run: () => "兩人過了幾招便收手，師兄拍拍你的肩。" }
      ] },
    { id: "扛米", action: "習武鍛體", title: "碼頭扛米",
      text: "碼頭在招短工，扛一袋米給三個銅板。",
      choices: [{ label: "去扛", run: (s, api) => { api.addStones(1); return "扛了一季的米，肩膀磨出了繭。工頭結帳時，順手給了你一塊撿來的碎靈石。"; } }] },

    // 採藥打工
    { id: "小荷生病", action: "採藥打工", once: true, title: "藥鋪的小荷",
      text: "藥鋪掌櫃的女兒小荷病了，掌櫃說後山崖邊的紫苓草能治，但那裡很危險。",
      choices: [
        { label: "去崖邊採藥", run: (s, api) => {
          if (api.chance(0.7)) { api.addKarma("救小荷", "少年時冒險採藥救了藥鋪的小荷", "中"); api.note("冒險上崖採紫苓草，救了小荷。"); return "你採回了紫苓草，小荷的病好了。掌櫃紅著眼眶說這份恩情他記下了。"; }
          return "你在崖邊滑了一跤，藥沒採到，還摔傷了腿。"; } },
        { label: "幫掌櫃看店，讓他自己去", run: () => "你守著藥鋪，掌櫃天黑才帶著草藥回來。" }
      ] },
    { id: "認草藥", action: "採藥打工", title: "認草藥",
      text: "掌櫃教你分辨幾種常見的靈草。",
      choices: [{ label: "仔細記下", run: (s, api) => { api.addMaterial("青木靈髓", 1); return "你認出了一株被當成雜草的青木靈髓。掌櫃笑著說，眼力這麼好，這株就送你了。"; } }] },

    // 結交他人
    { id: "青梅竹馬", action: "結交他人", once: true, title: "鄰家的孩子",
      text: "隔壁搬來一戶人家，那家的孩子總愛跟在你後面。",
      choices: [
        { label: "帶著他一起玩", run: (s, api) => { api.setFlag("青梅竹馬", api.pick(["阿遠", "小滿", "阿青", "念念"])); api.note(`和鄰家的${api.flag("青梅竹馬")}成了形影不離的玩伴。`); return `你們成了最好的玩伴。他叫${api.flag("青梅竹馬")}。`; } },
        { label: "嫌他煩", run: () => "他後來和別的孩子玩去了。" }
      ] },
    { id: "打群架", action: "結交他人", title: "村口打架",
      text: "東村和西村的孩子在村口對峙，兩邊都在拉人。",
      choices: [
        { label: "站到弱的那一邊", run: (s, api) => { api.note("少年時幫弱的一方打了一架。"); return "你們輸了，但從此多了幾個肯替你出頭的朋友。"; } },
        { label: "勸架", run: () => "沒人聽你的，最後被大人一起抓去罰站。" }
      ] },

    // 聽說書、打聽
    { id: "說書人", action: "聽說書、打聽", title: "茶館說書",
      text: s => s.legacyLives && s.legacyLives.length
        ? `說書人今天講的是「${s.legacyLives[s.legacyLives.length - 1].title}」${s.legacyLives[s.legacyLives.length - 1].name}的故事，說那人留下的手札，至今還藏在某座洞府裡。`
        : "說書人講起上古修士御劍千里的故事，滿座的孩子聽得眼睛發亮。",
      choices: [{ label: "聽到最後", run: (s, api) => { api.setFlag("聽過傳說"); return "你把故事記得一字不漏。"; } }] },
    { id: "古廟傳聞", action: "聽說書、打聽", once: true, title: "後山古廟",
      text: "茶館裡有人說，後山的古廟半夜會發光。",
      choices: [{ label: "記在心上", run: (s, api) => { api.setFlag("古廟傳聞"); return "你決定哪天要去看看。"; } }] },

    // 冒險
    { id: "誤食靈果", action: "冒險", once: true, title: "不知名的果子",
      when: s => true,
      text: "後山深處有一棵你從沒見過的樹，結著一顆淡淡發光的果子。",
      choices: [
        { label: "摘來吃", run: (s, api) => { api.setFlag("靈果"); api.note("在後山誤食一顆發光的果子，渾身燥熱三天三夜。"); return "你渾身燥熱了三天三夜，退燒後總覺得身體裡多了點什麼。"; } },
        { label: "不敢吃，帶回家", run: () => "果子隔天就爛了。" }
      ] },
    { id: "雷擊", action: "冒險", once: true, title: "雷雨中的山頂",
      text: "你在山頂迷了路，一場雷雨突然落下。",
      choices: [
        { label: "躲到大樹下", run: (s, api) => { api.setFlag("雷擊"); api.note("少年時被雷擊中過，竟然沒死。"); return "一道雷劈中了那棵樹，你被震暈過去，醒來時渾身酥麻，卻毫髮無傷。"; } },
        { label: "冒雨跑下山", run: () => "你一路滑下山，摔得滿身泥。" }
      ] },
    { id: "探古廟", action: "冒險", once: true, title: "後山古廟",
      when: s => s.flags["古廟傳聞"],
      text: "你半夜溜進後山古廟。神像後面似乎有一扇被封住的石門。",
      choices: [{ label: "記下石門的位置", run: (s, api) => { api.setFlag("古廟石門"); api.note("後山古廟神像後有一扇封住的石門。"); return "石門推不開，但你記住了它的位置。"; } }] },

    // 任何行動
    { id: "茶攤老人", once: true, title: "村口茶攤",
      when: s => s.legacyAvailable,
      text: "村口茶攤常坐著一位白髮老人。今天他叫住你：「小娃兒，你的眼神像一個故人。」",
      choices: [{ label: "陪他喝杯茶", run: (s, api) => { api.note("村口茶攤的老人說我像一位故人。"); return "老人說了很多年輕時的事，最後拍拍你的頭：「以後往瀑布那邊多走走。」"; } }] },
    { id: "平凡的一季", weight: 3, title: "平凡的日子",
      text: "這一季平平靜靜地過去了。",
      choices: [{ label: "繼續", run: () => "日子一天天過去。" }] }
  ]
};
