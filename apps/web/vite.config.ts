import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// 개발 시 백엔드(기본 4000) 프록시 + PWA 설정
// GitHub Pages(프로젝트 사이트)는 /sokyang1/ 하위 경로로 서빙되므로
// 빌드 시에만 base 를 지정한다. (dev 는 루트 유지)
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/sokyang1/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "S-Bus Link · 속초 실시간 버스",
        short_name: "S-Bus Link",
        description: "속초시 학생을 위한 실시간 버스 정보",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
  },
}));
