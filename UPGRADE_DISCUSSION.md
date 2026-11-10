# 🎬 BẢN THIẾT KẾ CHỐT NÂNG CẤP HỆ THỐNG (FINAL UPGRADE SPECIFICATION v5.5)

> **Trạng thái:** ✅ ĐÃ TRIỂN KHAI & ĐỐI CHIẾU HOÀN TẤT 100% (v5.5.0)  
> **Mục tiêu Tối thượng:**  
> 1. **Tự do Sáng tạo 100% (Zero Templates / Zero Rigid Matrices):** Không đóng khung Gemini vào bất kỳ mẫu slide hay template cố định nào. Khai mở toàn bộ sức mạnh của 26+ gói `@remotion/*`, Three.js 3D, SVG Path, Audio Spectrum, D3, Lucide Icons, và **Tư liệu Ảnh/Video Thực tế (Mixed-Media Documentary)**.  
> 2. **Kiến Trúc Storyboard Đạo Diễn Toàn Diện (`plan_video_storyboard` & `<StoryboardCanvas>`):** Chấm dứt hoàn toàn hiện tượng cắt cảnh rời rạc như slide PowerPoint bằng cách trang bị bộ lập kế hoạch Storyboard tổng thể, tự động kết nối Cầu nối Thị giác (`continuityFromPrevScene`) giữa các cảnh và bao bọc toàn bộ video trong một Không gian Camera Dịch chuyển Liên tục (`<StoryboardCanvas>`).  
> 3. **Tìm kiếm Đa nguồn Mở & "Đôi Mắt Kiểm Duyệt Trực Tiếp" (Multimodal Vision Media Search):** Công cụ `search_visual_media` quét đồng thời 45+ kho dữ liệu mở toàn cầu (Openverse, Wikimedia Commons, Wikipedia REST, Internet Archive `.mp4` Videos) và **trả về trực tiếp Hình ảnh thật + Khung hình Video thật (`type: "image"` Base64)** ngay trong luồng MCP để Gemini **nhìn tận mắt bằng Vision**, chấm điểm độ khớp với kịch bản và căn chỉnh bố cục trước khi viết code!  
> 4. **Đồng bộ Tuyệt đối 3 Tầng (Macro-Sync + Micro-Sync + Flow-Sync):** Giọng đọc nói tới đâu — Hình ảnh minh họa, Ảnh/Video thực tế, Nhịp chuyển cảnh và Phụ đề Karaoke khớp chính xác tới từng mili-giây mà không bao giờ bị trôi lệch (Zero-Drift).  
> 5. **Giọng đọc Thuần khiết 100% & Chống Giật Lag 60fps:** Loại bỏ hoàn toàn âm thanh nền tự tạo (`bgm.mp3` tĩnh lặng tuyệt đối), tải trước toàn bộ Ảnh & Video `.mp4` về ổ cứng SSD của Cloud (`prepare-render.mjs`) trước khi kết xuất.

---

## I. KIẾN TRÚC STORYBOARD ĐẠO DIỄN 3 TẦNG (DIRECTOR STORYBOARD FRAMEWORK)

### 1. Tầng 1 — Công Cụ Lập & Kiểm Định Storyboard Đạo Diễn (`plan_video_storyboard`)
Trước khi bắt tay vào viết `DynamicVideo.tsx`, Gemini gọi `plan_video_storyboard` truyền vào kế hoạch các cảnh (`scenesPlan`):
- `narration`: Đoạn lời bình liền mạch (2–3 câu hoàn chỉnh).
- `visualConcept`: Ý tưởng thị giác sáng tạo cho cảnh đó.
- `continuityFromPrevScene`: Cầu nối thị giác mượt mà từ cảnh trước sang cảnh này (Match Cut, Camera Zoom, Shared Element).
- `selectedMediaUrl`: Link ảnh hoặc video `.mp4` thực tế đã được Gemini nhìn duyệt qua `search_visual_media`.

**Công cụ tự động trả về:**
- Bảng phân cảnh hoàn chỉnh với từng **Visual Beat (Nhịp 1 -> Nhịp 2 -> Nhịp 3)** gắn chặt với từ khóa thực tế trong câu (`anchorKeyword`).
- Khung sườn code mẫu (`masterCodeSkeletonHint`) kết nối `<StoryboardCanvas>` + `<ChapterProgressSpine>` + `<SyncedScene>`.

### 2. Tầng 2 — Không Gian Dịch Chuyển Camera Xuyên Suốt (`<StoryboardCanvas>` & `<ChapterProgressSpine>`)
Trong `src/remotion/audio-sync.tsx`:
- **`<StoryboardCanvas ambientColor="#38bdf8">`**: Tạo một không gian vũ trụ/chiều sâu chung bao bọc toàn bộ video. Khi chuyển cảnh từ 0 sang 1, 2, 3..., máy quay tự động trôi nhẹ (Camera Glide & Parallax Drift) khiến người xem cảm nhận các cảnh diễn ra trên cùng một thế giới thống nhất chứ không phải từng slide tách biệt.
- **`<ChapterProgressSpine />`**: Thanh chỉ báo tiến độ chương mục phong cách phim tài liệu *Vox / Johnny Harris* giúp mắt người xem luôn có điểm neo thị giác.

### 3. Tầng 3 — Tải Trước Cả Ảnh Lẫn Video `.mp4` Trên SSD Local (`scripts/prepare-render.mjs`)
- Quét và tải trước toàn bộ file ảnh (`cached-img-X.jpg`) và file video `.mp4` thực tế (`cached-vid-X.mp4`) về ổ SSD của máy chủ GitHub Actions trước khi render, giúp `<OffthreadVideo>` và `<Img>` chạy cực nhanh và mượt 60fps.

---

## II. THỨ TỰ 5 BƯỚC CHUẨN ĐẠO DIỄN STORYBOARD (WORKFLOW)

1. **Bước 1 — Viết Kịch Bản Liền Mạch (Audio Spine Before Code)**:
   - Viết `narrationSegments` gồm 5–8 phân đoạn, mỗi đoạn 2–3 câu hoàn chỉnh (30–55 từ) có câu dẫn nối ý tự nhiên.
2. **Bước 2 — Đo Nhịp & Lấy Từ Khóa (`analyze_narration_timeline`)**:
   - Trích xuất bảng thời lượng và các từ khóa có thật trong từng câu.
3. **Bước 3 — Tìm & Tận Mắt Nhìn Duyệt Ảnh/Video Thực Tế (`search_visual_media`)**:
   - Quét 45+ kho mở toàn cầu, nhìn trực tiếp ảnh & khung hình video thật (`type: "image"` Base64) để chọn tư liệu chuẩn nhất.
4. **Bước 4 — Lập Bảng Storyboard Đạo Diễn (`plan_video_storyboard`)**:
   - Khóa chặt mối liên kết giữa Lời thoại + Từ khóa + Tư liệu thực tế + Cầu nối chuyển cảnh liền mạch giữa các cảnh.
5. **Bước 5 — Dựng `DynamicVideo.tsx` & Gửi Render (`render_remotion_video`)**:
   - Bao bọc trong `<StoryboardCanvas>`, chia từng cảnh bằng `<SyncedScene>`, kích hoạt từng lớp hình ảnh bằng `getWordTrigger(i, "từ_khóa", frame)` và hiển thị `<WordHighlightCaptions />`.

---

## III. BẢNG ĐỐI CHIẾU TRIỂN KHAI (IMPLEMENTATION CHECKLIST v5.5)

- [x] **MCP Tool `plan_video_storyboard`**: Đã tích hợp trên cả `src/cloudflare-worker.ts` và `src/server.ts`.
- [x] **Component `<StoryboardCanvas>` & `<ChapterProgressSpine>`**: Đã triển khai trong `src/remotion/audio-sync.tsx`.
- [x] **MCP Tool `search_visual_media` (Multimodal Vision `type: "image"`)**: Đã hoạt động quét 45+ kho dữ liệu mở toàn cầu.
- [x] **Tiền xử lý tải trước video & ảnh thực tế**: Đã tích hợp trong `scripts/prepare-render.mjs`.
- [x] **Đồng bộ 3 Tầng Zero-Drift & Pure Voiceover**: Khóa chuẩn mili-giây bằng `mutagen.mp3`, `<SyncedScene>` và `getWordTrigger`.
