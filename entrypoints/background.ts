import { CONFIG } from '@/lib/config';
import { solveQuiz, testGeminiKey } from '@/lib/gemini';
import { onMessage } from '@/lib/messaging';
import { completeScorm, type ScormResult } from '@/lib/scorm-complete';
import { geminiKeyItem } from '@/lib/storage';

// Service worker: tiêm completeScorm vào MAIN world của player.php và gọi Gemini cho bài kiểm tra.
export default defineBackground(() => {
  onMessage('completeScorm', ({ sender }) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined) return Promise.reject(new Error('Chỉ gọi được từ trang SCORM player.'));
    return browser.scripting
      .executeScript({
        target: { tabId, frameIds: [sender.frameId ?? 0] },
        world: 'MAIN',
        func: completeScorm,
        args: [CONFIG.SCORM],
      })
      .then(([injection]) => (injection?.result as ScormResult | undefined)
        ?? { ok: false, error: 'Không nhận được kết quả từ trang SCORM.' });
  });

  onMessage('solveQuiz', ({ data }) => geminiKeyItem.getValue().then((apiKey) => solveQuiz(apiKey, data)));

  onMessage('testGeminiKey', ({ data }) => testGeminiKey(data));
});
