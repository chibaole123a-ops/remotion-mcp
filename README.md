# 🎬 Remotion Cloud MCP Studio (v7.4.0)
### Máy Chủ MCP Điều Phối Video AI 100% Cloud-Native: Cloudflare Workers + GitHub Actions (16GB RAM)

> **Kiến trúc Vận hành:** Toàn bộ hệ thống chạy 100% trên Điện toán Đám mây (Cloud Serverless & Cloud CI/CD Runner). Tích hợp **Edge-TTS + MMS-300M CTC Forced Alignment**, thư viện **5-layer Studio Audio (-14 LUFS Two-Pass Loudnorm)**, **Media Cache Preview→Render**, kiểm duyệt **Spoken-vs-Shown + Safe-Zone 9:16/16:9**, và kết xuất **Remotion v4.0.542** (Three.js 3D, Skia, Rough Notation, Google Fonts, Transitions).

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
  │  • Kiểm định cú pháp Remotion TSX pre-flight                │
  │  • Proxy phát trực tiếp video (.mp4) hỗ trợ HTTP Range      │
  │  • Cung cấp giao diện /watch xem tiến độ & /gallery kho lưu  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                   (GitHub REST API: workflow_dispatch)
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │           2. ĐỘNG CƠ KẾT XUẤT: GITHUB ACTIONS CLOUD         │
  │                  (.github/workflows/render.yml)             │
  │  • Máy chủ Ubuntu Cloud 16GB RAM (Runner tiêu chuẩn)        │
  │  • Pre-fetch toàn bộ ảnh/video tư liệu vào SSD Cloud        │
  │  • Remotion Renderer 4.0.542 + WebGL2 Chromium Headless     │
  │  • Chế độ Still (1 frame) hoặc Render Video full 60fps      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                     (Tự động upload kết quả)
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │         3. LƯU TRỮ & TRUYỀN PHÁT: GITHUB RELEASES CDN       │
  │                    (tag: videos-store)                      │
  │  • Lưu trữ MP4/PNG vĩnh viễn, băng thông không giới hạn     │
  │  • Cung cấp link tải trực tiếp & link xem trực tuyến /watch  │
  │  • Lưu log lỗi tự động để AI tự chẩn đoán & tự sửa lỗi      │
  └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Danh Sách MCP Tools Tích Hợp (v7.4.0)

| Tên Tool | Chức Năng |
| :--- | :--- |
| `plan_storyboard_timeline` | Khóa timeline theo lời đọc, sinh `audioConfigPayload`, `recommendedPreviewFrames` (tối đa 6 mốc gồm Cold Open, giữa các cảnh, Outro Tail) và kế hoạch chia chương dài `adaptiveChapterPlan`. |
| `search_visual_media` | Tìm ảnh/video thực tế theo batch (`queries`) từ Wikimedia Commons, NASA, Wikipedia, Openverse, Internet Archive, Pexels/Pixabay và đính kèm ảnh Vision cho AI kiểm tra trực tiếp. |
| `search_soundtrack` / `search_sfx` | Tìm nhạc nền MP3 sạch bản quyền (`search_soundtrack`) và hiệu ứng `@remotion/sfx` + ambience thực địa Internet Archive (`search_sfx`). |
| `verify_external_asset` | Kiểm tra an toàn SSRF, loại bỏ domain stock dính watermark và kiểm tra MIME/Vision cho URL media bên ngoài. |
| `evaluate_video_quality` | Kiểm định nhanh TSX theo 3 tầng quy chuẩn (Hard Guardrails + `DIRECTOR_NOTE`s + `VISION_FRAME_CRITERIA`). |
| `preview_frames` | Chạy kiểm duyệt tĩnh tự động, cache media trước, lưu snapshot và kết xuất Contact Sheet (1–6 khung hình) kèm phụ đề CTC giả lập để kiểm tra trước khi render. |
| `render_video` | Kết xuất MP4 trên GitHub Actions 16GB RAM (hỗ trợ `fromPreviewJobId` tái sử dụng snapshot không cần gửi lại TSX), mastering `-14 LUFS`, lưu `project-*.json` và đo QC (`qc-*.json` + `final-sheet-*.jpg`). |
| `stitch_video_chapters` | Ghép 2–25 chương video dài kèm `masterBgmUrl` + FFmpeg `sidechaincompress` ducking xuyên suốt và mastering `-14 LUFS`. |
| `get_task_status` / `inspect_task_logs` | Theo dõi tiến độ Cloud, nhận link `/watch`, `/still`, `qcTelemetry`, ảnh Contact Sheet đầu/cuối và log lỗi chi tiết. |
| `list_system_assets` / `get_project_source` | Liệt kê kho video đã render trong `videos-store` hoặc nạp lại mã nguồn TSX/audioConfig của job cũ để chỉnh sửa từng phần. |

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
```

### 2. Triển khai lên Cloudflare Edge
```bash
npm run deploy
```
Sau khi hoàn tất, Worker sẽ trả về URL endpoint công khai, ví dụ:
```
https://remotion-mcp.<your-subdomain>.workers.dev/mcp/<MCP_SECRET>
```

### 3. Hoặc chạy máy chủ Local / Cloudflare Tunnel
```bash
# Khởi động server kèm tunnel HTTPS tự động
npm run tunnel
```

---

## 🌐 Các Trang Web Giao Diện Được Cung Cấp Tự Động

*   `/` : Báo cáo trạng thái trực tuyến 24/7 của máy chủ MCP.
*   `/mcp` hoặc `/mcp/:secret` : Cổng kết nối Model Context Protocol cho AI.
*   `/watch/:jobId` : Trang xem video thông minh (tự động theo dõi tiến độ GitHub Actions và tự động phát khi xong).
*   `/still/:jobId.png` : Endpoint phát trực tiếp ảnh chụp tĩnh một frame.
*   `/video/:jobId.mp4` : Máy chủ proxy streaming hỗ trợ HTTP Range (tua video mượt mà).
*   `/gallery` : Kho lưu trữ toàn bộ các video đã kết xuất từ trước đến nay.
