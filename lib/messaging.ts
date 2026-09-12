import { defineExtensionMessaging } from '@webext-core/messaging';
import type { GeminiModel, QuizAnswers, QuizQuestion } from './gemini';
import type { ScormResult } from './scorm-complete';

// Giao thức message giữa content script / popup và service worker.
// Mọi lời gọi Gemini đi qua service worker để chỉ có một nơi chạm tới mạng.
interface ProtocolMap {
  completeScorm(): ScormResult;
  solveQuiz(questions: QuizQuestion[]): QuizAnswers;
  testGeminiKey(input: { apiKey: string; model: string }): { ok: boolean; message: string };
  listGeminiModels(apiKey: string): GeminiModel[];
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
