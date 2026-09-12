import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeScorm } from '@/lib/scorm-complete';

const CFG = { apiTimeout: 300, initTimeout: 150, pollInterval: 10, score: '100' };

type Store = Record<string, string>;

const scorm12 = (initialized: boolean) => {
  const data: Store = { 'cmi.core.lesson_status': 'incomplete' };
  let lastError = initialized ? '0' : '301';
  const api = {
    LMSInitialize: vi.fn(() => {
      lastError = '0';
      return 'true';
    }),
    LMSGetValue: vi.fn((element: string) => data[element] ?? ''),
    LMSSetValue: vi.fn((element: string, value: string) => {
      data[element] = value;
      return 'true';
    }),
    LMSCommit: vi.fn(() => 'true'),
    LMSGetLastError: vi.fn(() => lastError),
  };
  return { api, data };
};

const scorm2004 = () => {
  const data: Store = { 'cmi.completion_status': 'incomplete' };
  let lastError = '122';
  const api = {
    Initialize: vi.fn(() => {
      lastError = '0';
      return 'true';
    }),
    GetValue: vi.fn((element: string) => data[element] ?? ''),
    SetValue: vi.fn((element: string, value: string) => {
      data[element] = value;
      return 'true';
    }),
    Commit: vi.fn(() => 'true'),
    GetLastError: vi.fn(() => lastError),
  };
  return { api, data };
};

const install = (key: string, api: object) => Object.assign(window as unknown as Record<string, unknown>, { [key]: api });

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).API;
  delete (window as unknown as Record<string, unknown>).API_1484_11;
});

describe('completeScorm', () => {
  it('hoàn thành gói SCORM 1.2 đã khởi tạo', () => {
    const { api, data } = scorm12(true);
    install('API', api);
    return completeScorm(CFG).then((result) => {
      expect(result).toMatchObject({ ok: true, version: '1.2', status: 'completed' });
      expect(data['cmi.core.lesson_status']).toBe('completed');
      expect(data['cmi.core.score.raw']).toBe('100');
      expect(api.LMSInitialize).not.toHaveBeenCalled();
    });
  });

  it('chặn SCO ghi đè trạng thái xuống thấp hơn sau khi hoàn thành', () => {
    const { api, data } = scorm12(true);
    install('API', api);
    return completeScorm(CFG).then(() => {
      const locked = (window as unknown as { API: { LMSSetValue: (element: string, value: string) => string } }).API;
      expect(locked.LMSSetValue('cmi.core.lesson_status', 'incomplete')).toBe('true');
      expect(data['cmi.core.lesson_status']).toBe('completed');
      expect(locked.LMSSetValue('cmi.core.session_time', '00:10:00')).toBe('true');
      expect(data['cmi.core.session_time']).toBe('00:10:00');
    });
  });

  it('tự khởi tạo phiên khi SCO chưa gọi Initialize (SCORM 2004)', () => {
    const { api, data } = scorm2004();
    install('API_1484_11', api);
    return completeScorm(CFG).then((result) => {
      expect(result).toMatchObject({ ok: true, version: '2004' });
      expect(api.Initialize).toHaveBeenCalledWith('');
      expect(data['cmi.completion_status']).toBe('completed');
      expect(data['cmi.success_status']).toBe('passed');
    });
  });

  it('không gọi Finish/Terminate để Moodle giữ nguyên trạng thái completed', () => {
    const { api } = scorm12(true);
    const finish = vi.fn(() => 'true');
    install('API', { ...api, LMSFinish: finish });
    return completeScorm(CFG).then(() => expect(finish).not.toHaveBeenCalled());
  });

  it('báo lỗi khi trang không có SCORM API', () => {
    return completeScorm({ ...CFG, apiTimeout: 30 }).then((result) => {
      expect(result.ok).toBe(false);
      expect(result.error).toContain('SCORM API');
    });
  });
});
