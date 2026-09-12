export type ScormConfig = { apiTimeout: number; initTimeout: number; pollInterval: number; score: string };

export type ScormResult = {
  ok: boolean;
  version?: string;
  commitResult?: string;
  errorCode?: string;
  status?: string;
  error?: string;
};

/**
 * Hoàn thành bài SCORM trong trang Moodle player.php.
 *
 * Service worker tiêm hàm này bằng chrome.scripting.executeScript({ world: 'MAIN' }) vì window.API /
 * window.API_1484_11 của Moodle chỉ tồn tại trong MAIN world. Hàm phải tự chứa toàn bộ logic: executeScript
 * chỉ gửi mã nguồn của hàm, không mang theo biến nào bên ngoài.
 */
export function completeScorm(cfg: ScormConfig): Promise<ScormResult> {
  type Version = '1.2' | '2004';
  type ScormApi = { [method: string]: unknown; __vpbalLocked?: boolean };
  type Adapter = {
    key: string;
    initialize: string;
    getValue: string;
    setValue: string;
    commit: string;
    lastError: string;
    statusElement: string;
    notInitialized: string[];
    values: [string, string][];
    locked: Record<string, string[]>;
  };
  type Context = { version: Version; adapter: Adapter; api: ScormApi };

  const { apiTimeout, initTimeout, pollInterval, score } = cfg;
  const TAG = '[Auto-Learner]';

  const ADAPTERS: Record<Version, Adapter> = {
    '1.2': {
      key: 'API',
      initialize: 'LMSInitialize',
      getValue: 'LMSGetValue',
      setValue: 'LMSSetValue',
      commit: 'LMSCommit',
      lastError: 'LMSGetLastError',
      statusElement: 'cmi.core.lesson_status',
      notInitialized: ['301'],
      values: [
        ['cmi.core.lesson_status', 'completed'],
        ['cmi.core.score.raw', score],
      ],
      locked: { 'cmi.core.lesson_status': ['completed', 'passed'] },
    },
    '2004': {
      key: 'API_1484_11',
      initialize: 'Initialize',
      getValue: 'GetValue',
      setValue: 'SetValue',
      commit: 'Commit',
      lastError: 'GetLastError',
      statusElement: 'cmi.completion_status',
      notInitialized: ['122', '123'],
      values: [
        ['cmi.completion_status', 'completed'],
        ['cmi.success_status', 'passed'],
        ['cmi.score.raw', score],
      ],
      locked: { 'cmi.completion_status': ['completed'], 'cmi.success_status': ['passed'] },
    },
  };

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const poll = <T>(probe: () => T | null | undefined | false, timeout: number, label: string): Promise<T> => {
    const deadline = Date.now() + timeout;
    const tick = (): Promise<T> => {
      const value = probe();
      if (value) return Promise.resolve(value);
      if (Date.now() >= deadline) return Promise.reject(new Error(`${label}: hết ${timeout / 1000}s chờ`));
      return sleep(pollInterval).then(tick);
    };
    return tick();
  };

  const readGlobal = (key: string): ScormApi | undefined => [window, window.parent, window.top]
    .map((win) => {
      try {
        return (win as unknown as Record<string, ScormApi | undefined> | null)?.[key];
      } catch {
        return undefined; // Khung khác origin.
      }
    })
    .find(Boolean);

  const findApi = (): Context | null => (['1.2', '2004'] as Version[])
    .map((version) => ({ version, adapter: ADAPTERS[version], api: readGlobal(ADAPTERS[version].key) }))
    .find((ctx): ctx is Context => Boolean(ctx.api)) ?? null;

  const call = ({ api }: Context, method: string, ...args: string[]) => String((api[method] as (...a: string[]) => unknown)(...args));

  // SCO chưa gọi Initialize thì GetValue báo lỗi 301 (1.2) hoặc 122 (2004).
  const isInitialized = (ctx: Context) => {
    call(ctx, ctx.adapter.getValue, ctx.adapter.statusElement);
    return !ctx.adapter.notInitialized.includes(call(ctx, ctx.adapter.lastError));
  };

  const ensureInitialized = (ctx: Context) => poll(() => isInitialized(ctx), initTimeout, 'SCO Initialize')
    .catch(() => {
      const { initialize, lastError } = ctx.adapter;
      console.warn(`${TAG} SCO chưa gọi ${initialize}() — tự khởi tạo phiên SCORM.`);
      const result = call(ctx, initialize, '');
      const errorCode = call(ctx, lastError);
      if (result !== 'true' && !isInitialized(ctx)) throw new Error(`${initialize}("") thất bại (mã lỗi ${errorCode})`);
      return true;
    })
    .then(() => ctx);

  // Chặn SCO ghi đè trạng thái xuống thấp hơn (vd. "incomplete" khi rời trang) sau khi đã hoàn thành.
  const lockStatus = ({ api, adapter }: Context) => {
    if (api.__vpbalLocked) return;
    const original = api[adapter.setValue] as (element: string, value: string) => unknown;
    api[adapter.setValue] = (element: string, value: string) => {
      const allowed = adapter.locked[element];
      if (allowed && !allowed.includes(String(value))) {
        console.info(`${TAG} Bỏ qua ghi đè ${element}="${value}" từ SCO.`);
        return 'true';
      }
      return original.call(api, element, value);
    };
    api.__vpbalLocked = true;
  };

  // Không gọi LMSFinish/Terminate: khi finish, Moodle có thể đổi "completed" thành "passed" nếu gói có
  // mastery score, trong khi điều kiện hoàn thành ở đây là "Complete the activity".
  const complete = (ctx: Context): ScormResult => {
    const { adapter, version } = ctx;
    adapter.values.forEach(([element, value]) => call(ctx, adapter.setValue, element, value));
    lockStatus(ctx);
    const commitResult = call(ctx, adapter.commit, '');
    const errorCode = call(ctx, adapter.lastError);
    const status = call(ctx, adapter.getValue, adapter.statusElement);
    const ok = commitResult === 'true' && errorCode === '0';
    console[ok ? 'log' : 'error'](`${TAG} SCORM ${version}: commit=${commitResult}, mã lỗi=${errorCode}, trạng thái=${status}`);
    return { ok, version, commitResult, errorCode, status };
  };

  return poll(findApi, apiTimeout, 'SCORM API')
    .then(ensureInitialized)
    .then(complete)
    .catch((error: Error) => ({ ok: false, error: error.message }));
}
