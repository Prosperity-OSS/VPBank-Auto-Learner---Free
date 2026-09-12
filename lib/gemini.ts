import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { CONFIG } from './config';
import { t } from './i18n';

export type QuizQuestion = {
  qId: string;
  qText: string;
  isMultiple: boolean;
  options: { inputId: string; text: string }[];
};

// Một model để hiện trong popup: label là dòng chính, detail là dòng phụ ("models/<id>").
export type GeminiModel = { id: string; label: string; detail: string };

// Structured output: schema viết một lần bằng zod — vừa gửi cho Gemini (responseJsonSchema), vừa kiểm tra kết quả.
export const quizAnswersSchema = z.object({
  answers: z.array(z.object({ qId: z.string(), selectedInputIds: z.array(z.string()) })),
});
export type QuizAnswers = z.infer<typeof quizAnswersSchema>;

const connectionSchema = z.object({ ok: z.boolean() });

const toGeminiSchema = (schema: z.ZodType) => {
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema);
  return jsonSchema;
};

const stripFences = (text: string) => text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

// Model rỗng (chưa chọn, hoặc cache cũ) thì quay về mặc định thay vì gọi API với model trống.
export const resolveModel = (model?: string) => model?.trim().replace(/^models\//, '') || CONFIG.GEMINI_MODEL_DEFAULT;

const client = (apiKey: string) => {
  const key = apiKey.trim();
  if (!key) throw new Error(t().noGeminiKey);
  return new GoogleGenAI({ apiKey: key });
};

const generate = <T extends z.ZodType>(
  apiKey: string,
  model: string,
  prompt: string,
  schema: T,
): Promise<z.infer<T>> => {
  let models: GoogleGenAI['models'];
  try {
    models = client(apiKey).models;
  } catch (error) {
    return Promise.reject(error as Error);
  }
  return models
    .generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseJsonSchema: toGeminiSchema(schema),
      },
    })
    .then((response) => {
      const text = stripFences(response.text ?? '');
      if (!text) throw new Error(t().emptyGeminiReply);
      return schema.parse(JSON.parse(text));
    });
};

export const buildQuizPrompt = (questions: QuizQuestion[]) => [
  'Bạn là một chuyên gia. Giải các câu hỏi trắc nghiệm sau.',
  'Nếu isMultiple = true, chọn TẤT CẢ inputId đúng; nếu false, chọn đúng 1 inputId đúng nhất.',
  'Trả về { "answers": [ { "qId", "selectedInputIds" } ] } cho MỌI câu hỏi, chỉ dùng qId và inputId có trong dữ liệu.',
  '',
  JSON.stringify(questions, null, 2),
].join('\n');

export const solveQuiz = (apiKey: string, model: string, questions: QuizQuestion[]) =>
  generate(apiKey, model, buildQuizPrompt(questions), quizAnswersSchema);

export const testGeminiKey = (apiKey: string, model: string) =>
  generate(apiKey, model, 'Kiểm tra kết nối: trả về {"ok": true}.', connectionSchema)
    .then(() => ({ ok: true, message: t().geminiConnected(resolveModel(model)) }))
    .catch((error: Error) => ({ ok: false, message: error.message }));

/**
 * Tải danh sách model của chính API key đang dùng.
 *
 * Chỉ giữ model Gemini còn hỗ trợ generateContent — danh sách thô còn có embedding,
 * imagen, veo... gọi generateContent sẽ lỗi. SDK đổi tên trường REST
 * supportedGenerationMethods thành supportedActions.
 */
export const listModels = (apiKey: string): Promise<GeminiModel[]> => {
  let models: GoogleGenAI['models'];
  try {
    models = client(apiKey).models;
  } catch (error) {
    return Promise.reject(error as Error);
  }

  // Pager tự lật trang khi duyệt bằng for await, không cần tự xử lý pageToken.
  return models.list({ config: { pageSize: 1000, queryBase: true } }).then(async (pager) => {
    const found: GeminiModel[] = [];

    for await (const model of pager) {
      const name = model.name ?? '';
      if (!name.startsWith('models/gemini')) continue;
      if (!model.supportedActions?.includes('generateContent')) continue;

      const id = name.replace(/^models\//, '');
      found.push({ id, label: model.displayName || id, detail: name });
    }

    return found.sort((a, b) => a.label.localeCompare(b.label));
  });
};
