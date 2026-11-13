import { ECOSYSTEM_DOCS } from "./prompts.js";
import { VISION_FRAME_CRITERIA } from "../../shared/quality-rubric.js";

export const TOOLS = [
  {
    name: 'render_video',
    description:
      `PRODUCTION VIDEO RENDER TOOL: Render a complete Remotion v4.0.542 React video composition into an MP4 file on 16GB Cloud Runners.\n` +
      `You are the sole AI Video Director: you control all layout, transitions, audio tracks, and animations.\n` +
      `Pass your full React code via "tsxCode". If your video has speech, pass "audioConfig". Follow up with "get_task_status(jobId)" to track or deliver the watch link.\n${ECOSYSTEM_DOCS}`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the video composition',
        },
        tsxCode: {
          type: 'string',
          description:
            'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`. Pass directly to tool parameter.',
        },
        durationInFrames: {
          type: 'number',
          description:
            'Total duration in frames (seconds * fps). You have unlimited rendering capacity for any length (e.g. 60s = 1800, 3 mins = 5400, 5 mins = 9000, 10 mins = 18000 frames). Match your narrative length or speech telemetry.',
          default: 300,
        },
        fps: {
          type: 'number',
          description: 'Frames per second (default 30).',
          default: 30,
        },
        width: {
          type: 'number',
          description: 'Width in pixels (1920 for landscape, 1080 for portrait TikTok/Shorts).',
          default: 1920,
        },
        height: {
          type: 'number',
          description: 'Height in pixels (1080 for landscape, 1920 for portrait TikTok/Shorts).',
          default: 1080,
        },
        audioConfig: {
          type: 'object',
          description:
            'Optional: AI Voiceover & Background Music configuration. Schema: { voice?: "vi-VN-NamMinhNeural" | "vi-VN-HoaiMyNeural", bgm?: "lofi" | "cinematic" | "tech", scenes?: Array<{ text: string, voice?: string }> }',
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'preview_frame',
    description:
      'VISUAL INSPECTION TOOL: Render and capture a single high-resolution still frame (PNG) from your Remotion TSX code.\n' +
      'Use this to inspect layout, color harmony, typography, and contrast with your Vision capabilities before or instead of rendering a full video.\n' +
      `When inspecting the returned image, check:\n${VISION_FRAME_CRITERIA.join('\n')}\n` +
      'Follow up with get_task_status(jobId) to receive the image block directly in your context.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title or description of the frame preview',
        },
        tsxCode: {
          type: 'string',
          description:
            'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`.',
        },
        frame: {
          type: 'number',
          description: 'Specific frame number to capture (e.g. 0 for poster/intro, 60 for mid-scene). Defaults to 0.',
          default: 0,
        },
        fps: {
          type: 'number',
          description: 'Frames per second (default 30).',
          default: 30,
        },
        width: {
          type: 'number',
          description: 'Width in pixels (default 1920).',
          default: 1920,
        },
        height: {
          type: 'number',
          description: 'Height in pixels (default 1080).',
          default: 1080,
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'plan_storyboard_timeline',
    description:
      'STORYBOARD & TIMELINE ORCHESTRATOR: The premier pre-production tool for professional AI Video Directors.\n' +
      'Pass your storyboard concepts, scene narrative texts, or song verses to receive a mathematically accurate frame-by-frame Timeline.\n' +
      'Returns exact startFrame, durationInFrames, and cumulative timing for each scene so you can code your Remotion composition with 100% audio-visual synchronization without guessing!',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description:
            'Array of storyboard scenes. Each scene can specify narration text, visual concept notes, and custom voice.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Narration script or lyric lines for this scene' },
              sceneName: { type: 'string', description: 'Optional scene name (e.g. "Hook", "Climax", "Outro")' },
              visualConcept: { type: 'string', description: 'Your creative visual direction for this scene' },
              voice: { type: 'string', description: 'Voice ID (e.g. "vi-VN-NamMinhNeural", "vi-VN-HoaiMyNeural")' },
            },
            required: ['text'],
          },
        },
        text: {
          type: 'string',
          description: 'Alternative: single full script string to automatically slice and compute.',
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
    name: 'synthesize_speech',
    description:
      'AI VOICEOVER & TIMING CALCULATOR TOOL: Plan and calculate exact speech duration (seconds, frames, word timings) for Vietnamese or English voiceover scenes.\n' +
      'Returns exact frame boundaries (startFrame, durationInFrames) for each scene so you can code your Remotion <Sequence> blocks with 100% sync!',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Array of scenes with narration text: [{ text: "...", voice?: "vi-VN-NamMinhNeural" }]',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              voice: { type: 'string' },
            },
            required: ['text'],
          },
        },
        text: {
          type: 'string',
          description: 'Alternative: single narration text string if only 1 scene.',
        },
        voice: {
          type: 'string',
          description: 'Default voice (e.g. "vi-VN-NamMinhNeural" or "vi-VN-HoaiMyNeural").',
          default: 'vi-VN-NamMinhNeural',
        },
        rate: {
          type: 'string',
          description: 'Speech rate adjustment (e.g. "+0%", "+10%", "-5%").',
          default: '+0%',
        },
        fps: {
          type: 'number',
          description: 'Frames per second of your video project (default 30).',
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
    name: 'get_task_status',
    description:
      'TASK STATUS & COMPLETION TRACKER TOOL: Check status and wait for any background Cloud render job to complete.\n' +
      'When rendering a video (or still frame), you should call this tool until status is "completed" or "failed".\n' +
      'This tool automatically holds connection up to 30s per check, so you can easily loop until you have the final completed watch link to give the user!',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The unique jobId returned by render_video, preview_frame, or remotion' },
        waitForCompletion: {
          type: 'boolean',
          description: 'If true, waits up to 30 seconds for the job to finish before returning. Defaults to true.',
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
      'DIAGNOSTICS & SELF-HEALING TOOL: Retrieve detailed compiler logs, TypeScript error traces, or runner failures for autonomous debugging and self-healing.',
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
    name: 'search_soundtrack',
    description:
      'SOUNDTRACK & MUSIC SEARCH TOOL: Search background music, soundscapes, or audio tracks by natural query.\n' +
      'Returns a list of tracks with title, duration, channel, and stream URL so you can choose the best music for your scene mood.\n' +
      'You can then mount `<Audio src="<track.url>" volume={0.2} loop />` directly in your Remotion TSX code!',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query or mood keywords (e.g. "cyberpunk synthwave instrumental", "lofi chill hiphop beat", "epic cinematic ambient orchestral")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of track results to return (default 5, max 15)',
          default: 5,
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
    name: 'inspect_audio_track',
    description:
      'AUDIO INSPECTION & AUDITORY REFLECTION TOOL: Inspect any audio URL (Direct MP3, TikTok sound, or Studio CDN) before using it in your video.\n' +
      'Returns technical audio telemetry (duration, estimated BPM, genre, speech clash risk, vocals/instrumental status) so you can verify if the music fits your narrative and voiceover without clashing!\n' +
      'If the track is noisy or clashes, you can discard it and search another link.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The audio stream or video URL to inspect (Direct MP3, Archive.org, Incompetech, or TikTok)',
        },
      },
      required: ['url'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'list_system_assets',
    description:
      'STORAGE & ASSET BROWSER: List all rendered MP4 videos, still frames, and CDN links currently available.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 20,
          description: 'Maximum number of items to retrieve',
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
    name: 'evaluate_video_quality',
    description:
      'NON-RESTRICTIVE DIRECTOR QUALITY CHECK & RUBRIC TOOL: Run a fast pre-render quality check on your Remotion TSX code and receive an intent-relative 5-pillar evaluation rubric (100 pts) tailored to your chosen genre and format.\n' +
      'Checks hard technical invariants (determinism, safe-zone, zero double-voiceover clash, audio timeline fit) while preserving 100% of your creative freedom on visual style, colors, 2D/3D medium, and pacing.',
    inputSchema: {
      type: 'object',
      properties: {
        tsxCode: {
          type: 'string',
          description: 'Your Remotion DynamicVideo TSX source code to validate and inspect.',
        },
        creativeIntent: {
          type: 'string',
          description: 'Optional: Your chosen aesthetic mood, visual language, and pacing intent (e.g. "Vox-style 2.5D investigative documentary, calm deliberate pacing").',
        },
        genre: {
          type: 'string',
          description: 'Optional: Video genre/format (e.g. "documentary", "short-viral", "3d-sci-fi", "minimalist-poem", "tutorial").',
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
    name: 'remotion',
    description:
      'LEGACY ALIAS TOOL: Unified entrypoint supporting both video render and still preview. Automatically routes to render_video or preview_frame.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        tsxCode: { type: 'string' },
        durationInFrames: { type: 'number' },
        fps: { type: 'number', default: 30 },
        width: { type: 'number', default: 1920 },
        height: { type: 'number', default: 1080 },
        frame: { type: 'number' },
        audioConfig: { type: 'object' },
      },
      required: ['tsxCode'],
    },
  },
];
