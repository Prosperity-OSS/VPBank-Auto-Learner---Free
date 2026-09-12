import { CONFIG } from '@/lib/config';
import type { QuizAnswers, QuizQuestion } from '@/lib/gemini';
import { sendMessage } from '@/lib/messaging';
import { cleanText, isVisible, log, page, sleep, viewUrl, waitFor } from './dom';
import { notify } from './notify';
import { goToCourse } from './state';
import type { State } from './state';

// Bài kiểm tra: view -> (startattempt) -> attempt (Gemini structured output) -> summary -> review -> view.
const QUESTION_SELECTOR = '.que.multichoice, .que.truefalse, .que.multichoiceset';

const visibleMatch = (selector: string) => () => Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible);

export const startAttempt = (state: State) => {
  if (!state.geminiKey) {
    notify.warning('Bỏ qua bài kiểm tra', ['Chưa nhập Gemini API key trong popup.']);
    return goToCourse(state, 'chưa có Gemini API key');
  }
  const button = document.querySelector<HTMLElement>('form[action*="startattempt.php"] [type="submit"]');
  if (!button) throw new Error('Không tìm thấy nút "Attempt quiz" (có thể đã hết lượt làm bài).');
  notify.info('Bắt đầu làm bài kiểm tra...');
  return sleep(CONFIG.DELAY.ACTION).then(() => {
    button.click();
    // Quiz giới hạn thời gian sẽ hiện hộp thoại "Start attempt".
    return waitFor(visibleMatch('#id_submitbutton'), 6000)
      .then((confirm) => confirm.click())
      .catch(() => log.info('Không có hộp thoại "Start attempt".'));
  });
};

// Trang xác nhận riêng (khi Moodle không mở được hộp thoại bằng JS).
export const runStartAttemptPage = () => waitFor('#id_submitbutton', 5000)
  .then((button) => sleep(CONFIG.DELAY.SHORT).then(() => button.click()))
  .catch(() => log.warn('Không thấy nút "Start attempt" trên trang startattempt.php.'));

const optionLabel = (input: HTMLInputElement) => {
  const row = input.closest('.answer > div') ?? input.parentElement;
  return cleanText(row?.querySelector('[data-region="answer-label"] .flex-fill')
    ?? row?.querySelector('[data-region="answer-label"], label')
    ?? row);
};

const collectQuestions = (): QuizQuestion[] => Array.from(document.querySelectorAll<HTMLElement>(QUESTION_SELECTOR))
  .map((node) => {
    const inputs = Array.from(node.querySelectorAll<HTMLInputElement>('.answer input[type="radio"], .answer input[type="checkbox"]'))
      .filter((input) => input.value !== '-1' && !input.disabled); // Bỏ "Clear my choice".
    return {
      qId: node.id,
      qText: cleanText(node.querySelector('.qtext')),
      isMultiple: inputs[0]?.type === 'checkbox',
      options: inputs.map((input) => ({ inputId: input.id, text: optionLabel(input) })),
    };
  })
  .filter(({ options }) => options.length > 0);

// Chọn đúng các đáp án AI trả về; với câu nhiều lựa chọn thì bỏ tích các ô không được chọn.
const applyAnswers = (questions: QuizQuestion[], { answers }: QuizAnswers) => {
  const chosen = new Set(answers.flatMap(({ selectedInputIds }) => selectedInputIds));
  const inputs = questions
    .flatMap(({ options }) => options)
    .map(({ inputId }) => document.getElementById(inputId))
    .filter((input): input is HTMLInputElement => input instanceof HTMLInputElement);
  inputs
    .filter((input) => (chosen.has(input.id) ? !input.checked : input.checked && input.type === 'checkbox'))
    .forEach((input) => input.click());
  return inputs.filter((input) => chosen.has(input.id)).length;
};

const goNext = () => {
  const next = document.querySelector<HTMLElement>('#mod_quiz-next-nav, .submitbtns [name="next"]');
  if (!next) throw new Error('Không tìm thấy nút "Next page" / "Finish attempt".');
  next.click();
};

export const runAttempt = () => {
  const questions = collectQuestions();
  if (!questions.length) {
    log.warn('Trang này không có câu hỏi trắc nghiệm được hỗ trợ — chuyển trang.');
    return sleep(CONFIG.DELAY.ACTION).then(goNext);
  }
  notify.info(`AI đang giải ${questions.length} câu hỏi...`);
  return sendMessage('solveQuiz', questions)
    .then((result) => {
      const count = applyAnswers(questions, result);
      notify.success(`Đã chọn ${count} đáp án`, [`Chuyển trang sau ${CONFIG.DELAY.AFTER_ANSWER / 1000}s`]);
    })
    .then(() => sleep(CONFIG.DELAY.AFTER_ANSWER))
    .then(goNext)
    .catch((error: Error) => {
      log.error('Lỗi khi làm bài:', error);
      notify.error('Chưa làm được bài kiểm tra', [error.message, 'Tải lại trang (F5) để thử lại.']);
    });
};

export const runSummary = () => {
  const button = document.querySelector<HTMLElement>('#frm-finishattempt [type="submit"], form[action*="processattempt.php"] [type="submit"]');
  if (!button) throw new Error('Không tìm thấy nút "Submit all and finish".');
  notify.info('Đang nộp bài...');
  return sleep(CONFIG.DELAY.ACTION).then(() => {
    button.click();
    return waitFor(visibleMatch('.modal.show [data-action="save"], .modal.show .btn-primary, .moodle-dialogue-base .btn-primary'), 8000)
      .then((confirm) => confirm.click())
      .catch(() => log.warn('Không thấy hộp thoại xác nhận nộp bài.'));
  });
};

export const runReview = (state: State) => {
  const finish = document.querySelector<HTMLAnchorElement>('a.mod_quiz-next-nav')
    ?? Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find((link) => /finish review|kết thúc xem lại/i.test(link.textContent ?? ''));
  const cmid = page.params.get('cmid');
  const target = finish?.href ?? (cmid ? viewUrl('quiz', cmid) : null);
  return sleep(CONFIG.DELAY.ACTION)
    .then(() => (target ? location.assign(target) : goToCourse(state, 'không tìm thấy nút Finish review')));
};
