import type { Language } from './i18n';

/**
 * Chuỗi hiển thị thay đổi theo kiểu phát hành.
 *
 * Bản nộp cửa hàng dùng tên trung tính và không nhắc tên thương hiệu nào, để
 * tránh bị từ chối vì dùng nhãn hiệu của bên khác làm tên sản phẩm.
 * Bản tự phát hành (dùng nội bộ) giữ nguyên tên cũ.
 *
 * __STORE_BUILD__ do Vite thay bằng hằng số lúc build (xem wxt.config.ts). Vì
 * vậy các chuỗi này không nằm trong i18n.ts: test không có hằng số đó.
 */
declare const __STORE_BUILD__: boolean;

const STORE = __STORE_BUILD__;

type Brand = {
  /** Mô tả ngắn dưới tên tiện ích trong popup. */
  tagline: string;
  /** Nhãn nút mở trang khóa học. */
  openCourseSite: string;
};

const BRANDS: Record<Language, Brand> = {
  vi: {
    tagline: STORE ? 'Tự động hoàn thành khóa học trực tuyến' : 'Tự động học trên VPBank Academy',
    openCourseSite: STORE ? 'Mở trang khóa học' : 'Mở VPBank Academy',
  },
  en: {
    tagline: STORE ? 'Completes online courses automatically' : 'Auto learning on VPBank Academy',
    openCourseSite: STORE ? 'Open course site' : 'Open VPBank Academy',
  },
};

export const brand = (language: Language): Brand => BRANDS[language];
