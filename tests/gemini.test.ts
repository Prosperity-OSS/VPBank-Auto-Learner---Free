import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizQuestion } from '@/lib/gemini';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
// Phải là class thật: vi.fn(() => ...) không dùng được với `new GoogleGenAI(...)`.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { buildQuizPrompt, solveQuiz, testGeminiKey } = await import('@/lib/gemini');

const QUESTIONS: QuizQuestion[] = [
  {
    qId: 'question-1',
    qText: 'VPBank Academy là gì?',
    isMultiple: false,
    options: [
      { inputId: 'q1:a', text: 'Hệ thống học trực tuyến' },
      { inputId: 'q1:b', text: 'Máy ATM' },
    ],
  },
];

const reply = (text: string) => generateContent.mockResolvedValueOnce({ text });

beforeEach(() => generateContent.mockReset());

describe('gemini', () => {
  it('gửi structured output và trả về đáp án đã kiểm tra', () => {
    reply(JSON.stringify({ answers: [{ qId: 'question-1', selectedInputIds: ['q1:a'] }] }));
    return solveQuiz('key-abc', QUESTIONS).then((result) => {
      const [request] = generateContent.mock.calls[0] as [{ config: Record<string, unknown> }];
      expect(request.config.responseMimeType).toBe('application/json');
      expect(request.config.responseJsonSchema).toMatchObject({
        type: 'object',
        properties: { answers: { type: 'array' } },
        required: ['answers'],
      });
      expect(request.config.responseJsonSchema).not.toHaveProperty('$schema');
      expect(result.answers).toEqual([{ qId: 'question-1', selectedInputIds: ['q1:a'] }]);
    });
  });

  it('bỏ hàng rào ```json quanh câu trả lời', () => {
    reply('```json\n{"answers":[]}\n```');
    return solveQuiz('key-abc', QUESTIONS).then((result) => expect(result.answers).toEqual([]));
  });

  it('từ chối câu trả lời sai cấu trúc', () => {
    reply(JSON.stringify({ answers: [{ qId: 'question-1', selectedInputIds: 'q1:a' }] }));
    return expect(solveQuiz('key-abc', QUESTIONS)).rejects.toThrow();
  });

  it('không gọi API khi chưa có key', () => expect(solveQuiz('  ', QUESTIONS))
    .rejects.toThrow(/Chưa nhập Gemini API key/)
    .then(() => expect(generateContent).not.toHaveBeenCalled()));

  it('prompt chứa toàn bộ câu hỏi và lựa chọn', () => {
    const prompt = buildQuizPrompt(QUESTIONS);
    expect(prompt).toContain('question-1');
    expect(prompt).toContain('Hệ thống học trực tuyến');
  });

  it('testGeminiKey trả về lỗi thay vì ném ra ngoài', () => {
    generateContent.mockRejectedValueOnce(new Error('API key not valid'));
    return testGeminiKey('sai-key').then((result) => {
      expect(result.ok).toBe(false);
      expect(result.message).toContain('API key not valid');
    });
  });

  it('testGeminiKey báo thành công khi kết nối được', () => {
    reply('{"ok":true}');
    return testGeminiKey('key-abc').then((result) => expect(result.ok).toBe(true));
  });
});
