import { runCourse } from './course';
import { log, page } from './dom';
import { notify } from './notify';
import { runAttempt, runReview, runStartAttemptPage, runSummary, startAttempt } from './quiz';
import { launchPlayer, runPlayer } from './scorm';
import { goToCourse, loadState, rememberCourse, runActivityPage } from './state';
import type { State } from './state';

type Route = { name: string; match: () => boolean; run: (state: State) => unknown; fallback?: boolean };

const cmid = () => page.params.get('id') ?? '';

const routes: Route[] = [
  { name: 'course', match: () => page.is('/course/view.php'), run: runCourse },
  {
    name: 'scorm-view',
    match: () => page.is('/mod/scorm/view.php'),
    run: (state) => runActivityPage(state, { cmid: cmid(), label: 'SCORM', act: launchPlayer }),
  },
  { name: 'scorm-player', match: () => page.is('/mod/scorm/player.php'), run: runPlayer },
  {
    name: 'quiz-view',
    match: () => page.is('/mod/quiz/view.php'),
    run: (state) => runActivityPage(state, { cmid: cmid(), label: 'Bài kiểm tra', act: startAttempt }),
  },
  { name: 'quiz-start', match: () => page.is('/mod/quiz/startattempt.php'), run: runStartAttemptPage },
  { name: 'quiz-attempt', match: () => page.is('/mod/quiz/attempt.php'), run: runAttempt },
  { name: 'quiz-summary', match: () => page.is('/mod/quiz/summary.php'), run: runSummary },
  { name: 'quiz-review', match: () => page.is('/mod/quiz/review.php'), run: runReview },
  // Dự phòng cho /mod/<loại>/view.php khác (tài liệu, trang, liên kết...): mở trang là đạt "View".
  {
    name: 'activity-view',
    fallback: true,
    match: () => /\/mod\/[a-z0-9_]+\/view\.php$/.test(page.path),
    run: (state) => runActivityPage(state, {
      cmid: cmid(),
      label: 'Hoạt động',
      act: (current) => goToCourse(current, 'đã mở trang (điều kiện View)'),
    }),
  },
];

// Chọn route khớp trang hiện tại (route cụ thể trước, dự phòng sau) và chạy khi đang bật tự động học.
export const runAutomation = (): Promise<unknown> => {
  const route = routes.find(({ fallback, match }) => !fallback && match())
    ?? routes.find(({ fallback, match }) => fallback && match());
  if (!route) return Promise.resolve();
  return loadState()
    .then((state) => {
      if (!state.enabled) {
        log.info('Tự động học đang tắt — bật trong popup của tiện ích để chạy.');
        return null;
      }
      log.info(`Trang "${route.name}".`);
      return rememberCourse(state).then((current) => route.run(current));
    })
    .catch((error: Error) => {
      log.error(error);
      notify.error('Có lỗi xảy ra', [error.message]);
    });
};
