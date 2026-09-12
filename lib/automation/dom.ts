import { CONFIG } from '@/lib/config';

// Tiện ích DOM dùng chung cho tự động hóa trên trang Moodle.
const TAG = '[Auto-Learner]';

export const log = {
  info: (...args: unknown[]) => console.log(TAG, ...args),
  warn: (...args: unknown[]) => console.warn(TAG, ...args),
  error: (...args: unknown[]) => console.error(TAG, ...args),
};

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Chờ phần tử / điều kiện xuất hiện bằng MutationObserver.
export const waitFor = <T extends Element = HTMLElement>(
  target: string | (() => T | null | undefined),
  timeout = 10000,
): Promise<T> => new Promise((resolve, reject) => {
  const probe = typeof target === 'function' ? target : () => document.querySelector<T>(target);
  const initial = probe();
  if (initial) {
    resolve(initial);
    return;
  }
  const observer = new MutationObserver(() => {
    const found = probe();
    if (!found) return;
    observer.disconnect();
    clearTimeout(timer);
    resolve(found);
  });
  const timer = setTimeout(() => {
    observer.disconnect();
    reject(new Error(`Hết thời gian chờ ${typeof target === 'string' ? target : 'điều kiện'}`));
  }, timeout);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-toggletype'],
  });
});

export const isVisible = (el: Element | null | undefined): boolean => Boolean(el?.getClientRects().length)
  && getComputedStyle(el as Element).visibility !== 'hidden';

export const cleanText = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const pageUrl = new URL(location.href);
export const page = {
  path: pageUrl.pathname,
  params: pageUrl.searchParams,
  is: (suffix: string) => pageUrl.pathname.endsWith(suffix),
};

export const courseUrl = (courseId: string) => `${CONFIG.BASE_URL}/course/view.php?id=${encodeURIComponent(courseId)}`;
export const viewUrl = (mod: string, cmid: string) => `${CONFIG.BASE_URL}/mod/${mod}/view.php?id=${encodeURIComponent(cmid)}`;

export const courseIdFromPage = (): string | null => {
  if (page.is('/course/view.php')) return page.params.get('id');
  const fromBody = document.body?.className.match(/\bcourse-(\d+)\b/)?.[1];
  if (fromBody && fromBody !== '1') return fromBody;
  const link = document.querySelector<HTMLAnchorElement>('.breadcrumb a[href*="/course/view.php?id="]')
    ?? document.querySelector<HTMLAnchorElement>('a[href*="/course/view.php?id="]');
  return link ? new URL(link.href).searchParams.get('id') : null;
};
