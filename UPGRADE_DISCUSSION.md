# 🎬 BẢN THIẾT KẾ CHỐT NÂNG CẤP HỆ THỐNG (FINAL UPGRADE SPECIFICATION v5.0)

> **Trạng thái:** ✅ ĐÃ TRIỂN KHAI & ĐỐI CHIẾU HOÀN TẤT 100% (v5.0.0)  
> **Mục tiêu Tối thượng:**  
> 1. **Tự do Sáng tạo 100% (Zero Templates / Zero Rigid Matrices):** Không đóng khung Gemini vào bất kỳ mẫu slide hay template cố định nào. Khai mở toàn bộ sức mạnh của 26+ gói `@remotion/*`, Three.js 3D, SVG Path, Audio Spectrum, D3 và Lucide Icons.  
> 2. **Đồng bộ Tuyệt đối "Nói tới đâu — Hình minh họa & Phụ đề Highlight chính xác tới đó" (Frame-Exact Word-to-Visual & Caption Sync):** Giải quyết tận gốc bài toán lệch nhịp giữa giọng đọc và hình ảnh bằng quy trình **Audio-First WordBoundary Telemetry** chuẩn Editor chuyên nghiệp.

---

## I. KIẾN TRÚC ĐỒNG BỘ "NÓI TỚI ĐÂU — HÌNH TỚI ĐÓ" (WORD-TO-VISUAL & CAPTION SYNC)

Để đạt độ chính xác 100% như một Editor chuyên nghiệp dựng trên Premiere / After Effects, hệ thống vận hành theo **Cơ chế Đồng bộ Kép (Dual-Layer Audio-Visual Lock)**:

### 1. Bước Đo Đạc Trước Khi Dựng Hình — MCP Tool mới: `analyze_narration_timeline`
Trước khi viết code `DynamicVideo.tsx`, Gemini có thể gọi tool `analyze_narration_timeline(narrationSegments, voice, fps)` (hoặc hệ thống tự động tính toán). Tool này trả về ngay lập tức **Bản Đồ Thời Gian Từng Từ & Từng Cảnh (Frame-Exact Cue Map)**:
- Độ dài thực tế của từng phân cảnh: `scenes[i].durationInFrames`, `startFrame`, `endFrame`.
- Vị trí chính xác (bằng `frame` và `ms`) của **từng từ khóa** trong lời thoại:
  ```json
  {
    "sceneIndex": 0,
    "durationInFrames": 240,
    "words": [
      { "word": "Ban", "startFrame": 4, "endFrame": 10, "startMs": 133, "endMs": 333 },
      ...
      { "word": "bùng", "startFrame": 92, "endFrame": 101, "startMs": 3066, "endMs": 3366 },
      { "word": "nổ", "startFrame": 101, "endFrame": 112, "startMs": 3366, "endMs": 3733 }
    ]
  }
  ```
- **Cách Gemini sử dụng:** Khi biết chính xác từ khóa *"bùng nổ"* nằm ở `frame 92`, Gemini đặt hiệu ứng hình ảnh vụ nổ / biểu đồ / chuyển động máy quay + âm thanh SFX (`vineBoom` / `whoosh`) kích hoạt đúng tại `frame 92`!

### 2. Dữ Liệu Thực Tế & Hàm Neo Từ Khóa Thời Gian Thực Tại Lúc Render (`src/remotion/audio-telemetry.ts`)
Khi GitHub Actions chạy `edge_tts` (Python API `Communicate` với `WordBoundary`), hệ thống trích xuất mốc thời gian thực tế của **từng từ đơn lẻ** từ file âm thanh thật (`public/voice-${i}.mp3` đo bằng `ffprobe`) và ghi trực tiếp vào `src/remotion/audio-telemetry.json` kèm module hỗ trợ `src/remotion/audio-sync.ts`:
- **`getSceneFrames(sceneIndex, fallback)`**: Trả về số frame chính xác 100% của cảnh `sceneIndex` theo file `voice-${sceneIndex}.mp3` thực tế (cộng nhịp thở tự nhiên).
- **`getWordFrame(sceneIndex, keywordOrPhrase, fallbackFrame)`**: Tìm từ khóa hoặc cụm từ trong lời thoại của cảnh `sceneIndex` và trả về **chính xác `startFrame` thực tế lúc giọng đọc AI phát âm từ đó**!
  - *Ví dụ:* `const boomFrame = getWordFrame(0, "bùng nổ", 60);` $\rightarrow$ Dù giọng AI đọc nhanh hay chậm, hiệu ứng hình ảnh luôn bung ra **đúng mili-giây miệng AI đọc chữ "bùng nổ"**!
- **`getSceneWordCaptions(sceneIndex)` & `<WordHighlightCaptions sceneIndex={i} />`**:
  - Dữ liệu từng từ (`text`, `startMs`, `endMs`) chuẩn hóa 100% theo gói `@remotion/captions`.
  - Hỗ trợ hiển thị **Phụ đề Karaoke Highlight Từng Từ** (từ nào đang được đọc sẽ sáng màu nổi bật / phóng nhẹ `scale` khớp 100% theo từng mili-giây giọng nói).

---

## II. QUY TRÌNH 6 BƯỚC CHUẨN EDITOR CHUYÊN NGHIỆP (GENERAL PROFESSIONAL SKILL)

Prompt hướng dẫn (`ECOSYSTEM_DOCS`) sẽ trang bị cho Gemini tư duy tổng quát của một Đạo diễn & Editor chuyên nghiệp qua 6 bước:

1. **Bước 1 — Tư duy Ngôn ngữ Điện ảnh theo Chủ đề (Creative Direction)**
   - Tự do phân tích đề tài để chọn phong cách thị giác, bảng màu, nhịp độ và công nghệ phù hợp (3D WebGL, vẽ nét SVG `evolvePath`, sóng nhạc `visualizeAudio`, chiều sâu 2.5D Parallax, hay Kinetic Typography). Không dùng lại template cố định hay kiểu lật slide tĩnh.
2. **Bước 2 — Kịch bản Phân cảnh & Xác định Điểm nhấn Thị giác (Script & Visual Cue Mapping)**
   - Viết `narrationSegments` giàu hình tượng, xác định rõ trong mỗi câu nói có những **từ khóa/con số/hành động** nào cần hình ảnh minh họa biến đổi tương ứng.
3. **Bước 3 — Đo đạc & Khóa cứng Timeline theo Giọng đọc (`analyze_narration_timeline` & `audio-sync`)**
   - Lấy thời lượng từng cảnh (`durationInFrames`) và mốc frame của các từ khóa quan trọng (`getWordFrame` / `getSceneFrames`) để khóa chặt khung thời gian âm thanh và hình ảnh.
4. **Bước 4 — Biên đạo Hình ảnh & Chuyển động Khớp Từng Ý Nói (Visual Choreography)**
   - Khi giọng đọc nói đến ý A (frame `0 -> cue1`) $\rightarrow$ camera và đồ họa diễn hoạt ý A.
   - Đúng frame giọng đọc chạm tới từ khóa B (`cue1`) $\rightarrow$ đồ họa biến đổi/zoom/vẽ đường dẫn minh họa trực tiếp cho ý B.
   - Đúng frame giọng đọc chạm tới con số/kết luận C (`cue2`) $\rightarrow$ số liệu/điểm nhấn bung ra khớp từng lời nói.
5. **Bước 5 — Phối âm Đa tầng & Phụ đề Highlight Từng Từ (3-Track Audio & Word-Level Captions)**
   - Kết hợp hài hòa:
     - **Voiceover (`volume: 1.0`)**: Giọng đọc Neural AI đã được lọc ấm & chuẩn hóa âm lượng (`ffmpeg loudnorm`).
     - **BGM (`volume: 0.16 - 0.20`)**: Nhạc nền đa lớp (4 hợp âm chuyển tiếp + Bass + Arpeggio).
     - **SFX (`@remotion/sfx`, `volume: 0.25 - 0.35`)**: Điểm xuyết đúng tại các `cueFrame` khi hình ảnh biến chuyển.
   - Phụ đề Highlight từng từ chạy mượt mà theo đúng mốc `WordBoundary`.
6. **Bước 6 — Đảm bảo Chất lượng & Tính Tất định (Visual Polish & Deterministic QA)**
   - Đảm bảo chiều sâu khung hình, không tràn chữ, dùng `random('seed')` và clamp mọi hàm `interpolate()`.

---

## III. DANH SÁCH CÁC FILE & HẠNG MỤC SẼ TRIỂN KHAI (IMPLEMENTATION CHECKLIST)

### 1. Nâng cấp Engine Âm thanh & Trích xuất `WordBoundary` (`scripts/generate-studio-audio.mjs`)
- [x] Viết bộ tổng hợp giọng đọc bằng **Python `edge_tts.Communicate(..., boundary="WordBoundary")`** (với fallback an toàn) để trích xuất **chính xác mili-giây (`startMs`, `endMs`) của từng từ đơn lẻ** ngay khi tạo file `public/voice-${i}.mp3`.
- [x] Bổ sung thuật toán **Syllable/Word Alignment Bảo hiểm**: Đảm bảo 100% mọi câu tiếng Việt/tiếng Anh đều có mảng `words` tách rời từng từ khớp khít với thời lượng thực tế đo bằng `ffprobe`.
- [x] Chuẩn hóa âm thanh giọng đọc qua `ffmpeg` (`highpass=f=80,acompressor,loudnorm=I=-16:TP=-1.5:LRA=11`) để giọng AI dày, ấm và rõ nét.
- [x] Nâng cấp bộ tổng hợp nhạc nền `public/bgm.mp3` lên **Multi-Layer BGM v2** (4-Chord Progression + Sub-Bass Pulse + Arpeggio) theo 5 mood, nén chuẩn `.mp3`.
- [x] Xuất đầy đủ dữ liệu thời lượng cảnh (`sceneFrames`), tổng thời lượng (`computedDurationInFrames`), và bản đồ từng từ (`scenes[i].words` chuẩn `@remotion/captions`) vào `src/remotion/audio-telemetry.json`, `public/audio-telemetry.json` và `src/remotion/meta.json`.

### 2. Module Đồng bộ Âm-Hình & Phụ đề Highlight Từng Từ (`src/remotion/audio-sync.tsx` & `src/remotion/Root.tsx`)
- [x] Tạo `src/remotion/audio-telemetry.json` (dữ liệu mặc định khi khởi tạo) và `src/remotion/audio-sync.tsx` cung cấp các hàm cốt lõi:
  - `audioTelemetry`: Toàn bộ dữ liệu đo đạc thực tế của các cảnh và từng từ.
  - `getSceneFrames(sceneIndex, fallbackFrames)`: Lấy độ dài chuẩn xác của cảnh `i`.
  - `getWordFrame(sceneIndex, keyword, fallbackFrame)`: Lấy chính xác frame bắt đầu của bất kỳ từ/cụm từ nào trong cảnh `i` để neo hiệu ứng hình ảnh khớp 100% với lời nói.
  - `getWordProgress(sceneIndex, startKeyword, endKeyword, frame)`: Trả về tiến độ `0 -> 1` trong khoảng thời gian giọng đọc nói từ cụm `startKeyword` đến `endKeyword`.
  - `getSceneCaptions(sceneIndex)` & `buildWordHighlightPages`: Trả về mảng `Caption[]` và trang từ chuẩn `@remotion/captions`.
  - `<WordHighlightCaptions sceneIndex={i} />`: Component phụ đề Karaoke highlight từng từ đang phát âm dựa trên dữ liệu `WordBoundary` thực tế (tùy chỉnh được màu sắc, font chữ, vị trí).

### 3. Hệ thống Tiền xử lý Tài nguyên & Bảo vệ Build (`scripts/prepare-render.mjs` & `.github/workflows/render.yml`)
- [x] **Pre-fetch External Images**: Tự động quét `src/remotion/DynamicVideo.tsx`, tải trước mọi URL ảnh bên ngoài (Pollinations.ai, Unsplash, Wikimedia...) về `public/cached-img-${k}.jpg` với timeout & ảnh dự phòng để không bao giờ treo render do lỗi mạng.
- [x] **Lucide Icon Import Guard**: Kiểm tra mọi tên icon được import từ `lucide-react` trong `DynamicVideo.tsx`. Nếu có tên icon không tồn tại trong thư viện thực tế, tự động ánh xạ sang icon hợp lệ gần nhất để không bao giờ bị lỗi build Webpack.
- [x] **Auto Duration Sync**: Đảm bảo `src/remotion/meta.json` luôn lấy `computedDurationInFrames` thực tế từ `generate-studio-audio.mjs`.

### 4. Nâng cấp MCP Server (`src/cloudflare-worker.ts` & `src/server.ts`)
- [x] Bổ sung MCP Tool mới **`analyze_narration_timeline`**: Cho phép Gemini gửi `narrationSegments` để nhận về bản đồ thời lượng từng cảnh (`durationInFrames`) và mốc frame (`startFrame`, `endFrame`) của từng từ khóa trước khi viết `tsxCode`.
- [x] Bổ sung MCP Tool mới **`list_rendered_videos`** và trang giao diện Web **`/gallery`**: Giúp xem lại toàn bộ danh sách các video đã được render trên Cloud.
- [x] Cập nhật **`ECOSYSTEM_DOCS` v5.0**:
  - Khai mở đầy đủ chữ ký API của toàn bộ **26+ gói `@remotion/*`** (`@remotion/captions`, `@remotion/media-utils`, `@remotion/paths`, `@remotion/shapes`, `@remotion/three`, `@remotion/motion-blur`, `@remotion/noise`, `@remotion/light-leaks`, `@remotion/sfx`, `@remotion/google-fonts`, `@remotion/layout-utils`, `@remotion/lottie`, `@remotion/gif`, `lucide-react`).
  - Hướng dẫn Quy trình 6 bước chuẩn Editor chuyên nghiệp và cách dùng `analyze_narration_timeline` + `audio-sync` (`getSceneFrames`, `getWordFrame`, `<WordHighlightCaptions />`) để **nói tới đâu — hình ảnh minh họa và phụ đề highlight chính xác tới đó**.
