/**
 * Chuỗi hiển thị cho người dùng, bằng tiếng Việt và tiếng Anh.
 *
 * Không dùng browser.i18n + _locales cho phần này: API đó chọn ngôn ngữ theo giao
 * diện trình duyệt và không đổi được lúc đang chạy, trong khi nhiều người dùng
 * Việt vẫn để Edge bằng tiếng Anh. Người dùng tự chọn bằng nút VI/EN trong popup
 * (xem loadLanguage trong storage.ts). _locales chỉ giữ tên và mô tả trong manifest.
 *
 * Chỉ dịch những gì người dùng nhìn thấy: popup, thông báo trên trang và lỗi hiện
 * trong thông báo. Log trong console giữ nguyên.
 *
 * File này không import storage hay browser, vì gemini.ts dùng nó và được test trực tiếp.
 */

export const LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

// Dùng cho toLocaleString / toLocaleDateString.
export const LOCALES: Record<Language, string> = { vi: 'vi-VN', en: 'en-GB' };

const vi = {
  // Popup
  language: 'Ngôn ngữ',
  autoLearn: 'Tự động học',
  autoLearnDescription: 'Mở lần lượt các bài chưa hoàn thành trong khóa học đang xem.',
  running: 'Đang chạy',
  stopped: 'Đang tắt',
  enableFailed: 'Không bật được tự động học',
  autoQuiz: 'Làm bài tự động',
  save: 'Lưu',
  test: 'Kiểm tra',
  saved: 'Đã lưu',
  keyRemoved: 'Đã xóa API key',
  connectionOk: 'Kết nối thành công',
  connectionFailed: 'Kết nối thất bại',
  lastRunAt: (time: string) => `Lượt chạy lúc ${time}`,
  courseFinished: 'Khóa học đã hoàn thành.',

  // Ô chọn model
  model: 'Model',
  chooseModel: 'Chọn model',
  reloadModels: 'Tải lại danh sách model',
  searchModels: 'Tìm hoặc nhập tên model',
  // Hai nửa quanh tên model vừa gõ: Dùng “…” làm tên model.
  useTypedBefore: 'Dùng',
  useTypedAfter: 'làm tên model',
  noModels: 'Chưa có danh sách model. Bấm nút làm mới bên cạnh.',
  modelCount: (count: number, date: string) => `${count} model · cập nhật ${date}`,
  refreshModelsHint: 'Bấm nút làm mới để tải danh sách model theo API key của bạn.',
  enterKeyFirst: 'Nhập Gemini API key trước',
  modelsFollowKey: 'Danh sách model lấy theo key của bạn.',
  modelsLoaded: (count: number) => `Đã tải ${count} model`,
  modelsLoadFailed: 'Không tải được danh sách model',

  // Gemini (chạy trong service worker, lỗi hiện ở popup hoặc thông báo trên trang)
  noGeminiKey: 'Chưa nhập Gemini API key trong popup.',
  emptyGeminiReply: 'Gemini trả về nội dung rỗng.',
  geminiConnected: (model: string) => `Kết nối được ${model}.`,

  // Trang khóa học
  somethingWentWrong: 'Có lỗi xảy ra',
  opening: (name: string) => `Đang mở: ${name}`,
  attempt: (current: number, max: number) => `Lần thử ${current}/${max}`,
  courseDone: 'Khóa học đã hoàn thành',
  stoppedForManual: (count: number) => `Đã dừng — ${count} hoạt động cần làm thủ công`,
  needsGeminiKey: 'cần Gemini API key',

  // Bài kiểm tra
  quizSkipped: 'Bỏ qua bài kiểm tra',
  quizStarting: 'Bắt đầu làm bài kiểm tra...',
  noAttemptButton: 'Không tìm thấy nút "Attempt quiz" (có thể đã hết lượt làm bài).',
  solvingQuestions: (count: number) => `AI đang giải ${count} câu hỏi...`,
  answersChosen: (count: number) => `Đã chọn ${count} đáp án`,
  nextPageIn: (seconds: number) => `Chuyển trang sau ${seconds}s`,
  quizFailed: 'Chưa làm được bài kiểm tra',
  reloadToRetry: 'Tải lại trang (F5) để thử lại.',
  noNextButton: 'Không tìm thấy nút "Next page" / "Finish attempt".',
  noSubmitButton: 'Không tìm thấy nút "Submit all and finish".',
  submitting: 'Đang nộp bài...',

  // SCORM
  scormOpening: 'Đang mở bài học SCORM...',
  scormCompleting: 'Đang hoàn thành bài học SCORM...',
  scormDone: (version: string, status: string) => `Đã hoàn thành SCORM ${version} (${status})`,
  scormFailed: 'Chưa hoàn thành được SCORM',
  errorCode: (code: string) => `Mã lỗi ${code}`,
  noScormForm: 'Không tìm thấy form #scormviewform trên trang SCORM.',
  scormOnlyFromPlayer: 'Chỉ gọi được từ trang SCORM player.',
  scormNoResult: 'Không nhận được kết quả từ trang SCORM.',
  // completeScorm chạy trong MAIN world và không import được gì, nên nhận mẫu chuỗi qua tham số.
  scormTemplates: {
    timeout: '{label}: hết {seconds}s chờ',
    initFailed: '{method}("") thất bại (mã lỗi {code})',
  },
};

export type Messages = typeof vi;

const en: Messages = {
  language: 'Language',
  autoLearn: 'Auto learn',
  autoLearnDescription: 'Opens the unfinished lessons of the course you are viewing, one by one.',
  running: 'Running',
  stopped: 'Off',
  enableFailed: 'Could not turn on auto learn',
  autoQuiz: 'Auto quiz',
  save: 'Save',
  test: 'Test',
  saved: 'Saved',
  keyRemoved: 'API key removed',
  connectionOk: 'Connected',
  connectionFailed: 'Connection failed',
  lastRunAt: (time) => `Last run at ${time}`,
  courseFinished: 'The course is complete.',

  model: 'Model',
  chooseModel: 'Choose a model',
  reloadModels: 'Reload model list',
  searchModels: 'Search or type a model name',
  useTypedBefore: 'Use',
  useTypedAfter: 'as the model name',
  noModels: 'No model list yet. Click the refresh button next to it.',
  modelCount: (count, date) => `${count} ${count === 1 ? 'model' : 'models'} · updated ${date}`,
  refreshModelsHint: 'Click refresh to load the models your API key can use.',
  enterKeyFirst: 'Enter a Gemini API key first',
  modelsFollowKey: 'The model list depends on your key.',
  modelsLoaded: (count) => `Loaded ${count} ${count === 1 ? 'model' : 'models'}`,
  modelsLoadFailed: 'Could not load the model list',

  noGeminiKey: 'No Gemini API key has been entered in the popup.',
  emptyGeminiReply: 'Gemini returned an empty response.',
  geminiConnected: (model) => `Connected to ${model}.`,

  somethingWentWrong: 'Something went wrong',
  opening: (name) => `Opening: ${name}`,
  attempt: (current, max) => `Attempt ${current}/${max}`,
  courseDone: 'Course complete',
  stoppedForManual: (count) =>
    `Stopped — ${count} ${count === 1 ? 'activity needs' : 'activities need'} to be done by hand`,
  needsGeminiKey: 'needs a Gemini API key',

  quizSkipped: 'Quiz skipped',
  quizStarting: 'Starting the quiz...',
  noAttemptButton: 'Could not find the "Attempt quiz" button (you may have no attempts left).',
  solvingQuestions: (count) => `AI is answering ${count} ${count === 1 ? 'question' : 'questions'}...`,
  answersChosen: (count) => `Selected ${count} ${count === 1 ? 'answer' : 'answers'}`,
  nextPageIn: (seconds) => `Next page in ${seconds}s`,
  quizFailed: 'Could not complete the quiz',
  reloadToRetry: 'Reload the page (F5) to try again.',
  noNextButton: 'Could not find the "Next page" / "Finish attempt" button.',
  noSubmitButton: 'Could not find the "Submit all and finish" button.',
  submitting: 'Submitting...',

  scormOpening: 'Opening the SCORM lesson...',
  scormCompleting: 'Completing the SCORM lesson...',
  scormDone: (version, status) => `SCORM ${version} completed (${status})`,
  scormFailed: 'Could not complete the SCORM lesson',
  errorCode: (code) => `Error code ${code}`,
  noScormForm: 'Could not find the #scormviewform form on the SCORM page.',
  scormOnlyFromPlayer: 'Can only be called from the SCORM player page.',
  scormNoResult: 'No result came back from the SCORM page.',
  scormTemplates: {
    timeout: '{label}: timed out after {seconds}s',
    initFailed: '{method}("") failed (error code {code})',
  },
};

const MESSAGES: Record<Language, Messages> = { vi, en };

// Ngôn ngữ đang dùng. Popup, content script và service worker mỗi nơi giữ một bản riêng.
let current: Language = 'vi';

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

// Chưa chọn thì theo giao diện trình duyệt: tiếng Việt nếu là vi, còn lại tiếng Anh.
export const detectLanguage = (uiLanguage = ''): Language => (uiLanguage.toLowerCase().startsWith('vi') ? 'vi' : 'en');

export const setLanguage = (language: Language) => {
  current = language;
};

export const getLanguage = () => current;

export const messagesFor = (language: Language): Messages => MESSAGES[language];

export const t = (): Messages => MESSAGES[current];
