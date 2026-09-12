import { describe, expect, it } from 'vitest';
import { detectLanguage, isLanguage } from '@/lib/i18n';

describe('detectLanguage', () => {
  it('chọn tiếng Việt khi trình duyệt dùng tiếng Việt', () => {
    expect(detectLanguage('vi')).toBe('vi');
    expect(detectLanguage('vi-VN')).toBe('vi');
  });

  it('các ngôn ngữ khác dùng tiếng Anh', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('fr')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});

describe('isLanguage', () => {
  it('chỉ nhận ngôn ngữ có bản dịch', () => {
    expect(isLanguage('vi')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
