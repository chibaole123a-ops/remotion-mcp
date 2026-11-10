# 🎬 Remotion Cloud MCP Studio (v6.1.0)
### Máy Chủ MCP Điều Phối Video AI 100% Cloud-Native: Cloudflare Workers + GitHub Actions (16GB RAM)

> **Kiến trúc Vận hành:** Toàn bộ hệ thống chạy 100% trên Điện toán Đám mây (Cloud Serverless & Cloud CI/CD Runner). Hỗ trợ render video Remotion đầy đủ tính năng (Three.js 3D, Rough Notation, Google Fonts, Transitions, Vector Shapes) mà không cần cấu hình phần cứng cục bộ.

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

## 🛠️ Danh Sách MCP Tools Tích Hợp (v6.1.0)

| Tên Tool | Chức Năng |
| :--- | :--- |
| `remotion` | Công cụ kết xuất Remotion Studio hoàn chỉnh (v4.0.542). Hỗ trợ render full video hoặc bắt nhanh 1 frame tĩnh xem trước bằng tham số `frame`. |
| `get_task_status` | Theo dõi tiến độ thời gian thực của job trên GitHub Actions, nhận link xem trực tiếp `/watch` hoặc link ảnh preview `/still`. |
| `inspect_task_logs` | Trích xuất chi tiết lỗi biên dịch, stack trace trên GitHub Actions để AI tự chẩn đoán và tự sửa lỗi (Self-Healing). |
| `list_system_assets` | Liệt kê danh sách video và asset đã render lưu trữ trong kho Cloud Release CDN. |

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
