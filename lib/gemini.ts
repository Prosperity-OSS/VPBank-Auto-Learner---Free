import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { CONFIG } from './config';

export type QuizQuestion = {
  qId: string;
  qText: string;
  isMultiple: boolean;
  options: { inputId: string; text: string }[];
};

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

const generate = <T extends z.ZodType>(apiKey: string, prompt: string, schema: T): Promise<z.infer<T>> => {
  const key = apiKey.trim();
  if (!key) return Promise.reject(new Error('Chưa nhập Gemini API key trong popup.'));
  return new GoogleGenAI({ apiKey: key }).models
    .generateContent({
      model: CONFIG.GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseJsonSchema: toGeminiSchema(schema),
      },
    })
    .then((response) => {
      const text = stripFences(response.text ?? '');
      if (!text) throw new Error('Gemini trả về nội dung rỗng.');
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

export const solveQuiz = (apiKey: string, questions: QuizQuestion[]) => generate(apiKey, buildQuizPrompt(questions), quizAnswersSchema);

export const testGeminiKey = (apiKey: string) => generate(apiKey, 'Kiểm tra kết nối: trả về {"ok": true}.', connectionSchema)
  .then(() => ({ ok: true, message: `Kết nối được ${CONFIG.GEMINI_MODEL}.` }))
  .catch((error: Error) => ({ ok: false, message: error.message }));
