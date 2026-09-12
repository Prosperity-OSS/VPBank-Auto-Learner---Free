import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// Manifest MV3 + React + Tailwind v4. Bản build chỉ gồm file đã đóng gói và nén (không source map).
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'VPBank Auto Learner Free',
    description: 'Công cụ học tập tự động trên hệ thống Học viện VP dành cho CBNV Ngân hàng Việt Nam Thịnh Vượng. Vì một Việt Nam thịnh vượng.',
    minimum_chrome_version: '116', // Popover API (top layer) cho thông báo trên trang.
    permissions: ['storage', 'scripting'],
    host_permissions: ['https://academy.vpbank.com.vn/*', 'https://generativelanguage.googleapis.com/*'],
    action: { default_title: 'VPBank Auto Learner Free' },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: { sourcemap: false },
  }),
});
