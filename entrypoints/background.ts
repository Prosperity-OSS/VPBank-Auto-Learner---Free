import { CONFIG } from '@/lib/config';
import { listModels, solveQuiz, testGeminiKey } from '@/lib/gemini';
import { t } from '@/lib/i18n';
import { onMessage } from '@/lib/messaging';
import { completeScorm, type ScormResult } from '@/lib/scorm-complete';
import { geminiKeyItem, geminiModelItem, loadLanguage } from '@/lib/storage';

// Service worker: tiêm completeScorm vào MAIN world của player.php và gọi Gemini cho bài kiểm tra.
//
// Mỗi message đọc lại ngôn ngữ thay vì chỉ đọc lúc khởi động: service worker bị tắt/bật
// lại bất cứ lúc nào, người dùng có thể vừa đổi ngôn ngữ, và lỗi trả về hiện thẳng ra màn hình.
export default defineBackground(() => {
  onMessage('completeScorm', ({ sender }) => loadLanguage().then(() => {
    const tabId = sender.tab?.id;
    if (tabId === undefined) throw new Error(t().scormOnlyFromPlayer);
    return browser.scripting
      .executeScript({
        target: { tabId, frameIds: [sender.frameId ?? 0] },
        world: 'MAIN',
        func: completeScorm,
        args: [{ ...CONFIG.SCORM, messages: t().scormTemplates }],
      })
      .then(([injection]) => (injection?.result as ScormResult | undefined)
        ?? { ok: false, error: t().scormNoResult });
  }));

  onMessage('solveQuiz', ({ data }) => Promise
    .all([geminiKeyItem.getValue(), geminiModelItem.getValue(), loadLanguage()])
    .then(([apiKey, model]) => solveQuiz(apiKey, model, data)));

  // Popup gửi kèm key và model đang gõ dở, nên kiểm tra được trước khi lưu.
  onMessage('testGeminiKey', ({ data }) => loadLanguage().then(() => testGeminiKey(data.apiKey, data.model)));

  onMessage('listGeminiModels', ({ data }) => loadLanguage().then(() => listModels(data)));
});
