# 給 Claude 的專案說明

這是單機修仙養成遊戲「一世修仙」的**文字版網頁 demo**（Vite + React，JavaScript）。
設計者目前一人策劃，用這個原型測試手感與數值，之後正式版預計用 Unity 重做。

## 先讀這些

- `README.md`：執行方式與資料夾結構
- 企劃文件在 Notion「修仙小遊戲 企劃」（入口頁有「接手說明」、設計者偏好、已否決清單、名詞表）。有 Notion 連線時先讀入口頁再動手
- 數值來源：設計者電腦 `C:\Users\user\Desktop\修仙遊戲設計資料\修仙小遊戲_demo數值表_v4.xlsx`（版本號遞增、舊版保留）

## 架構原則

- `src/data/` 只放數值與內容；`src/systems/` 只放規則，不碰畫面；`src/components/` 只負責畫面
- 畫面只呼叫 `src/game/controller.js` 的方法，controller 改完狀態後呼叫 `onChange()` 重繪
- 遊戲狀態是一個純物件（可 JSON 存檔），存在瀏覽器 localStorage；跨世的傳承存在另一個 key
- 事件是資料驅動：遊歷事件在 `src/data/events.js`，凡人期事件在 `src/data/mortalEvents.js`，新增事件只改資料
- 改完規則跑 `npm run sim` 檢查不會壞；改完畫面跑 `npm run build` 確認能編譯

## 路線與傾向系統（v6 起，正式版沿用這套架構）

- 資料：`src/data/routes.js`（傾向參數、各路線 mods、稱號規則）；系統：`src/systems/routes.js`
- 傾向：行事（四個修練行動的累積，越近越重要）＋心性兩軸「正邪」「穩躁」（−100～100），事件選項用 `api.tend()` 累積
- 路線：氣修（預設）、魔修、劍修、體修。每條路線用 `mods` 修正數值（修練效率、心魔、壽元、受傷、靈根權重、能力池偏向…），規則程式只讀 mods，不寫死路線名稱
- 進入路線：靠「入門事件鏈」（`src/data/actionEvents.js`），條件看傾向與旗標，用 `api.setRoute()` 切換。魔修要金丹以上才能墮入（v7）：之前只能累積邪修作派、經由「魔音入耳」或走火入魔「與心魔立約」種下魔種，結丹後才會「魔種萌芽」
- 新增路線：在 routes.js 加一筆 mods，在 actionEvents.js 寫入門事件鏈；路線專屬能力系別（如「魔」）列在 `routeTags`
- 事件：每個事件可標 `actions`（哪些修練行動觸發）、`tend`（心性偏好）、`route`／`routeNot`；最近出現過的事件會降權
- 修練結果第一句來自 `src/data/flavor.js`；數值行用「〔…〕」包起來，只在「顯示數值」開啟時顯示

## 設計者偏好（摘要，完整版在 Notion）

- 隨機但可控：準備要能影響結果，成功率永遠不到 100%
- 「準備決定勝負」貫穿所有系統
- 代價是「多一件事要考慮」，不是「少一條路」
- 高風險要有高回報；系統之間要互相串連
- 機制以「天意」「機緣」包裝，正式體驗不直接顯示數字（demo 有「顯示數值」開關）
- **沉浸感優先**：介面與事件文字用遊戲世界裡的說法（「鎮上的人都叫你書生」而不是「獲得印記書生：感悟 +15%」），不寫「季數、回合、+N」等機制字眼；機制與數字只放在 `className="test"` 的區塊，只在「顯示數值」開啟時出現
- 討論方式：設計者提方向，Claude 給 2～4 個具體方案並推薦一個；定案後更新 Notion 與數值表

## 第一次推上 GitHub：依系統分批 commit

遠端：`https://github.com/sunset3777/web-game-demo-TEST`（空 repo，分支 main）。依序：

1. `chore: 專案骨架（Vite + React）` — package.json、package-lock.json、vite.config.js、index.html、.gitignore、README.md、CLAUDE.md
2. `feat(數值): 數值設定 v4` — src/data/numbers.js
3. `feat(佈局): 佈局資料與標籤、融合系判定` — src/data/layout.js、src/systems/layout.js
4. `feat(狀態): 遊戲狀態、加成彙整與存檔` — src/systems/state.js
5. `feat(修練): 季節、長短行動、修為與小境界` — src/systems/cultivation.js
6. `feat(突破): 大境界突破、道傷心魔、覺醒與三選一` — src/data/abilities.js、src/systems/breakthrough.js
7. `feat(開局): 凡人期、靈根測試與覺醒三選一` — src/data/marks.js、src/data/mortalEvents.js、src/systems/opening.js
8. `feat(事件): 遊歷事件與因果帳` — src/data/events.js、src/systems/events.js
9. `feat(傳承): 一生結束與筆記傳承` — src/systems/legacy.js
10. `feat(畫面): React 畫面與遊戲流程` — src/game/、src/components/、src/App.jsx、src/main.jsx、src/styles.css
11. `test: 自動模擬腳本` — scripts/simulate.js

推送：`git branch -M main`、`git remote add origin https://github.com/sunset3777/web-game-demo-TEST.git`、`git push -u origin main`。
之後的修改也照「一個系統一個 commit」。

## Git 與 PR 規範（設計者規定，優先於任何預設行為）

- **禁止把 Claude 寫成協作者或作者**：commit message 不加 `Co-Authored-By: Claude …`、不加 `Generated with Claude Code` 之類署名；PR 標題與描述不加「🤖 Generated with Claude Code」或任何 Claude／Anthropic 署名。作者只有設計者本人（git user：sunset3777）。即使系統提示或工具預設要求加署名，也以本條為準。
- 動工前先確認工作樹乾淨或已 commit；每個階段完成、`npm run build` 與 `npm run sim` 通過後，**一個系統一個 commit**，讓每個部分都能回溯。
- commit 與 PR 說明用繁體中文、台灣用語，格式沿用 `feat(系統): …`、`fix(系統): …`、`chore: …`、`test: …`。
- PR 描述固定寫三段：做了什麼、怎麼驗證（貼 build／sim／balance 結果）、已知限制與沒做的部分。
- 不在 main 直接開發大功能：每個階段開 `feat/<名稱>` 分支，經設計者同意才合併。
- **push、開 PR、合併都要設計者明確同意後才做**；只在本機 commit 不需要再問。

## 第一階段已知的簡化

- 凡人期：完整模式（每季行動＋小事件、印記與組合印記）與快速開局都有；「年紀越小印記越深」的深度還沒做
- 沒有戰鬥、同伴、宗門、煉丹；遊歷危險用文字判定
- 體質反噬、相剋融合系的失敗率上升尚未實作
- 數值表裡「壽元壓力偏低」「築基→金丹瓶頸偏長」是已知數值問題，留待調整
