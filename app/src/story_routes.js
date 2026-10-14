import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { config } from './config.js';
import { accounts, renders, posts } from './db.js';
import { getCreatorInfo } from './tiktok.js';
import { publishFieldsFrom } from './publish.js';
import { fetchPost, toNarration } from './story/reddit.js';
import { synthesize, VOICES } from './story/tts.js';
import { renderVideo, listBackgrounds, SUBTITLE_STYLES } from './story/video.js';

export const storyRouter = express.Router();

const backgroundsDir = path.join(config.root, 'assets/backgrounds');
const jobsDir = path.join(config.uploadDir, 'jobs');
fs.mkdirSync(backgroundsDir, { recursive: true });
fs.mkdirSync(jobsDir, { recursive: true });

const backgroundUpload = multer({
  storage: multer.diskStorage({
    destination: backgroundsDir,
    filename: (_req, file, cb) => cb(null, file.originalname.replace(/[^\w.\-]/g, '_')),
  }),
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^video\//.test(file.mimetype);
    cb(ok ? null : new Error('Background must be a video file'), ok);
  },
});

/* --------------------------------------------------------------- The studio */

storyRouter.get('/story', async (req, res, next) => {
  try {
    const all = accounts.all();
    const openId = req.query.account || all[0]?.open_id;
    if (!openId) return res.redirect('/');

    res.render('story', {
      accounts: all,
      openId,
      backgrounds: await listBackgrounds(backgroundsDir),
      voices: VOICES[process.env.TTS_PROVIDER || 'openai'] ?? [],
      styles: Object.keys(SUBTITLE_STYLES),
      recent: renders.recent(),
    });
  } catch (err) { next(err); }
});

/** Reads the Reddit post so the user can edit the text before it is narrated. */
storyRouter.post('/story/fetch', express.json(), async (req, res) => {
  try {
    const post = await fetchPost(req.body.url ?? '');
    res.json({
      headline: post.title,
      text: toNarration(post),
      subreddit: post.subreddit,
      author: post.author,
      nsfw: post.nsfw,
      url: post.url,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

storyRouter.post('/backgrounds', backgroundUpload.single('background'), (_req, res) => {
  res.redirect('/story');
});

storyRouter.post('/story/render', express.urlencoded({ extended: true }), async (req, res, next) => {
  const id = crypto.randomUUID();
  const jobDir = path.join(jobsDir, id);

  try {
    const b = req.body;
    const narration = (b.narration ?? '').trim();
    if (!narration) throw new Error('The story text is empty');
    if (!b.background) throw new Error('Choose a background clip');

    const backgroundFile = path.join(backgroundsDir, path.basename(b.background));
    if (!fs.existsSync(backgroundFile)) throw new Error('That background clip no longer exists');

    await fsp.mkdir(jobDir, { recursive: true });

    const audioFile = path.join(jobDir, 'narration.mp3');
    await synthesize({
      text: narration,
      voice: b.voice,
      speed: Number(b.speed) || 1,
      outFile: audioFile,
    });

    const { outFile, duration } = await renderVideo({
      jobDir,
      backgroundFile,
      audioFile,
      narration,
      style: b.style,
      wordsPerCue: Number(b.words_per_cue) || 4,
      titleCard: b.title_card === 'on' ? (b.headline ?? '') : '',
    });

    const { size } = await fsp.stat(outFile);
    renders.create({
      id,
      open_id: b.account,
      source_url: b.source_url || null,
      headline: b.headline ?? '',
      narration,
      background: path.basename(backgroundFile),
      voice: b.voice ?? '',
      style: b.style ?? '',
      file_path: outFile,
      duration,
      file_size: size,
      created_at: Date.now(),
    });

    res.redirect(`/story/${id}`);
  } catch (err) {
    await fsp.rm(jobDir, { recursive: true, force: true });
    next(err);
  }
});

/* ------------------------------------------------------- Preview and publish */

storyRouter.get('/story/:id', async (req, res, next) => {
  try {
    const render = renders.get(req.params.id);
    if (!render) return res.redirect('/story');

    const creator = await getCreatorInfo(render.open_id);
    const tooLong = render.duration > creator.max_video_post_duration_sec;
    res.render('story_preview', { render, creator, tooLong });
  } catch (err) { next(err); }
});

storyRouter.get('/story/:id/file', (req, res, next) => {
  const render = renders.get(req.params.id);
  if (!render) return next(new Error('Unknown render'));
  res.sendFile(render.file_path);
});

storyRouter.post('/story/:id/publish', express.urlencoded({ extended: true }), (req, res, next) => {
  try {
    const render = renders.get(req.params.id);
    if (!render) throw new Error('Unknown render');

    posts.create({
      open_id: render.open_id,
      file_path: render.file_path,
      file_size: render.file_size,
      ...publishFieldsFrom(req.body),
    });

    res.redirect('/posts');
  } catch (err) { next(err); }
});
