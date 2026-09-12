import { toast } from 'sonner';

// Thông báo trên trang Moodle bằng sonner (toast của shadcn). Chi tiết nhiều dòng (vd. lỗi AI) được tách dòng,
// dòng quá dài được rút gọn — bản đầy đủ vẫn nằm trong console.
const MAX_LINES = 6;
const MAX_CHARS = 220;

const describe = (details: string[] = []) => {
  const lines = details
    .flatMap((text) => String(text).split('\n'))
    .map((line) => line.replace(/^\s*[•*-]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map((line) => (line.length > MAX_CHARS ? `${line.slice(0, MAX_CHARS - 1)}…` : line));
  return lines.length ? lines.join('\n') : undefined;
};

export const notify = {
  info: (title: string, details?: string[]) => toast.info(title, { description: describe(details) }),
  success: (title: string, details?: string[]) => toast.success(title, { description: describe(details) }),
  warning: (title: string, details?: string[]) => toast.warning(title, { description: describe(details) }),
  error: (title: string, details?: string[]) => toast.error(title, { description: describe(details) }),
};
