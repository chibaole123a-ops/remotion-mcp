# 🎬 Remotion Cloud MCP Studio (v5.5.0)
### Máy Chủ MCP Điều Phối Video AI 100% Cloud-Native: Cloudflare Workers + GitHub Actions (16GB RAM)

> **Kiến trúc Vận hành:** Toàn bộ hệ thống chạy 100% trên Điện toán Đám mây (Cloud Serverless & Cloud CI/CD Runner). **Hoàn toàn KHÔNG cần máy tính cục bộ (local PC)** hay máy chủ VPS vật lý.

---

## 🏛️ Sơ Đồ Kiến Trúc Hệ Thống (Cloud-Only Architecture)

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 AI CLIENT (Gemini Web / Pro / Claude)       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                 (JSON-RPC 2.0 / MCP Protocol)
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │         1. ĐIỀU PHỐI VIÊN MCP: CLOUDFLARE WORKERS           │
  │                   (src/cloudflare-worker.ts)                │
  │  • Trực tuyến 24/7 toàn cầu, phản hồi tức thì 0ms cold-start │
  │  • Bóc tách âm thanh, tính toán frame nhịp điệu tiếng Việt  │
  │  • Tìm kiếm tư liệu ảnh/video (Wikimedia, Openverse, Pexels)│
  │  • Gửi ảnh Base64 cho Vision AI nhìn trực tiếp              │
  │  • Lập Master Storyboard, kiểm định & đóng gói mã Remotion  │
  │  • Proxy phát trực tiếp video (.mp4) hỗ trợ HTTP Range      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                   (GitHub REST API: workflow_dispatch)
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │           2. ĐỘNG CƠ KẾT XUẤT: GITHUB ACTIONS CLOUD         │
  │                  (.github/workflows/render.yml)             │
  │  • Máy chủ Ubuntu Cloud 16GB RAM (Runner tiêu chuẩn)        │
  │  • Thu âm giọng đọc Edge-TTS tiếng Việt (NamMinh / HoaiMy)  │
  │  • Đo đạc chính xác mili-giây từng từ với Python `mutagen`  │
  │  • Tải trước 100% ảnh/video tư liệu vào SSD Cloud           │
  │  • Remotion Renderer 4.0.541 + WebGL2 Chromium Headless     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                     (Tự động upload kết quả)
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │         3. LƯU TRỮ & TRUYỀN PHÁT: GITHUB RELEASES CDN       │
  │                    (tag: videos-store)                      │
  │  • Lưu trữ MP4 vĩnh viễn, băng thông không giới hạn         │
  │  • Cung cấp link tải trực tiếp & link xem trực tuyến /watch  │
  │  • Lưu log lỗi tự động để AI tự chẩn đoán & tự sửa lỗi      │
  └─────────────────────────────────────────────────────────────┘
```

---

## ⚡ 5 Bước Sáng Tạo Video Chuẩn Đạo Diễn (Storyboard Workflow)

1. **Bước 1 — Soạn Kịch Bản Kể Chuyện (Cohesive Storytelling):**
   Viết `narrationSegments` gồm 5–8 đoạn, mỗi đoạn 2–3 câu hoàn chỉnh (30–55 từ) có liên kết nội dung tự nhiên.
2. **Bước 2 — Phân Tích Nhịp Âm Thanh (`analyze_narration_timeline`):**
   Xác định khung thời gian chính xác từng từ và trích xuất từ khóa neo (`anchorKeyword`).
3. **Bước 3 — Tìm Kiếm & Nhìn Duyệt Đa Thể Thức (`search_visual_media`):**
   Quét 45+ kho mở và nhận trực tiếp ảnh Base64 (`type: "image"`) vào cửa sổ chat để Vision AI "nhìn tận mắt" trước khi duyệt.
4. **Bước 4 — Lập Bản Vẽ Đạo Diễn (`plan_video_storyboard`):**
   Khóa liên kết Cảnh - Từ khóa - Cầu nối chuyển cảnh, sinh khung code `<StoryboardCanvas>` + `<ChapterProgressSpine>` + `<SyncedScene>`.
5. **Bước 5 — Gửi Render Lên Cloud (`render_remotion_video`):**
   Kích hoạt GitHub Actions 16GB RAM kết xuất video 1080p 60fps hoàn chỉnh.

---

## 🚀 Hướng Dẫn Triển Khai (Deployment)

### 1. Cấu hình Cloudflare Worker
Tất cả các biến bảo mật đều được thiết lập trực tiếp trên Cloudflare:

```bash
# Đăng nhập vào Cloudflare (chỉ cần làm 1 lần)
npx wrangler login

# Đặt token GitHub (có quyền repo & workflow)
npx wrangler secret put GITHUB_TOKEN

# Đặt mật khẩu khóa bảo vệ endpoint MCP (tùy chọn)
npx wrangler secret put MCP_SECRET

# Đặt API Key của Pexels để tìm video HD (tùy chọn)
npx wrangler secret put PEXELS_API_KEY
```

### 2. Triển khai lên Cloudflare Edge
```bash
npm run deploy
```
Sau khi hoàn tất, Worker sẽ trả về URL endpoint công khai, ví dụ:
```
https://remotion-mcp.<your-subdomain>.workers.dev/mcp/<MCP_SECRET>
```

---

## 🛠️ Danh Sách MCP Tools Tích Hợp

| Tên Tool | Chức Năng |
| :--- | :--- |
| `get_remotion_ecosystem_guide` | Hướng dẫn toàn diện 26+ thư viện `@remotion/*`, Three.js 3D, SVG, Audio Spectrum. |
| `analyze_narration_timeline` | Phân tích dòng thời gian giọng đọc tiếng Việt theo từng từ trước khi viết code. |
| `search_visual_media` | Tìm kiếm ảnh & video B-roll thực tế, trả về ảnh Base64 cho Vision AI nhìn trực tiếp. |
| `plan_video_storyboard` | Lập storyboard tổng thể, liên kết visual bridge và tạo code skeleton đạo diễn. |
| `render_remotion_video` | Dispatch job render video Remotion chất lượng cao sang GitHub Actions 16GB RAM. |
| `render_batch_videos` | Điều phối render tối đa 20 video song song trên Cloud. |
| `check_render_status` | Theo dõi tiến độ thời gian thực, đọc log từng bước và trích xuất lỗi stack trace. |
| `list_rendered_videos` | Danh sách toàn bộ video đã render lưu trữ trong kho Cloud kèm link phát. |

---

## 🌐 Các Trang Web Giao Diện Được Cung Cấp Tự Động

*   `/` : Báo cáo trạng thái trực tuyến 24/7 của máy chủ Cloudflare Worker.
*   `/mcp` hoặc `/mcp/:secret` : Cổng kết nối Model Context Protocol cho AI.
*   `/watch/:jobId` : Trang xem video thông minh (tự động theo dõi tiến độ GitHub Actions và tự động phát khi xong).
*   `/video/:jobId.mp4` : Máy chủ proxy streaming hỗ trợ HTTP Range (tua mượt mà).
*   `/gallery` : Kho lưu trữ toàn bộ các video đã kết xuất từ trước đến nay.
