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

    // Tự cập nhật qua update server riêng. URL này không chứa ID tiện ích —
    // Chrome tự khai ID trong yêu cầu — nên không bao giờ phải đổi.
    // Server tự ghi lại update_url và key khi đóng gói .crx; giá trị ở đây là
    // để bản "Load unpacked" cũng trỏ đúng chỗ.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6h1uahh/IjSdiqhH4EfkpZviVQWq85xWG3dDszCIeXdmDd8qPPnEPnZ1OEFWEewEjuAsduTNoW9MiueQKMFw509uhti6pkxJzFciNW+uAyeMaoy6o64CfauLmjKeFGniZUBSRb7pbcsO4OJWb6qnPetLgt+Sw8N7+7giRcu5DUDDMKFd5NJ11lF/xkA88W5i4UStMTIUTGu3RMPauJJScfPELhcoiozsFN8UrZohtWb/266xTUJOhuskEJxIux85AvNaiNgrDEKgjTNqXOQwHThH3wab364F/qXdxhSzGR7nqmBONLwIBmRyaztSMmdPYWBw7NWwVc0pAa9qqEM2fQIDAQAB',
    update_url: 'https://extension.montserrat.id.vn/updates.xml',
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: { sourcemap: false },
  }),
});
