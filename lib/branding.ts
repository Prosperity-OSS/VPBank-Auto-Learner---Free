/**
 * Chuỗi hiển thị thay đổi theo kiểu phát hành.
 *
 * Bản nộp cửa hàng dùng tên trung tính và không nhắc tên thương hiệu nào, để
 * tránh bị từ chối vì dùng nhãn hiệu của bên khác làm tên sản phẩm.
 * Bản tự phát hành (dùng nội bộ) giữ nguyên tên cũ.
 *
 * __STORE_BUILD__ do Vite thay bằng hằng số lúc build (xem wxt.config.ts).
 */
declare const __STORE_BUILD__: boolean;

const STORE = __STORE_BUILD__;

export const BRAND = {
  /** Mô tả ngắn dưới tên tiện ích trong popup. */
  tagline: STORE ? 'Tự động hoàn thành khóa học trực tuyến' : 'Tự động học trên VPBank Academy',

  /** Nhãn nút mở trang khóa học. */
  openCourseSite: STORE ? 'Mở trang khóa học' : 'Mở VPBank Academy',
} as const;
