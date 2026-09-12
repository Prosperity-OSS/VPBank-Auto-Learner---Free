import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// Khóa ký của tiện ích trên update server riêng. Đây là khóa CÔNG KHAI, không
// phải bí mật: nó chỉ dùng để bản "Load unpacked" có cùng ID với bản đã đóng gói.
const SELF_HOSTED_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6h1uahh/IjSdiqhH4EfkpZviVQWq85xWG3dDszCIeXdmDd8qPPnEPnZ1OEFWEewEjuAsduTNoW9MiueQKMFw509uhti6pkxJzFciNW+uAyeMaoy6o64CfauLmjKeFGniZUBSRb7pbcsO4OJWb6qnPetLgt+Sw8N7+7giRcu5DUDDMKFd5NJ11lF/xkA88W5i4UStMTIUTGu3RMPauJJScfPELhcoiozsFN8UrZohtWb/266xTUJOhuskEJxIux85AvNaiNgrDEKgjTNqXOQwHThH3wab364F/qXdxhSzGR7nqmBONLwIBmRyaztSMmdPYWBw7NWwVc0pAa9qqEM2fQIDAQAB';

const SELF_HOSTED_UPDATE_URL = 'https://extension.montserrat.id.vn/updates.xml';

// Bản nộp cửa hàng nhận biết qua target trình duyệt, KHÔNG qua `--mode store`.
// `--mode` khác "production" làm Vite coi đây là bản dev: React nhúng đường dẫn
// tuyệt đối của máy build vào bundle và bỏ qua tối ưu hoá. Target trình duyệt
// giữ nguyên mode production.
const STORE_TARGETS = ['edge', 'chrome-store'];

const MAX_DESCRIPTION_LENGTH = 132;

// Ngôn ngữ mặc định của tiện ích. Partner Center đọc default_locale + _locales
// trong gói để biết listing cần những ngôn ngữ nào; không khai báo thì nó mặc
// định English (United States), bất kể thị trường đã chọn là gì.
const DEFAULT_LOCALE = 'vi';

// Tên và mô tả theo từng kiểu phát hành. Dùng chung cho manifest và cho
// _locales để hai nơi không bao giờ lệch nhau.
const identity = (store: boolean) =>
  store
    ? {
        name: 'VPA Auto Learner',
        description:
          'Mở và hoàn thành các bài học trực tuyến còn dang dở, trả lời bài kiểm tra bằng Google Gemini với API key của bạn.',
      }
    : {
        name: 'VPBank Auto Learner Free',
        description:
          'Công cụ học tập tự động trên hệ thống Học viện VP dành cho CBNV Ngân hàng Việt Nam Thịnh Vượng. Vì một Việt Nam thịnh vượng.',
      };

const STORE_ICONS = {
  16: 'icon-store/16.png',
  32: 'icon-store/32.png',
  48: 'icon-store/48.png',
  128: 'icon-store/128.png',
};

// Manifest MV3 + React + Tailwind v4. Bản build chỉ gồm file đã đóng gói và nén (không source map).
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  manifest: ({ browser }) => {
    // Hai kiểu phát hành:
    //
    //   wxt zip               -> tự phát hành, tự cập nhật qua update server riêng
    //   wxt zip -b edge       -> nộp lên Edge Add-ons
    //   wxt zip -b chrome-store -> nộp lên Chrome Web Store
    //
    // Bản nộp cửa hàng KHÔNG được có update_url: cửa hàng tự lo cập nhật và sẽ
    // từ chối manifest trỏ sang nơi khác. Cũng bỏ luôn key vì cửa hàng tự cấp ID.
    //
    // Bản cửa hàng còn đổi sang tên và logo trung tính: lấy nhãn hiệu của bên
    // khác làm tên sản phẩm là lý do bị từ chối rất thường gặp.
    const store = STORE_TARGETS.includes(browser);

    const { name, description } = identity(store);

    // Chrome caps manifest descriptions at 132 characters, and a store upload is
    // rejected outright for going over. Fail here rather than at submission.
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(
        `manifest description is ${description.length} characters, the limit is ${MAX_DESCRIPTION_LENGTH}:
  ${description}`,
      );
    }

    return {
      // Trỏ sang _locales để gói tự khai báo ngôn ngữ. Chrome BẮT BUỘC phải có
      // _locales/<default_locale>/messages.json, file đó được sinh ở hook
      // build:publicAssets bên dưới.
      default_locale: DEFAULT_LOCALE,
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      minimum_chrome_version: '116', // Popover API (top layer) cho thông báo trên trang.
      permissions: ['storage', 'scripting'],
      host_permissions: [
        'https://academy.vpbank.com.vn/*',
        'https://generativelanguage.googleapis.com/*',
      ],

      // default_title is NOT set here: WXT overwrites it from the popup's
      // <title> element, so entrypoints/popup/index.html is the place to change it.
      action: {
        ...(store && { default_icon: STORE_ICONS }),
      },

      // WXT tự sinh icons từ public/icon khi không khai báo.
      ...(store && { icons: STORE_ICONS }),

      ...(!store && {
        key: SELF_HOSTED_KEY,
        // URL này không chứa ID tiện ích — Chrome tự khai ID trong yêu cầu —
        // nên không bao giờ phải đổi.
        update_url: SELF_HOSTED_UPDATE_URL,
      }),
    };
  },

  hooks: {
    // Sinh _locales/<locale>/messages.json ngay lúc build, thay vì để sẵn trong
    // public/: nội dung khác nhau giữa bản tự phát hành và bản nộp cửa hàng,
    // còn public/ thì được chép nguyên vẹn cho cả hai.
    'build:publicAssets'(wxt, files) {
      const { name, description } = identity(STORE_TARGETS.includes(wxt.config.browser));

      files.push({
        relativeDest: `_locales/${DEFAULT_LOCALE}/messages.json`,
        contents: JSON.stringify(
          {
            extName: { message: name, description: 'Tên tiện ích' },
            extDescription: { message: description, description: 'Mô tả ngắn của tiện ích' },
          },
          null,
          2,
        ),
      });
    },
  },

  vite: ({ browser }) => ({
    plugins: [tailwindcss()],
    build: { sourcemap: false },
    // Thay bằng hằng số lúc build, nên dùng được cả trong mã tiêm vào MAIN world.
    define: { __STORE_BUILD__: JSON.stringify(STORE_TARGETS.includes(browser)) },
  }),
});
