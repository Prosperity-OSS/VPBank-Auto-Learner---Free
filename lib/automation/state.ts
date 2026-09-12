import { CONFIG } from '@/lib/config';
import { courseIdItem, dispatchItem, enabledItem, geminiKeyItem, lastRunItem, triesItem } from '@/lib/storage';
import type { Dispatch, LastRun } from '@/lib/storage';
import { cleanText, courseIdFromPage, courseUrl, log, sleep, waitFor } from './dom';

export type State = {
  enabled: boolean;
  tries: Record<string, number>;
  dispatch: Dispatch;
  courseId: string | null;
  geminiKey: string;
};

export type Completion = { pending: boolean; todo: string[]; manual?: HTMLElement };

export const loadState = (): Promise<State> => Promise.all([
  enabledItem.getValue(),
  triesItem.getValue(),
  dispatchItem.getValue(),
  courseIdItem.getValue(),
  geminiKeyItem.getValue(),
]).then(([enabled, tries, dispatch, courseId, geminiKey]) => ({ enabled, tries, dispatch, courseId, geminiKey }));

// Tắt tự động học (hết việc) và lưu tóm tắt lượt chạy cho popup.
export const disable = (lastRun: LastRun) => Promise.all([
  enabledItem.setValue(false),
  dispatchItem.setValue(null),
  lastRunItem.setValue(lastRun),
]).then(() => undefined);

// Nhớ khóa học hiện tại để các trang không có liên kết khóa học (vd. SCORM player) vẫn quay về được.
export const rememberCourse = (state: State): Promise<State> => {
  const courseId = courseIdFromPage();
  if (!courseId || courseId === state.courseId) return Promise.resolve(state);
  return courseIdItem.setValue(courseId).then(() => ({ ...state, courseId }));
};

export const goToCourse = (state: State, reason = ''): Promise<void> => {
  const courseId = courseIdFromPage() ?? state.courseId;
  log.info(`Về trang khóa học${reason ? ` — ${reason}` : ''}.`);
  if (!courseId) {
    log.warn('Không xác định được khóa học hiện tại, dừng tại đây.');
    return Promise.resolve();
  }
  return sleep(CONFIG.DELAY.NAVIGATE).then(() => location.assign(courseUrl(courseId)));
};

// "Done:" / "Đã xong:" là đạt; "To do:" và "Failed:" đều là còn phải làm.
const DONE_RE = /(^|\s)(done|đã xong|đã hoàn thành)\s*:/i;

// Trạng thái hoàn thành trong một vùng (thẻ hoạt động ở trang khóa học hoặc header trang hoạt động).
// Dùng textContent để đọc cả phần dropdown đang ẩn. null = hoạt động không theo dõi hoàn thành.
export const readCompletion = (root: ParentNode | null): Completion | null => {
  const info = root?.querySelector('[data-region="completion-info"]');
  if (!info) return null;
  const manual = info.querySelector<HTMLElement>('[data-action="toggle-manual-completion"][data-toggletype="manual:mark-done"]');
  if (manual) return { pending: true, manual, todo: ['Mark as done'] };
  if (info.querySelector('[data-action="toggle-manual-completion"]')) return { pending: false, todo: [] };
  const items = Array.from(info.querySelectorAll('[data-region="completionrequirements"] [role="listitem"]'));
  if (!items.length) return null;
  const todo = items.filter((item) => !DONE_RE.test(item.textContent ?? '')).map(cleanText);
  return { pending: todo.length > 0, todo };
};

export const activityHeader = (): ParentNode => document.querySelector('[data-for="page-activity-header"]') ?? document.body;

// Mỗi lượt điều phối chỉ được "hành động" một lần trên trang hoạt động (chống lặp vô hạn).
export const claimLaunch = (state: State, cmid: string): Promise<boolean> => {
  const { dispatch, tries } = state;
  if (dispatch?.cmid === cmid) {
    if (dispatch.launched) return Promise.resolve(false);
    return dispatchItem.setValue({ ...dispatch, launched: true }).then(() => true);
  }
  // Người dùng tự mở trang: tính như một lượt điều phối mới.
  const used = tries[cmid] ?? 0;
  if (used >= CONFIG.MAX_TRIES) return Promise.resolve(false);
  return Promise.all([
    triesItem.setValue({ ...tries, [cmid]: used + 1 }),
    dispatchItem.setValue({ cmid, launched: true }),
  ]).then(() => true);
};

const markManualDone = (button: HTMLElement) => {
  log.info('Bấm "Mark as done".');
  button.click();
  return waitFor('[data-action="toggle-manual-completion"][data-toggletype="manual:undo"]', 8000)
    .then(() => undefined)
    .catch(() => log.warn('Chưa thấy trạng thái "Done" sau khi bấm Mark as done.'));
};

type ActivityOptions = {
  cmid: string;
  label: string;
  act: (state: State, completion: Completion) => unknown;
};

export const runActivityPage = (state: State, { cmid, label, act }: ActivityOptions): Promise<unknown> => {
  const completion = readCompletion(activityHeader());
  if (!completion) return goToCourse(state, `${label} không theo dõi hoàn thành`);
  if (!completion.pending) return goToCourse(state, `${label} đã hoàn thành`);
  log.info(`${label} chưa xong:`, completion.todo.join(' | '));
  return claimLaunch(state, cmid).then((claimed) => {
    if (!claimed) return goToCourse(state, 'đã thử trong lượt này, để trang khóa học lên lịch lại');
    if (completion.manual) {
      return markManualDone(completion.manual).then(() => goToCourse(state, 'đã đánh dấu hoàn thành'));
    }
    return act(state, completion);
  });
};
