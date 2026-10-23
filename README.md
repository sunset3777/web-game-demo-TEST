# 一世修仙・文字版 demo

單機修仙養成遊戲的文字版原型，用來驗證核心循環與數值：
佈局 → 突破三選一 → 一生結束 → 筆記傳承給下一世。

企劃文件在 Notion「修仙小遊戲 企劃」，數值來自「修仙小遊戲_demo數值表_v4.xlsx」。

## 執行

需要先安裝 [Node.js](https://nodejs.org/)（LTS 版即可）。

```bash
npm install      # 第一次執行
npm run dev      # 啟動，瀏覽器打開終端機顯示的網址
npm run sim      # 不開瀏覽器，自動玩 20 輪檢查流程與數值
npm run build    # 打包成 dist/，可放到 GitHub Pages
```

## 第一階段包含

- 凡人期：一季一季過（每季選行動、觸發小事件，凝成印記與組合印記），或快速開局；靈根測試（含融合變異靈根）、覺醒三選一
- 季節回合；修練、閉關、遊歷是長行動，耗時依境界（煉氣 1／築基 4／金丹 6 季），修滿整段 ×1.1
- 修為與小境界（抽成長池）、瓶頸感悟、大境界突破（成功率曲線、道傷、心魔軟門檻、強行衝關、走火入魔）
- 佈局：功法、素材、靈器、地點、季節、靈根 → 7 個標籤、融合系判定、共鳴／覺醒／天人合一
- 遊歷事件（資料驅動）、因果帳、坊市季節價格
- 壽盡或坐化後選筆記頁傳給下一世，下一世在「前人遺府」取得
- 右上角「顯示數值」可看成功率、標籤分數等測試用數字

## 資料夾

```
src/
  data/        數值與內容（調數值、加事件只改這裡）
    numbers.js     境界、靈根、行動、心魔、道傷、坊市、因果、傳承
    layout.js      7 個標籤、功法／素材／靈器／地點／季節倍率、融合系、覺醒門檻
    abilities.js   能力池、成長池、體質、幻境意象
    marks.js       少年志向與印記
    events.js      遊歷事件
    mortalEvents.js 凡人期小事件
  systems/     遊戲規則（不碰畫面）
    state.js        狀態、工具、加成彙整、存檔
    layout.js       佈局計算與判定
    cultivation.js  季節、行動、修為、小境界、壽元
    breakthrough.js 大境界突破、覺醒、三選一、走火入魔
    opening.js      凡人期、靈根測試、覺醒三選一
    events.js       事件抽選、事件 api、因果
    legacy.js       結局、傳承
  game/controller.js  串接各系統，畫面只呼叫這裡
  components/  React 畫面元件
scripts/simulate.js   自動模擬
```

## 新增事件

遊歷事件在 `src/data/events.js`、凡人期事件在 `src/data/mortalEvents.js`，在 `list` 加一筆即可，檔案開頭有欄位與 api 說明。
