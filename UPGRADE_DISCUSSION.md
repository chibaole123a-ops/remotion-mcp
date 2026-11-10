# 🎬 BẢN THIẾT KẾ CHỐT NÂNG CẤP HỆ THỐNG (FINAL UPGRADE SPECIFICATION v5.4)

> **Trạng thái:** ✅ ĐÃ TRIỂN KHAI & ĐỐI CHIẾU HOÀN TẤT 100% (v5.4.0)  
> **Mục tiêu Tối thượng:**  
> 1. **Tự do Sáng tạo 100% (Zero Templates / Zero Rigid Matrices):** Không đóng khung Gemini vào bất kỳ mẫu slide hay template cố định nào. Khai mở toàn bộ sức mạnh của 26+ gói `@remotion/*`, Three.js 3D, SVG Path, Audio Spectrum, D3, Lucide Icons, và **Tư liệu Ảnh/Video Thực tế (Mixed-Media Documentary)**.  
> 2. **Tìm kiếm Đa nguồn Mở & "Đôi Mắt Kiểm Duyệt Trực Tiếp" (Multimodal Vision Media Search):** Cung cấp công cụ `search_visual_media` quét đồng thời 45+ kho dữ liệu mở toàn cầu (Openverse, Wikimedia Commons, Wikipedia REST, Internet Archive `.mp4` Videos...) và **trả về trực tiếp Hình ảnh thật + Khung hình Video thật (`type: "image"` Base64)** ngay trong luồng MCP để Gemini **nhìn tận mắt bằng Vision**, chấm điểm độ khớp với kịch bản và căn chỉnh bố cục trước khi viết code!  
> 3. **Đồng bộ Tuyệt đối 3 Tầng (Macro-Sync + Micro-Sync + Flow-Sync):** Giọng đọc nói tới đâu — Hình ảnh minh họa, Ảnh/Video thực tế, Nhịp chuyển cảnh và Phụ đề Karaoke khớp chính xác tới từng mili-giây mà không bao giờ bị trôi lệch (Zero-Drift).  
> 4. **Giọng đọc Thuần khiết 100% & Chống Giật Lag 60fps:** Loại bỏ hoàn toàn âm thanh nền tự tạo (`bgm.mp3` tĩnh lặng tuyệt đối), tải trước toàn bộ Ảnh & Video `.mp4` về ổ cứng SSD của Cloud (`prepare-render.mjs`) trước khi kết xuất.

---

## I. KIẾN TRÚC TÌM KIẾM ĐA NGUỒN & KIỂM DUYỆT TRỰC TIẾP BẰNG ĐÔI MẮT GEMINI (`search_visual_media`)

### 1. Tìm Kiếm Mở Đa Nguồn Theo Ngữ Cảnh Từng Câu Kịch Bản (Federated Multi-Source Search)
Khi Gemini gọi `search_visual_media({ sceneQueries })`, mỗi truy vấn gắn trực tiếp với `sceneIndex`, `spokenSentence` (câu đang nói trong kịch bản), và `searchQuery` (từ khóa tìm kiếm). Hệ thống truy vấn song song qua các nguồn mở lớn nhất thế giới (không phụ thuộc vào 1 nguồn cố định):
- **Openverse API (WordPress/CreativeCommons Federated Index):** Quét hơn 800 triệu hình ảnh thực tế từ 45+ nguồn toàn cầu (NASA, Smithsonian, Flickr, Europeana, Rawpixel, Bảo tàng Quốc gia...).
- **Wikimedia Commons API & Wikipedia REST Media:** Kho ảnh tư liệu lịch sử, khoa học, công nghệ, bản đồ, chân dung và video thực tế (`.webm` / `.mp4`).
- **Internet Archive (`archive.org` Advanced Search & Metadata API):** Kho lưu trữ hàng triệu **video quay thực tế (`.mp4`)**, phim tài liệu lịch sử, khoa học, vũ trụ kèm khung hình trích xuất thực tế.
- *(Hỗ trợ tự động cả kho B-Roll Điện ảnh Pexels HD/4K nếu có `PEXELS_API_KEY` trong môi trường).*

### 2. Kiểm Tra Link Sống (`200 OK`) & Trả Về Hình Ảnh Thực Tế Qua Giao Thức Multimodal MCP (`type: "image"`)
- Thay vì chỉ trả về đường link chữ (text) khiến Gemini phải "đoán mò" xem bức ảnh hay đoạn video trông như thế nào, Cloudflare Worker tự động:
  1. Tải trực tiếp bản xem trước (Preview Image của bức ảnh, hoặc **Video Keyframe Still / Khung hình trích xuất thật của đoạn video `.mp4`**).
  2. Kiểm tra `HTTP 200 OK`, xác thực đúng định dạng `image/*` và dung lượng hợp lệ.
  3. Mã hóa sang Base64 và trả về trong mảng `content` của MCP dưới dạng khối **`{ type: "image", data: "<base64>", mimeType: "image/jpeg" }`** đi kèm khối **`{ type: "text" }`** chứa URL gốc độ phân giải cao (`1280px–1920px` hoặc `.mp4`), kích thước, tiêu đề và câu thoại cần minh họa.
- **Cách Gemini sử dụng "Đôi Mắt" (Multimodal Vision):**
  - Gemini **nhìn thấy trực tiếp bức ảnh và khung hình video thật** ngay trong cửa sổ suy luận.
  - Tự loại bỏ các ảnh không đúng ý câu thoại, ảnh chứa chữ rác/biểu đồ rối, hoặc ảnh mờ.
  - Quan sát vị trí vật thể chính (bên trái, bên phải hay ở giữa) và tông màu sáng/tối của bức ảnh thật để đặt khung chữ chú thích, đường vẽ SVG (`evolvePath`) và hiệu ứng Ken Burns Zoom không bao giờ đè lên chủ thể quan trọng!

### 3. Tải Trước Cả Ảnh Lẫn Video Thực Tế (`.mp4`/`.webm`) Về Ổ Cứng SSD Trên Cloud (`scripts/prepare-render.mjs`)
- Trước khi `npx remotion render` chạy, `scripts/prepare-render.mjs` quét toàn bộ `DynamicVideo.tsx`:
  - Tự động tải trước mọi URL ảnh bên ngoài về `public/cached-img-${k}.jpg` và viết lại thành `staticFile('cached-img-${k}.jpg')`.
  - **MỚI:** Tự động tải trước mọi URL video thực tế (`.mp4`, `.webm`, `.mov`) về `public/cached-vid-${k}.mp4` và viết lại thành `staticFile('cached-vid-${k}.mp4')` (nếu link video ngoài bị lỗi mạng đột xuất, tự động chuyển đổi an toàn để không bao giờ làm gãy bản dựng).

---

## II. KIẾN TRÚC ĐỒNG BỘ 3 TẦNG CHUẨN EDITOR CHUYÊN NGHIỆP (3-LAYER ZERO-DRIFT SYNC)

1. **Tầng 1 — Macro-Sync (Khớp Thời Lượng Thực Tế):**
   - Đo độ dài thực tế đến từng mili-giây của mỗi file `public/voice-${i}.mp3` bằng **`mutagen.mp3`** + `WordBoundary` trong `scripts/generate-studio-audio.mjs`.
2. **Tầng 2 — Flow-Sync (`<SyncedScene sceneIndex={i}>`):**
   - Khóa cứng điểm bắt đầu (`getSegmentStartFrame(i)`) và độ dài (`getSceneFrames(i)`) theo đúng file âm thanh thật, đồng thời tạo hiệu ứng chuyển giao mượt mà (Smooth Crossfade + Camera Glide) ở đầu và cuối cảnh mà không làm trôi lệch thời gian.
3. **Tầng 3 — Micro-Sync (`getWordTrigger` & `analyze_narration_timeline`):**
   - `analyze_narration_timeline` trích xuất sẵn các từ khóa có thật trong từng câu nói (`suggestedVisualBeats`).
   - `getWordTrigger(sceneIndex, keyword, frame)` kích hoạt hiệu ứng hình ảnh, nhãn chú thích hoặc phóng to bức ảnh/video thực tế **đúng vào mili-giây giọng đọc phát âm từ khóa đó**.

---

## III. THỨ TỰ 8 BƯỚC TẠO VIDEO CHUẨN EDITOR CHUYÊN NGHIỆP (BEFORE & AFTER WORKFLOW)

### Giai đoạn A — Trên Gemini (Lên Kịch bản -> Đo Nhịp -> Xem & Chọn Media Thật -> Dựng Cảnh)
1. **Bước 1 — Đọc Hồ sơ Kỹ thuật (`get_remotion_ecosystem_guide`)**.
2. **Bước 2 — Viết Kịch bản Tự sự Liền mạch Trước (Narration First)**:
   - Mỗi đoạn `narrationSegments[i]` dài 2–3 câu hoàn chỉnh (30–55 từ) có câu cầu nối chuyển ý tự nhiên.
3. **Bước 3 — Chạy `analyze_narration_timeline` Để Lấy Bảng Từ Khóa Có Thật (`suggestedVisualBeats`)**.
4. **Bước 4 — Chạy `search_visual_media` Để Tìm & Tận Mắt Nhìn Duyệt Ảnh/Video Thực Tế (Multimodal Vision Inspection)**:
   - Truyền câu thoại và từ khóa tìm kiếm của các cảnh cần tư liệu thực tế.
   - **Nhìn trực tiếp** các bức ảnh và khung hình video trả về trong kết quả MCP (`type: "image"`), chọn đúng URL có hình ảnh khớp nhất với câu thoại và bố cục đẹp nhất.
5. **Bước 5 — Viết Code `DynamicVideo.tsx` Kết Hợp Mixed-Media + Đồng Bộ Từ Khóa & Gửi Render (`render_remotion_video`)**:
   - Bọc mỗi cảnh trong `<SyncedScene sceneIndex={i}>`.
   - Kết hợp Ảnh thực tế (`<Img>`) / Video thực tế (`<OffthreadVideo muted />`) đã nhìn duyệt ở Bước 4 với hiệu ứng Ken Burns Zoom nhẹ + Đồ họa Vector/Chú thích bung ra đúng từ khóa qua `getWordTrigger(i, "từ_khóa", frame)`.

### Giai đoạn B — Trên Đám Mây GitHub Actions (Thu âm thực tế -> Tải trước Ảnh/Video -> Xuất MP4)
6. **Bước 6 — Thu âm `edge-tts` & Đo đạc Mili-giây Từng Từ (`scripts/generate-studio-audio.mjs`)**.
7. **Bước 7 — Tải trước Ảnh & Video Thực Tế về SSD + Kiểm tra Icon (`scripts/prepare-render.mjs`)**.
8. **Bước 8 — Kết xuất H.264 Chất lượng Cao (`npx remotion render --crf=18`)**.

---

## IV. DANH SÁCH ĐỐI CHIẾU TRIỂN KHAI (IMPLEMENTATION CHECKLIST v5.4)

### 1. Công cụ Tìm kiếm Đa nguồn & Hiển thị Trực tiếp Media (`src/cloudflare-worker.ts` & `src/server.ts`)
- [x] Bổ sung MCP Tool mới **`search_visual_media`**:
  - Quét đa nguồn mở: **Openverse API (45+ nguồn toàn cầu)** + **Wikimedia Commons Image & Video API** + **Wikipedia REST API** + **Internet Archive (`.mp4` Video Search)** (+ hỗ trợ `PEXELS_API_KEY` nếu có).
  - Tự động tải ảnh preview / khung hình video thật (`fetch` với kiểm tra `200 OK` và `image/*`), chuyển sang Base64 và trả về trực tiếp qua khối MCP **`{ type: "image", data, mimeType }`** để Gemini nhìn thấy tận mắt bằng Vision.
  - Đặt câu thoại `spokenSentence` ngay cạnh từng bức ảnh để Gemini đối chiếu trực tiếp bằng mắt xem bức ảnh/video có đúng ngữ cảnh kịch bản hay không.

### 2. Tiền xử lý Tải trước Ảnh & Video Thực tế (`scripts/prepare-render.mjs`)
- [x] Tự động tải trước mọi URL ảnh bên ngoài về `public/cached-img-${k}.jpg`.
- [x] Tự động tải trước mọi URL video thực tế (`.mp4`, `.webm`, `.mov`) về `public/cached-vid-${k}.mp4` để `<OffthreadVideo>` chạy trực tiếp từ ổ cứng SSD local với tốc độ tối đa và mượt 60fps.

### 3. Module Đồng bộ 3 Tầng & Kịch bản Đạo diễn (`src/remotion/audio-sync.tsx` & `ECOSYSTEM_DOCS` v5.4)
- [x] `<SyncedScene sceneIndex={i}>`, `getWordTrigger`, `getWordProgress`, `getWordFrame`, `getBeatFrame`, `<ContinuousAudioTrack />`, `<WordHighlightCaptions />`.
- [x] Cập nhật `ECOSYSTEM_DOCS` v5.4 hướng dẫn quy trình 5 bước trên Gemini (Narrative -> Analyze Timeline -> Search & Visually Inspect Real Photos/Videos -> Mixed-Media SyncedScene Code -> Render).
