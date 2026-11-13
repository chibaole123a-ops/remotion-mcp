import json
import os
import re
import sys

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


VOICE_ISO_MAP = {
    "vi": "vie",
    "en": "eng",
    "ja": "jpn",
    "zh": "cmn",
    "ko": "kor",
    "fr": "fra",
    "de": "deu",
    "es": "spa",
    "pt": "por",
    "ru": "rus",
    "th": "tha",
    "id": "ind",
}

VI_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
EN_ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
]
EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

VI_ACRONYMS = {
    "AI": "ây ai",
    "QC": "kiu xi",
    "MCP": "em xi pi",
    "FPS": "ép pi ét",
    "LUFS": "lớp",
    "DBTP": "đê bi ti pi",
    "3D": "ba đê",
    "2D": "hai đê",
    "4K": "bốn ca",
    "HD": "hát đê",
    "MP4": "em pi bốn",
    "MP3": "em pi ba",
    "UI": "iu ai",
    "API": "ây pi ai",
    "TSX": "ti ét ích",
    "WEBGL": "oép gi eo",
}


def voice_to_iso639_3(voice: str) -> str:
    prefix = str(voice or "vi-VN").split("-")[0].lower().strip()
    return VOICE_ISO_MAP.get(prefix, "vie")


def int_to_vi(n: int) -> str:
    if n < 0:
        return "âm " + int_to_vi(-n)
    if n < 10:
        return VI_DIGITS[n]
    if n < 20:
        if n == 10:
            return "mười"
        if n == 15:
            return "mười lăm"
        return "mười " + VI_DIGITS[n % 10]
    if n < 100:
        tens, ones = divmod(n, 10)
        head = VI_DIGITS[tens] + " mươi"
        if ones == 0:
            return head
        if ones == 1:
            return head + " mốt"
        if ones == 5:
            return head + " lăm"
        return head + " " + VI_DIGITS[ones]
    if n < 1000:
        hundreds, rem = divmod(n, 100)
        head = VI_DIGITS[hundreds] + " trăm"
        if rem == 0:
            return head
        if rem < 10:
            return head + " lẻ " + VI_DIGITS[rem]
        return head + " " + int_to_vi(rem)
    if n < 1_000_000:
        thousands, rem = divmod(n, 1000)
        head = int_to_vi(thousands) + " nghìn"
        if rem == 0:
            return head
        if rem < 100:
            return head + " không trăm " + int_to_vi(rem)
        return head + " " + int_to_vi(rem)
    return " ".join(VI_DIGITS[int(ch)] for ch in str(n) if ch.isdigit())


def int_to_en(n: int) -> str:
    if n < 0:
        return "minus " + int_to_en(-n)
    if n < 20:
        return EN_ONES[n]
    if n < 100:
        tens, ones = divmod(n, 10)
        return EN_TENS[tens] + ("" if ones == 0 else " " + EN_ONES[ones])
    if n < 1000:
        hundreds, rem = divmod(n, 100)
        return EN_ONES[hundreds] + " hundred" + ("" if rem == 0 else " " + int_to_en(rem))
    if n < 1_000_000:
        thousands, rem = divmod(n, 1000)
        return int_to_en(thousands) + " thousand" + ("" if rem == 0 else " " + int_to_en(rem))
    return " ".join(EN_ONES[int(ch)] for ch in str(n) if ch.isdigit())


def number_str_to_words(num_str: str, iso_code: str) -> str:
    neg = num_str.startswith("-")
    raw = num_str[1:] if neg else num_str
    prefix = ("âm " if iso_code == "vie" else "minus ") if neg else ""
    if "." in raw:
        parts = raw.split(".", 1)
        left = int_to_vi(int(parts[0])) if (iso_code == "vie" and parts[0].isdigit()) else (
            int_to_en(int(parts[0])) if parts[0].isdigit() else parts[0]
        )
        dot_word = "chấm" if iso_code == "vie" else "point"
        right = int_to_vi(int(parts[1])) if (iso_code == "vie" and parts[1].isdigit()) else (
            int_to_en(int(parts[1])) if parts[1].isdigit() else parts[1]
        )
        return f"{prefix}{left} {dot_word} {right}".strip()
    if raw.isdigit():
        val = int(raw)
        return prefix + (int_to_vi(val) if iso_code == "vie" else int_to_en(val))
    return num_str


def expand_token_for_speech(token: str, iso_code: str) -> str:
    """Convert numeric tokens & common acronyms into phonetic spoken equivalents for CTC alignment."""
    stripped = re.sub(r"^[^\w\-+]+|[^\w%]+$", "", token, flags=re.UNICODE)
    if not stripped:
        return ""

    if iso_code == "vie":
        acr = VI_ACRONYMS.get(stripped.upper()) or VI_ACRONYMS.get(stripped)
        if acr:
            return acr

    if stripped.endswith("%") and re.match(r"^-?\d+(?:\.\d+)?%$", stripped):
        num_part = stripped[:-1]
        suffix = "phần trăm" if iso_code == "vie" else "percent"
        return f"{number_str_to_words(num_part, iso_code)} {suffix}"

    if re.match(r"^-?\d+(?:\.\d+)?$", stripped):
        return number_str_to_words(stripped, iso_code)

    # Alphanumeric like V7.2 -> V 7.2
    m = re.match(r"^([A-Za-z]+)(\d+(?:\.\d+)?)$", stripped)
    if m:
        letters, digits = m.groups()
        return f"{letters} {number_str_to_words(digits, iso_code)}"

    return token


def sanitize_uroman_chars(utok: str, vocab_keys: set[str]) -> str:
    chars = [ch for ch in utok.split(" ") if ch and ch in vocab_keys]
    return " ".join(chars)


def clamp_and_interpolate_words(orig_tokens: list[str], aligned_map: dict[int, tuple[int, int]], duration_ms: int) -> list[dict]:
    n = len(orig_tokens)
    if n == 0:
        return []

    dur = max(200, int(duration_ms))
    starts = [None] * n
    ends = [None] * n

    for idx, (s_ms, e_ms) in aligned_map.items():
        if 0 <= idx < n:
            starts[idx] = max(0, min(dur - 40, int(s_ms)))
            ends[idx] = max(starts[idx] + 40, min(dur, int(e_ms)))

    # Interpolate any skipped punctuation/symbol tokens smoothly between aligned neighbors
    for idx in range(n):
        if starts[idx] is not None:
            continue
        prev_end = 0
        for p in range(idx - 1, -1, -1):
            if ends[p] is not None:
                prev_end = ends[p]
                break
        next_start = dur
        for q in range(idx + 1, n):
            if starts[q] is not None:
                next_start = starts[q]
                break
        gap = max(60, next_start - prev_end)
        s_val = max(0, min(dur - 60, prev_end))
        e_val = max(s_val + 40, min(dur, s_val + min(140, gap // 2)))
        starts[idx] = s_val
        ends[idx] = e_val

    # Monotonic pass so captions highlight forward without backwards jumps
    out = []
    prev_end = 0
    for idx, w in enumerate(orig_tokens):
        s_val = max(prev_end, starts[idx])
        if s_val > dur - 40:
            s_val = max(0, dur - 40)
        e_val = max(s_val + 40, min(dur, ends[idx]))
        prev_end = e_val
        out.append({
            "word": w,
            "startMs": int(s_val),
            "endMs": int(e_val),
        })
    return out


def align_single_segment(seg: dict, model, tokenizer, vocab_keys: set[str], align_fns: dict) -> list[dict] | None:
    text = str(seg.get("text") or "").strip()
    audio_path = str(seg.get("audioPath") or "")
    duration_ms = int(seg.get("durationMs") or 0)
    iso_code = voice_to_iso639_3(seg.get("voice") or "vi-VN")

    if not text or not audio_path or not os.path.exists(audio_path):
        return None

    orig_tokens = [t for t in text.split() if t]
    if not orig_tokens:
        return None

    spoken_tokens = [expand_token_for_speech(t, iso_code) for t in orig_tokens]
    norm_fn = align_fns["text_normalize"]
    uroman_fn = align_fns["get_uroman_tokens"]

    normed = [norm_fn(st, iso_code, remove_numbers=False) if st else "" for st in spoken_tokens]
    uroman_list = uroman_fn(normed, iso=iso_code)
    clean_uroman = [sanitize_uroman_chars(u, vocab_keys) for u in uroman_list]

    align_indices = [i for i, u in enumerate(clean_uroman) if u]
    if not align_indices:
        return None

    tokens_starred = []
    text_starred = []
    for i in align_indices:
        tokens_starred.extend(["<star>", clean_uroman[i]])
        text_starred.extend(["<star>", str(i)])

    waveform = align_fns["load_audio"](audio_path, model.dtype, model.device)
    emissions, stride = align_fns["generate_emissions"](
        model, waveform, window_length=30, context_length=2, batch_size=4
    )
    segments, scores, blank_token = align_fns["get_alignments"](emissions, tokens_starred, tokenizer)
    spans = align_fns["get_spans"](tokens_starred, segments, blank_token)
    raw_results = align_fns["postprocess_results"](text_starred, spans, stride, scores)

    if len(raw_results) != len(align_indices):
        return None

    aligned_map: dict[int, tuple[int, int]] = {}
    for item in raw_results:
        tok_idx = int(item["text"])
        s_ms = round(float(item["start"]) * 1000)
        e_ms = round(float(item["end"]) * 1000)
        aligned_map[tok_idx] = (s_ms, e_ms)

    return clamp_and_interpolate_words(orig_tokens, aligned_map, duration_ms)


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python ctc_align_batch.py <manifest.json> <output.json>\n")
        sys.exit(2)

    manifest_path, output_path = sys.argv[1], sys.argv[2]
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    if not isinstance(manifest, list) or len(manifest) == 0:
        with open(output_path, "w", encoding="utf-8") as out_f:
            json.dump({}, out_f)
        return

    import torch
    from ctc_forced_aligner import (
        load_audio,
        load_alignment_model,
        generate_emissions,
        get_alignments,
        get_spans,
        postprocess_results,
    )
    from ctc_forced_aligner.text_utils import text_normalize, get_uroman_tokens

    torch.set_num_threads(min(4, os.cpu_count() or 2))
    model, tokenizer = load_alignment_model("cpu", dtype=torch.float32)
    vocab_keys = {k.lower() for k in tokenizer.get_vocab().keys()}

    align_fns = {
        "load_audio": load_audio,
        "generate_emissions": generate_emissions,
        "get_alignments": get_alignments,
        "get_spans": get_spans,
        "postprocess_results": postprocess_results,
        "text_normalize": text_normalize,
        "get_uroman_tokens": get_uroman_tokens,
    }

    results = {}
    for seg in manifest:
        idx = str(seg.get("index"))
        try:
            aligned_words = align_single_segment(seg, model, tokenizer, vocab_keys, align_fns)
            if aligned_words:
                results[idx] = aligned_words
        except Exception as exc:
            sys.stderr.write(f"⚠️ CTC alignment skipped for scene {idx}: {exc}\n")

    with open(output_path, "w", encoding="utf-8") as out_f:
        json.dump(results, out_f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
