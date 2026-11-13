import { ECOSYSTEM_DOCS } from "./prompts.js";
import { VISION_FRAME_CRITERIA } from "../../shared/quality-rubric.js";

export const TOOLS = [
  {
    name: 'plan_storyboard_timeline',
    description:
      'STAGE 1 — STORYBOARD, TIMELINE & CODE BLUEPRINT ORCHESTRATOR: Compute frame-accurate speech timing, scene boundaries (startFrame, durationInFrames), audioConfigPayload, anchorKeywords, AND the verified Continuous-World DynamicVideo.tsx Blueprint.\n' +
      'Mandatory workflow: 1) plan_storyboard_timeline -> 2) search_visual_media + search_soundtrack + search_sfx -> 3) evaluate_video_quality -> 4) preview_frames (4 keyframes) + get_task_status Vision check -> 5) render_video -> 6) get_task_status final audit.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Array of storyboard scenes with narration text and optional creative direction.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Narration script or lyric lines for this scene' },
              sceneName: { type: 'string', description: 'Optional scene name (e.g. "Hook", "Climax", "Outro")' },
              visualConcept: { type: 'string', description: 'Your creative visual direction for this scene' },
              continuityFromPrevScene: { type: 'string', description: 'Visual/rhythmic bridge from previous scene' },
              voice: { type: 'string', description: 'Voice ID (e.g. "vi-VN-NamMinhNeural", "vi-VN-HoaiMyNeural")' },
            },
            required: ['text'],
          },
        },
        text: {
          type: 'string',
          description: 'Alternative: single full script string if there is only 1 segment.',
        },
        voice: {
          type: 'string',
          description: 'Default voice for speech synthesis (default: "vi-VN-NamMinhNeural").',
          default: 'vi-VN-NamMinhNeural',
        },
        rate: {
          type: 'string',
          description: 'Speech pace adjustment (e.g. "+0%", "+10%", "-5%").',
          default: '+0%',
        },
        fps: {
          type: 'number',
          description: 'Frames per second of your composition (default: 30).',
          default: 30,
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'search_visual_media',
    description:
      'STAGE 2A — MULTIMODAL VISUAL MEDIA SEARCH: Search real photos and MP4/WebM videos across open global libraries (Wikimedia Commons, Openverse, Internet Archive).\n' +
      'Automatically attaches verified thumbnails as Vision image blocks (type: "image") so you can visually inspect quality, framing, and relevance before embedding URLs in <Img> or <OffthreadVideo>.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Descriptive English or Vietnamese keywords (English yields broader global stock coverage, e.g. "tokyo neon rain night", "earth from space nasa").',
        },
        mediaType: {
          type: 'string',
          enum: ['all', 'image', 'video'],
          default: 'all',
          description: 'Filter by image, video, or all.',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Max results to return (1-8, default 5).',
        },
        attachVisionThumbnails: {
          type: 'boolean',
          default: true,
          description: 'Attach up to 4 thumbnails directly as Vision image blocks for inspection.',
        },
      },
      required: ['query'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'search_soundtrack',
    description:
      'STAGE 2B — VERIFIED SOUNDTRACK & BGM SEARCH: Search background music tracks and automatically verify direct MP3 reachability & speech-clash risk.\n' +
      'Mount selected tracks with `<Audio src="<track.url>" volume={(f) => ...} loop />` and apply dynamic ducking whenever voiceover is active.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Mood or genre keywords (e.g. "cyberpunk synthwave instrumental", "lofi chill beat", "epic cinematic orchestral").',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum number of tracks to return (1-15, default 5).',
        },
        verifyLinks: {
          type: 'boolean',
          default: true,
          description: 'Verify HTTP reachability for direct MP3 URLs.',
        },
      },
      required: ['query'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'search_sfx',
    description:
      'STAGE 2C — SOUND EFFECTS & FOLEY LIBRARY: Discover verified built-in `@remotion/sfx` exports (exact import names like whoosh, whip, pageTurn, uiSwitch, mouseClick, ding, shutterModern, vineBoom, dramaticBoomer, recordScratch) and optional real-world foley/ambience URLs from Internet Archive.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SFX action or mood (e.g. "whoosh transition", "camera shutter", "ui click", "rain ambience", "dramatic impact").',
        },
        category: {
          type: 'string',
          enum: ['all', 'transition', 'ui', 'camera', 'emphasis', 'comedy'],
          default: 'all',
          description: 'Optional built-in category filter.',
        },
        includeWebFoley: {
          type: 'boolean',
          default: false,
          description: 'Also search Internet Archive for external foley/ambience audio files.',
        },
      },
      required: ['query'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'evaluate_video_quality',
    description:
      'STAGE 3A — NON-RESTRICTIVE DIRECTOR QUALITY CHECK & RUBRIC: Run fast pre-render validation on your Remotion TSX code against hard technical invariants and get an intent-relative 5-pillar rubric (100 pts) while keeping 100% creative freedom.',
    inputSchema: {
      type: 'object',
      properties: {
        tsxCode: {
          type: 'string',
          description: 'Your Remotion DynamicVideo TSX source code to validate and inspect.',
        },
        creativeIntent: {
          type: 'string',
          description: 'Your chosen aesthetic mood, visual language, and pacing intent.',
        },
        genre: {
          type: 'string',
          description: 'Video genre/format (e.g. "documentary", "short-viral", "3d-sci-fi", "minimalist-poem", "tutorial").',
        },
        durationInFrames: { type: 'number', default: 300 },
        fps: { type: 'number', default: 30 },
        width: { type: 'number', default: 1920 },
        height: { type: 'number', default: 1080 },
        audioConfig: {
          type: 'object',
          description: 'Optional audioConfig payload if using AI voiceover scenes.',
        },
      },
      required: ['tsxCode'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'preview_frames',
    description:
      'STAGE 3B — MULTI-FRAME VISUAL INSPECTION (CONTACT SHEET): Render 1 frame OR up to 6 key frames in a SINGLE Cloud job (e.g. frames: [15, 180, 420] for Hook, Body, Outro) and receive a labeled Contact Sheet PNG in your Vision context.\n' +
      `Inspect the returned image against:\n${VISION_FRAME_CRITERIA.join('\n')}\n` +
      'Follow up with get_task_status(jobId) to retrieve the Contact Sheet image block.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title or description of the frame preview' },
        tsxCode: {
          type: 'string',
          description: 'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`.',
        },
        frames: {
          type: 'array',
          items: { type: 'number' },
          description: 'Recommended: Array of 1 to 6 frame indices (e.g. [15, 180, 420]) to inspect Hook, Midground, and Outro in one labeled Contact Sheet.',
        },
        frame: {
          type: 'number',
          description: 'Alternative single frame index if only inspecting 1 frame (defaults to 0 when both frames and frame are omitted).',
        },
        durationInFrames: { type: 'number', description: 'Optional composition duration in frames.', default: 300 },
        fps: { type: 'number', description: 'Frames per second (default 30).', default: 30 },
        width: { type: 'number', description: 'Width in pixels (default 1920).', default: 1920 },
        height: { type: 'number', description: 'Height in pixels (default 1080).', default: 1080 },
        audioConfig: {
          type: 'object',
          description: 'Optional audioConfigPayload from plan_storyboard_timeline so captions and ChapterProgressSpine appear on the Contact Sheet (synthesized fast without waiting for TTS).',
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'render_video',
    description:
      `STAGE 4 — PRODUCTION CLOUD VIDEO RENDER & MASTERING: Render your Remotion v4.0.542 composition into MP4 on 16GB GitHub Actions Cloud Runners, optionally apply two-pass FFmpeg audio mastering (-14 LUFS), save project source for future edits, and measure QC telemetry.\n` +
      `Pass TSX via "tsxCode" and speech config via "audioConfig". Follow up with get_task_status(jobId, waitForCompletion: true).\n${ECOSYSTEM_DOCS}`,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the video composition' },
        tsxCode: {
          type: 'string',
          description: 'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`.',
        },
        durationInFrames: {
          type: 'number',
          description: 'Total duration in frames (seconds * fps). Match your narrative or speech telemetry.',
          default: 300,
        },
        fps: { type: 'number', description: 'Frames per second (default 30).', default: 30 },
        width: { type: 'number', description: 'Width in pixels (1920 landscape, 1080 portrait).', default: 1920 },
        height: { type: 'number', description: 'Height in pixels (1080 landscape, 1920 portrait).', default: 1080 },
        audioConfig: {
          type: 'object',
          description: 'Optional AI Voiceover & BGM config: { voice?: "vi-VN-NamMinhNeural" | "vi-VN-HoaiMyNeural", rate?: "+0%", bgm?: "lofi" | "cinematic" | "tech", scenes?: Array<{ text: string, voice?: string }> }',
        },
        audioMastering: {
          type: 'object',
          description: 'Optional studio FFmpeg audio mastering on Cloud runner (two-pass loudnorm without video re-encoding). Defaults to { enabled: true, targetLufs: -14, truePeakDbtp: -1.5 }.',
          properties: {
            enabled: { type: 'boolean', default: true },
            targetLufs: { type: 'number', default: -14 },
            truePeakDbtp: { type: 'number', default: -1.5 },
          },
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'get_task_status',
    description:
      'STAGE 5A — TASK STATUS, VISION RETURN & QC TELEMETRY: Wait for and retrieve Cloud render results. Returns watch/download links + FFmpeg QC telemetry for videos, or attached Base64 PNG/Contact Sheet + Vision checklist for previews.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Unique jobId returned by render_video or preview_frames' },
        waitForCompletion: {
          type: 'boolean',
          description: 'Wait up to 30s per call until completed or failed (default true).',
          default: true,
        },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'inspect_task_logs',
    description:
      'STAGE 5B — DIAGNOSTICS & SELF-HEALING: Retrieve compiler logs, TypeScript error traces, or GitHub Actions runner failure details to diagnose and fix failed renders.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The unique jobId to inspect' },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'list_system_assets',
    description:
      'ASSET & GALLERY BROWSER: List rendered MP4 videos stored in the Cloud Release CDN along with watch/stream/download links.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 20, description: 'Maximum number of items to retrieve' },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'get_project_source',
    description:
      'ITERATIVE EDITING — LOAD PROJECT SOURCE: Retrieve the saved TSX source code, audioConfig, and composition specs (width, height, fps, durationInFrames) of a previously rendered jobId so you can surgically refine specific scenes instead of rewriting from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The jobId of the previously rendered video to load' },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];
