import { storage } from '#imports';

export type Dispatch = { cmid: string; launched: boolean } | null;
export type LastRun = { finishedAt: string; skipped: string[] } | null;

// Trạng thái chạy (local) và Gemini API key (sync theo hồ sơ trình duyệt).
export const enabledItem = storage.defineItem<boolean>('local:enabled', { fallback: false });
export const triesItem = storage.defineItem<Record<string, number>>('local:tries', { fallback: {} });
export const dispatchItem = storage.defineItem<Dispatch>('local:dispatch', { fallback: null });
export const courseIdItem = storage.defineItem<string | null>('local:courseId', { fallback: null });
export const lastRunItem = storage.defineItem<LastRun>('local:lastRun', { fallback: null });
export const geminiKeyItem = storage.defineItem<string>('sync:geminiKey', { fallback: '' });
