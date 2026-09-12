// Cấu hình cố định của bản Free (popup chỉ có bật/tắt tự động học và Gemini API key).
export const CONFIG = {
  BASE_URL: 'https://academy.vpbank.com.vn/learning',

  // Số lần tự động thử tối đa cho mỗi hoạt động trong một lượt chạy; quá số này thì bỏ qua (chống lặp).
  MAX_TRIES: 3,

  // Thời gian chờ (ms) để Moodle kịp xử lý và người dùng theo dõi được.
  DELAY: {
    SHORT: 800,
    ACTION: 1500,
    NAVIGATE: 1200,
    AFTER_ANSWER: 2500,
    AFTER_SCORM: 2000,
  },

  // Truyền vào completeScorm khi chạy trong trang SCORM player.
  SCORM: {
    apiTimeout: 20000,
    initTimeout: 15000,
    pollInterval: 500,
    score: '100',
  },

  GEMINI_MODEL: 'gemini-2.5-flash',
} as const;
