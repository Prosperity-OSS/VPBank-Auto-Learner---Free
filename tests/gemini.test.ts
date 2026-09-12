import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizQuestion } from '@/lib/gemini';

const { generateContent, list } = vi.hoisted(() => ({ generateContent: vi.fn(), list: vi.fn() }));
// Phải là class thật: vi.fn(() => ...) không dùng được với `new GoogleGenAI(...)`.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent, list };
  },
}));

const { buildQuizPrompt, listModels, resolveModel, solveQuiz, testGeminiKey } = await import('@/lib/gemini');

const DEFAULT_MODEL = 'gemini-2.5-flash';

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

// models.list trả về Pager, chỉ cần là AsyncIterable để duyệt bằng for await.
const pageOf = (models: unknown[]) => list.mockResolvedValueOnce({
  async *[Symbol.asyncIterator]() {
    yield* models;
  },
});

const requestFor = (index = 0) => generateContent.mock.calls[index] as [{ model: string; config: Record<string, unknown> }];

beforeEach(() => {
  generateContent.mockReset();
  list.mockReset();
});

describe('gemini', () => {
  it('gửi structured output và trả về đáp án đã kiểm tra', () => {
    reply(JSON.stringify({ answers: [{ qId: 'question-1', selectedInputIds: ['q1:a'] }] }));
    return solveQuiz('key-abc', DEFAULT_MODEL, QUESTIONS).then((result) => {
      const [request] = requestFor();
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
    return solveQuiz('key-abc', DEFAULT_MODEL, QUESTIONS).then((result) => expect(result.answers).toEqual([]));
  });

  it('từ chối câu trả lời sai cấu trúc', () => {
    reply(JSON.stringify({ answers: [{ qId: 'question-1', selectedInputIds: 'q1:a' }] }));
    return expect(solveQuiz('key-abc', DEFAULT_MODEL, QUESTIONS)).rejects.toThrow();
  });

  it('không gọi API khi chưa có key', () => expect(solveQuiz('  ', DEFAULT_MODEL, QUESTIONS))
    .rejects.toThrow(/Chưa nhập Gemini API key/)
    .then(() => expect(generateContent).not.toHaveBeenCalled()));

  it('prompt chứa toàn bộ câu hỏi và lựa chọn', () => {
    const prompt = buildQuizPrompt(QUESTIONS);
    expect(prompt).toContain('question-1');
    expect(prompt).toContain('Hệ thống học trực tuyến');
  });

  it('testGeminiKey trả về lỗi thay vì ném ra ngoài', () => {
    generateContent.mockRejectedValueOnce(new Error('API key not valid'));
    return testGeminiKey('sai-key', DEFAULT_MODEL).then((result) => {
      expect(result.ok).toBe(false);
      expect(result.message).toContain('API key not valid');
    });
  });

  it('testGeminiKey báo thành công kèm tên model đã dùng', () => {
    reply('{"ok":true}');
    return testGeminiKey('key-abc', 'gemini-3.0-pro').then((result) => {
      expect(result.ok).toBe(true);
      expect(result.message).toContain('gemini-3.0-pro');
    });
  });
});

describe('chọn model', () => {
  it('dùng đúng model được truyền vào', () => {
    reply('{"answers":[]}');
    return solveQuiz('key-abc', 'gemini-3.0-pro', QUESTIONS).then(() => {
      expect(requestFor()[0].model).toBe('gemini-3.0-pro');
    });
  });

  it('quay về model mặc định khi chưa chọn gì', () => {
    reply('{"answers":[]}');
    return solveQuiz('key-abc', '   ', QUESTIONS).then(() => {
      expect(requestFor()[0].model).toBe(DEFAULT_MODEL);
    });
  });

  it('bỏ tiền tố models/ khi gọi API', () => {
    reply('{"answers":[]}');
    return solveQuiz('key-abc', 'models/gemini-3.0-pro', QUESTIONS).then(() => {
      expect(requestFor()[0].model).toBe('gemini-3.0-pro');
    });
  });

  it('resolveModel xử lý các đầu vào lạ', () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL);
    expect(resolveModel('')).toBe(DEFAULT_MODEL);
    expect(resolveModel('  gemini-2.0-flash  ')).toBe('gemini-2.0-flash');
  });
});

describe('listModels', () => {
  it('chỉ giữ model Gemini còn hỗ trợ generateContent', () => {
    pageOf([
      { name: 'models/gemini-3.0-pro', displayName: 'Gemini 3.0 Pro', supportedActions: ['generateContent'] },
      // Gemini nhưng chỉ để đếm token — gọi generateContent sẽ lỗi.
      { name: 'models/gemini-1.0-legacy', displayName: 'Legacy', supportedActions: ['countTokens'] },
      // Không phải Gemini.
      { name: 'models/text-embedding-004', displayName: 'Embedding', supportedActions: ['embedContent'] },
      { name: 'models/imagen-3.0', displayName: 'Imagen', supportedActions: ['predict'] },
    ]);

    return listModels('key-abc').then((models) => {
      expect(models).toEqual([
        { id: 'gemini-3.0-pro', label: 'Gemini 3.0 Pro', detail: 'models/gemini-3.0-pro' },
      ]);
    });
  });

  it('dùng id làm nhãn khi thiếu displayName, và sắp xếp theo nhãn', () => {
    pageOf([
      { name: 'models/gemini-z', supportedActions: ['generateContent'] },
      { name: 'models/gemini-a', displayName: 'Alpha', supportedActions: ['generateContent'] },
    ]);

    return listModels('key-abc').then((models) => {
      expect(models.map((model) => model.label)).toEqual(['Alpha', 'gemini-z']);
    });
  });

  it('không gọi API khi chưa có key', () => expect(listModels('  '))
    .rejects.toThrow(/Chưa nhập Gemini API key/)
    .then(() => expect(list).not.toHaveBeenCalled()));

  it('chỉ lấy base model và xin trang đủ lớn', () => {
    pageOf([]);
    return listModels('key-abc').then(() => {
      const [params] = list.mock.calls[0] as [{ config: { pageSize: number; queryBase: boolean } }];
      expect(params.config.queryBase).toBe(true);
      expect(params.config.pageSize).toBeGreaterThan(100);
    });
  });
});
