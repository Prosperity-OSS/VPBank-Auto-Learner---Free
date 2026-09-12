import { defineExtensionMessaging } from '@webext-core/messaging';
import type { QuizAnswers, QuizQuestion } from './gemini';
import type { ScormResult } from './scorm-complete';

// Giao thức message giữa content script / popup và service worker.
interface ProtocolMap {
  completeScorm(): ScormResult;
  solveQuiz(questions: QuizQuestion[]): QuizAnswers;
  testGeminiKey(apiKey: string): { ok: boolean; message: string };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
