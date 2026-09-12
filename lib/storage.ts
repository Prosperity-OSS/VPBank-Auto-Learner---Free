import { browser, storage } from '#imports';
import { CONFIG } from './config';
import type { GeminiModel } from './gemini';
import { detectLanguage, isLanguage, setLanguage } from './i18n';
import type { Language } from './i18n';

export type Dispatch = { cmid: string; launched: boolean } | null;
export type LastRun = { finishedAt: string; skipped: string[] } | null;
export type ModelCache = { models: GeminiModel[]; updatedAt: string } | null;

// Trạng thái chạy (local) và Gemini API key (sync theo hồ sơ trình duyệt).
export const enabledItem = storage.defineItem<boolean>('local:enabled', { fallback: false });
export const triesItem = storage.defineItem<Record<string, number>>('local:tries', { fallback: {} });
export const dispatchItem = storage.defineItem<Dispatch>('local:dispatch', { fallback: null });
export const courseIdItem = storage.defineItem<string | null>('local:courseId', { fallback: null });
export const lastRunItem = storage.defineItem<LastRun>('local:lastRun', { fallback: null });
export const geminiKeyItem = storage.defineItem<string>('sync:geminiKey', { fallback: '' });

// Model đang chọn đi theo hồ sơ (sync); danh sách model tải về chỉ là cache nên để local.
export const geminiModelItem = storage.defineItem<string>('sync:geminiModel', {
  fallback: CONFIG.GEMINI_MODEL_DEFAULT,
});
export const modelCacheItem = storage.defineItem<ModelCache>('local:geminiModels', { fallback: null });

// Ngôn ngữ người dùng chọn trong popup (sync theo hồ sơ); null = chưa chọn, theo ngôn ngữ trình duyệt.
export const languageItem = storage.defineItem<Language | null>('sync:language', { fallback: null });

// Đặt ngôn ngữ cho t(). Popup, content script và service worker đều phải tự gọi trước khi hiện chữ.
export const loadLanguage = (): Promise<Language> => languageItem.getValue().then((saved) => {
  const language = isLanguage(saved) ? saved : detectLanguage(browser.i18n.getUILanguage());
  setLanguage(language);
  return language;
});
