// 每個畫面測試的共同前置：載入 jest-dom 斷言、每個測試後卸載畫面、清空 jsdom 的 localStorage
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});
