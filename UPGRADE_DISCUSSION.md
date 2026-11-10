# 🎬 BẢN THIẾT KẾ CHỐT NÂNG CẤP HỆ THỐNG (FINAL UPGRADE SPECIFICATION v5.3)

> **Trạng thái:** ✅ ĐÃ TRIỂN KHAI & ĐỐI CHIẾU HOÀN TẤT 100% (v5.3.0)  
> **Mục tiêu Tối thượng:**  
> 1. **Tự do Sáng tạo 100% (Zero Templates / Zero Rigid Matrices):** Không đóng khung Gemini vào bất kỳ mẫu slide hay template cố định nào. Khai mở toàn bộ sức mạnh của 26+ gói `@remotion/*`, Three.js 3D, SVG Path, Audio Spectrum, D3 và Lucide Icons.  
> 2. **Đồng bộ Tuyệt đối 3 Tầng (Macro-Sync + Micro-Sync + Flow-Sync):** Giọng đọc nói tới đâu — Hình ảnh minh họa, Nhịp chuyển cảnh và Phụ đề Karaoke khớp chính xác tới từng mili-giây mà không bao giờ bị trôi lệch (Zero-Drift).  
> 3. **Giọng đọc Thuần khiết 100% (Pure Neural Voiceover):** Loại bỏ hoàn toàn âm thanh nền tự tạo (`bgm.mp3` tĩnh lặng tuyệt đối) và tiếng động SFX gây nhiễu.  
> 4. **Mượt mà 60fps & Chống Giật Lag (Zero Unmount Pop-out / Zero Heavy Blur Lag):** Loại bỏ hiện tượng biến mất vật thể đột ngột và nghẽn CPU do `filter: blur()` lớn.

---

## I. KIẾN TRÚC ĐỒNG BỘ 3 TẦNG CHUẨN EDITOR CHUYÊN NGHIỆP (3-LAYER ZERO-DRIFT SYNC)

### 1. Tầng 1 — Đồng bộ Khung Thời Gian Tổng & Từng Phân Cảnh (Macro-Sync)
- Trên GitHub Actions (`scripts/generate-studio-audio.mjs`), hệ thống thu âm giọng đọc AI bằng `edge_tts.Communicate(..., boundary="WordBoundary")` và đo độ dài thực tế chính xác đến từng phần nghìn giây bằng **`mutagen.mp3`** (kèm dự phòng `npx remotion ffprobe` và kích thước byte CBR).
- Mỗi phân cảnh `sceneIndex` có mốc bắt đầu thực tế `getSegmentStartFrame(i)` và độ dài thực tế `getSceneFrames(i)` (đã cộng `0.40s` nhịp nghỉ lấy hơi tự nhiên).

### 2. Tầng 2 — Đồng bộ Chuyển Cảnh Mượt Không Lệch Tiếng (Flow-Sync: `<SyncedScene>`)
- **Giải quyết lỗ hổng lệch thời gian của `TransitionSeries`:** Nếu dùng `TransitionSeries` chồng lấp 20 frames mỗi cảnh, hình ảnh các cảnh sau sẽ bị kéo sớm hơn giọng đọc (trôi lệch lũy kế).
- **Giải pháp `<SyncedScene sceneIndex={i}>` trong `src/remotion/audio-sync.tsx`:**
  - Tự động đọc `getSegmentStartFrame(i)` và `getSceneFrames(i)` để đặt `<Sequence>` đúng 100% vào khung thời gian giọng đọc thực tế của cảnh `i` (Zero-Drift).
  - Tự động áp dụng hiệu ứng **Smooth Envelope Transition** (mờ dần + trượt/phóng nhẹ camera ở `enterFrames` đầu và `exitFrames` cuối trong khoảng nghỉ lấy hơi của giọng đọc) để chuyển giao mượt mà giữa các cảnh mà không làm lệch dù chỉ 1 frame âm thanh!

### 3. Tầng 3 — Đồng bộ Từ Khóa Tới Hành Động & Nhịp Bồi Đắp (Micro-Sync: Word-to-Action)
- **Nâng cấp `analyze_narration_timeline` thành "Bảng Điều Phối Đạo Diễn" (Director's Sync Sheet):**
  - Tự động tách các từ thực tế có trong từng câu `narrationSegments[i]`, chia sẵn thành **3–4 Nhịp Thị Giác (Visual Beats: Đầu câu -> Giữa câu -> Cao trào -> Kết câu)** kèm từ khóa neo (`anchorKeyword`) có thật 100% trong câu và đoạn code mẫu `getWordProgress(i, "từ_khóa")`.
  - Nhờ đó Gemini không bao giờ truyền sai từ khóa không có trong lời thoại.
- **Nâng cấp `src/remotion/audio-sync.tsx`:**
  - `getWordFrame(sceneIndex, keywordOrPhrase, fallbackFrame)`: Hỗ trợ so khớp cụm từ tiếng Việt, bỏ dấu câu, kèm cơ chế đối chiếu không dấu (accent-insensitive fallback) để luôn tìm trúng từ trong câu.
  - `getWordTrigger(sceneIndex, keywordOrPhrase, localFrame, durationFrames, fallbackRatio)`: Trả về tiến độ `0 -> 1` mượt mà (với `Easing.bezier(0.22, 1, 0.36, 1)`) bắt đầu ngay tại đúng frame giọng đọc phát âm `keywordOrPhrase`! Nếu từ khóa dự phòng được kích hoạt, tự động neo theo tỷ lệ thực tế của mảng từ trong câu (`getBeatFrame`) chứ không nhảy về số frame cố định vô nghĩa.
  - `getBeatFrame(sceneIndex, beatIndex, totalBeats)`: Chia đều mốc frame dựa trên danh sách các từ thực tế được phát âm trong cảnh `sceneIndex`.

---

## II. THỨ TỰ 7 BƯỚC TẠO VIDEO CHUẨN EDITOR CHUYÊN NGHIỆP (BEFORE & AFTER WORKFLOW)

### Giai đoạn A — Trên Gemini (Đạo diễn & Dựng cảnh)
1. **Bước 1 — Đọc Hồ sơ Kỹ thuật (`get_remotion_ecosystem_guide`)**: Nạp API 26+ thư viện Remotion v4.0.541 và bộ công cụ `./audio-sync`.
2. **Bước 2 — Viết Kịch bản Tự sự Liền mạch Trước (Narration First / Radio Edit)**:
   - Viết xong toàn bộ `narrationSegments` trước khi viết code hình ảnh.
   - Mỗi phân đoạn dài **2–3 câu hoàn chỉnh (30–55 từ, ~8–14 giây)**, có câu cầu nối chuyển ý tự nhiên (Narrative Bridges), tuyệt đối không viết 1 câu cụt lủn rời rạc.
3. **Bước 3 — Chạy `analyze_narration_timeline` Để Lấy Bảng Từ Khóa Có Thật**:
   - Nhận về thời lượng ước tính (`totalFrames`, `sceneFrames`) và danh sách `suggestedVisualBeats` chứa các từ khóa có thật trong từng câu nói.
4. **Bước 4 — Viết Code `DynamicVideo.tsx` Theo Khung Đồng Bộ & Gửi Render (`render_remotion_video`)**:
   - Đặt lớp nền chung xuyên suốt (Shared Spatial Canvas) + `<ContinuousAudioTrack />` + `<WordHighlightCaptions />`.
   - Bọc mỗi phân cảnh bằng **`<SyncedScene sceneIndex={i}>`**.
   - Bên trong mỗi cảnh, dùng **`getWordTrigger(i, "từ_khóa", frame)`** hoặc **`getWordProgress(i, "từ_A", "từ_B", frame)`** lấy từ Bước 3 để bồi đắp (Progressive Build-up) các lớp hình ảnh khớp 100% với lời nói.
   - Giữ các phần tử trên màn hình đến hết cảnh (không dùng `{progress < 1 && <Comp />}` làm biến mất đột ngột) và không dùng `filter: blur()` lớn gây giật lag.

### Giai đoạn B — Trên Đám Mây GitHub Actions (Thu âm thực tế & Khớp mili-giây)
5. **Bước 5 — Thu âm `edge-tts` & Đo đạc Mili-giây Thực tế (`scripts/generate-studio-audio.mjs`)**:
   - Tạo `public/voice-${i}.mp3` trong trẻo (không nhạc nền tự tạo), trích xuất `WordBoundary` của từng từ và đo độ dài chuẩn bằng `mutagen.mp3` -> Ghi vào `src/remotion/audio-telemetry.json` và `src/remotion/meta.json`.
6. **Bước 6 — Kiểm tra An toàn Tài nguyên (`scripts/prepare-render.mjs`)**:
   - Tải trước ảnh ngoài (Pre-fetch URLs), bảo vệ import icon `lucide-react`, khóa cứng tổng số frames theo `computedDurationInFrames`.
7. **Bước 7 — Kết xuất H.264 Chất lượng Cao (`npx remotion render`)**:
   - `<SyncedScene>`, `getWordTrigger`, `getWordFrame`, `<WordHighlightCaptions>` tự động đọc dữ liệu thật từ `audio-telemetry.json` để khớp từng frame âm thanh và hình ảnh, xuất file MP4 lên kho lưu trữ.

---

## III. DANH SÁCH ĐỐI CHIẾU TRIỂN KHAI (IMPLEMENTATION CHECKLIST v5.3)

### 1. Engine Âm thanh Thuần khiết & Đo đạc Chính xác (`scripts/generate-studio-audio.mjs`)
- [x] Thu âm giọng đọc bằng Python `edge_tts.Communicate(..., boundary="WordBoundary")` + đo độ dài thực tế bằng **`mutagen.mp3`** + fallback `npx remotion ffprobe` + CBR byte-size.
- [x] Loại bỏ hoàn toàn nhạc nền tự tạo (`public/bgm.mp3` là file im lặng tuyệt đối 100%) theo yêu cầu người dùng.
- [x] Xuất đầy đủ `sceneFrames`, `sceneStartFrames`, `computedDurationInFrames`, và `scenes[i].words` vào `src/remotion/audio-telemetry.json`, `public/audio-telemetry.json` và `src/remotion/meta.json`.

### 2. Module Đồng bộ 3 Tầng (`src/remotion/audio-sync.tsx`)
- [x] `getSceneFrames(sceneIndex, fallback)` & `getSegmentStartFrame(sceneIndex, fallback)`.
- [x] `getWordFrame(sceneIndex, keywordOrPhrase, fallbackFrame)`: Nâng cấp bộ dò cụm từ thông minh (hỗ trợ cả có dấu & không dấu tiếng Việt, tự động đối chiếu từ gần nhất).
- [x] `getBeatFrame(sceneIndex, beatIndex, totalBeats)`: Lấy frame chuẩn theo vị trí nhịp từ thực tế trong câu.
- [x] `getWordTrigger(sceneIndex, keywordOrPhrase, localFrame, durationFrames, fallbackBeatRatio)`: Hàm kích hoạt hiệu ứng mượt mà (`0 -> 1` với `Easing.bezier`) ngay tại thời điểm phát âm từ khóa.
- [x] `getWordProgress(sceneIndex, startKeyword, endKeyword, currentLocalFrame)`: Nội suy tiến độ `0 -> 1` giữa 2 mốc từ khóa.
- [x] `<SyncedScene sceneIndex={i}>`: Component khung cảnh tự động khóa cứng vào `startFrame` và `durationInFrames` của giọng đọc thực tế + tự động tạo hiệu ứng chuyển giao mượt mà (Smooth Crossfade + Subtle Camera Flow) ở đầu và cuối cảnh mà không làm lệch thời gian.
- [x] `<ContinuousAudioTrack />` & `<WordHighlightCaptions />`: Phát toàn bộ giọng đọc liền mạch và hiển thị phụ đề Karaoke từng từ.

### 3. Nâng cấp Công cụ Phân tích & Hướng dẫn Đạo diễn (`src/cloudflare-worker.ts` & `src/server.ts`)
- [x] Nâng cấp `buildNarrationTimelineAnalysis` (`analyze_narration_timeline`):
  - Tự động trích xuất **`suggestedVisualBeats`** (chia câu thoại thành 3–4 nhịp Đầu – Giữa – Cao trào – Kết với từ khóa thực tế có trong câu và gợi ý mã lệnh `getWordTrigger(i, "từ_khóa", frame)`).
  - Cảnh báo nếu phân đoạn quá ngắn (< 18 từ) để nhắc Gemini viết lời bình sâu sắc, liền mạch hơn.
- [x] Cập nhật `ECOSYSTEM_DOCS` v5.3 đồng bộ trên cả `src/cloudflare-worker.ts` và `src/server.ts`:
  - Quy trình chuẩn 4 bước cho Gemini: **Bước 1: Đọc Docs -> Bước 2: Viết kịch bản liền mạch -> Bước 3: Gọi `analyze_narration_timeline` lấy từ khóa thật -> Bước 4: Dựng cảnh với `<SyncedScene>` + `getWordTrigger` / `getWordProgress`**.
  - Cấm dùng âm thanh nền tự tạo (`bgm.mp3` / `@remotion/sfx`), cấm unmount đột ngột `{progress < 1 && ...}`, cấm dùng `filter: blur()` lớn gây giật lag.
