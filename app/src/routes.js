import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { config } from './config.js';
import { accounts, posts } from './db.js';
import {
  buildAuthUrl, exchangeCode, getUserInfo, listVideos, getCreatorInfo,
} from './tiktok.js';
import { publishFieldsFrom } from './publish.js';

export const router = express.Router();

const upload = multer({
  dest: config.uploadDir,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype);
    cb(ok ? null : new Error('Only mp4, mov or webm video files are accepted'), ok);
  },
});

/* ------------------------------------------------------------------- OAuth */

router.get('/auth/login', (req, res) => {
  const { url, state, codeVerifier } = buildAuthUrl();
  req.session.oauth = { state, codeVerifier };
  res.redirect(url);
});

router.get('/auth/callback', async (req, res, next) => {
  try {
    const { code, state, error, error_description: description } = req.query;
    if (error) return res.status(400).render('message', { title: 'Authorization declined', body: description || error });

    const pending = req.session.oauth;
    if (!pending || pending.state !== state) {
      return res.status(400).render('message', { title: 'Invalid state', body: 'Start the connection again from the dashboard.' });
    }
    delete req.session.oauth;

    const token = await exchangeCode(code, pending.codeVerifier);
    accounts.upsert({
      open_id: token.open_id,
      union_id: null,
      display_name: null,
      avatar_url: null,
      scopes: token.scopes,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      access_expires_at: token.access_expires_at,
      refresh_expires_at: token.refresh_expires_at,
      connected_at: Date.now(),
    });

    // Fill in the profile so the user can see which account is connected.
    const user = await getUserInfo(token.open_id);
    accounts.updateProfile(token.open_id, user);

    res.redirect('/');
  } catch (err) { next(err); }
});

router.post('/accounts/:openId/disconnect', (req, res) => {
  accounts.remove(req.params.openId);
  res.redirect('/');
});

/* --------------------------------------------------------------- Monitoring */

router.get('/', (req, res) => {
  res.render('dashboard', { accounts: accounts.all(), scopes: config.scopes });
});

router.get('/accounts/:openId', async (req, res, next) => {
  try {
    const account = accounts.get(req.params.openId);
    if (!account) return res.redirect('/');

    const [user, videos] = await Promise.all([
      getUserInfo(account.open_id),
      listVideos(account.open_id).catch(() => ({ videos: [] })),
    ]);
    accounts.updateProfile(account.open_id, user);

    res.render('account', { account, user, videos: videos.videos ?? [] });
  } catch (err) { next(err); }
});

/* ---------------------------------------------------------------- Composing */

router.get('/compose', async (req, res, next) => {
  try {
    const all = accounts.all();
    const openId = req.query.account || all[0]?.open_id;
    if (!openId) return res.redirect('/');

    // Required by TikTok: the publish form must render what this call returns.
    const creator = await getCreatorInfo(openId);
    res.render('compose', { accounts: all, openId, creator, error: null });
  } catch (err) { next(err); }
});

router.post('/compose', upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) throw new Error('Select a video file');
    const fields = publishFieldsFrom(req.body);

    // Keep the original extension so the upload PUT sends a file TikTok recognizes.
    const ext = path.extname(req.file.originalname) || '.mp4';
    const stored = `${req.file.path}${ext}`;
    fs.renameSync(req.file.path, stored);

    posts.create({
      open_id: req.body.account,
      file_path: stored,
      file_size: req.file.size,
      ...fields,
    });

    res.redirect('/posts');
  } catch (err) {
    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
    next(err);
  }
});

/* ------------------------------------------------------------------- Queue */

router.get('/posts', (req, res) => {
  res.render('posts', { posts: posts.listForView() });
});
