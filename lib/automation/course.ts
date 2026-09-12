import { CONFIG } from '@/lib/config';
import { courseIdItem, dispatchItem, triesItem } from '@/lib/storage';
import { log, page, sleep } from './dom';
import { notify } from './notify';
import { disable, readCompletion } from './state';
import type { Completion, State } from './state';

// Trang khóa học là bộ lập lịch duy nhất: chọn hoạt động "To do" đầu tiên còn lượt thử rồi mở nó.
const CONTAINER_TYPES = ['modtype_subsection', 'modtype_label', 'modtype_certificate'];

type Activity = {
  li: HTMLElement;
  cmid: string;
  name: string;
  link: HTMLAnchorElement | null;
  completion: Completion | null;
  isQuiz: boolean;
};

// Chỉ xét biểu tượng khóa của chính thẻ này, không tính các hoạt động con lồng bên trong.
const isOwnRestricted = (li: HTMLElement) => Array.from(li.querySelectorAll('.isrestricted'))
  .some((el) => el.closest('li.activity') === li);

const describe = (li: HTMLElement): Activity => ({
  li,
  cmid: li.dataset.id ?? '',
  name: li.querySelector<HTMLElement>('[data-activityname]')?.dataset.activityname ?? `#${li.dataset.id}`,
  link: li.querySelector<HTMLAnchorElement>('a.aalink[href]'),
  completion: readCompletion(li),
  isQuiz: li.classList.contains('modtype_quiz'),
});

// forceview=1: trang tài liệu hiển thị trong Moodle thay vì chuyển thẳng sang file (nơi content script không chạy).
const withForceView = (href: string) => {
  const target = new URL(href);
  target.searchParams.set('forceview', '1');
  return target.href;
};

const finishRun = (leftovers: Activity[], needKey: Activity[]) => {
  const skipped = [
    ...leftovers.filter((activity) => !needKey.includes(activity))
      .map(({ name, completion }) => `${name} — ${completion?.todo.join(', ')}`),
    ...needKey.map(({ name }) => `${name} — cần Gemini API key`),
  ];
  if (skipped.length) {
    log.warn(`Dừng: còn ${skipped.length} hoạt động chưa tự hoàn thành được.`, skipped);
    notify.warning(`Đã dừng — ${skipped.length} hoạt động cần làm thủ công`, skipped);
  } else {
    log.info('Khóa học đã hoàn thành.');
    notify.success('Khóa học đã hoàn thành');
  }
  return disable({ finishedAt: new Date().toISOString(), skipped });
};

export const runCourse = (state: State) => {
  const pending = Array.from(document.querySelectorAll<HTMLElement>('li.activity[data-for="cmitem"]'))
    .filter((li) => !CONTAINER_TYPES.some((type) => li.classList.contains(type)) && !isOwnRestricted(li))
    .map(describe)
    .filter((activity) => activity.completion?.pending && activity.link);
  // Bài kiểm tra cần Gemini API key; chưa có key thì bỏ qua và báo ở cuối lượt chạy.
  const needKey = pending.filter((activity) => activity.isQuiz && !state.geminiKey);
  const triesOf = (activity: Activity) => state.tries[activity.cmid] ?? 0;
  const next = pending.find((activity) => !needKey.includes(activity) && triesOf(activity) < CONFIG.MAX_TRIES);
  if (!next?.link) return finishRun(pending, needKey);

  const attempt = triesOf(next) + 1;
  log.info(`Bài tiếp theo: "${next.name}" (lần ${attempt}/${CONFIG.MAX_TRIES}).`);
  notify.info(`Đang mở: ${next.name}`, [`Lần thử ${attempt}/${CONFIG.MAX_TRIES}`, ...(next.completion?.todo ?? [])]);
  next.li.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const href = withForceView(next.link.href);
  return Promise.all([
    triesItem.setValue({ ...state.tries, [next.cmid]: attempt }),
    dispatchItem.setValue({ cmid: next.cmid, launched: false }),
    courseIdItem.setValue(page.params.get('id')),
  ])
    .then(() => sleep(CONFIG.DELAY.NAVIGATE))
    .then(() => location.assign(href));
};
