import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export const SUBTITLE_STYLES = {
  bold_white: { font: 'DejaVu Sans', size: 72, primary: '&H00FFFFFF', outline: 5, caps: false },
  yellow_caps: { font: 'DejaVu Sans', size: 76, primary: '&H0000F0FF', outline: 6, caps: true },
  clean_small: { font: 'DejaVu Sans', size: 56, primary: '&H00FFFFFF', outline: 4, caps: false },
};

export async function probeDuration(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`Could not read the duration of ${path.basename(file)}`);
  return seconds;
}

const ts = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${sec}`;
};

const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\{/g, '(').replace(/\}/g, ')').replace(/\n/g, ' ');

/**
 * Splits the narration into short caption groups and spreads them over the audio
 * duration proportionally to their length. Close enough for read-aloud narration,
 * and it needs no forced alignment.
 */
function captionCues(text, duration, wordsPerCue) {
  const words = text.split(/\s+/).filter(Boolean);
  const cues = [];
  for (let i = 0; i < words.length; i += wordsPerCue) cues.push(words.slice(i, i + wordsPerCue).join(' '));

  const totalChars = cues.reduce((sum, c) => sum + c.length, 0) || 1;
  let at = 0;
  return cues.map((text) => {
    const span = (text.length / totalChars) * duration;
    const cue = { text, start: at, end: at + span };
    at += span;
    return cue;
  });
}

function buildAss({ narration, duration, style, wordsPerCue, titleCard, titleSeconds }) {
  const s = SUBTITLE_STYLES[style] ?? SUBTITLE_STYLES.bold_white;
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${s.font},${s.size},${s.primary},&H00000000,&H64000000,1,1,${s.outline},2,5,80,80,0,1
Style: Card,${s.font},64,&H00FFFFFF,&H00000000,&HC8000000,1,3,14,0,5,90,90,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = [];
  if (titleCard) {
    events.push(`Dialogue: 0,${ts(0)},${ts(titleSeconds)},Card,,0,0,0,,${escape(titleCard)}`);
  }
  if (style !== 'none') {
    for (const cue of captionCues(narration, duration, wordsPerCue)) {
      if (cue.start < titleSeconds && titleCard) continue; // don't collide with the card
      const text = s.caps ? cue.text.toUpperCase() : cue.text;
      events.push(`Dialogue: 0,${ts(cue.start)},${ts(cue.end)},Caption,,0,0,0,,${escape(text)}`);
    }
  }
  return header + events.join('\n') + '\n';
}

/**
 * Renders the vertical 1080x1920 video: a slice of the chosen background clip,
 * the narration audio, and burned-in captions.
 */
export async function renderVideo({
  jobDir, backgroundFile, audioFile, narration,
  style = 'bold_white', wordsPerCue = 4, titleCard = '', titleSeconds = 3,
}) {
  const audioDuration = await probeDuration(audioFile);
  const bgDuration = await probeDuration(backgroundFile);

  // Start at a random point so repeated renders of the same background differ.
  const span = Math.max(bgDuration - audioDuration, 0);
  const offset = span > 0 ? Number((Math.random() * span).toFixed(2)) : 0;

  const assPath = path.join(jobDir, 'captions.ass');
  await fs.writeFile(assPath, buildAss({
    narration, duration: audioDuration, style, wordsPerCue,
    titleCard, titleSeconds: titleCard ? Math.min(titleSeconds, audioDuration) : 0,
  }));

  const outFile = path.join(jobDir, 'out.mp4');
  const args = [
    '-y',
    '-ss', String(offset), '-t', String(audioDuration), '-i', backgroundFile,
    '-i', audioFile,
    '-filter_complex',
    // Fill a 9:16 frame from any source aspect, then burn the captions in.
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,subtitles=captions.ass[v]",
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
    outFile,
  ];

  // cwd is the job directory so the subtitles filter takes a plain filename and
  // needs no path escaping.
  await run('ffmpeg', args, { cwd: jobDir, maxBuffer: 32 * 1024 * 1024 });
  return { outFile, duration: audioDuration };
}

export async function listBackgrounds(dir) {
  const entries = await fs.readdir(dir).catch(() => []);
  return entries.filter((f) => /\.(mp4|mov|webm)$/i.test(f));
}
