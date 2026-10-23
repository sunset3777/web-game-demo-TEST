import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 畫面層測試專用設定（npm run test:ui）。dev／build 仍使用 vite.config.js，互不影響。
// 規則層測試（tests/*.test.js）由 node:test 負責，這裡只收 tests-ui/ 的 *.test.jsx。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests-ui/**/*.test.jsx"],
    setupFiles: ["tests-ui/helpers/setup.js"]
  }
});
