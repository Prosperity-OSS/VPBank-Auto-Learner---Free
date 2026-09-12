import ReactDOM from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { runAutomation } from '@/lib/automation';
import '@/assets/theme.css';
// Sonner tự chèn CSS vào document.head, mà style của trang không lọt được vào shadow root —
// nên phải nhập thẳng file CSS của nó để WXT gộp vào academy.css (được chèn trong shadow root).
import 'sonner/dist/styles.css';

// Thông báo được vẽ trong shadow root (không bị CSS của Moodle ảnh hưởng) và đặt ở top layer bằng Popover API,
// vì theme của Academy chèn header + huy hiệu tên với z-index tối đa sau khi trang tải xong.
const TOP_LAYER_STYLE = `
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  pointer-events: none;
`;

export default defineContentScript({
  matches: ['https://academy.vpbank.com.vn/learning/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  main(ctx) {
    return createShadowRootUi(ctx, {
      name: 'vpbal-toaster',
      position: 'inline',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        // Luôn dùng nền sáng: Academy chỉ có giao diện sáng, thông báo tối sẽ lạc lõng trên trang.
        root.render(<Toaster position="top-right" theme="light" richColors closeButton expand />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    })
      .then((ui) => {
        ui.mount();
        const host = ui.shadowHost as HTMLElement;
        host.style.cssText = TOP_LAYER_STYLE;
        host.popover = 'manual';
        host.showPopover?.();
      })
      .then(runAutomation);
  },
});
