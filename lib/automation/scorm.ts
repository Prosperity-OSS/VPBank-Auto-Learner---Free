import { CONFIG } from '@/lib/config';
import { t } from '@/lib/i18n';
import { sendMessage } from '@/lib/messaging';
import type { ScormResult } from '@/lib/scorm-complete';
import { log, page, sleep, viewUrl } from './dom';
import { notify } from './notify';
import { goToCourse } from './state';
import type { State } from './state';

// SCORM: view.php mở player ngay trong tab hiện tại (không popup); player.php nhờ service worker chạy completeScorm
// trong MAIN world rồi quay lại view.php để kiểm tra "Complete the activity".
export const launchPlayer = () => {
  const form = document.querySelector<HTMLFormElement>('#scormviewform');
  if (!form) throw new Error(t().noScormForm);
  const target = new URL(form.action);
  target.search = new URLSearchParams(Array.from(new FormData(form), ([key, value]) => [key, String(value)])).toString();
  target.searchParams.set('mode', 'normal');
  log.info('Mở SCORM player trong tab hiện tại:', target.href);
  notify.info(t().scormOpening);
  return sleep(CONFIG.DELAY.NAVIGATE).then(() => location.assign(target.href));
};

const report = (result: ScormResult) => {
  if (result.ok) {
    log.info('SCORM commit ok:', result);
    notify.success(t().scormDone(result.version ?? '', result.status ?? ''));
  } else {
    log.error('SCORM chưa hoàn thành:', result);
    notify.error(t().scormFailed, [result.error ?? t().errorCode(result.errorCode ?? '')]);
  }
};

// Popup do Moodle mở (người dùng tự bấm Enter) thì đóng lại; Moodle sẽ tự đưa tab gốc về trang khóa học.
const isMoodlePopup = () => window.name === 'Popup' || history.length <= 1;

const returnToView = (state: State, cmid: string | null) => (cmid
  ? sleep(CONFIG.DELAY.NAVIGATE).then(() => location.assign(viewUrl('scorm', cmid)))
  : goToCourse(state, 'không rõ mã hoạt động SCORM'));

const leavePlayer = (state: State, cmid: string | null) => {
  if (!isMoodlePopup()) return returnToView(state, cmid);
  window.close();
  return sleep(1000).then(() => (window.closed ? undefined : returnToView(state, cmid)));
};

export const runPlayer = (state: State) => {
  const cmid = page.params.get('cm') ?? state.dispatch?.cmid ?? null;
  notify.info(t().scormCompleting);
  // Lỗi cũng quay về view.php: trang đó sẽ đưa hoạt động qua giới hạn số lần thử.
  return sendMessage('completeScorm')
    .then(report)
    .catch((error: Error) => notify.error(t().scormFailed, [error.message]))
    .then(() => sleep(CONFIG.DELAY.AFTER_SCORM))
    .then(() => leavePlayer(state, cmid));
};
