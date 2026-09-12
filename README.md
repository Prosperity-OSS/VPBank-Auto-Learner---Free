# VPBank Auto Learner Free

Tiện ích Chrome/Edge (Manifest V3) tự động học trên [VPBank Academy](https://academy.vpbank.com.vn/learning/):
mở lần lượt các hoạt động chưa hoàn thành của khóa học, hoàn thành bài SCORM, đánh dấu hoàn thành tài liệu và
làm bài kiểm tra trắc nghiệm bằng Google Gemini.

## Tải xuống
- Download phiên bản mới nhất (zip) tại [Release](https://github.com/makecolour/VPBank-Auto-Learner---Free/releases/latest)
- Tới bước [Cài vào trình duyệt](#cài-vào-trình-duyệt)

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

1. Mở `chrome://extensions` (hoặc `edge://extensions`) và bật **Developer mode**.
2. Bấm **Load unpacked** rồi chọn thư mục `.output/chrome-mv3`.

## Sử dụng

1. Mở khóa học trên VPBank Academy (trang `/learning/course/view.php?id=...`).
2. Mở popup của tiện ích.
3. (Tùy chọn) Dán **Gemini API key** từ [Google AI Studio](https://aistudio.google.com/apikey), bấm **Lưu** và
   **Kiểm tra**. Không có key thì các bài kiểm tra sẽ bị bỏ qua, phần còn lại vẫn chạy.
4. (Tùy chọn) Chọn **Model**. Bấm nút làm mới để tải danh sách model mà chính API key của bạn dùng được
   (chỉ những model Gemini còn hỗ trợ `generateContent`), gõ để tìm, hoặc tự nhập tên model chưa có trong
   danh sách. Mặc định là `gemini-2.5-flash`.
5. Bật **Tự động học**. Tab khóa học tải lại và tiện ích bắt đầu chạy.

Tiện ích tự tắt khi khóa học hoàn thành hoặc khi không còn hoạt động nào tự làm được; popup hiển thị danh sách
những mục cần làm thủ công (ví dụ khảo sát/feedback).

## Đóng gói phát hành

Hai kiểu phát hành, khác nhau đúng hai trường trong manifest:

```bash
npm run zip        # tự phát hành   -> .output/*-chrome.zip
npm run zip:edge   # Edge Add-ons   -> .output/*-edge.zip
npm run zip:store  # Chrome Web Store -> .output/*-chrome-store.zip
```

| | Tự phát hành | Nộp cửa hàng |
| --- | --- | --- |
| Tên | VPBank Auto Learner Free | **VPA Auto Learner** |
| Logo | `public/icon/` | `public/icon-store/` |
| `update_url` + `key` | có | **không** |

Bản nộp cửa hàng **không được** có `update_url`: cửa hàng tự lo cập nhật và sẽ
từ chối manifest trỏ sang máy chủ khác. `key` cũng bị bỏ vì cửa hàng tự cấp ID.
Tên và logo cũng đổi sang trung tính — lấy nhãn hiệu của bên khác làm tên sản
phẩm là lý do bị từ chối rất thường gặp.

Nhận biết bản cửa hàng qua **target trình duyệt** (`STORE_TARGETS` trong
`wxt.config.ts`), không qua `--mode`: mode khác `production` khiến Vite build ra
bản dev, nhúng cả đường dẫn tuyệt đối của máy build vào bundle.

Hệ quả: bản trên cửa hàng và bản tự phát hành là **hai tiện ích khác nhau, ID
khác nhau**. Bản tự phát hành vẫn tự cập nhật qua update server riêng; bản trên
cửa hàng cập nhật qua cửa hàng.

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
| `lib/gemini.ts` | Gọi Gemini với structured output, kiểm tra kết quả bằng zod, và liệt kê model dùng được |
