import { describe, expect, it } from 'vitest';
import { readCompletion } from '@/lib/automation/state';

const render = (html: string) => {
  document.body.innerHTML = html;
  return document.body.firstElementChild;
};

const requirements = (items: string[]) => `
  <li class="activity" data-for="cmitem" data-id="123">
    <div data-region="completion-info">
      <div data-region="completionrequirements">
        ${items.map((item) => `<div role="listitem">${item}</div>`).join('')}
      </div>
    </div>
  </li>`;

const manual = (type: string) => `
  <li class="activity" data-for="cmitem" data-id="124">
    <div data-region="completion-info">
      <button data-action="toggle-manual-completion" data-toggletype="${type}">Mark as done</button>
    </div>
  </li>`;

describe('readCompletion', () => {
  it('coi "Done:" và "Đã xong:" là đã hoàn thành', () => {
    const node = render(requirements(['Done: View', 'Đã xong: Nhận điểm']));
    expect(readCompletion(node)).toMatchObject({ pending: false, todo: [] });
  });

  it('coi "To do:" và "Failed:" là còn phải làm', () => {
    const node = render(requirements(['Done: View', 'To do: Complete the activity', 'Failed: Receive a grade']));
    const completion = readCompletion(node);
    expect(completion?.pending).toBe(true);
    expect(completion?.todo).toEqual(['To do: Complete the activity', 'Failed: Receive a grade']);
  });

  it('nhận ra nút đánh dấu hoàn thành thủ công', () => {
    const node = render(manual('manual:mark-done'));
    expect(readCompletion(node)?.manual).toBeInstanceOf(HTMLElement);
  });

  it('nút "Undo" nghĩa là đã hoàn thành', () => {
    const node = render(manual('manual:undo'));
    expect(readCompletion(node)).toMatchObject({ pending: false });
  });

  it('trả về null khi hoạt động không theo dõi hoàn thành', () => {
    const node = render('<li class="activity" data-for="cmitem" data-id="125"><a class="aalink" href="#">Tài liệu</a></li>');
    expect(readCompletion(node)).toBeNull();
  });
});
