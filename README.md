# VPBank Auto Learner Free

Tiện ích Chrome/Edge (Manifest V3) tự động học trên [VPBank Academy](https://academy.vpbank.com.vn/learning/):
mở lần lượt các hoạt động chưa hoàn thành của khóa học, hoàn thành bài SCORM, đánh dấu hoàn thành tài liệu và
làm bài kiểm tra trắc nghiệm bằng Google Gemini.

Bản Free chỉ giữ phần lõi: một API key Gemini duy nhất, số lần thử lại cố định (3) và giao diện shadcn/ui.

## Yêu cầu

- Node.js 20 trở lên và npm
- Chrome hoặc Edge 116 trở lên

## Cài đặt và chạy

```bash
npm install        # cài phụ thuộc (tự chạy `wxt prepare`)
npm run dev        # mở trình duyệt kèm tiện ích, tự tải lại khi sửa mã
```

## Đóng gói

```bash
npm run build      # tạo .output/chrome-mv3 (đã gộp + nén, không kèm source map)
npm run zip        # tạo .output/*-chrome.zip để chia sẻ hoặc đăng lên store
```

Bản build chỉ chứa mã đã đóng gói, không có mã nguồn gốc.

## Cài vào trình duyệt

1. `npm run build`
2. Mở `chrome://extensions` (hoặc `edge://extensions`) và bật **Developer mode**.
3. Bấm **Load unpacked** rồi chọn thư mục `.output/chrome-mv3`.

## Sử dụng

1. Mở khóa học trên VPBank Academy (trang `/learning/course/view.php?id=...`).
2. Mở popup của tiện ích.
3. (Tùy chọn) Dán **Gemini API key** từ [Google AI Studio](https://aistudio.google.com/apikey), bấm **Lưu** và
   **Kiểm tra**. Không có key thì các bài kiểm tra sẽ bị bỏ qua, phần còn lại vẫn chạy.
4. Bật **Tự động học**. Tab khóa học tải lại và tiện ích bắt đầu chạy.

Tiện ích tự tắt khi khóa học hoàn thành hoặc khi không còn hoạt động nào tự làm được; popup hiển thị danh sách
những mục cần làm thủ công (ví dụ khảo sát/feedback).

## Kiểm thử

```bash
npm run typecheck  # tsc --noEmit
npm run test       # vitest
```

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `entrypoints/background.ts` | Service worker: tiêm mã hoàn thành SCORM vào MAIN world, gọi Gemini |
| `entrypoints/academy.content/` | Content script: định tuyến theo trang Moodle và hiện thông báo |
| `entrypoints/popup/` | Popup React + shadcn/ui |
| `lib/automation/` | Máy trạng thái tự động học (trang khóa học là bộ lập lịch duy nhất) |
| `lib/scorm-complete.ts` | Hoàn thành SCORM 1.2 / 2004 trong trang player |
| `lib/gemini.ts` | Gọi Gemini với structured output và kiểm tra kết quả bằng zod |
